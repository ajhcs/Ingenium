import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createProjectStore, createContinuation } from '../src/project-state/index.mjs';
import { reviseRecord } from '../src/records/index.mjs';
const base = resolve(fileURLToPath(new URL('../work/implementation/state-fault-tests/', import.meta.url)));
await mkdir(base, { recursive: true });
const schemaURL = new URL('../src/project-state/index.mjs', import.meta.url).href;
const record = JSON.parse(await readFile(new URL('../examples/records/poster.json', import.meta.url)));
const code = expected => error => { assert.equal(error.code, expected, error.message); return true; };
async function setup(t, structured = false) { const root = await mkdtemp(resolve(base, 'case-')); t.after(() => rm(root, { recursive: true, force: true })); const store = createProjectStore({ root }); const state = createContinuation({ projectId: 'fault-project', brief: 'Synthetic persistence fault case.', ...(structured ? { record, versions: [{ id: 'old-direction', name: 'Retained direction', revision: 0, sources: [], previews: [] }] } : {}) }); const first = await store.commit({ expectedHeadHash: null, requestId: 'create', state, change: { kind: 'create', summary: 'Initial durable state.' } }); const input = { expectedHeadHash: first.headHash, requestId: 'edit', state: (await store.read()).state, change: { kind: 'edit', summary: 'Retain next action.' } }; input.state.nextAction = 'Continue after restart.'; return { root, store, first, input }; }

test('faults before publication and HEAD replacement preserve old HEAD and complete recovery diagnostics', async t => {
  for (const stage of ['before-artifact-publication', 'before-commit-publication', 'after-commit-publication', 'before-head-replace']) {
    const fixture = await setup(t); const faulty = createProjectStore({ root: fixture.root }, { fault(point) { if (point === stage) throw Object.assign(Error(`Injected ${stage}`), { code: 'ENOSPC' }); } });
    await assert.rejects(faulty.commit(fixture.input), error => { assert.equal(error.code, 'SPACE_OR_IO'); assert.equal(error.details.lastDurableHead, fixture.first.headHash); assert.ok(error.details.pendingTransaction); assert.ok(error.details.recoveryCommand.includes('--inspect')); return true; });
    assert.equal((await fixture.store.read()).headHash, fixture.first.headHash); const inventory = await fixture.store.recover({ mode: 'inspect' }); assert.ok(inventory.pending.length); assert.equal(inventory.lock.status, 'absent');
    if (['after-commit-publication', 'before-head-replace'].includes(stage)) { assert.equal(inventory.orphans.filter(candidate => candidate.verified).length, 1); await assert.rejects(fixture.store.commit(fixture.input), code('ORPHAN_COMMIT')); assert.equal((await fixture.store.read()).headHash, fixture.first.headHash); }
  }
});

test('lost acknowledgement after HEAD update is resolved by exact request retry without duplicate revision', async t => {
  for (const stage of ['after-head-replace', 'after-head-flush', 'before-acknowledgement']) {
    const fixture = await setup(t); let injected = false; const faulty = createProjectStore({ root: fixture.root }, { fault(point) { if (point === stage && !injected) { injected = true; throw Error('Lost acknowledgement'); } } });
    await assert.rejects(faulty.commit(fixture.input), error => { assert.equal(error.code, 'SPACE_OR_IO'); assert.equal(error.details.headReplaced, true); return true; });
    const saved = await fixture.store.read(); assert.equal(saved.state.revision, 1); const receipt = await fixture.store.commit(fixture.input); assert.equal(receipt.headHash, saved.headHash); assert.equal(receipt.revision, 1); assert.equal((await fixture.store.history()).entries.length, 2);
  }
});

