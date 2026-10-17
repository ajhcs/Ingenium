import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { customize, select } from '../src/ui/index.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
async function workspace(t) {
  await mkdir(join(root, 'work'), { recursive: true });
  const directory = await mkdtemp(join(root, 'work/library-cli-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
function run(directory, args, expected = 0) {
  const result = spawnSync(process.execPath, [join(root, 'bin/ingenium.mjs'), ...args], { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, expected, `${result.stdout}\n${result.stderr}`);
  assert.ok(result.stdout.trim(), 'CLI produced no JSON output');
  return JSON.parse(result.stdout);
}
async function snapshot(directory) {
  const names = (await readdir(directory)).sort();
  return Promise.all(names.map(async name => [name, await readFile(join(directory, name))]));
}

test('shape CLI exports exact editable parameters and refuses to replace prior output', async t => {
  const directory = await workspace(t), spec = join(directory, 'shape.json'), output = join(directory, 'shape output');
  const original = JSON.stringify({ id: 'star', starPoints: 7, width: 200, height: 120, fill: '#123456' });
  await writeFile(spec, original);
  run(directory, ['shapes', 'create', spec, output]);
  assert.equal(await readFile(spec, 'utf8'), original);
  const saved = JSON.parse(await readFile(join(output, 'shape.json'), 'utf8'));
  assert.equal(saved.parameters.starPoints, 7);
  assert.equal(saved.parameters.fill, '#123456');
  assert.match(await readFile(join(output, 'shape.svg'), 'utf8'), /viewBox="0 0 200 120"/);
  const before = await snapshot(output);
  await writeFile(spec, JSON.stringify({ id: 'circle' }));
  run(directory, ['shapes', 'create', spec, output], 1);
  assert.deepEqual(await snapshot(output), before);
  assert.equal(await readFile(spec, 'utf8'), JSON.stringify({ id: 'circle' }));
});

test('palette CLI retains selected tokens, modification lineage and rights without overwrite', async t => {
  const directory = await workspace(t), spec = join(directory, 'palette.json'), output = join(directory, 'palette output');
  const original = JSON.stringify({ id: 'radix-blue-light', select: { tokens: ['blue-1', 'blue-12'] }, customize: { id: 'cli-blue', replacements: { 'blue-12': '#001122' } } });
  await writeFile(spec, original);
  run(directory, ['palettes', 'export', spec, output]);
  const palette = JSON.parse(await readFile(join(output, 'palette.json'), 'utf8'));
  assert.deepEqual(Object.keys(palette.tokens), ['blue-1', 'blue-12']);
  assert.equal(palette.tokens['blue-12'], '#001122');
  assert.equal(palette.derivation.parentId, 'radix-blue-light');
  assert.equal(palette.license.spdx, 'MIT');
  assert.match(palette.license.text, /Permission is hereby granted/);
  assert.match(await readFile(join(output, 'palette.css'), 'utf8'), /#001122/);
  const before = await snapshot(output);
  run(directory, ['palettes', 'export', spec, output], 1);
  assert.deepEqual(await snapshot(output), before);
  assert.equal(await readFile(spec, 'utf8'), original);
});

test('package-library CLI resolves explicit local sources relative to config, not calling cwd', async t => {
  const directory = await workspace(t), configDir = join(directory, 'configuration'), packageDir = join(configDir, 'source package');
  await mkdir(packageDir, { recursive: true });
  // Original metadata fixture only: no downloaded font or live acquisition claim.
  await writeFile(join(packageDir, 'package.json'), JSON.stringify({ name: '@fontsource/fixture', version: '1.0.0' }));
  await writeFile(join(packageDir, 'metadata.json'), JSON.stringify({ family: 'Synthetic CLI Fixture' }));
  const config = join(configDir, 'library.json');
  await writeFile(config, JSON.stringify({ sources: [{ id: 'fixture', kind: 'font', packageDir: './source package' }] }));
  const result = run(directory, ['library', 'search', config, 'font', 'Synthetic']);
  assert.equal(result.sources[0].state, 'local');
  assert.equal(result.results[0].family, 'Synthetic CLI Fixture');
});

test('UI CLI preserves serialized customized API selection, id shorthand and pinned sources', async t => {
  const supplied = process.env.INGENIUM_UI_PACKAGE_DIR;
  if (!supplied) { t.skip('Set INGENIUM_UI_PACKAGE_DIR to an existing exact Bulma 1.0.4 package; no install or network attempted'); return; }
  const packageDir = resolve(supplied), directory = await workspace(t), configDir = join(directory, 'configuration');
  await mkdir(configDir);
  const config = join(configDir, 'ui.json');
  await writeFile(config, JSON.stringify({ packageDir: relative(dirname(config), packageDir) }));
  const source = customize(select({ id: 'button' }), { label: '<Keep my choice>', hue: 42, radius: 19, size: 'large' });
  const spec = join(directory, 'selection.json'), output = join(directory, 'selected output');
  const original = JSON.stringify(source);
  await writeFile(spec, original);
  assert.equal(run(directory, ['ui', 'discover', config, 'action']).components[0].id, 'button');
  run(directory, ['ui', 'acquire', config, spec, output]);
  assert.deepEqual(JSON.parse(await readFile(join(output, 'source.json'), 'utf8')).controls, source.controls);
  const css = await readFile(join(output, 'custom.css'), 'utf8');
  assert.match(css, /42deg/); assert.match(css, /19px/);
  assert.match(await readFile(join(output, 'component.html'), 'utf8'), /&lt;Keep my choice&gt;/);
  assert.deepEqual(await readFile(join(output, 'upstream.css')), await readFile(join(packageDir, 'css/bulma.min.css')));
  assert.deepEqual(await readFile(join(output, 'LICENSE.bulma.txt')), await readFile(join(packageDir, 'LICENSE')));
  const before = await snapshot(output);
  run(directory, ['ui', 'acquire', config, spec, output], 1);
  assert.deepEqual(await snapshot(output), before);
  assert.equal(await readFile(spec, 'utf8'), original);
  const shorthand = join(directory, 'shorthand.json'), shorthandOutput = join(directory, 'shorthand output');
  await writeFile(shorthand, JSON.stringify({ id: 'button', controls: { hue: 210 } }));
  run(directory, ['ui', 'acquire', config, shorthand, shorthandOutput]);
  assert.equal(JSON.parse(await readFile(join(shorthandOutput, 'source.json'), 'utf8')).controls.hue, 210);
});
