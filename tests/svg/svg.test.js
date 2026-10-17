import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink, link } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { discoverCapabilities, exportSvg } from '../../src/svg/index.js';

const require = createRequire(import.meta.url);
const example = fileURLToPath(new URL('../../examples/svg/clipped-orbit.svg', import.meta.url));
let testSharp = process.env.INGENIUM_TEST_SHARP_MODULE;
if (!testSharp) {
  try { testSharp = require.resolve('sharp'); } catch { /* Optional dependency is absent. */ }
}
const digest = b => createHash('sha256').update(b).digest('hex');
const fixture = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect id="original" width="80" height="60" fill="red"/></svg>';
async function workspace(t) {
  // Keep generated test artifacts alongside this worktree, never on the root disk.
  const dir = await mkdtemp(resolve('tests/svg/.run-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const sourcePath = join(dir, 'source.svg');
  const outputPath = join(dir, 'output.png');
  await writeFile(sourcePath, fixture);
  return { dir, sourcePath, outputPath };
}

test('discovery honestly reports absent and errored optional modules', async t => {
  assert.equal((await discoverCapabilities({ sharpModule: '@ingenium-test/definitely-missing' })).sharp.status, 'absent');
  const { dir } = await workspace(t);
  const broken = join(dir, 'broken.cjs');
  await writeFile(broken, 'throw new Error("synthetic load failure")');
  assert.equal((await discoverCapabilities({ sharpModule: broken })).sharp.status, 'errored');
  const incomplete = join(dir, 'incomplete.cjs');
  await writeFile(incomplete, 'require("@ingenium-test/missing-transitive-dependency")');
  assert.equal((await discoverCapabilities({ sharpModule: incomplete })).sharp.status, 'errored');
});

test('a callable module that fails the render probe is errored', async t => {
  const { dir } = await workspace(t);
  const broken = join(dir, 'probe.cjs');
  await writeFile(broken, 'module.exports = Object.assign(() => { throw new Error("probe fails") }, {versions:{sharp:"synthetic"}})');
  const result = await discoverCapabilities({ sharpModule: broken });
  assert.equal(result.sharp.status, 'errored');
  assert.equal(result.sharp.version, 'synthetic');
  assert.equal(result.sharp.reason, 'Sharp SVG-to-PNG probe failed');
  assert.equal(result.sharp.setup.package, 'sharp@0.35.4');
});

test('refuses overwrite, existing outputs, symlinks and hard links while preserving bytes', async t => {
  const paths = await workspace(t);
  const before = await readFile(paths.sourcePath);
  await assert.rejects(exportSvg({ sourcePath: paths.sourcePath, outputPath: paths.sourcePath }), /separate/);
  await writeFile(paths.outputPath, 'keep existing output');
  await assert.rejects(exportSvg(paths), /already exists/);
  assert.equal(await readFile(paths.outputPath, 'utf8'), 'keep existing output');
  const outputLink = join(paths.dir, 'alias.png');
  await symlink(paths.sourcePath, outputLink);
  await assert.rejects(exportSvg({ ...paths, outputPath: outputLink }), /already exists/);
  const hard = join(paths.dir, 'hard.png');
  await link(paths.sourcePath, hard);
  await assert.rejects(exportSvg({ ...paths, outputPath: hard }), /already exists/);
  const sourceLink = join(paths.dir, 'source-link.svg');
  await symlink(paths.sourcePath, sourceLink);
  await assert.rejects(exportSvg({ ...paths, sourcePath: sourceLink }), /regular file/);
  assert.deepEqual(await readFile(paths.sourcePath), before);
});

test('refuses canonical source aliases through a parent symlink', async t => {
  const paths = await workspace(t);
  const pngSource = join(paths.dir, 'source.png');
  await writeFile(pngSource, fixture);
  const alias = join(paths.dir, 'parent');
  await symlink(paths.dir, alias);
  await assert.rejects(exportSvg({ sourcePath: pngSource, outputPath: join(alias, 'source.png') }), /aliases SVG source/);
});

const rejected = [
  ['DTD', '<!DOCTYPE svg SYSTEM "https://example.invalid/a.dtd">' + fixture],
  ['entity', '<!ENTITY x "value">' + fixture],
  ['script', fixture.replace('<rect', '<script/> <rect')],
  ['event', fixture.replace('id="original"', 'onclick="alert(1)"')],
  ['external paint', fixture.replace('fill="red"', 'fill="url(https://example.invalid/paint)"')],
  ['encoded paint', fixture.replace('fill="red"', 'fill="url(&#35;paint)"')],
  ['image', fixture.replace('<rect', '<image href="https://example.invalid/a"/> <rect')],
  ['style', fixture.replace('<rect', '<style>rect {fill:red}</style><rect')],
  ['style attribute', fixture.replace('fill="red"', 'style="fill:red"')],
  ['processing instruction', '<?custom probe?>' + fixture],
  ['mismatched tag', fixture.replace('</svg>', '</g>')],
  ['unresolved clip', fixture.replace('fill="red"', 'clip-path="url(#missing)"')],
  ['unknown text entity', fixture.replace('</svg>', '<text>&custom;</text></svg>')],
  ['duplicate ID', fixture.replace('</svg>', '<g id="original"/></svg>')],
  ['excess input', fixture + ' '.repeat(2 * 1024 * 1024)],
  ['too deep', fixture.replace('</svg>', '<g>'.repeat(65) + '</g>'.repeat(65) + '</svg>')],
];
for (const [name, input] of rejected) {
  test(`refuses ${name} before resolving a renderer`, async t => {
    const paths = await workspace(t);
    await writeFile(paths.sourcePath, input);
    await assert.rejects(exportSvg({ ...paths, sharpModule: '@ingenium-test/definitely-missing' }), error => !['MODULE_NOT_FOUND', 'INGENIUM_RENDERER_ABSENT'].includes(error.code));
    assert.equal(await readFile(paths.sourcePath, 'utf8'), input);
    await assert.rejects(readFile(paths.outputPath), { code: 'ENOENT' });
  });
}

test('qualifies actual Sharp probe, example export and exact source preservation', { skip: !testSharp && 'Set INGENIUM_TEST_SHARP_MODULE for actual renderer qualification' }, async t => {
  const capability = await discoverCapabilities({ sharpModule: testSharp });
  assert.equal(capability.sharp.status, 'present');
  assert.deepEqual(capability.sharp.probe, { format: 'png', width: 2, height: 3 });
  const paths = await workspace(t);
  const original = await readFile(example);
  await writeFile(paths.sourcePath, original);
  const receipt = await exportSvg({ ...paths, sharpModule: testSharp });
  const png = await readFile(paths.outputPath);
  assert.deepEqual(await readFile(paths.sourcePath), original);
  assert.equal(receipt.sourceHash, digest(original));
  assert.equal(receipt.outputHash, digest(png));
  assert.equal(receipt.width, 320);
  assert.equal(receipt.height, 240);
  assert.equal(receipt.format, 'png');
  assert.equal(receipt.renderer.name, 'sharp');
  assert.equal(receipt.renderer.version, capability.sharp.version);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  const sharp = require(testSharp);
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  assert.deepEqual(pixel(160, 112), [250, 244, 231, 255], 'even-odd hole exposes the background');
  assert.deepEqual(pixel(10, 112), [250, 244, 231, 255], 'clip excludes geometry outside window');
  assert.notDeepEqual(pixel(160, 65), [250, 244, 231, 255], 'transformed ring actually renders');
});

test('actual renderer refuses excessive raster size and leaves no output', { skip: !testSharp && 'Optional renderer not configured' }, async t => {
  const paths = await workspace(t);
  await writeFile(paths.sourcePath, fixture.replace('width="80"', 'width="9000"'));
  await assert.rejects(exportSvg({ ...paths, sharpModule: testSharp }), /dimensions|pixel limit/i);
  await assert.rejects(readFile(paths.outputPath), { code: 'ENOENT' });
});
