import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { exportStudySvg } from '../tools/export-study-svg.mjs';
import { studySelections, developmentStudyIdentity } from '../tools/build-study-bundles.mjs';

const selectors = { playwrightModule: process.env.INGENIUM_STUDY_PLAYWRIGHT, executablePath: process.env.INGENIUM_STUDY_CHROMIUM };
const renderAvailable = Boolean(selectors.playwrightModule && selectors.executablePath);
const fixture = body => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">${body}</svg>`;
async function scratch(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ingenium-study-export-')); t.after(() => fs.rm(dir, { recursive: true, force: true })); return dir; }
async function sourceAt(dir, svg, name = 'source.svg') { const file = path.join(dir, name); await fs.writeFile(file, svg); return file; }

// Decode small Chromium RGBA PNG fixtures without another optional dependency.
function pixels(png) {
  let offset = 8, width, height, type, parts = [];
  while (offset < png.length) {
    const n = png.readUInt32BE(offset), kind = png.toString('ascii', offset + 4, offset + 8), data = png.subarray(offset + 8, offset + 8 + n); offset += n + 12;
    if (kind === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); type = data[9]; }
    if (kind === 'IDAT') parts.push(data);
  }
  assert.ok(type === 2 || type === 6); const channels = type === 6 ? 4 : 3, stride = width * channels;
  const raw = inflateSync(Buffer.concat(parts)), decoded = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? decoded[y * stride + x - channels] : 0, b = y ? decoded[(y - 1) * stride + x] : 0, c = y && x >= channels ? decoded[(y - 1) * stride + x - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predictor = [0, a, b, Math.floor((a + b) / 2), pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      assert.notEqual(predictor, undefined); decoded[y * stride + x] = (raw[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  return (x, y) => [...decoded.subarray(y * stride + x * channels, y * stride + x * channels + 3)];
}

test('trusted acknowledgement and explicit existing selectors are required before output', async t => {
  const dir = await scratch(t), sourcePath = await sourceAt(dir, fixture('<rect width="24" height="24"/>')), outputDir = path.join(dir, 'out');
  await assert.rejects(exportStudySvg({ sourcePath, outputDir, ...selectors }), /trustedSource/);
  await assert.rejects(exportStudySvg({ sourcePath, outputDir, trustedSource: true }), /playwrightModule/);
  await assert.rejects(fs.access(outputDir));
});

test('active, external and missing local dependencies refuse before output', async t => {
  const dir = await scratch(t);
  for (const [i, body] of ['<script/>', '<foreignObject/>', '<image href="https://example.invalid/a.png"/>', '<style>@import "https://example.invalid/a.css";</style>', '<rect style="fill:url(https://example.invalid/a.svg)"/>', '<image href="missing.png"/>'].entries()) {
    const sourcePath = await sourceAt(dir, fixture(body), `bad-${i}.svg`), outputDir = path.join(dir, `bad-${i}`);
    await assert.rejects(exportStudySvg({ sourcePath, outputDir, trustedSource: true, ...selectors, playwrightModule: selectors.playwrightModule ?? '/missing', executablePath: selectors.executablePath ?? '/missing', assetRoot: dir }));
    await assert.rejects(fs.access(outputDir));
  }
  const image = path.join(dir, 'image.png'); await fs.symlink('/etc/hostname', image);
  const sourcePath = await sourceAt(dir, fixture('<image href="image.png"/>'));
  await assert.rejects(exportStudySvg({ sourcePath, outputDir: path.join(dir, 'symlink'), trustedSource: true, ...selectors, playwrightModule: selectors.playwrightModule ?? '/missing', executablePath: selectors.executablePath ?? '/missing', assetRoot: dir }), /symlink/);
});

test('styles, filter and pattern produce the expected actual image pixels; prior output refuses', { skip: !renderAvailable }, async t => {
  const dir = await scratch(t);
  const cases = [
    { body: '<style>.ink{fill:rgb(255,0,0)}</style><rect class="ink" width="24" height="24"/>', expected: [[2,2,[255,0,0]]] },
    { body: '<defs><filter id="f" x="0" y="0" width="100%" height="100%"><feFlood flood-color="#00ff00"/></filter></defs><rect width="24" height="24" filter="url(#f)"/>', expected: [[12,12,[0,255,0]]] },
    { body: '<defs><pattern id="p" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="red"/><rect width="6" height="12" fill="blue"/></pattern></defs><rect width="24" height="24" fill="url(#p)"/>', expected: [[2,2,[0,0,255]],[8,2,[255,0,0]],[14,2,[0,0,255]]] },
  ];
  for (const [i, item] of cases.entries()) {
    const svg = fixture(item.body), sourcePath = await sourceAt(dir, svg, `source-${i}.svg`), outputDir = path.join(dir, `out-${i}`);
    const result = await exportStudySvg({ ...selectors, sourcePath, outputDir, trustedSource: true });
    assert.equal(result.status, 'pass'); assert.equal(result.sourcePreserved, true); assert.equal(result.renderer.chromiumSandbox, true); assert.deepEqual(result.isolation.blockedRequests, []);
    assert.equal(await fs.readFile(sourcePath, 'utf8'), svg);
    const get = pixels(await fs.readFile(path.join(outputDir, 'export.png')));
    for (const [x,y,expected] of item.expected) assert.deepEqual(get(x,y), expected);
    await assert.rejects(exportStudySvg({ ...selectors, sourcePath, outputDir, trustedSource: true }), /EEXIST/);
  }
});

test('truncated local and embedded raster payloads refuse with failed receipts and no completed image', { skip: !renderAvailable }, async t => {
  const dir = await scratch(t), truncated = Buffer.from([137,80,78,71,13,10,26,10]);
  await fs.writeFile(path.join(dir, 'truncated.png'), truncated);
  const cases = [
    '<image width="24" height="24" href="truncated.png"/>',
    `<image width="24" height="24" href="data:image/png;base64,${truncated.toString('base64')}"/>`,
    `<defs><filter id="bad"><feImage href="data:image/png;base64,${truncated.toString('base64')}"/></filter></defs><rect width="24" height="24" filter="url(#bad)"/>`,
  ];
  for (const [i, body] of cases.entries()) {
    const svg = fixture(body), sourcePath = await sourceAt(dir, svg, `truncated-${i}.svg`), outputDir = path.join(dir, `truncated-out-${i}`);
    await assert.rejects(exportStudySvg({ ...selectors, sourcePath, outputDir, trustedSource: true, assetRoot: dir }), /Raster image decode failed/);
    const receipt = JSON.parse(await fs.readFile(path.join(outputDir, 'export.json')));
    assert.equal(receipt.status, 'error'); assert.equal(receipt.output, undefined);
    await assert.rejects(fs.access(path.join(outputDir, 'export.png')));
    assert.equal(await fs.readFile(sourcePath, 'utf8'), svg);
    assert.deepEqual(await fs.readFile(path.join(dir, 'truncated.png')), truncated);
  }
});

test('embedded authored font changes actual image glyphs relative to a missing face', { skip: !renderAvailable }, async t => {
  const dir = await scratch(t);
  const authored = await fs.readFile(new URL('../examples/process/human-systems-physiology/source/final-01.svg', import.meta.url), 'utf8');
  const font = authored.match(/@font-face\s*\{[^}]+}/)[0];
  const svg = style => `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><style>${style}</style><rect width="240" height="80" fill="white"/><text x="3" y="62" style="font-family:'Archivo Black',serif;font-size:54px">HUMAN</text></svg>`;
  const outputs = [];
  for (const [i, style] of [font, ''].entries()) {
    const sourcePath = await sourceAt(dir, svg(style), `font-${i}.svg`), outputDir = path.join(dir, `font-out-${i}`);
    const result = await exportStudySvg({ ...selectors, sourcePath, outputDir, trustedSource: true });
    outputs.push(result.output.sha256);
  }
  assert.notEqual(outputs[0], outputs[1], 'embedded face must affect rendered glyph pixels');
});

test('a broken selected executable leaves an explicit failed receipt and no completed PNG', { skip: !renderAvailable }, async t => {
  const dir = await scratch(t), sourcePath = await sourceAt(dir, fixture('<rect width="24" height="24"/>')), outputDir = path.join(dir, 'failure');
  await assert.rejects(exportStudySvg({ ...selectors, executablePath: '/usr/bin/false', sourcePath, outputDir, trustedSource: true }));
  assert.equal(JSON.parse(await fs.readFile(path.join(outputDir, 'export.json'))).status, 'error');
  await assert.rejects(fs.access(path.join(outputDir, 'export.png')));
});

test('all thirteen process selections deliver standalone exporter and exact final commands; source identity is scoped', async () => {
  const selections = await studySelections(), processSelections = selections.filter(s => s.openingFile.startsWith('examples/process/'));
  assert.equal(processSelections.length, 13); let finals = 0;
  for (const selection of processSelections) {
    for (const required of ['tools/export-study-svg.mjs','docs/study-export.md']) assert.ok(selection.files.some(f => f.path === required));
    const opening = selection.generatedFiles.find(f => f.path === 'OPENING.md').text;
    const sources = selection.files.filter(f => /\/source\/final-\d+\.svg$/.test(f.path)); finals += sources.length;
    for (const file of sources) assert.ok(opening.includes(file.path + ' export-final-'));
    const identity = await developmentStudyIdentity(selection);
    assert.equal(identity.prepared, false); assert.equal(identity.scope, 'source-snapshot'); assert.equal(identity.delivery, 'development');
    assert.match(identity.selection.sha256, /^[a-f0-9]{64}$/); assert.ok(identity.source.headTree); assert.equal(identity.selection.members, selection.files.length + selection.generatedFiles.length);
  }
  assert.equal(finals, 16);
});
