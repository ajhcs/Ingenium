import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRecord, reviseRecord } from '../../src/records/index.mjs';

const fixture = JSON.parse(await readFile(new URL('../../examples/records/poster.json', import.meta.url), 'utf8'));
const copy = value => JSON.parse(JSON.stringify(value));
const change = updates => ({ baseRevision: 0, updates });
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

test('synthetic record round-trips every field and remains valid', () => {
  assert.deepEqual(validateRecord(fixture), { valid: true, errors: [] });
  assert.deepEqual(copy(fixture), fixture);
  assert.deepEqual(validateRecord(copy(fixture)), { valid: true, errors: [] });
});

test('ordinary revisions preserve chosen context and do not mutate or alias inputs', () => {
  const input = freeze(copy(fixture));
  const artifacts = copy(fixture.artifacts);
  artifacts[0].description = 'Editable study is ready for human review.';
  const delta = freeze(change({ artifacts }));
  const next = reviseRecord(input, delta);
  assert.equal(next.revision, 1);
  assert.deepEqual(next.decisions, fixture.decisions);
  assert.deepEqual(next.evidence, fixture.evidence);
  assert.deepEqual(next.interpretations, fixture.interpretations);
  assert.equal(input.revision, 0);
  next.artifacts[0].description = 'Changed returned object';
  next.evidence[0].statement = 'Changed returned evidence';
  assert.equal(delta.updates.artifacts[0].description, 'Editable study is ready for human review.');
  assert.deepEqual(input, fixture);
});

test('open decisions can be chosen explicitly without accepting tentative interpretations', () => {
  const decisions = copy(fixture.decisions);
  decisions[1].status = 'chosen';
  decisions[1].choice = 'Title at lower edge';
  const next = reviseRecord(fixture, change({ decisions }));
  assert.equal(next.decisions[1].status, 'chosen');
  assert.equal(next.interpretations[0].status, 'tentative');
});

test('chosen decisions require explicit reopen, retain ID, and choose on a later revision', () => {
  const decisions = copy(fixture.decisions);
  decisions[0].choice = 'Violet';
  assert.throws(() => reviseRecord(fixture, change({ decisions })), /d-palette.*reopen/);
  const reopen = [{ decisionId: 'd-palette', reason: 'The fictional brief changed.' }];
  assert.throws(() => reviseRecord(fixture, { ...change({ decisions }), reopen }), /status open/);
  decisions[0].status = 'open';
  decisions[0].choice = null;
  const reopened = reviseRecord(fixture, { ...change({ decisions }), reopen });
  assert.equal(reopened.revision, 1);
  decisions[0].status = 'chosen';
  decisions[0].choice = 'Violet';
  const chosen = reviseRecord(reopened, { baseRevision: 1, updates: { decisions } });
  assert.equal(chosen.revision, 2);
  assert.equal(chosen.decisions[0].choice, 'Violet');
  assert.deepEqual(fixture.decisions[0].choice, 'Indigo background with warm yellow accents');
});

test('chosen decisions also protect referenced evidence, interpretations, and project purpose', () => {
  for (const [kind, field] of [['evidence', 'statement'], ['interpretations', 'statement']]) {
    const entries = copy(fixture[kind]);
    entries[0][field] = 'Changed meaning';
    assert.throws(() => reviseRecord(fixture, change({ [kind]: entries })), /protects.*reopen/);
  }
  assert.throws(() => reviseRecord(fixture, change({ purpose: 'A different commission' })), /protects record purpose/);
  const evidence = copy(fixture.evidence);
  evidence[1].statement = 'Changed unrelated shape requirement';
  assert.equal(reviseRecord(fixture, change({ evidence })).revision, 1);
});

test('transitive evidence and shared context require reopening every affected decision', () => {
  const base = copy(fixture);
  base.decisions[0].evidenceIds = [];
  const evidence = copy(base.evidence);
  evidence[0].statement = 'Changed interpretation support';
  assert.throws(() => reviseRecord(base, change({ evidence })), /protects evidence/);
  base.decisions[1] = { ...base.decisions[1], status: 'chosen', choice: 'Lower edge', interpretationIds: ['i-mood'] };
  const decisions = copy(base.decisions);
  decisions[0].status = 'open';
  decisions[0].choice = null;
  assert.throws(() => reviseRecord(base, { ...change({ decisions, evidence }), reopen: [{ decisionId: 'd-palette', reason: 'Reconsider palette' }] }), /d-layout.*protects evidence/);
});

