import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createPackageLibrary, customizeSymbol } from '../src/assets/packages.mjs';
import { main } from '../bin/ingenium.mjs';

async function fixture() {
  await mkdir(resolve('work'), { recursive: true });
  const root = await mkdtemp(resolve('work/package-library-'));
  const pkg = join(root, 'font'); await mkdir(join(pkg, 'files'), { recursive: true });
  await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: '@fontsource/synthetic', version: '1.0.0', main: '400.css', license: 'OFL-1.1' }));
  await writeFile(join(pkg, 'metadata.json'), JSON.stringify({ family: 'Synthetic Test', version: 'catalog-label', license: { type: 'OFL-1.1' } }));
  await writeFile(join(pkg, 'LICENSE'), 'Original synthetic test notice only. SIL OPEN FONT LICENSE Version 1.1');
  // Container-only synthetic data: never represented as a usable real font.
  const woff = Buffer.alloc(49); woff.write('wOF2'); woff.writeUInt32BE(0x00010000, 4); woff.writeUInt32BE(49, 8); woff.writeUInt16BE(1, 12); woff.writeUInt32BE(100, 16); woff.writeUInt32BE(1, 20);
  await writeFile(join(pkg, 'files/a.woff2'), woff); await writeFile(join(pkg, 'files/b.woff2'), woff);
  const rule = (file, range) => `@font-face{font-family:'Synthetic Test';font-style:normal;font-weight:400;src:url(./files/${file}.woff2) format('woff2');unicode-range:${range};}`;
  await writeFile(join(pkg, '400.css'), rule('a', 'U+0400-04FF') + rule('b', 'U+0000-00FF'));
  return { root, pkg, library: createPackageLibrary({ sources: [{ id: 'font', kind: 'font', packageDir: pkg }] }) };
}
test('local package construction is inert and missing sources request explicit acquisition', async () => {
  const library = createPackageLibrary({ sources: [{ id: 'absent', kind: 'font', packageDir: resolve('work/does-not-exist-library') }] });
  assert.equal((await library.capabilities())[0].state, 'acquisition-required');
  assert.deepEqual((await library.search({ kind: 'font', query: 'Inter' })).results, []);
  assert.throws(() => createPackageLibrary({ sources: [] }), /1..8/);
});
test('discovery separates package version, source label and actual per-rule CSS faces', async () => {
  const { library } = await fixture();
  assert.equal((await library.search({ kind: 'font', query: 'synthetic' })).results[0].packageVersion, '1.0.0');
  const detail = await library.details({ sourceId: 'font' });
  assert.deepEqual(detail.faces.map(f => f.unicodeRange), ['U+0400-04FF', 'U+0000-00FF']);
  assert.equal(detail.faces[1].relativeFile, 'files/b.woff2');
  assert.equal(detail.metadataVersionLabel, 'catalog-label');
});
test('commented faces never become selectable active font rules', async () => {
  const { library, pkg } = await fixture(), file = join(pkg, '400.css');
  const active = await readFile(file, 'utf8');
  await writeFile(file, `/* ${active.replaceAll('font-weight:400', 'font-weight:900')} */\n${active}`);
  const result = await library.details({ sourceId: 'font' });
  assert.equal(result.faces.length, 2); assert(result.faces.every(f => f.weight === '400'));
  await writeFile(file, '/* unterminated');
  await assert.rejects(library.details({ sourceId: 'font' }), /Unterminated/);
});
test('selected font export preserves the selected bytes/notice and refuses existing output', async () => {
  const { library, root, pkg } = await fixture(), outputDir = join(root, 'selected');
  const result = await library.acquire({ sourceId: 'font', selected: true, faceIndex: 1, outputDir });
  assert.equal(result.face.unicodeRange, 'U+0000-00FF');
  assert.deepEqual(await readFile(join(outputDir, 'font.woff2')), await readFile(join(pkg, 'files/b.woff2')));
  const original = await readFile(join(outputDir, 'font.css'));
  await assert.rejects(library.acquire({ sourceId: 'font', selected: true, faceIndex: 0, outputDir }), /exist/i);
  assert.deepEqual(await readFile(join(outputDir, 'font.css')), original);
  await assert.rejects(library.acquire({ sourceId: 'font', faceIndex: 1, outputDir: join(root, 'refused') }), /selected:true/);
});
test('CSS external resources, traversal, duplicate descriptors and missing license refuse', async () => {
  for (const css of ["@import 'https://example.invalid/a.css';", "@font-face{font-family:X;src:url(https://example.invalid/font.woff2)}", "@font-face{font-family:X;font-family:Y}"]) {
    const { library, pkg } = await fixture(); await writeFile(join(pkg, '400.css'), css);
    await assert.rejects(library.details({ sourceId: 'font' }), /CSS|descriptor|family|source|font-face/);
  }
  const { library, root, pkg } = await fixture();
  await assert.rejects(library.details({ sourceId: 'font', cssFile: '../outside.css' }), /relative/);
  await writeFile(join(pkg, 'LICENSE'), 'No usable full notice');
  await assert.rejects(library.acquire({ sourceId: 'font', selected: true, faceIndex: 0, outputDir: join(root, 'no-license') }), /notice/);
});
test('canonical source boundary rejects files reached through symlink parents', async () => {
  const { root, pkg } = await fixture(); await symlink(pkg, join(root, 'alias'));
  const library = createPackageLibrary({ sources: [{ id: 'alias', kind: 'font', packageDir: join(root, 'alias') }] });
  assert.equal((await library.capabilities())[0].state, 'error');
});
test('CLI resolves package paths against its config and exposes real face selection', async () => {
  const { root } = await fixture(); const config = join(root, 'library.json'), selection = join(root, 'face.json');
  await writeFile(config, JSON.stringify({ sources: [{ id: 'font', kind: 'font', packageDir: 'font' }] }));
  await writeFile(selection, JSON.stringify({ sourceId: 'font', cssFile: '400.css' }));
  const output = []; assert.equal(await main(['library', 'details', config, selection], x => output.push(x)), 0);
  assert.equal(output[0].faces[1].faceIndex, 1);
});
test('symbol export refuses metadata-only license and requires explicit optional converter', async () => {
  const { root } = await fixture(), pkg = join(root, 'icons'); await mkdir(pkg);
  await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: '@iconify-json/synthetic', version: '1.0.0', license: 'ISC' }));
  await writeFile(join(pkg, 'info.json'), JSON.stringify({ prefix: 'synthetic', license: { spdx: 'ISC', url: 'https://example.invalid/license' } }));
  const library = createPackageLibrary({ sources: [{ id: 'icons', kind: 'symbol', packageDir: pkg }] });
  await assert.rejects(library.acquire({ sourceId: 'icons', name: 'sun', selected: true, outputDir: join(root, 'out') }), /full notice/);
});

test('selected symbol edits preserve original bytes and refuse absent paint/injection', { skip: !process.env.INGENIUM_ASSET_PARSER_DIR }, () => {
  const parserDir = process.env.INGENIUM_ASSET_PARSER_DIR;
  const original = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" d="M2 2L22 22"/></svg>');
  const before = Buffer.from(original), result = customizeSymbol(original, { color: '#006c70', strokeWidth: 1.5, width: 48 }, { parserDir });
  assert.deepEqual(original, before); assert.match(result.svg.toString(), /stroke="#006c70"/); assert.match(result.svg.toString(), /stroke-width="1.5"/); assert.match(result.svg.toString(), /width="48"/);
  assert.throws(() => customizeSymbol(original, { color: 'url(https://example.invalid)' }, { parserDir }), /hex/);
  assert.throws(() => customizeSymbol(result.svg, { color: '#ffffff' }, { parserDir }), /currentColor/);
  assert.throws(() => customizeSymbol(original, { rotate: 1 }, { parserDir }), /supported/);
});
