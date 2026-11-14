import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, chmod, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createProjectStore, createContinuation, validateProjectState, migrateProjectState, compareProjectVersions } from '../src/project-state/index.mjs';
import { reviseRecord } from '../src/records/index.mjs';
const repository = resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryParent = resolve(repository, 'work/implementation/state-tests');
await mkdir(temporaryParent, { recursive: true });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const copied = value => JSON.parse(JSON.stringify(value));
const fixtureRecord = JSON.parse(await readFile(new URL('../examples/records/poster.json', import.meta.url), 'utf8'));
const source = label => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><image href="image.svg" width="20" height="20"/><text x="10" y="50">${label}</text></svg>`;
const picture = label => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><title>${label}</title><circle r="8" cx="10" cy="10"/></svg>`;
async function setup(t, { record = false } = {}) {
  const root = await mkdtemp(resolve(temporaryParent, 'case-')); t.after(() => rm(root, { recursive: true, force: true }));
  const svg = source('First label'); const image = picture('First image');
  await writeFile(resolve(root, 'drawing.svg'), svg); await writeFile(resolve(root, 'image.svg'), image);
  const refs = [{ id: 'drawing', path: 'drawing.svg', sha256: digest(svg), mediaType: 'image/svg+xml' }, { id: 'image', path: 'image.svg', sha256: digest(image), mediaType: 'image/svg+xml' }];
  const state = createContinuation({ projectId: 'synthetic-project', brief: 'Keep the image and all labels except the requested narrow edit.', sources: refs, versions: [{ id: 'v-first', name: 'First direction', revision: 0, sources: refs, previews: [] }], ...(record ? { record: fixtureRecord } : {}) });
  const store = createProjectStore({ root }); const input = { expectedHeadHash: null, requestId: 'request-first', state, change: { kind: 'create', summary: 'Retain first editable direction.' } };
  return { root, store, state, input, svg, image };
}
const rejectCode = code => error => { assert.equal(error.code, code, error.message); assert.ok(error.nextStep); return true; };
async function edited(fixture, label = 'Second label', requestId = 'request-second') {
  const { state, headHash } = await fixture.store.read(); const svg = source(label); const image = picture(`${label} image`);
  await writeFile(resolve(fixture.root, 'drawing.svg'), svg); await writeFile(resolve(fixture.root, 'image.svg'), image);
  state.sources = state.sources.map(ref => ({ ...ref, path: ref.id === 'drawing' ? 'drawing.svg' : 'image.svg', sha256: digest(ref.id === 'drawing' ? svg : image) }));
  state.versions.push({ id: 'v-second', name: 'Second direction', revision: state.revision + 1, sources: copied(state.sources), previews: [], basedOnVersionId: 'v-first' });
  return { expectedHeadHash: headHash, requestId, state, change: { kind: 'edit', summary: 'Change one label and the synthetic image title.' } };
}

test('pure defaults, detached imports, known migration and unchanged records-v1', () => {
  const state = createContinuation({ projectId: 'simple', brief: 'A quick comparison.' }); assert.deepEqual(state.sources, []); assert.equal(state.nextAction, null); assert.equal(state.revision, 0);
  const withRecord = createContinuation({ projectId: 'recorded', brief: 'Explicit normalization.', record: fixtureRecord }); withRecord.record.evidence[0].statement = 'Detached'; assert.notEqual(fixtureRecord.evidence[0].statement, 'Detached');
  const migrated = migrateProjectState(state); migrated.brief = 'Changed copy'; assert.equal(state.brief, 'A quick comparison.');
  assert.throws(() => migrateProjectState({ ...state, schema: 'ingenium-project/2' }), rejectCode('UNSUPPORTED_VERSION'));
  assert.throws(() => createContinuation(fixtureRecord));
});

