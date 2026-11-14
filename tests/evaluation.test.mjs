import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, mkdir, mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { inventory, prepareCase, validateManifest, main } from '../tools/run-behavioral-evaluation.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('./fixtures/evaluation/manifest.json', import.meta.url), 'utf8'));
async function fixture(t) {
  const parent = path.join(root, 'work/implementation/evaluations/test-temp');
  await mkdir(parent, { recursive: true });
  const dir = await mkdtemp(path.join(parent, 'harness-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
test('approved behavior manifest retains eight core jobs and realistic content separately', () => {
  assert.deepEqual(validateManifest(manifest), []);
  assert.equal(manifest.cases.length, 10);
  for (const id of ['minimal-brief', 'ambiguous-feedback', 'autonomous-task', 'protected-narrow-edit', 'missing-tools', 'interrupted-export', 'resume', 'explicit-reopen', 'realistic-content']) assert.ok(manifest.cases.some(item => item.id === id));
});
test('manifest refuses ambiguous identities and filesystem traversal before writes', () => {
  const bad = structuredClone(manifest);
  bad.cases.push(structuredClone(bad.cases[0]));
  bad.cases[0].inputs = ['../private.txt'];
  assert.match(validateManifest(bad).join('\n'), /duplicate/);
  assert.match(validateManifest(bad).join('\n'), /unsafe/);
  assert.ok(validateManifest({ schema: 'ingenium-behavioral-cases/1', cases: [null, { id: 'malformed-case', inputs: {}, sourceIds: {} }] }).length > 0);
});
test('prepared prompts omit evaluator answers, capture exact candidate bytes, and remain not-run', async t => {
  const dir = await fixture(t), skillDir = path.join(dir, 'candidate');
  await mkdir(skillDir);
  await writeFile(path.join(skillDir, 'SKILL.md'), '---\nname: ingenium\ndescription: Original harness test\n---\nSynthetic candidate.\n');
  const result = await prepareCase({ manifest, id: 'resume', skillDir, outputDir: path.join(dir, 'run') });
  assert.equal(result.receipt.status, 'not-run');
  assert.equal(result.receipt.judgments.length, 0);
  assert.ok(!result.prompt.includes('Can the next person'));
  assert.ok(result.receipt.preparedInputs.some(item => item.path === 'inputs/continuation.md'));
  assert.equal(result.receipt.releaseIdentity.files[0].sha256, (await inventory(skillDir))[0].sha256);
  await assert.rejects(prepareCase({ manifest, id: 'resume', skillDir, outputDir: path.join(dir, 'run') }), /EEXIST/);
});
test('symlink candidate input is refused rather than silently capturing other files', async t => {
  const dir = await fixture(t), skillDir = path.join(dir, 'candidate');
  await mkdir(skillDir);
  await writeFile(path.join(dir, 'outside.txt'), 'not candidate content');
  await symlink('../outside.txt', path.join(skillDir, 'SKILL.md'));
  await assert.rejects(inventory(skillDir), /Symlink/);
});
test('CLI refuses duplicate flags without launching any client', async () => {
  await assert.rejects(main(['--case', 'resume', '--case', 'resume']), /Invalid option/);
});
test('documented preparation works with a new parent tree and keeps destination exclusive', async t => {
  const dir = await fixture(t), skillDir = path.join(dir, 'candidate');
  await mkdir(skillDir);
  await writeFile(path.join(skillDir, 'SKILL.md'), '---\nname: ingenium\ndescription: Original preparation fixture\n---\nSynthetic candidate.\n');
  const output = path.join(dir, 'new-parent', 'evaluations', 'prepared');
  const args = ['--case', 'minimal-brief', '--repeat', '1', '--skill', skillDir, '--output', output];
  const results = await main(args);
  assert.equal(results[0].status, 'not-run');
  assert.equal(results.length, 1);
  await assert.rejects(main(args), /EEXIST/);
});