test('unsupported durability and failed retry reflush never report durable Saved', async t => {
  const fixture = await setup(t); const { ProjectStateError } = await import('../src/project-state/index.mjs');
  const unsupported = createProjectStore({ root: fixture.root }, { fault(point) { if (point === 'after-head-replace') throw new ProjectStateError('DURABILITY_UNAVAILABLE', 'Injected unsupported directory fsync.', 'Inspect actual filesystem support.'); } });
  await assert.rejects(unsupported.commit(fixture.input), code('DURABILITY_UNAVAILABLE'));
  const badRetry = createProjectStore({ root: fixture.root }, { fault(point) { if (point === 'before-retry-flush') throw new ProjectStateError('DURABILITY_UNAVAILABLE', 'Retry reflush unavailable.'); } }); await assert.rejects(badRetry.commit(fixture.input), code('DURABILITY_UNAVAILABLE'));
  assert.equal((await fixture.store.commit(fixture.input)).durable, true);
});

test('actual killed local process leaves abandoned lock and explicit unchanged-token release retains metadata receipt', async t => {
  const fixture = await setup(t);
  const script = `import {createProjectStore} from ${JSON.stringify(schemaURL)};const input=JSON.parse(process.argv[2]);const store=createProjectStore({root:process.argv[1]},{fault(stage){if(stage==='after-commit-publication')process.kill(process.pid,'SIGKILL')}});await store.commit(input);`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script, fixture.root, JSON.stringify(fixture.input)], { encoding: 'utf8' }); assert.equal(child.signal, 'SIGKILL', child.stderr);
  let inventory = await fixture.store.recover({ mode: 'inspect' }); assert.equal(inventory.head.commitHash, fixture.first.headHash); assert.equal(inventory.lock.status, 'abandoned'); assert.equal(inventory.orphans.filter(value => value.verified).length, 1);
  const token = inventory.lock.token; await assert.rejects(fixture.store.recover({ mode: 'release-lock', expectedLockToken: 'other-token', reason: 'Wrong observed token.' }), code('LOCK_CHANGED'));
  assert.deepEqual(await fixture.store.recover({ mode: 'release-lock', expectedLockToken: token, reason: 'Killed synthetic writer process is absent.' }), { released: true });
  inventory = await fixture.store.recover({ mode: 'inspect' }); assert.equal(inventory.lock.status, 'absent'); const receipts = await readdir(resolve(fixture.root, '.ingenium/recovery')); assert.equal(receipts.filter(name => name.endsWith('.receipt.json')).length, 1); const receipt = JSON.parse(await readFile(resolve(fixture.root, '.ingenium/recovery', receipts.find(name => name.endsWith('.receipt.json'))))); assert.equal(receipt.token, token); assert.equal(receipt.metadata.token, token);
});

test('live and unknown locks refuse release; age is not permission', async t => {
  const fixture = await setup(t); let checked = false;
  const active = createProjectStore({ root: fixture.root }, { async fault(stage) { if (stage !== 'before-head-replace') return; const inventory = await fixture.store.recover({ mode: 'inspect' }); assert.equal(inventory.lock.status, 'live'); await assert.rejects(fixture.store.recover({ mode: 'release-lock', expectedLockToken: inventory.lock.token, reason: 'Must refuse live process.' }), code('LOCKED')); checked = true; } });
  await active.commit(fixture.input); assert.equal(checked, true);
  await writeFile(resolve(fixture.root, '.ingenium/writer.lock'), JSON.stringify({ schema: 'ingenium-lock/1', token: 'unknown', host: 'other-host', bootId: 'old', pid: 1, processStart: '1' }), { mode: 0o600 });
  assert.equal((await fixture.store.recover({ mode: 'inspect' })).lock.status, 'unknown'); await assert.rejects(fixture.store.recover({ mode: 'release-lock', expectedLockToken: 'unknown', reason: 'Must refuse ambiguous owner.' }), code('LOCKED'));
});