test('strict runtime validation refuses future schemas, inspection snapshots, malformed refs, duplicate namespaces and bounds without throwing', () => {
  const state = createContinuation({ projectId: 'strict', brief: 'Synthetic.' });
  const mutations = [value => value.extra = true, value => value.schema = 'ingenium-project/2', value => value.sources = {}, value => value.outputs = 12, value => value.brief = 'x'.repeat(32769), value => value.nextAction = undefined, value => value.sources = [{ id: 'x', path: '../escape.svg', sha256: 'a'.repeat(64), mediaType: 'image/svg+xml' }], value => value.sources = [{ id: 'x', path: 'a.svg', sha256: 'UPPERCASE', mediaType: 'image/svg+xml' }], value => value.versions = [{ id: 'v-a', name: 'A', revision: 0, sources: [], previews: [], basedOnVersionId: 'v-b' }, { id: 'v-b', name: 'B', revision: 0, sources: [], previews: [], basedOnVersionId: 'v-a' }]];
  for (const mutate of mutations) { const value = copied(state); mutate(value); assert.equal(validateProjectState(value).valid, false); }
  const accessor = copied(state); Object.defineProperty(accessor, 'brief', { enumerable: true, get() { throw Error('must not invoke'); } }); assert.equal(validateProjectState(accessor).valid, false);
  const cycle = copied(state); cycle.record = cycle; assert.equal(validateProjectState(cycle).valid, false);
  assert.equal(validateProjectState({ version: 1, kind: 'ingenium-project', route: '/', pages: [] }).valid, false);
  for (const path of ['/absolute.svg', 'a/../b.svg', 'a//b.svg', 'a\\b.svg', '%2e%2e/a.svg', 'C:foo.svg', '//host/path', 'a.svg?x']) { const value = copied(state); value.sources.push({ id: 'a', path, sha256: 'a'.repeat(64), mediaType: 'image/svg+xml' }); assert.equal(validateProjectState(value).valid, false, path); }
});

test('commit publishes immutable complete closure, reads detached values and pages history', async t => {
  const fixture = await setup(t); const receipt = await fixture.store.commit(fixture.input); assert.equal(receipt.status, 'saved'); assert.equal(receipt.durable, true); assert.equal(receipt.revision, 0);
  const result = await fixture.store.read(); assert.match(result.state.sources[0].path, /^\.ingenium\/artifacts\/[a-f0-9]{64}\/drawing.svg$/); result.state.brief = 'Detached'; assert.notEqual((await fixture.store.read()).state.brief, 'Detached');
  const manifest = JSON.parse(await readFile(resolve(fixture.root, '.ingenium/commits', receipt.headHash, 'manifest.json'))); assert.equal(manifest.artifactTreeHashes.length, 1);
  const entries = await fixture.store.history({ limit: 1 }); assert.equal(entries.entries[0].kind, 'create'); assert.equal(entries.nextOffset, null);
  await assert.rejects(fixture.store.history({ limit: 129 }), rejectCode('INVALID_OPTIONS'));
});

test('same request retry returns reachable saved revision before stale expected-head rejection; conflicting retry refuses', async t => {
  const fixture = await setup(t); const first = await fixture.store.commit(fixture.input); const secondInput = await edited(fixture); const second = await fixture.store.commit(secondInput);
  assert.deepEqual(await fixture.store.commit(fixture.input), first); assert.equal((await fixture.store.read()).headHash, second.headHash);
  await assert.rejects(fixture.store.commit({ ...fixture.input, state: { ...fixture.state, brief: 'Different payload.' } }), rejectCode('REQUEST_REPLAY_CONFLICT'));
  await assert.rejects(fixture.store.commit({ ...fixture.input, requestId: 'stale-distinct' }), rejectCode('STALE_HEAD'));
});

