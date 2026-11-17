import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, mkdir, mkdtemp, writeFile, rm, symlink, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inventory, prepareCase, validateManifest, main, runCase } from '../tools/run-behavioral-evaluation.mjs';
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
  assert.equal(manifest.cases.length, 13);
  for (const id of ['open-commission', 'explore-commission', 'ordinary-overview']) {
    assert.ok(manifest.cases.some(item => item.id === id));
  }
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
  assert.deepEqual(result.receipt.settings, { skillCue: 'named', reasoningEffort: 'low' });
  assert.match(result.prompt, /^Use the project-local \$ingenium skill/);
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
  await assert.rejects(main([...args, '--skill-cue', 'sometimes']), /--skill-cue/);
  await assert.rejects(main([...args, '--reasoning-effort', 'two words']), /--reasoning-effort/);
  const results = await main([...args, '--skill-cue', 'none', '--reasoning-effort', 'client-default']);
  assert.equal(results[0].status, 'not-run');
  assert.equal(results.length, 1);
  assert.deepEqual(results[0].settings, { skillCue: 'none', reasoningEffort: 'client-default' });
  const prompt = await readFile(path.join(output, 'run-1/producer-prompt.txt'), 'utf8');
  assert.doesNotMatch(prompt, /ingenium|skill/i);
  assert.ok(prompt.includes(manifest.cases.find(item => item.id === 'minimal-brief').task));
  assert.equal(await readFile(path.join(output, 'run-1/project/.agents/skills/ingenium/SKILL.md'), 'utf8'), await readFile(path.join(skillDir, 'SKILL.md'), 'utf8'));
  await assert.rejects(main(args), /EEXIST/);
});

test('client receives the selected reasoning override and sandbox, with reproducible defaults', async t => {
  const dir = await fixture(t), skillDir = path.join(dir, 'candidate'), client = path.join(dir, 'fake-client');
  await mkdir(skillDir);
  await writeFile(path.join(skillDir, 'SKILL.md'), 'Synthetic candidate');
  await writeFile(client, '#!/usr/bin/env node\nif (process.argv.includes("--version")) console.log("fake 1"); else console.log(JSON.stringify(process.argv.slice(2)));\n');
  await chmod(client, 0o755);
  const base = { manifest, id: 'minimal-brief', skillDir, client, model: 'synthetic' };
  await assert.rejects(runCase({ ...base, sandbox: 'unsafe', outputDir: path.join(dir, 'invalid') }), /Sandbox/);
  for (const [name, sandbox, reasoningEffort] of [
    ['default', undefined, undefined],
    ['explicit', 'danger-full-access', 'high'],
    ['client', undefined, 'client-default'],
  ]) {
    const outputDir = path.join(dir, name);
    const result = await runCase({ ...base, sandbox, reasoningEffort, outputDir });
    assert.equal(result.environment.sandbox, sandbox || 'workspace-write');
    const invocation = JSON.parse(await readFile(path.join(outputDir, 'client-events.jsonl'), 'utf8')).slice(0, -1);
    assert.deepEqual(invocation, result.environment.invocation);
    assert.equal(invocation[invocation.indexOf('-s') + 1], sandbox || 'workspace-write');
    assert.equal(result.settings.reasoningEffort, reasoningEffort ?? 'low');
    if (reasoningEffort === 'client-default') {
      assert.equal(invocation.includes('-c'), false);
      assert.ok(!invocation.some(arg => arg.startsWith('model_reasoning_effort=')));
    } else {
      assert.ok(invocation.includes('-c'));
      assert.equal(invocation[invocation.indexOf('-c') + 1], `model_reasoning_effort="${reasoningEffort ?? 'low'}"`);
    }
    assert.equal(result.status, 'observed-needs-review');
  }
});

test('a rejected model request fails the CLI and retains only the evidence actually produced', async t => {
  const dir = await fixture(t);
  const client = path.join(dir, 'rejecting-client');
  await writeFile(client, '#!/usr/bin/env node\nif (process.argv.includes("--version")) console.log("fixture 1"); else { console.error("Unknown fixture model"); process.exitCode = 1; }\n', { mode: 0o755 });
  const output = path.join(dir, 'observations');
  const run = spawnSync(process.execPath, [
    path.join(root, 'tools/run-behavioral-evaluation.mjs'), '--case', 'minimal-brief',
    '--skill', path.join(root, 'skills/ingenium'), '--output', output,
    '--repeat', '1', '--run', '--client', client, '--model', 'unavailable-fixture',
  ], { encoding: 'utf8' });
  assert.equal(run.status, 1, run.stderr);
  assert.equal(JSON.parse(run.stdout)[0].status, 'client-error');
  const runDir = path.join(output, 'run-1');
  const receipt = JSON.parse(await readFile(path.join(runDir, 'result.json'), 'utf8'));
  assert.deepEqual(receipt.evidenceFiles, ['producer-prompt.txt', 'client-events.jsonl', 'client-stderr.txt', 'project/']);
  assert.match(await readFile(path.join(runDir, 'client-stderr.txt'), 'utf8'), /Unknown fixture model/);
});
