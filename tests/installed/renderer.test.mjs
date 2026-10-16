import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Opt-in integration fixture: an npm-installed Ingenium consumer and a separately
// installed renderer, prepared with the documented commands. No installs here.
const consumer = process.env.INGENIUM_TEST_CONSUMER_DIR;
const renderer = process.env.INGENIUM_TEST_RENDERER_DIR;
const digest = data => createHash('sha256').update(data).digest('hex');

test('fresh installed consumer uses its chosen renderer and remains useful without it', async t => {
  assert.ok(consumer && renderer, 'Set INGENIUM_TEST_CONSUMER_DIR and INGENIUM_TEST_RENDERER_DIR to the prepared fixture');
  const root = resolve(consumer);
  const installed = join(root, 'node_modules/@ajhcs/ingenium');
  const runDir = await mkdtemp(join(root, 'render run-'));
  t.after(() => rm(runDir, { recursive: true, force: true }));
  const binary = join(root, 'node_modules/.bin/ingenium');
  const run = args => {
    const result = spawnSync(process.execPath, [binary, ...args], { cwd: runDir, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    return { status: result.status, value: JSON.parse(result.stdout), stderr: result.stderr };
  };
  const source = join(installed, 'examples/svg/clipped-orbit.svg');
  const before = await readFile(source);
  const absentDir = join(runDir, 'empty renderer');
  await mkdir(absentDir);
  const absent = run(['capabilities', '--renderer-dir', absentDir]);
  assert.equal(absent.status, 0);
  assert.equal(absent.value.sharp.status, 'absent');
  assert.equal(absent.value.sharp.setup.package, 'sharp@0.35.4');
  assert.match(absent.value.sharp.setup.install, /--prefix.*--include=optional.*--ignore-scripts/);
  const refused = run(['render', source, join(runDir, 'missing.png'), '--renderer-dir', absentDir]);
  assert.equal(refused.status, 1);
  assert.equal(refused.value.code, 'INGENIUM_RENDERER_ABSENT');
  assert.ok(refused.value.setup.documentation);
  assert.deepEqual(await readdir(absentDir), []);
  assert.equal(run(['check', join(installed, 'examples/records/poster.json')]).value.valid, true);

  const present = run(['capabilities', '--renderer-dir', resolve(renderer)]);
  assert.equal(present.value.sharp.status, 'present', JSON.stringify(present));
  assert.equal(present.value.sharp.version, '0.35.4');
  const output = join(runDir, 'rendered.png');
  const rendered = run(['render', source, output, '--renderer-dir', resolve(renderer)]);
  assert.equal(rendered.status, 0, JSON.stringify(rendered));
  assert.equal(rendered.value.sourceHash, digest(before));
  assert.equal(rendered.value.outputHash, digest(await readFile(output)));
  assert.equal(rendered.value.width, 320);
  assert.equal(rendered.value.height, 240);
  assert.deepEqual(await readFile(source), before);
  const png = await readFile(output);
  assert.equal(run(['render', source, output, '--renderer-dir', resolve(renderer)]).status, 1);
  assert.deepEqual(await readFile(output), png);

  const broken = join(runDir, 'broken renderer');
  await mkdir(join(broken, 'node_modules/sharp'), { recursive: true });
  await writeFile(join(broken, 'node_modules/sharp/package.json'), '{"main":"index.cjs"}');
  await writeFile(join(broken, 'node_modules/sharp/index.cjs'), 'module.exports = {};');
  const incompatible = run(['capabilities', '--renderer-dir', broken]);
  assert.equal(incompatible.value.sharp.status, 'errored');
  assert.match(incompatible.value.sharp.reason, /supported Sharp API/);
  const brokenExport = run(['render', source, join(runDir, 'broken.png'), '--renderer-dir', broken]);
  assert.equal(brokenExport.status, 1);
  assert.equal(brokenExport.value.code, 'INGENIUM_RENDERER_INCOMPATIBLE');
  assert.deepEqual(await readFile(source), before);
});