test('explicit complete orphan selection appends recovery event and does not silently promote original orphan', async t => {
  const fixture = await setup(t); const failing = createProjectStore({ root: fixture.root }, { fault(stage) { if (stage === 'after-commit-publication') throw Error('Stop before head'); } }); await assert.rejects(failing.commit(fixture.input));
  const inventory = await fixture.store.recover({ mode: 'inspect' }); const orphan = inventory.orphans.find(value => value.verified); const recovered = await fixture.store.recover({ mode: 'select', commitHash: orphan.commitHash, expectedHeadHash: inventory.head.commitHash, expectedHeadFileHash: inventory.head.fileHash, reason: 'Select verified interrupted candidate explicitly.' }); assert.notEqual(recovered.headHash, orphan.commitHash); assert.equal(recovered.revision, 1); const entries = (await fixture.store.history()).entries; assert.equal(entries[0].kind, 'recover'); assert.equal(entries[1].commitHash, fixture.first.headHash);
});

test('healthy-head recovery cannot restore earlier protected choices; ordinary return retains new revision and current choices', async t => {
  const fixture = await setup(t, true); let current = await fixture.store.read(); const decisions = JSON.parse(JSON.stringify(current.state.record.decisions)); decisions[0].status = 'open'; decisions[0].choice = null; const recordChange = { baseRevision: 0, updates: { decisions }, reopen: [{ decisionId: decisions[0].id, reason: 'Reconsider by explicit synthetic instruction.' }] }; current.state.record = reviseRecord(current.state.record, recordChange);
  await fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'reopen', state: current.state, change: { kind: 'reopen', summary: 'Reopen choice.', reason: 'Synthetic instruction.', recordChange } });
  const inventory = await fixture.store.recover({ mode: 'inspect' }); await assert.rejects(fixture.store.recover({ mode: 'select', commitHash: fixture.first.headHash, expectedHeadHash: inventory.head.commitHash, expectedHeadFileHash: inventory.head.fileHash, reason: 'Try older choice through recovery.' }), code('PROTECTED_RECORD'));
  current = await fixture.store.read(); current.state.versions = [{ id: 'old-direction', name: 'Retained direction', revision: 0, sources: [], previews: [] }, { id: 'returned-direction', name: 'Return as new revision', revision: 2, sources: [], previews: [], basedOnVersionId: 'old-direction' }];
  const returned = await fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'return', state: current.state, change: { kind: 'return', summary: 'Return presentation only.', reason: 'Synthetic instruction to reuse old presentation.', basedOnVersionId: 'old-direction' } }); assert.equal(returned.revision, 2); assert.equal((await fixture.store.read()).state.record.decisions[0].status, 'open');
});

test('corrupt raw HEAD requires exact file identity and explicit disaster recovery with truthful unknown-newer-state event', async t => {
  const fixture = await setup(t, true); await fixture.store.commit(fixture.input); await writeFile(resolve(fixture.root, '.ingenium/HEAD.json'), '{damaged', { mode: 0o600 });
  await assert.rejects(fixture.store.read(), code('CORRUPT_STATE')); const inventory = await fixture.store.recover({ mode: 'inspect' }); assert.equal(inventory.head.status, 'corrupt'); assert.equal(inventory.head.commitHash, null); assert.ok(inventory.head.fileHash);
  await assert.rejects(fixture.store.recover({ mode: 'select', commitHash: fixture.first.headHash, expectedHeadHash: null, expectedHeadFileHash: 'a'.repeat(64), reason: 'Wrong observed bytes.' }), code('STALE_HEAD'));
  const saved = await fixture.store.recover({ mode: 'select', commitHash: fixture.first.headHash, expectedHeadHash: null, expectedHeadFileHash: inventory.head.fileHash, reason: 'Restore verified earlier durable state; newer choices unknown.' });
  const recovered = await fixture.store.read(); assert.equal(recovered.state.record.decisions[0].choice, record.decisions[0].choice); const event = JSON.parse(await readFile(resolve(fixture.root, '.ingenium/commits', saved.headHash, 'event.json'))); assert.equal(event.disasterRecovery, true); assert.equal(event.recoveredFrom, fixture.first.headHash); assert.match(event.change.summary, /may be unknown/);
});