test('two competing writers from one parent serialize and retain the rejected caller candidate', async t => {
  const fixture = await setup(t); const first = await fixture.store.commit(fixture.input); const base = (await fixture.store.read()).state;
  const candidateA = { expectedHeadHash: first.headHash, requestId: 'writer-a', state: { ...base, nextAction: 'A' }, change: { kind: 'edit', summary: 'Writer A.' } };
  const candidateB = { expectedHeadHash: first.headHash, requestId: 'writer-b', state: { ...base, nextAction: 'B' }, change: { kind: 'edit', summary: 'Writer B.' } };
  const results = await Promise.allSettled([fixture.store.commit(candidateA), createProjectStore({ root: fixture.root }).commit(candidateB)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); const rejected = results.find(result => result.status === 'rejected'); assert.ok(['LOCKED', 'STALE_HEAD'].includes(rejected.reason.code)); assert.equal(candidateA.state.nextAction, 'A'); assert.equal(candidateB.state.nextAction, 'B'); assert.equal((await fixture.store.history()).entries.length, 2);
});

test('historical names/bytes/dependencies survive overwritten and deleted working files, materialize independently and continue in a fresh process', async t => {
  const fixture = await setup(t, { record: true }); const first = await fixture.store.commit(fixture.input); const secondInput = await edited(fixture); await fixture.store.commit(secondInput);
  await rm(resolve(fixture.root, 'drawing.svg')); await rm(resolve(fixture.root, 'image.svg'));
  const firstVersion = await fixture.store.readVersion({ versionId: 'v-first' }); assert.equal(firstVersion.commitHash, first.headHash); assert.equal(firstVersion.state.record.decisions[0].status, 'chosen');
  for (const [versionId, expected] of [['v-first', fixture.svg], ['v-second', source('Second label')]]) {
    const outputDir = resolve(fixture.root, `export-${versionId}`); const result = await fixture.store.materializeVersion({ versionId, outputDir }); assert.equal(result.openingFile, 'CONTINUATION.md'); assert.equal(await readFile(resolve(outputDir, 'drawing.svg'), 'utf8'), expected);
    const portable = JSON.parse(await readFile(resolve(outputDir, 'continuation.json'))); assert.equal(validateProjectState(portable).valid, true); assert.equal(portable.sources[0].path, 'drawing.svg'); assert.ok(!JSON.stringify(portable).includes('.ingenium/'));
    const script = `import {readFile,writeFile} from 'node:fs/promises';import {createProjectStore} from ${JSON.stringify(new URL('../src/project-state/index.mjs', import.meta.url).href)};import {createHash} from 'node:crypto';const root=process.argv[1];const state=JSON.parse(await readFile(root+'/continuation.json'));const bytes=(await readFile(root+'/drawing.svg','utf8')).replace('label','label continued');await writeFile(root+'/drawing.svg',bytes);const sha=createHash('sha256').update(bytes).digest('hex');state.sources[0].sha256=sha;state.versions=[];state.revision=0;const saved=await createProjectStore({root}).commit({expectedHeadHash:null,requestId:'resumed',state,change:{kind:'create',summary:'Resume materialized source and narrow label edit.'}});console.log(saved.status);`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script, outputDir], { encoding: 'utf8' }); assert.equal(child.status, 0, child.stderr); assert.equal(child.stdout.trim(), 'saved');
    const reopened = await createProjectStore({ root: outputDir }).read(); assert.equal(reopened.state.record.decisions[0].choice, fixtureRecord.decisions[0].choice);
  }
  assert.equal((await fixture.store.readVersion({ versionId: `commit:${first.headHash}` })).commitHash, first.headHash);
  await assert.rejects(fixture.store.materializeVersion({ versionId: 'v-first', outputDir: resolve(fixture.root, 'export-v-first') }), error => error.code === 'SPACE_OR_IO');
});

test('record transition reconstructs authoritative result and protects shared chosen evidence; explicit reopen then choose works', async t => {
  const fixture = await setup(t, { record: true }); await fixture.store.commit(fixture.input); let current = await fixture.store.read();
  const handEdited = copied(current.state); handEdited.record.evidence[0].statement = 'Tampered protected evidence.';
  await assert.rejects(fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'tamper', state: handEdited, change: { kind: 'edit', summary: 'Try bypassing v1.' } }), rejectCode('PROTECTED_RECORD'));
  const decisions = copied(current.state.record.decisions); decisions[0].status = 'open'; decisions[0].choice = null;
  const recordChange = { baseRevision: 0, updates: { decisions }, reopen: [{ decisionId: decisions[0].id, reason: 'Synthetic user requests reconsideration.' }] };
  current.state.record = reviseRecord(current.state.record, recordChange);
  await fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'reopen', state: current.state, change: { kind: 'reopen', summary: 'Reopen palette.', reason: 'Synthetic user instruction.', recordChange } });
  current = await fixture.store.read(); const chosen = copied(current.state.record.decisions); chosen[0].status = 'chosen'; chosen[0].choice = 'Violet'; const choose = { baseRevision: 1, updates: { decisions: chosen } }; current.state.record = reviseRecord(current.state.record, choose);
  await fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'choose', state: current.state, change: { kind: 'choose', summary: 'Retain newly supplied palette.', recordChange: choose } });
  assert.equal((await fixture.store.read()).state.record.decisions[0].choice, 'Violet'); assert.equal((await fixture.store.read()).state.record.revision, 2);
});

