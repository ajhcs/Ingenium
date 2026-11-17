import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { main } from '../bin/ingenium.mjs';
async function temporary(t) { await mkdir('work', { recursive: true }); const root = await mkdtemp(resolve('work/cli-resources-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
const capture = async args => { let result; const exit = await main(args, value => { result = value; }); return { result, exit }; };
test('task CLI search/detail are offline; selected editable acquisition retains exact source and full notice', async t => {
  const root = await temporary(t), search = join(root, 'search.json'), detail = join(root, 'detail.json'), request = join(root, 'selected.json'), output = join(root, 'result');
  const originalFetch = globalThis.fetch; globalThis.fetch = () => { throw new Error('No network expected'); }; t.after(() => { globalThis.fetch = originalFetch; });
  const help = await capture(['resources', 'task-acquire', '--help']);
  assert.equal(help.exit, 0);
  assert.match(help.result.outputs[0], /creates NEW_OUTPUT_DIR/i);
  assert.match(help.result.outputs[0], /originalSHA256/);
  assert.deepEqual(await readdir(root), []);
  await writeFile(search, JSON.stringify({ sourceIds: ['cse-selected'], query: 'gear', limit: 2 }));
  const found = await capture(['resources', 'task-search', search]); assert.equal(found.exit, 0, JSON.stringify(found.result)); assert.ok(found.result.entries.length);
  assert.equal(found.result.entries[0].qualificationTier, 'handoff-qualified');
  assert.deepEqual(found.result.entries[0].qualifiedOperations, ['acquire', 'edit', 'export', 'handoff']);
  assert.ok(found.result.entries[0].qualificationEvidenceIds.length > 0);
  await writeFile(detail, JSON.stringify({ providerId: 'cse-selected', assetId: 'mech-gear' }));
  const selected = await capture(['resources', 'task-detail', detail]); assert.equal(selected.exit, 0, JSON.stringify(selected.result));
  const d = selected.result; await writeFile(request, JSON.stringify({ selection: { providerId: d.providerId, assetId: d.assetId, sourceRevision: d.sourceRevision, originalSHA256: d.sourceDetails.selectedSource.sha256 }, selectors: { controls: { scale: 1.25 } }, allowNetwork: true }));
  const acquired = await capture(['resources', 'task-acquire', request, output]); assert.equal(acquired.exit, 0, JSON.stringify(acquired.result)); assert.equal(acquired.result.selection.acquisitionMode, 'bundled'); assert.ok(acquired.result.notices.length); assert.notEqual(acquired.result.selection.originalSHA256, acquired.result.selection.derivedSHA256);
  assert.match(await readFile(join(output, 'original.svg'), 'utf8'), /width="35mm"/); assert.match(await readFile(join(output, 'derived.svg'), 'utf8'), /width="43.75mm"/); assert.match(await readFile(join(output, 'LICENSE.txt'), 'utf8'), /MIT License/);
  const before = await readdir(output); assert.equal((await capture(['resources', 'task-acquire', request, output])).exit, 1); assert.deepEqual(await readdir(output), before);
});