test('actual killed writer after HEAD publication is recognized as saved after lock release and retry', async t => {
  const fixture = await setup(t); const script = `import{createProjectStore}from ${JSON.stringify(schemaURL)};await createProjectStore({root:process.argv[1]},{fault(stage){if(stage==='after-head-flush')process.kill(process.pid,'SIGKILL')}}).commit(JSON.parse(process.argv[2]));`; const child = spawnSync(process.execPath, ['--input-type=module', '-e', script, fixture.root, JSON.stringify(fixture.input)], { encoding: 'utf8' }); assert.equal(child.signal, 'SIGKILL', child.stderr); const inventory = await fixture.store.recover({ mode: 'inspect' }); assert.equal(inventory.head.status, 'valid'); assert.notEqual(inventory.head.commitHash, fixture.first.headHash); await fixture.store.recover({ mode: 'release-lock', expectedLockToken: inventory.lock.token, reason: 'Killed writer no longer exists.' }); const receipt = await fixture.store.commit(fixture.input); assert.equal(receipt.headHash, inventory.head.commitHash); assert.equal((await fixture.store.history()).entries.length, 2);
});

async function leaveAbandonedWriter(fixture) {
  const script = `import{createProjectStore}from ${JSON.stringify(schemaURL)};await createProjectStore({root:process.argv[1]},{fault(stage){if(stage==='after-commit-publication')process.kill(process.pid,'SIGKILL')}}).commit(JSON.parse(process.argv[2]));`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script, fixture.root, JSON.stringify(fixture.input)], { encoding: 'utf8' }); assert.equal(child.signal, 'SIGKILL', child.stderr); return (await fixture.store.recover({ mode: 'inspect' })).lock.token;
}

test('two simultaneous abandoned-lock releases cannot remove a subsequently live writer lock', async t => {
  const fixture = await setup(t); const token = await leaveAbandonedWriter(fixture); let enteredResolve, continueResolve; const entered = new Promise(resolve => enteredResolve = resolve); const continuation = new Promise(resolve => continueResolve = resolve);
  const owner = createProjectStore({ root: fixture.root }, { async fault(stage) { if (stage === 'after-release-claim') { enteredResolve(); await continuation; } } });
  const first = owner.recover({ mode: 'release-lock', expectedLockToken: token, reason: 'First serialized recovery.' }); await entered;
  await assert.rejects(fixture.store.recover({ mode: 'release-lock', expectedLockToken: token, reason: 'Concurrent stale recovery.' }), code('LOCKED')); continueResolve(); assert.deepEqual(await first, { released: true });
  const current = await fixture.store.read(); const writer = createProjectStore({ root: fixture.root }, { async fault(stage) { if (stage === 'before-head-replace') { const live = await fixture.store.recover({ mode: 'inspect' }); assert.equal(live.lock.status, 'live'); await assert.rejects(fixture.store.recover({ mode: 'release-lock', expectedLockToken: token, reason: 'Old token must not remove new live writer.' }), code('LOCK_CHANGED')); assert.equal((await fixture.store.recover({ mode: 'inspect' })).lock.token, live.lock.token); } } });
  await writer.commit({ expectedHeadHash: current.headHash, requestId: 'new-live-writer', state: current.state, change: { kind: 'edit', summary: 'A new live writer remains protected.' } });
});

test('crashed recovery claimant is superseded only after positive process-instance absence', async t => {
  const fixture = await setup(t); const token = await leaveAbandonedWriter(fixture);
  const script = `import{createProjectStore}from ${JSON.stringify(schemaURL)};await createProjectStore({root:process.argv[1]},{fault(stage){if(stage==='after-release-claim')process.kill(process.pid,'SIGKILL')}}).recover({mode:'release-lock',expectedLockToken:process.argv[2],reason:'Crash a synthetic release claimant.'});`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script, fixture.root, token], { encoding: 'utf8' }); assert.equal(child.signal, 'SIGKILL', child.stderr); assert.equal((await fixture.store.recover({ mode: 'inspect' })).lock.token, token);
  assert.deepEqual(await fixture.store.recover({ mode: 'release-lock', expectedLockToken: token, reason: 'Dead recovery process instance is absent; advance claim.' }), { released: true });
  const files = await readdir(resolve(fixture.root, '.ingenium/recovery')); assert.equal(files.filter(file => file.endsWith('.claim.json')).length, 2);
});

