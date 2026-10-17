import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as palettes from '../src/palettes/index.mjs';

const { discoverPalettes, inspectPalette, selectPalette, customizePalette, generatePalette, paletteContrast, contrastCandidates, exportPalette } = palettes;
test('all documented exports are actual callable exports', () => {
  assert.deepEqual(Object.keys(palettes).sort(), ['contrastCandidates', 'customizePalette', 'discoverPalettes', 'exportPalette', 'generatePalette', 'inspectPalette', 'paletteContrast', 'selectPalette']);
  assert(Object.values(palettes).every(value => typeof value === 'function'));
});
test('bounded discovery is local, filtered, defensive and honest about unknown scales', () => {
  assert.equal(discoverPalettes().length, 16);
  assert.deepEqual(discoverPalettes({ query: 'BLUE', mode: 'dark' }).map(p => p.id), ['radix-blue-dark']);
  assert(discoverPalettes().every(p => p.availability === 'local' && p.version === '3.0.0'));
  const list = discoverPalettes(); list[0].id = 'changed';
  assert.equal(discoverPalettes()[0].id, 'radix-blue-light');
  assert.throws(() => inspectPalette('radix-gold-light'), /separate acquisition/);
  assert.throws(() => discoverPalettes({ mode: 'sepia' }));
});
test('every source token is exact opaque sRGB from selected package CSS, with byte hashes and MIT retained', () => {
  for (const entry of discoverPalettes()) {
    const palette = inspectPalette(entry.id);
    const original = readFileSync(new URL(`../src/palettes/source/${entry.file}`, import.meta.url));
    assert.equal(palette.provenance.selectedFileSha256, createHash('sha256').update(original).digest('hex'));
    const exact = Object.fromEntries([...original.toString().matchAll(/--([a-z]+-\d+): (#[0-9a-f]{6});/g)].map(match => [match[1], match[2]]));
    assert.deepEqual(palette.tokens, exact);assert.equal(Object.keys(exact).length, 12);
    assert(original.toString().includes('color(display-p3'));
    assert.equal(palette.license.text, readFileSync(new URL('../src/palettes/source/LICENSE', import.meta.url), 'utf8'));
    assert.equal(palette.provenance.integrityVerified, true);
    assert.equal(palette.kind, 'source');assert.equal(palette.license.spdx, 'MIT');
  }
  assert.equal(inspectPalette('radix-blue-light').tokens['blue-9'], '#0090ff');
  assert.equal(inspectPalette('radix-blue-dark').tokens['blue-1'], '#0d1520');
});
test('selection and derivatives preserve originals, upstream provenance and license', () => {
  const original = selectPalette('radix-blue-light', { tokens: ['blue-1', 'blue-9', 'blue-12'] });
  const snapshot = structuredClone(original);
  const derivative = customizePalette(original, { id: 'studio-blue', replacements: { 'blue-9': '#006c70' } });
  assert.deepEqual(original, snapshot);
  assert.equal(derivative.kind, 'derived');assert.equal(derivative.tokens['blue-9'], '#006c70');
  assert.equal(derivative.derivation.parentId, original.id);
  assert.deepEqual(derivative.provenance, original.provenance);assert.deepEqual(derivative.license, original.license);
  derivative.provenance.files[0].sha256 = 'changed';
  assert.notEqual(original.provenance.files[0].sha256, 'changed');
  assert.equal(inspectPalette('radix-blue-light').tokens['blue-9'], '#0090ff');
  assert.throws(() => customizePalette(original, { id: original.id, replacements: { 'blue-9': '#000000' } }));
  assert.throws(() => customizePalette(original, { id: 'new', replacements: { 'blue-9': '#00000080' } }));
  assert.throws(() => customizePalette(original, { id: 'new', replacements: { absent: '#000000' } }));
  assert.throws(() => selectPalette('radix-blue-light', { tokens: ['missing'] }));
});
test('generated anchors and simple interpolation are exact, scoped, bounded and separately attributed', () => {
  const palette = generatePalette({ id: 'synthetic-ramp', from: '#000000', to: '#ffffff', steps: 3 });
  assert.deepEqual(palette.tokens, { 'step-1': '#000000', 'step-2': '#808080', 'step-3': '#ffffff' });
  assert.equal(palette.kind, 'generated');assert.equal(palette.license.spdx, 'NOASSERTION');
  assert.throws(() => generatePalette({ id: 'invalid', from: '#00000080', to: '#ffffff' }));
  assert.throws(() => generatePalette({ id: 'invalid', from: '#000000', to: '#ffffff', steps: 100 }));
});
test('contrast uses final authored text metrics, exact solid pair ratios and explicit token selection', () => {
  const palette = inspectPalette('radix-blue-light');
  assert.equal(paletteContrast(palette, { foreground: 'blue-12', background: 'blue-1', fontSizePx: 16, fontWeight: 400 }).status, 'pass');
  assert.equal(paletteContrast(palette, { foreground: 'blue-2', background: 'blue-1', fontSizePx: 16, fontWeight: 400 }).status, 'fail');
  assert.equal(paletteContrast(palette, { foreground: 'blue-12', background: 'blue-1' }).status, 'error');
  const results = contrastCandidates(palette, { background: 'blue-1', minimum: 4.5 });
  assert(results.length > 0 && results.every(item => item.ratio >= 4.5));
  assert(results[0].ratio >= results.at(-1).ratio);
  assert.throws(() => contrastCandidates(palette, { background: 'absent' }));
});
test('CSS/JSON/SVG exports are usable, retain licenses and never overwrite originals', () => {
  const palette = inspectPalette('radix-blue-light'), before = structuredClone(palette);
  assert.deepEqual(JSON.parse(exportPalette(palette)), palette);
  const css = exportPalette(palette, { format: 'css', prefix: 'studio' });
  assert(css.includes('--studio-blue-9: #0090ff;'));
  assert(css.includes('Copyright (c) 2021 Radix'));
  const svg = exportPalette(palette, { format: 'svg' });
  assert(svg.includes('fill="#0090ff"'));assert(svg.includes('<metadata>'));assert(svg.includes('Copyright (c) 2021 Radix'));
  assert.deepEqual(palette, before);
  assert.throws(() => exportPalette(palette, { prefix: 'x;bad' }));
  assert.throws(() => exportPalette(palette, { format: 'html' }));
});
