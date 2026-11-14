import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDelivery, writeDelivery } from '../src/delivery/index.mjs';

const workspace = fileURLToPath(new URL('../work/implementation/', import.meta.url));
const hash = content => createHash('sha256').update(content).digest('hex');
const source = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><text id="title" x="10" y="30">Field Station</text><image href="image.png" x="10" y="50" width="32" height="32"/></svg>';
const note = 'Open drawing.svg. Requested edit: title treatment only. Preserve Field Station and the image. Next action: adjust title weight in the editable SVG.';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64');
const manifest = () => ({ schema: 'ingenium-delivery/1', projectId: 'field-station', versionId: 'title-treatment', openingFile: 'drawing.svg', artifacts: [
  { id: 'drawing', path: 'drawing.svg', sha256: hash(source), mediaType: 'image/svg+xml', role: 'source', editableKind: 'live-text', editingNote: 'Title remains SVG text; image is linked raster.', dependsOnIds: ['image'] },
  { id: 'image', path: 'image.png', sha256: hash(pixel), mediaType: 'image/png', role: 'source', editableKind: 'raster-layer', editingNote: 'Original synthetic one-pixel raster; replaceable, not vector geometry.', dependsOnIds: [] },
  { id: 'instructions', path: 'CONTINUE.md', sha256: hash(note), mediaType: 'text/markdown', role: 'instructions', dependsOnIds: ['drawing'] },
], tools: [{ id: 'svg-editor', purpose: 'Edit live SVG text', required: true, tested: 'no', limitations: ['Native editor opening was not exercised.'] }], checks: [{ id: 'png-export', status: 'not-run', scope: 'Optional PNG renderer is absent; no PNG export is claimed.', evidenceIds: [] }], limitations: ['System font fallback can differ across editors.', 'Original fictional illustration; engineering adequacy is unqualified.'] });
async function fixture(t) {
  await mkdir(workspace, { recursive: true });
  const dir = await mkdtemp(path.join(workspace, 'delivery-test-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const root = path.join(dir, 'source'); await mkdir(root);
  await writeFile(path.join(root, 'drawing.svg'), source); await writeFile(path.join(root, 'image.png'), pixel); await writeFile(path.join(root, 'CONTINUE.md'), note);
  return { dir, root, outputDir: path.join(dir, 'delivered') };
}

test('pure delivery validation admits exact v1 and rejects malformed paths/IDs/closure/roles', () => {
  assert.deepEqual(validateDelivery(manifest()), { valid: true, errors: [] });
  const variants = [d => d.schema = 'ingenium-delivery/2', d => d.extra = true, d => d.artifacts[0].path = '../outside.svg', d => d.artifacts[0].path = 'a/%2e%2e/b.svg', d => d.artifacts[0].path = 'C:/x.svg', d => d.artifacts[0].sha256 = 'A'.repeat(64), d => d.artifacts[0].mediaType = 'image/png', d => d.artifacts[0].dependsOnIds = ['missing'], d => d.tools[0].id = 'drawing', d => d.openingFile = 'missing.svg', d => d.artifacts[2].role = 'preview', d => d.artifacts[0].dependsOnIds = null, d => d.artifacts[0].path = 'delivery.json'];
  for (const mutate of variants) { const d = manifest(); mutate(d); const result = validateDelivery(d); assert.equal(result.valid, false, JSON.stringify(d)); assert.ok(result.errors.every(e => e.code && e.path && e.message && e.nextStep)); }
  let accessed = false;
  assert.equal(validateDelivery({ get schema() { accessed = true; return 'ingenium-delivery/1'; } }).valid, false); assert.equal(accessed, false);
  const nested = manifest(); nested.artifacts[0].path = '.ingenium/artifacts/' + 'a'.repeat(64) + '/drawing.svg'; nested.openingFile = nested.artifacts[0].path;
  assert.equal(validateDelivery(nested).valid, true);
  const cycle = manifest(); cycle.artifacts[1].dependsOnIds = ['drawing'];
  assert.equal(validateDelivery(cycle).valid, true, 'File reference cycles are valid finite closure');
});

test('actual SVG/raster handoff reopens independently and survives second edit without input mutation', async t => {
  const { dir, root, outputDir } = await fixture(t), delivery = manifest(), original = structuredClone(delivery);
  const result = await writeDelivery({ root, delivery, outputDir });
  assert.equal(result.status, 'complete'); assert.deepEqual(delivery, original);
  assert.deepEqual(JSON.parse(await readFile(result.manifestPath, 'utf8')), original);
  assert.match(await readFile(result.inventoryPath, 'utf8'), /live-text/); assert.match(await readFile(result.inventoryPath, 'utf8'), /tested no/);
  // Delete the original source root to make hidden checkout/source dependencies observable.
  await rm(root, { recursive: true });
  const reopened = JSON.parse(await readFile(path.join(outputDir, 'delivery.json'), 'utf8'));
  const nextSource = (await readFile(path.join(outputDir, reopened.openingFile), 'utf8')).replace('id="title"', 'id="title" font-weight="700"');
  assert.match(nextSource, />Field Station<\/text>/);
  await writeFile(path.join(outputDir, 'drawing.svg'), nextSource);
  reopened.artifacts[0].sha256 = hash(nextSource); reopened.versionId = 'title-weight';
  const resumed = await writeDelivery({ root: outputDir, delivery: reopened, outputDir: path.join(dir, 'continued') });
  assert.equal(resumed.status, 'complete');
  assert.equal(await readFile(path.join(dir, 'continued', 'drawing.svg'), 'utf8'), nextSource);
  assert.deepEqual(await readFile(path.join(dir, 'continued', 'image.png')), pixel);
});

test('hash mismatch, missing source, undeclared dependencies and symlinks refuse before output', async t => {
  const { dir, root } = await fixture(t);
  for (const [name, change, code] of [
    ['hash', d => d.artifacts[0].sha256 = '0'.repeat(64), 'HASH_MISMATCH'],
    ['dependency', d => d.artifacts[0].dependsOnIds = [], 'MISSING_DEPENDENCY'],
    ['missing-image', d => d.artifacts = d.artifacts.filter(a => a.id !== 'image'), 'INVALID_DELIVERY'],
  ]) {
    const d = manifest(); change(d); const outputDir = path.join(dir, name);
    await assert.rejects(writeDelivery({ root, delivery: d, outputDir }), { code });
    await assert.rejects(access(outputDir));
  }
  await rm(path.join(root, 'image.png')); await symlink(path.join(root, 'drawing.svg'), path.join(root, 'image.png'));
  await assert.rejects(writeDelivery({ root, delivery: manifest(), outputDir: path.join(dir, 'symlink') }), { code: 'UNSAFE_FILE' });
  await assert.rejects(access(path.join(dir, 'symlink')));
});

test('full notices stay separate; link-only notices and unavailable external resources refuse', async t => {
  const { dir, root } = await fixture(t);
  const d = manifest(); const notice = 'https://example.invalid/license';
  await writeFile(path.join(root, 'NOTICE.txt'), notice);
  d.artifacts.push({ id: 'notice', path: 'NOTICE.txt', sha256: hash(notice), mediaType: 'text/plain', role: 'notice', dependsOnIds: [] });
  await assert.rejects(writeDelivery({ root, delivery: d, outputDir: path.join(dir, 'link-only') }), { code: 'LINK_ONLY_NOTICE' });
  const external = source.replace('image.png', 'https://example.invalid/image.png'); await writeFile(path.join(root, 'drawing.svg'), external);
  const e = manifest(); e.artifacts[0].sha256 = hash(external);
  await assert.rejects(writeDelivery({ root, delivery: e, outputDir: path.join(dir, 'external') }), { code: 'EXTERNAL_DEPENDENCY' });
});

test('relative CSS imports, fonts with full notice, static JS imports and mutual page navigation retain exact closure', async t => {
  const { dir, root } = await fixture(t);
  const files = {
    'index.html': '<!doctype html><html><head><link rel="stylesheet" href="styles/main.css"/></head><body><a href="details.html">Details</a><script type="module" src="scripts/main.mjs"></script></body></html>',
    'details.html': '<!doctype html><html><body><a href="index.html">Home</a></body></html>',
    'styles/main.css': '@import "./type.css"; body { color: #111; }',
    'styles/type.css': '@font-face { font-family: Demo; src: url("../fonts/demo.woff2"); }',
    'fonts/demo.woff2': 'original synthetic font fixture bytes; not a usable font',
    'scripts/main.mjs': 'import { label } from "./label.mjs"; document.title = label;',
    'scripts/label.mjs': 'export const label = "Field Station";',
    'FONT-NOTICE.txt': 'Original synthetic fixture. Permission is granted to use these fictional test bytes under MIT. No real font qualification is claimed.',
    'CONTINUE.md': 'Open index.html through a local HTTP server. Requested edit: page title. Preserve route links. Next action: edit scripts/label.mjs.',
  };
  const definitions = [
    ['home', 'index.html', 'text/html', 'source', ['details', 'style', 'main']],
    ['details', 'details.html', 'text/html', 'source', ['home']],
    ['style', 'styles/main.css', 'text/css', 'source', ['type']],
    ['type', 'styles/type.css', 'text/css', 'source', ['font']],
    ['font', 'fonts/demo.woff2', 'font/woff2', 'source', ['font-notice']],
    ['main', 'scripts/main.mjs', 'text/javascript', 'source', ['label']],
    ['label', 'scripts/label.mjs', 'text/javascript', 'source', []],
    ['font-notice', 'FONT-NOTICE.txt', 'text/plain', 'notice', []],
    ['instructions', 'CONTINUE.md', 'text/markdown', 'instructions', ['home']],
  ];
  const delivery = { schema: 'ingenium-delivery/1', projectId: 'website', versionId: 'v1', openingFile: 'index.html', artifacts: definitions.map(([id, p, mediaType, role, dependsOnIds]) => ({ id, path: p, sha256: hash(files[p]), mediaType, role, dependsOnIds })), tools: [], checks: [], limitations: ['These synthetic fixture font bytes test closure only; rendering is untested.'] };
  for (const [p, bytes] of Object.entries(files)) { await mkdir(path.dirname(path.join(root, p)), { recursive: true }); await writeFile(path.join(root, p), bytes); }
  const missingNotice = structuredClone(delivery); missingNotice.artifacts.find(a => a.id === 'font').dependsOnIds = [];
  assert.equal(validateDelivery(missingNotice).valid, false);
  await assert.rejects(writeDelivery({ root, delivery: missingNotice, outputDir: path.join(dir, 'without-notice') }), { code: 'INVALID_DELIVERY' });
  const missingImport = structuredClone(delivery); missingImport.artifacts.find(a => a.id === 'style').dependsOnIds = [];
  await assert.rejects(writeDelivery({ root, delivery: missingImport, outputDir: path.join(dir, 'without-import') }), { code: 'MISSING_DEPENDENCY' });
  await rm(path.join(root, 'scripts/label.mjs'));
  await assert.rejects(writeDelivery({ root, delivery, outputDir: path.join(dir, 'without-script') }), { code: 'ENOENT' });
  await assert.rejects(access(path.join(dir, 'without-script')));
  await writeFile(path.join(root, 'scripts/label.mjs'), files['scripts/label.mjs']);
  const result = await writeDelivery({ root, delivery, outputDir: path.join(dir, 'site') });
  assert.equal(result.status, 'complete'); assert.equal(await readFile(path.join(dir, 'site/styles/main.css'), 'utf8'), files['styles/main.css']);
  const schema = JSON.parse(await readFile(new URL('../schemas/delivery-v1.schema.json', import.meta.url), 'utf8'));
  const pathPattern = new RegExp(schema.$defs.path.pattern);
  for (const p of ['index.html', '.ingenium/artifacts/a/drawing.svg']) assert.ok(pathPattern.test(p));
  for (const p of ['../x', '/x', 'a/../b', 'a/%2e/b', 'a\\b', 'a//b']) assert.ok(!pathPattern.test(p), p);
});

test('Markdown inline/reference/shortcut images and links cannot silently omit local dependencies', async t => {
  const { dir, root } = await fixture(t);
  const cases = [
    ['inline-image', '![Required figure](missing.svg)', 'MISSING_DEPENDENCY'],
    ['inline-link', '[Editable figure](missing.svg)', 'MISSING_DEPENDENCY'],
    ['reference-image', '![Required figure][figure]\n\n[figure]: missing.svg', 'MISSING_DEPENDENCY'],
    ['collapsed-image', '![figure][]\n\n[figure]: missing.svg', 'MISSING_DEPENDENCY'],
    ['shortcut-image', '![figure]\n\n[figure]: missing.svg', 'MISSING_DEPENDENCY'],
    ['reference-link', '[Editable figure][figure]\n\n[figure]: missing.svg', 'MISSING_DEPENDENCY'],
    ['missing-definition', '![Required figure][figure]', 'UNRESOLVED_MARKDOWN'],
    ['complex-destination', '![Required figure](missing(part).svg)', 'UNSUPPORTED_MARKDOWN'],
    ['unquoted-html', '<img src=missing.png>', 'UNSUPPORTED_SOURCE'],
    ['quoted-html', '<img src="missing.png">', 'MISSING_DEPENDENCY'],
    ['quoted-angle-html', '<img alt="before > after" src="missing.png">', 'MISSING_DEPENDENCY'],
    ['background-html', '<body background="missing.png">', 'MISSING_DEPENDENCY'],
    ['embedded-svg-image', '<svg><image href="missing.svg"/></svg>', 'MISSING_DEPENDENCY'],
    ['embedded-svg-use', '<svg><use xlink:href="missing.svg#symbol"/></svg>', 'MISSING_DEPENDENCY'],
    ['inline-script', '<script>image.src = "missing.png";</script>', 'UNSUPPORTED_SOURCE'],
    ['inline-handler', '<button onclick="image.src = \'missing.png\'">Change</button>', 'UNSUPPORTED_SOURCE'],
    ['css-image-set', '<style>body { background: image-set("missing.png" 1x); }</style>', 'UNSUPPORTED_SOURCE'],
    ['css-comment-import', '<style>@import/* retained comment */"missing.css";</style>', 'MISSING_DEPENDENCY'],
    ['css-complex-url', '<style>body { background: url("missing image.png"); }</style>', 'UNSUPPORTED_SOURCE'],
  ];
  for (const [name, content, code] of cases) {
    await writeFile(path.join(root, 'document.md'), content);
    const d = manifest(); d.artifacts.push({ id: 'document', path: 'document.md', sha256: hash(content), mediaType: 'text/markdown', role: 'source', editableKind: 'code', dependsOnIds: [] });
    const outputDir = path.join(dir, name);
    await assert.rejects(writeDelivery({ root, delivery: d, outputDir }), { code });
    await assert.rejects(access(outputDir));
  }
  const content = '![Raster](image.png)\n\n[Editable SVG][figure]\n\n[figure]: drawing.svg\n\n[External navigation](https://example.invalid/)\n\n```md\n![Example only](not-required.svg)\n```';
  await writeFile(path.join(root, 'document.md'), content);
  const d = manifest(); d.artifacts.push({ id: 'document', path: 'document.md', sha256: hash(content), mediaType: 'text/markdown', role: 'source', editableKind: 'code', dependsOnIds: ['drawing', 'image'] });
  assert.equal((await writeDelivery({ root, delivery: d, outputDir: path.join(dir, 'markdown-complete') })).status, 'complete');
});

test('exclusive outputs and actual interrupted copy preserve partial receipt without complete manifest', async t => {
  const { dir, root, outputDir } = await fixture(t);
  await mkdir(outputDir); await writeFile(path.join(outputDir, 'hold.txt'), 'keep');
  await assert.rejects(writeDelivery({ root, delivery: manifest(), outputDir }), { code: 'EEXIST' });
  assert.equal(await readFile(path.join(outputDir, 'hold.txt'), 'utf8'), 'keep');
  // Deterministic actual write failure: the source fits, but the longer output
  // parent crosses Linux's total path bound only for the final nested artifact.
  const d = manifest(), relative = Array.from({ length: 5 }, (_, i) => `${i}${'x'.repeat(198)}`).join('/') + '/late.txt';
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true }); await writeFile(path.join(root, relative), 'late');
  d.artifacts.push({ id: 'late', path: relative, sha256: hash('late'), mediaType: 'text/plain', role: 'source', editableKind: 'code', dependsOnIds: [] });
  const parent = path.join(dir, ...Array.from({ length: 16 }, (_, i) => `${i}${'p'.repeat(198)}`));
  await mkdir(parent, { recursive: true });
  const partial = path.join(parent, 'partial');
  await assert.rejects(writeDelivery({ root, delivery: d, outputDir: partial }), { code: 'ENAMETOOLONG' });
  const receipt = JSON.parse(await readFile(path.join(partial, 'INCOMPLETE.json'), 'utf8'));
  assert.equal(receipt.status, 'incomplete'); assert.ok(receipt.successfulIds.includes('drawing'));
  assert.ok(!(await readdir(partial)).includes('delivery.json'));
});