test('project and named-version identity/revision cannot rewind or mutate history', async t => {
  const fixture = await setup(t); await fixture.store.commit(fixture.input); const current = await fixture.store.read();
  for (const state of [{ ...current.state, revision: 55 }, { ...current.state, projectId: 'other' }]) await assert.rejects(fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'wrong-revision', state, change: { kind: 'edit', summary: 'Invalid revision.' } }), rejectCode('STALE_REVISION'));
  const altered = copied(current.state); altered.versions[0].name = 'Rewritten history'; await assert.rejects(fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'rewrite-version', state: altered, change: { kind: 'edit', summary: 'Rewrite named version.' } }), rejectCode('IMMUTABLE_VERSION'));
});

test('missing or changed source and omitted dependency refuse without saved acknowledgement', async t => {
  for (const scenario of ['missing', 'changed', 'dependency']) {
    const fixture = await setup(t); if (scenario === 'missing') await rm(resolve(fixture.root, 'drawing.svg')); if (scenario === 'changed') await writeFile(resolve(fixture.root, 'drawing.svg'), 'overwritten'); if (scenario === 'dependency') { fixture.input.state.sources.pop(); fixture.input.state.versions[0].sources.pop(); }
    await assert.rejects(fixture.store.commit(fixture.input), rejectCode(scenario === 'missing' ? 'SOURCE_MISSING' : scenario === 'changed' ? 'SOURCE_CHANGED' : 'MISSING_DEPENDENCY'));
    assert.equal((await fixture.store.recover({ mode: 'inspect' })).head.status, 'missing');
  }
});

test('symlink source/store and reserved metadata traversal refuse', async t => {
  const fixture = await setup(t); await rm(resolve(fixture.root, 'image.svg')); await symlink(resolve(fixture.root, 'drawing.svg'), resolve(fixture.root, 'image.svg'));
  await assert.rejects(fixture.store.commit(fixture.input), rejectCode('PATH_ESCAPE'));
  const other = await setup(t); other.input.state.sources[0].path = '.ingenium/HEAD.json'; await assert.rejects(other.store.commit(other.input), rejectCode('PATH_ESCAPE'));
});

test('bounded tree members/bytes, unsupported source dependencies and remote required assets refuse', async t => {
  const fixture = await setup(t); await assert.rejects(createProjectStore({ root: fixture.root, maxBytes: 1 }).commit(fixture.input), rejectCode('LIMIT_EXCEEDED'));
  const remote = await setup(t); const svg = source('External').replace('image.svg', 'https://example.invalid/image.svg'); await writeFile(resolve(remote.root, 'drawing.svg'), svg); remote.state.sources[0].sha256 = digest(svg); remote.state.versions = []; await assert.rejects(remote.store.commit(remote.input), rejectCode('EXTERNAL_DEPENDENCY'));
  const unsupported = await setup(t); unsupported.state.sources[0].mediaType = 'application/x-unknown-source'; unsupported.state.versions = []; await assert.rejects(unsupported.store.commit(unsupported.input), rejectCode('UNSUPPORTED_DEPENDENCIES'));
});

test('immutable artifact corruption, extra members and corrupt predecessor remain visible', async t => {
  for (const scenario of ['bytes', 'extra', 'predecessor']) {
    const fixture = await setup(t); const first = await fixture.store.commit(fixture.input); await fixture.store.commit(await edited(fixture));
    if (scenario === 'predecessor') await writeFile(resolve(fixture.root, '.ingenium/commits', first.headHash, 'state.json'), '{}', { mode: 0o600 });
    else { const old = await fixture.store.readVersion({ versionId: 'v-first' }); const ref = old.version.sources[0].path; if (scenario === 'bytes') await writeFile(resolve(fixture.root, ref), 'corrupt'); else await writeFile(resolve(dirnameFromRef(fixture.root, ref), 'extra.bin'), 'unlisted', { mode: 0o600 }); }
    await assert.rejects(fixture.store.read(), rejectCode('CORRUPT_STATE')); assert.equal((await fixture.store.recover({ mode: 'inspect' })).head.status, 'corrupt');
  }
});
function dirnameFromRef(root, ref) { return resolve(root, ref.split('/').slice(0, -1).join('/')); }

