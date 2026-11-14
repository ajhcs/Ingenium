import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { main } from '../bin/ingenium.mjs';
import { createContinuation, createProjectStore } from '../src/project-state/index.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function temporary(t) { await mkdir('work', { recursive: true }); const root = await mkdtemp(resolve('work/cli-project-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
const capture = async args => { let result; const exit = await main(args, value => { result = value; }); return { result, exit }; };

test('project CLI continues read-only; history/diff/open-version use verified retained named versions', async t => {
  const root = await temporary(t), firstSVG = '<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="10">First</text></svg>', secondSVG = firstSVG.replace('First', 'Second');
  const ref = bytes => ({ id: 'graphic', path: 'graphic.svg', sha256: sha(bytes), mediaType: 'image/svg+xml' });
  await writeFile(join(root, 'graphic.svg'), firstSVG);
  const state = createContinuation({ projectId: 'cli-study', brief: 'Original synthetic CLI study', sources: [ref(firstSVG)], versions: [{ id: 'first', name: 'First direction', revision: 0, sources: [ref(firstSVG)], previews: [] }], nextAction: 'Change the title.' });
  const file = join(root, 'continuation.json'); await writeFile(file, JSON.stringify(state));
  const continued = await capture(['project', 'continue', file]); assert.equal(continued.exit, 0, JSON.stringify(continued.result)); assert.equal(continued.result.saved, false); assert.equal(continued.result.openingSources[0].path, 'graphic.svg');
  assert.deepEqual((await readdir(root)).sort(), ['continuation.json', 'graphic.svg']);
  const store = createProjectStore({ root });
  const first = await store.commit({ expectedHeadHash: null, requestId: 'cli-first', state, change: { kind: 'create', summary: 'Create original source' } });
  await writeFile(join(root, 'graphic.svg'), secondSVG);
  const current = await store.read(), next = { ...current.state, sources: [ref(secondSVG)], versions: [...current.state.versions, { id: 'second', name: 'Title revision', revision: 1, sources: [ref(secondSVG)], previews: [], basedOnVersionId: 'first' }] };
  const second = await store.commit({ expectedHeadHash: first.headHash, requestId: 'cli-second', state: next, change: { kind: 'edit', summary: 'Change only source title' } });
  const history = await capture(['project', 'history', root, '--limit', '1']); assert.equal(history.exit, 0); assert.equal(history.result.entries[0].revision, 1); assert.equal(history.result.nextOffset, 1);
  const diff = await capture(['project', 'diff', root, 'first', 'second']); assert.equal(diff.exit, 0, JSON.stringify(diff.result)); assert.ok(diff.result.changes.some(c => c.path === '$.sources[graphic]')); assert.equal(diff.result.behavior.status, 'not-run'); assert.equal(diff.result.text[0].status,'pass'); assert.equal(diff.result.text[0].normalizedEqual,false);
  assert.equal((await capture(['project', 'diff', root, `commit:${first.headHash}`, `commit:${second.headHash}`])).exit, 0);
  const output = join(root, 'old-copy'); const opened = await capture(['project', 'open-version', root, 'first', output]); assert.equal(opened.exit, 0, JSON.stringify(opened.result)); assert.equal(await readFile(join(output, 'graphic.svg'), 'utf8'), firstSVG); assert.ok(opened.result.openingFile);
  const recovered = await capture(['project', 'recover', root, '--inspect']); assert.equal(recovered.exit, 0, JSON.stringify(recovered.result));
  assert.equal((await store.read()).headHash, second.headHash);
  assert.equal((await capture(['project', 'open-version', root, 'first', output])).exit, 1);
});

test('project recover and history reject malformed usage without creating a store', async t => {
  const root = await temporary(t);
  for (const args of [ ['history', root, '--offset', '-1'], ['history', root, '--limit', '0'], ['recover', root], ['recover', root, '--inspect', '--reason', 'x'], ['recover', root, '--select', 'a'.repeat(64), '--reason', 'x'], ['recover', root, '--release-lock', 'token', '--reason', 'x', '--expected-head', 'missing'] ]) {
    const result = await capture(['project', ...args]); assert.equal(result.exit, 2, JSON.stringify(result));
  }
  assert.deepEqual(await readdir(root), []);
});
