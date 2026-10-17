import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, rm, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));

test('npm-style binary symlink works from another directory and preserves source', async t => {
  await mkdir(resolve(root, 'work'), { recursive: true });
  const dir = await mkdtemp(resolve(root, 'work/cli-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const binary = join(dir, 'ingenium');
  await symlink(resolve(root, 'bin/ingenium.mjs'), binary);
  const run = args => spawnSync(process.execPath, [binary, ...args], { cwd: dir, encoding: 'utf8' });
  const record = run(['check', resolve(root, 'examples/records/poster.json')]);
  assert.equal(record.status, 0, record.stderr);
  assert.equal(JSON.parse(record.stdout).valid, true);
  const unknown = run(['deploy']);
  assert.equal(unknown.status, 2);
  assert.match(JSON.parse(unknown.stdout).error, /Usage/);
  const capability = run(['capabilities']);
  assert.equal(capability.status, 0, capability.stderr);
  const status = JSON.parse(capability.stdout).sharp.status;
  assert.ok(['present', 'absent', 'errored'].includes(status));
  if (status === 'present') {
    const source = resolve(root, 'examples/svg/clipped-orbit.svg');
    const before = await readFile(source);
    const output = join(dir, 'preview.png');
    const rendered = run(['render', source, output]);
    assert.equal(rendered.status, 0, rendered.stdout);
    assert.equal(JSON.parse(rendered.stdout).width, 320);
    assert.deepEqual(await readFile(source), before);
    const collision = run(['render', source, output]);
    assert.equal(collision.status, 1);
    assert.match(JSON.parse(collision.stdout).error, /already exists/);
  }
});