test('pure version diff marks expected record/source changes and unrun behavior/layout without opening files', () => {
  const before = createContinuation({ projectId: 'diff', brief: 'Same brief.', sources: [{ id: 'source', path: 'a.txt', sha256: 'a'.repeat(64), mediaType: 'text/plain' }] }); const after = copied(before); after.revision = 1; after.sources[0].sha256 = 'b'.repeat(64);
  const result = compareProjectVersions({ before, after, expectedChanges: ['$.sources[source]'], sourceTexts: { before: { source: 'cafe\u0301\r\n' }, after: { source: 'café\n' } } }); assert.equal(result.changes[0].expected, true); assert.equal(result.text[0].normalizedEqual, true); assert.equal(result.behavior.status, 'not-run'); assert.equal(result.layout.status, 'not-run'); assert.equal(result.unexpectedDifferences.length, 0);
  assert.equal(compareProjectVersions({ before, after }).text[0].status, 'not-run');
});

test('public synthetic continuation and JSON Schema are readable and all file hashes resolve', async () => {
  const schema = JSON.parse(await readFile(new URL('../schemas/project-state-v1.schema.json', import.meta.url))); assert.equal(schema.properties.schema.const, 'ingenium-project/1'); assert.equal(schema.additionalProperties, false);
  const fixture = JSON.parse(await readFile(new URL('../examples/continuation/continuation.json', import.meta.url))); assert.equal(validateProjectState(fixture).valid, true); for (const ref of fixture.sources) assert.equal(digest(await readFile(new URL(`../examples/continuation/${ref.path}`, import.meta.url))), ref.sha256);
});

test('repairable initial preflight failure leaves no metadata and restored source retries normally', async t => {
  const fixture = await setup(t); await rm(resolve(fixture.root, 'drawing.svg')); await assert.rejects(fixture.store.commit(fixture.input), rejectCode('SOURCE_MISSING')); assert.equal((await readdir(fixture.root)).includes('.ingenium'), false); await writeFile(resolve(fixture.root, 'drawing.svg'), fixture.svg); assert.equal((await fixture.store.commit(fixture.input)).status, 'saved');
});

test('malformed nonstring IDs return structured errors instead of coercion exceptions', () => {
  const state = createContinuation({ projectId: 'strict-id', brief: 'Synthetic.' });
  for (const value of [{ toString: null }, { valueOf: null }, 12, null, ['array']]) { assert.doesNotThrow(() => validateProjectState({ ...state, projectId: value })); assert.equal(validateProjectState({ ...state, projectId: value }).valid, false); }
});

test('shared parser refuses unquoted HTML references and retains Markdown image dependencies before any initialization', async t => {
  for (const [path, mediaType, text, expected] of [['index.html', 'text/html', '<img src=missing.png>', 'UNSUPPORTED_SOURCE'], ['NOTE.md', 'text/markdown', '![Picture](missing.svg)', 'MISSING_DEPENDENCY'], ['NOTE.md', 'text/markdown', '![Picture][ref]\n\n[ref]: missing.svg', 'MISSING_DEPENDENCY']]) {
    const fixture = await setup(t); await writeFile(resolve(fixture.root, path), text); const state = createContinuation({ projectId: 'dependencies', brief: 'Synthetic missing dependency.', sources: [{ id: 'source', path, sha256: digest(text), mediaType }] }); await assert.rejects(fixture.store.commit({ ...fixture.input, state }), rejectCode(expected)); assert.equal((await readdir(fixture.root)).includes('.ingenium'), false);
  }
});