test('first-save interruption before commit publication retries exact owned initialization without discarding pending files', async t => {
  const root = await mkdtemp(resolve(base, 'first-save-')); t.after(() => rm(root, { recursive: true, force: true }));
  const input = { expectedHeadHash: null, requestId: 'initial-interrupted', state: createContinuation({ projectId: 'initial-interrupted', brief: 'Synthetic first save interrupted before publication.' }), change: { kind: 'create', summary: 'First save.' } };
  const faulty = createProjectStore({ root }, { fault(stage) { if (stage === 'before-commit-publication') throw Object.assign(Error('First-save full disk fault'), { code: 'ENOSPC' }); } }); await assert.rejects(faulty.commit(input), code('SPACE_OR_IO'));
  const store = createProjectStore({ root }); const before = await store.recover({ mode: 'inspect' }); assert.equal(before.head.status, 'missing'); assert.equal(before.orphans.length, 0); assert.ok(before.pending.some(value => value.complete));
  await assert.rejects(store.commit({ ...input, requestId: 'different-initial-request' }), code('REQUEST_REPLAY_CONFLICT')); assert.equal((await store.commit(input)).status, 'saved'); const after = await store.recover({ mode: 'inspect' }); assert.ok(after.pending.some(value => before.pending.some(old => old.id === value.id)));
});

test('unknown existing metadata is refused before adding initialization or infrastructure files', async t => {
  const root = await mkdtemp(resolve(base, 'unknown-')); t.after(() => rm(root, { recursive: true, force: true })); await mkdir(resolve(root, '.ingenium'), { mode: 0o700 }); await writeFile(resolve(root, '.ingenium/retained-private-marker'), 'preserve', { mode: 0o600 }); const before = await readdir(resolve(root, '.ingenium'));
  await assert.rejects(createProjectStore({ root }).commit({ expectedHeadHash: null, requestId: 'unknown', state: createContinuation({ projectId: 'unknown', brief: 'Do not infer ownership.' }), change: { kind: 'create', summary: 'Must refuse unknown metadata.' } }), code('CORRUPT_STATE')); assert.deepEqual(await readdir(resolve(root, '.ingenium')), before);
});

test('injected full-disk failure on second real artifact write retains first file and truthful old-head receipt', async t => {
  const fixture = await setup(t); const { createHash } = await import('node:crypto'); const refs = [];
  for (const name of ['one.txt', 'two.txt']) { const bytes = `Synthetic ${name}\n`; await writeFile(resolve(fixture.root, name), bytes); refs.push({ id: name.split('.')[0], path: name, sha256: createHash('sha256').update(bytes).digest('hex'), mediaType: 'text/plain' }); }
  fixture.input.state.sources = refs; let writes = 0; const faulty = createProjectStore({ root: fixture.root }, { fault(stage) { if (stage === 'before-artifact-write' && ++writes === 2) throw Object.assign(Error('Injected ENOSPC during actual artifact staging'), { code: 'ENOSPC' }); } });
  await assert.rejects(faulty.commit(fixture.input), error => { assert.equal(error.code, 'SPACE_OR_IO'); assert.equal(error.details.stage, 'artifact-write'); assert.deepEqual(error.details.successfulFiles, ['one.txt']); assert.equal(error.details.lastDurableHead, fixture.first.headHash); return true; });
  assert.equal((await fixture.store.read()).headHash, fixture.first.headHash); const inventory = await fixture.store.recover({ mode: 'inspect' }); assert.ok(inventory.pending.some(value => value.stage === 'artifact-staged'));
});