test('stale revisions, identity/version edits, empty changes, and exhausted revisions refuse', () => {
  const next = reviseRecord(fixture, change({ artifacts: [] }));
  assert.throws(() => reviseRecord(next, change({ artifacts: [] })), /Stale baseRevision: expected 1/);
  for (const field of ['id', 'version', 'revision']) assert.throws(() => reviseRecord(fixture, change({ [field]: 2 })), /immutable/);
  assert.throws(() => reviseRecord(fixture, change({})), /at least one field/);
  assert.throws(() => reviseRecord({ ...fixture, revision: Number.MAX_SAFE_INTEGER }, { baseRevision: Number.MAX_SAFE_INTEGER, updates: { artifacts: [] } }), /exhausted/);
});

test('dangling, wrong-kind, duplicate IDs and deletion of referenced records refuse', () => {
  for (const target of ['missing', 'd-layout']) {
    const record = copy(fixture);
    record.interpretations[0].evidenceIds = [target];
    assert.equal(validateRecord(record).valid, false);
  }
  const duplicate = copy(fixture);
  duplicate.artifacts[0].id = duplicate.evidence[0].id;
  assert.match(validateRecord(duplicate).errors.join(';'), /duplicate ID/);
  assert.throws(() => reviseRecord(fixture, change({ evidence: [] })), /dangling/);
  assert.throws(() => reviseRecord(fixture, change({ decisions: [] })), /dangling/);
});

test('invalid states and fabricated numerical confidence refuse', () => {
  const mutations = [
    r => { r.version = 2; },
    r => { r.revision = -1; },
    r => { r.interpretations[0].status = 'accepted'; },
    r => { r.interpretations[0].confidence = 0.99; },
    r => { r.tasteConfidence = 0.99; },
    r => { r.decisions[1].choice = 'Unchosen text'; },
    r => { r.decisions[0].choice = ''; },
    r => { r.decisions[0].status = 'approved'; },
    r => { r.evidence[0].statement = ' '; },
    r => { r.artifacts[0].evidenceIds = ['e-color', 'e-color']; },
  ];
  for (const mutate of mutations) {
    const record = copy(fixture);
    mutate(record);
    assert.equal(validateRecord(record).valid, false);
    assert.throws(() => reviseRecord(record, change({ artifacts: [] })), /Invalid base record/);
  }
});

test('malformed reference values return errors rather than coercing JSON objects', () => {
  for (const [kind, field] of [['interpretations', 'evidenceIds'], ['decisions', 'evidenceIds'], ['decisions', 'interpretationIds'], ['artifacts', 'evidenceIds'], ['artifacts', 'decisionIds']]) {
    for (const invalid of [{ toString: null }, { toString: null, valueOf: null }, [], null, 42, false]) {
      const record = copy(fixture);
      record[kind][0][field] = [invalid];
      const result = validateRecord(record);
      assert.equal(result.valid, false);
      assert.match(result.errors.join(';'), /expected ID/);
    }
  }
});

test('reopen declarations refuse unknown IDs, missing reasons, duplicates, and deletion', () => {
  for (const reopen of [[{ decisionId: 'missing', reason: 'Review' }], [{ decisionId: 'd-layout', reason: 'Review' }], [{ decisionId: 'd-palette', reason: ' ' }], [{ decisionId: 'd-palette', reason: 'Review' }, { decisionId: 'd-palette', reason: 'Again' }]]) {
    assert.throws(() => reviseRecord(fixture, { ...change({ artifacts: [] }), reopen }));
  }
  const record = copy(fixture);
  record.artifacts = [];
  assert.throws(() => reviseRecord(record, { ...change({ decisions: [record.decisions[1]] }), reopen: [{ decisionId: 'd-palette', reason: 'Review' }] }), /retain ID/);
});

test('malformed JSON inputs report invalid without invoking getters', () => {
  const cycle = {}; cycle.self = cycle;
  const sparse = copy(fixture); sparse.evidence = Array(1); sparse.evidence.extra = {};
  const accessor = copy(fixture); Object.defineProperty(accessor, 'purpose', { enumerable: true, get() { throw new Error('Getter ran'); } });
  for (const input of [null, [], undefined, cycle, sparse, accessor, new Date(), { ...fixture, revision: NaN }, { ...fixture, extra: undefined }]) {
    const result = validateRecord(input);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length);
  }
});