test('multi-tree narrow-edit version materializes selected new source and unchanged old sibling without unrelated old collision', async t => {
  const fixture = await setup(t); const a = 'Old A\n', b = 'Unchanged B\n'; await writeFile(resolve(fixture.root, 'a.txt'), a); await writeFile(resolve(fixture.root, 'b.txt'), b);
  fixture.input.state = createContinuation({ projectId: 'multi-tree', brief: 'Change A only; retain B.', sources: [{ id: 'a', path: 'a.txt', sha256: digest(a), mediaType: 'text/plain' }, { id: 'b', path: 'b.txt', sha256: digest(b), mediaType: 'text/plain' }] }); await fixture.store.commit(fixture.input);
  const current = await fixture.store.read(); const nextA = 'New A\n'; await writeFile(resolve(fixture.root, 'a.txt'), nextA); current.state.sources[0] = { ...current.state.sources[0], path: 'a.txt', sha256: digest(nextA) }; current.state.versions = [{ id: 'mixed-version', name: 'Narrow edit', revision: 1, sources: copied(current.state.sources), previews: [] }]; await fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'mixed-edit', state: current.state, change: { kind: 'edit', summary: 'Change A only.' } });
  const outputDir = resolve(fixture.root, 'mixed-export'); await fixture.store.materializeVersion({ versionId: 'mixed-version', outputDir }); assert.equal(await readFile(resolve(outputDir, 'a.txt'), 'utf8'), nextA); assert.equal(await readFile(resolve(outputDir, 'b.txt'), 'utf8'), b); const portable = JSON.parse(await readFile(resolve(outputDir, 'continuation.json'))); assert.ok(!JSON.stringify(portable).includes('.ingenium/')); assert.equal((await createProjectStore({ root: outputDir }).commit({ expectedHeadHash: null, requestId: 'reopen-mixed', state: { ...portable, revision: 0, versions: [] }, change: { kind: 'create', summary: 'Reopen mixed-tree narrow edit.' } })).status, 'saved');
});

test('embedded delivery projects opening and artifacts together; materialized source/notice closure delivers outside the store', async t => {
  const fixture = await setup(t); const opening = 'Open drawing.svg. Change only the requested label; preserve the linked image. Next action: scoped edit.'; const notice = 'Original synthetic test artwork. MIT licensed fixture.';
  await writeFile(resolve(fixture.root, 'OPEN.txt'), opening); await writeFile(resolve(fixture.root, 'LICENSE.txt'), notice);
  fixture.state.delivery = { schema: 'ingenium-delivery/1', projectId: fixture.state.projectId, versionId: 'v-first', openingFile: 'drawing.svg', artifacts: [
    { ...fixture.state.sources[0], role: 'source', editableKind: 'live-text', editingNote: 'Edit the SVG text label.', dependsOnIds: ['image', 'license'] },
    { ...fixture.state.sources[1], role: 'source', editableKind: 'vector-geometry', dependsOnIds: [] },
    { id: 'instructions', path: 'OPEN.txt', sha256: digest(opening), mediaType: 'text/plain', role: 'instructions', dependsOnIds: [] },
    { id: 'license', path: 'LICENSE.txt', sha256: digest(notice), mediaType: 'text/plain', role: 'notice', dependsOnIds: [] },
  ], tools: [], checks: [], limitations: ['Synthetic illustrative source; no native engineering model or acceptance claim.'] };
  fixture.state.resources = [{ providerId: 'synthetic', assetId: 'signal', sourceRevision: `sha256:${fixture.state.sources[0].sha256}`, originalSHA256: fixture.state.sources[0].sha256, qualificationEvidenceIds: [], noticeIds: ['license'], acquisitionMode: 'injected-fixture' }];
  const saved = await fixture.store.commit(fixture.input); const stored = await fixture.store.read(); assert.equal(stored.state.delivery.openingFile, stored.state.delivery.artifacts[0].path); assert.ok(stored.state.delivery.openingFile.startsWith('.ingenium/artifacts/'));
  const outputDir = resolve(fixture.root, 'portable-delivery'); await fixture.store.materializeVersion({ versionId: `commit:${saved.headHash}`, outputDir });
  const portable = JSON.parse(await readFile(resolve(outputDir, 'continuation.json'))); assert.equal(portable.delivery.openingFile, 'drawing.svg'); assert.equal(portable.delivery.artifacts[0].path, 'drawing.svg'); assert.equal(await readFile(resolve(outputDir, 'LICENSE.txt'), 'utf8'), notice); assert.ok(!JSON.stringify(portable).includes('.ingenium/'));
  const { writeDelivery } = await import('../src/delivery/index.mjs'); await writeDelivery({ root: outputDir, delivery: portable.delivery, outputDir: resolve(fixture.root, 'standalone-delivery') }); const delivered = JSON.parse(await readFile(resolve(fixture.root, 'standalone-delivery/delivery.json'))); assert.equal(delivered.openingFile, 'drawing.svg'); assert.equal(await readFile(resolve(fixture.root, 'standalone-delivery/drawing.svg'), 'utf8'), fixture.svg);
});

