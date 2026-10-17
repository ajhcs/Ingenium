import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { discoverCapabilities, exportSvg } from '../src/svg/index.js';
import { main } from '../bin/ingenium.mjs';

async function workspace(t) {
  await mkdir('work', { recursive: true });
  const dir = await mkdtemp(resolve('work/renderer-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('explicit empty renderer boundary never falls back and discovery performs no setup', async t => {
  const dir = await workspace(t);
  const result = await discoverCapabilities({ rendererDir: dir });
  assert.equal(result.sharp.status, 'absent');
  assert.equal(result.sharp.setup.package, 'sharp@0.35.4');
  assert.match(result.sharp.setup.install, /--prefix/);
  assert.match(result.sharp.setup.next, /--renderer-dir/);
  assert.deepEqual(await readdir(dir), []);
  const sourcePath = join(dir, 'source.svg');
  const outputPath = join(dir, 'preview.png');
  const source = '<svg width="3" height="2"><rect width="3" height="2" fill="red"/></svg>';
  await writeFile(sourcePath, source);
  const output = [];
  assert.equal(await main(['render', sourcePath, outputPath, '--renderer-dir', dir], value => output.push(value)), 1);
  assert.equal(output[0].code, 'INGENIUM_RENDERER_ABSENT');
  assert.equal(output[0].setup.package, 'sharp@0.35.4');
  assert.equal(await readFile(sourcePath, 'utf8'), source);
  assert.deepEqual((await readdir(dir)).sort(), ['source.svg']);
});

test('incompatible modules and missing native/transitive dependencies are errored with setup help', async t => {
  const dir = await workspace(t);
  const moduleDir = join(dir, 'node_modules/sharp');
  await mkdir(moduleDir, { recursive: true });
  await writeFile(join(moduleDir, 'package.json'), '{"main":"index.cjs"}');
  await writeFile(join(moduleDir, 'index.cjs'), 'module.exports = {};');
  const incompatible = await discoverCapabilities({ rendererDir: dir });
  assert.equal(incompatible.sharp.status, 'errored');
  assert.match(incompatible.sharp.reason, /supported Sharp API/);
  assert.ok(incompatible.sharp.setup);
  const brokenDir = await workspace(t);
  await mkdir(join(brokenDir, 'node_modules/sharp'), { recursive: true });
  await writeFile(join(brokenDir, 'node_modules/sharp/package.json'), '{"main":"index.cjs"}');
  await writeFile(join(brokenDir, 'node_modules/sharp/index.cjs'), 'require("@ingenium/missing-native-fixture");');
  const broken = await discoverCapabilities({ rendererDir: brokenDir });
  assert.equal(broken.sharp.status, 'errored');
  assert.match(broken.sharp.reason, /Node\/platform.*optional binary/);
  assert.ok(broken.sharp.setup);
});

test('CLI capability selector is portable, and ambiguous selectors refuse without work', async t => {
  const dir = await workspace(t);
  const result = [];
  assert.equal(await main(['capabilities', '--renderer-dir', dir], value => result.push(value)), 0);
  assert.equal(result[0].sharp.status, 'absent');
  for (const args of [['capabilities', '--renderer-dir'], ['capabilities', '--renderer-dir', dir, '--sharp-module', 'sharp']]) {
    const output = [];
    assert.equal(await main(args, value => output.push(value)), 2);
    assert.match(output[0].error, /Usage/);
  }
  assert.equal((await discoverCapabilities({ rendererDir: dir, sharpModule: 'sharp' })).sharp.status, 'errored');
  const sourcePath = join(dir, 'source.svg');
  await writeFile(sourcePath, '<svg width="1" height="1"/>');
  await assert.rejects(exportSvg({ sourcePath, outputPath: join(dir, 'preview.png'), rendererDir: dir, sharpModule: 'sharp' }), /either/);
});