test('one SVG label edit reuses unchanged retained linked image while freezing a complete new dependency tree', async t => {
  const fixture = await setup(t); await fixture.store.commit(fixture.input); const current = await fixture.store.read(); const newSVG = source('Only changed label'); await writeFile(resolve(fixture.root, 'drawing.svg'), newSVG); await rm(resolve(fixture.root, 'image.svg'));
  current.state.sources[0] = { ...current.state.sources[0], path: 'drawing.svg', sha256: digest(newSVG) }; current.state.versions.push({ id: 'v-one-label', name: 'One label changed', revision: 1, sources: copied(current.state.sources), previews: [], basedOnVersionId: 'v-first' });
  await fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'one-label', state: current.state, change: { kind: 'edit', summary: 'Change one SVG text element; reuse exact retained image.' } }); await rm(resolve(fixture.root, 'drawing.svg'));
  for (const [versionId, svg] of [['v-first', fixture.svg], ['v-one-label', newSVG]]) { const outputDir = resolve(fixture.root, `one-label-${versionId}`); await fixture.store.materializeVersion({ versionId, outputDir }); assert.equal(await readFile(resolve(outputDir, 'drawing.svg'), 'utf8'), svg); assert.equal(await readFile(resolve(outputDir, 'image.svg'), 'utf8'), fixture.image); }
});

test('nested malformed resource scalars remain structured validation errors without string coercion', () => {
  const resource = { providerId: 'synthetic', assetId: 'asset', sourceRevision: 'sha256:synthetic', originalSHA256: 'a'.repeat(64), qualificationEvidenceIds: [], noticeIds: [], acquisitionMode: 'injected-fixture' };
  for (const field of ['providerId', 'assetId', 'sourceRevision', 'originalSHA256', 'acquisitionMode']) { const state = createContinuation({ projectId: 'nested', brief: 'Synthetic.', resources: [resource] }); state.resources[0][field] = { toString: null }; assert.doesNotThrow(() => validateProjectState(state)); assert.equal(validateProjectState(state).valid, false); }
});

test('materialized resource notice retains its original ID and resumes a selected-version store independently', async t => {
  const fixture = await setup(t); const drawing = 'Original source text.\n'; const notice = 'Original synthetic notice.\n'; await writeFile(resolve(fixture.root, 'a.txt'), drawing); await writeFile(resolve(fixture.root, 'LICENSE.txt'), notice);
  const refs = [{ id: 'drawing', path: 'a.txt', sha256: digest(drawing), mediaType: 'text/plain' }, { id: 'license', path: 'LICENSE.txt', sha256: digest(notice), mediaType: 'text/plain' }];
  fixture.input.state = createContinuation({ projectId: 'resource-notice', brief: 'Keep the selected resource and its full notice.', sources: refs, versions: [{ id: 'v-notice', name: 'Notice-linked version', revision: 0, sources: [refs[0]], previews: [] }], resources: [{ providerId: 'synthetic', assetId: 'drawing', sourceRevision: `sha256:${digest(drawing)}`, originalSHA256: digest(drawing), qualificationEvidenceIds: [], noticeIds: ['license'], acquisitionMode: 'injected-fixture' }] });
  await fixture.store.commit(fixture.input); const outputDir = resolve(fixture.root, 'notice-portable'); await fixture.store.materializeVersion({ versionId: 'v-notice', outputDir }); const portable = JSON.parse(await readFile(resolve(outputDir, 'continuation.json'))); assert.equal(portable.sources.find(ref => ref.path === 'LICENSE.txt').id, 'license'); assert.equal((await createProjectStore({ root: outputDir }).commit({ expectedHeadHash: null, requestId: 'reopen-notice', state: portable, change: { kind: 'create', summary: 'Resume selected source with exact retained notice ID.' } })).status, 'saved');
});

test('resource original/derived hashes bind to exact retained bytes, never matching basenames or descriptive metadata', async t => {
  for (const [field, wrong] of [['originalSHA256', 'a'.repeat(64)], ['derivedSHA256', 'b'.repeat(64)]]) {
    const fixture = await setup(t); fixture.state.resources = [{ providerId: 'synthetic', assetId: 'resource', sourceRevision: 'synthetic:1', originalSHA256: fixture.state.sources[0].sha256, ...(field === 'derivedSHA256' ? { derivedSHA256: wrong } : { originalSHA256: wrong }), qualificationEvidenceIds: [], noticeIds: [], acquisitionMode: 'injected-fixture' }];
    await assert.rejects(fixture.store.commit(fixture.input), rejectCode('RESOURCE_CHANGED')); assert.equal((await readdir(fixture.root)).includes('.ingenium'), false);
  }
  const stale = await setup(t); stale.state.resources = [{ providerId: 'synthetic', assetId: 'stale', sourceRevision: 'synthetic:1', originalSHA256: stale.state.sources[0].sha256, qualificationEvidenceIds: [], noticeIds: [], acquisitionMode: 'injected-fixture' }]; await writeFile(resolve(stale.root, 'drawing.svg'), source('Stale resource bytes')); await assert.rejects(stale.store.commit(stale.input), rejectCode('SOURCE_CHANGED'));
});

test('portable selected resource retains original bytes under an explicit namespace when derived bytes reuse historical filename', async t => {
  const fixture = await setup(t); const original = 'Original resource\n'; await writeFile(resolve(fixture.root, 'asset.txt'), original); const originalRef = { id: 'asset', path: 'asset.txt', sha256: digest(original), mediaType: 'text/plain' };
  fixture.input.state = createContinuation({ projectId: 'resource-evolution', brief: 'Keep source provenance during the requested edit.', sources: [originalRef], versions: [{ id: 'original', name: 'Original resource', revision: 0, sources: [originalRef], previews: [] }] }); await fixture.store.commit(fixture.input);
  const current = await fixture.store.read(); const derived = 'Derived resource\n'; await writeFile(resolve(fixture.root, 'asset.txt'), derived); current.state.sources = [{ ...originalRef, sha256: digest(derived) }]; current.state.resources = [{ providerId: 'synthetic', assetId: 'asset', sourceRevision: 'synthetic:1', originalSHA256: digest(original), derivedSHA256: digest(derived), qualificationEvidenceIds: [], noticeIds: [], acquisitionMode: 'injected-fixture' }]; current.state.versions.push({ id: 'derived', name: 'Derived current resource', revision: 1, sources: copied(current.state.sources), previews: [], basedOnVersionId: 'original' });
  await fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'resource-edit', state: current.state, change: { kind: 'edit', summary: 'Retain original and derived resource bytes.' } }); const outputDir = resolve(fixture.root, 'resource-portable'); await fixture.store.materializeVersion({ versionId: 'derived', outputDir }); const portable = JSON.parse(await readFile(resolve(outputDir, 'continuation.json'))); assert.equal(await readFile(resolve(outputDir, 'asset.txt'), 'utf8'), derived); const ref = portable.sources.find(ref => ref.sha256 === digest(original)); assert.match(ref.path, /^resources\/[a-f0-9]{64}\/asset.txt$/); assert.equal(await readFile(resolve(outputDir, ref.path), 'utf8'), original); assert.equal((await createProjectStore({ root: outputDir }).commit({ expectedHeadHash: null, requestId: 'reopen-resources', state: { ...portable, revision: 0, versions: [] }, change: { kind: 'create', summary: 'Reopen exact original/derived resource closure.' } })).status, 'saved');
});

test('return cannot claim an older direction without a new named version of its exact retained sources', async t => {
  const fixture = await setup(t); await fixture.store.commit(fixture.input); const current = await fixture.store.read();
  await assert.rejects(fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'fake-return', state: current.state, change: { kind: 'return', summary: 'No named returned direction.', reason: 'Synthetic request.', basedOnVersionId: 'v-first' } }), rejectCode('INVALID_CHANGE'));
  current.state.versions.push({ ...copied(current.state.versions[0]), id: 'v-returned', name: 'Retained direction as new revision', revision: 1, basedOnVersionId: 'v-first' });
  const returned = await fixture.store.commit({ expectedHeadHash: current.headHash, requestId: 'valid-return', state: current.state, change: { kind: 'return', summary: 'Retain old direction under new version identity.', reason: 'Synthetic explicit return request.', basedOnVersionId: 'v-first' } }); assert.equal(returned.revision, 1); assert.equal((await fixture.store.read()).state.versions.at(-1).id, 'v-returned');
});
