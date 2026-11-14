import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planTask, reviewRevision } from '../src/workflow/task.mjs';
import { reviseRecord } from '../src/records/index.mjs';

test('all ordinary routes produce detached proportional plans without execution or persistence', () => {
  for (const intent of ['create', 'compare', 'revise', 'review', 'continue']) {
    const options = { intent, request: 'Change the title treatment.', inputs: ['drawing.svg'], deliverables: ['editable SVG'] };
    const original = structuredClone(options);
    const plan = planTask(options);
    assert.equal(plan.schema, 'ingenium-task/1');
    assert.equal(plan.depth, 'quick'); assert.equal(plan.continuation, 'file');
    assert.equal(plan.materialQuestions.length, 0);
    assert.ok(plan.operations.every(op => ['inspect-inputs', 'study', 'edit', 'review', 'export', 'handoff'].includes(op.kind)));
    assert.ok(!plan.operations.some(op => /store|install/.test(op.kind)));
    for (const operation of plan.operations) for (const dep of operation.dependsOn) assert.ok(plan.operations.findIndex(op => op.id === dep) < plan.operations.indexOf(operation));
    plan.deliverables.push('not requested'); assert.deepEqual(options, original);
  }
  const quick = planTask({ intent: 'make', request: 'Compare two palettes.' });
  assert.equal(quick.intent, 'create'); assert.equal(quick.continuation, 'none');
  assert.equal(quick.operations.filter(op => op.kind === 'edit').length, 1);
  assert.equal(planTask({ intent: 'revise', depth: 'progressive', request: 'Change one settled title.' }).depth, 'standard');
  for (const depth of ['quick', 'standard', 'deep']) assert.equal(planTask({ intent: 'revise', depth, request: 'Change one settled title.' }).operations.filter(op => op.kind === 'edit').length, 1);
});

test('task helper refuses unsupported shapes and never invokes input accessors', () => {
  for (const options of [{ intent: 'install', request: 'x' }, { intent: 'create', depth: 'exhaustive', request: 'x' }, { intent: 'create', request: '' }, { intent: 'create', request: 'x', inputs: [{}] }, { intent: 'create', request: 'x', persisted: true }]) assert.throws(() => planTask(options));
  let accessed = false;
  assert.throws(() => planTask({ get request() { accessed = true; return 'x'; }, intent: 'create' }));
  assert.equal(accessed, false);
});

test('Field Station source-grounded protected fields and wording survive only a title treatment edit', async () => {
  const brief = JSON.parse(await readFile(new URL('../examples/evolution/brief.json', import.meta.url), 'utf8'));
  const before = { ...brief, treatment: 'plain' }, after = { ...brief, treatment: 'framed' };
  const protectedFields = ['/title', '/date', '/invitation', '/components', '/connections'];
  const result = reviewRevision({ before, after, protectedFields, suppliedWording: [{ text: brief.invitation, before: brief.request, after: brief.request }] });
  assert.equal(result.status, 'pass');
  assert.ok(result.limitations.some(limit => limit.includes('No behavioral preservation')));
  after.connections = [{ from: 'controller', to: 'sensor', label: 'measurement' }];
  assert.equal(reviewRevision({ before, after, protectedFields }).status, 'fail');
  assert.equal(reviewRevision({ before, after, protectedFields: ['/missing'] }).status, 'fail');
  assert.equal(reviewRevision({ before: {}, after: {} }).status, 'review-needed');
});

const record = () => ({ version: 1, id: 'record', revision: 0, purpose: 'Keep the supplied title', evidence: [{ id: 'fact', statement: 'Title is Field Station' }], interpretations: [], decisions: [{ id: 'choice', question: 'Title?', scope: 'graphic', status: 'chosen', choice: 'Field Station', evidenceIds: ['fact'], interpretationIds: [] }], artifacts: [] });

test('narrow revision review uses actual records protection and explicit reopen, never hash acceptance', () => {
  const before = { record: record() };
  const after = structuredClone(before); after.record.decisions[0].choice = 'New name'; after.record.revision++;
  assert.equal(reviewRevision({ before, after }).status, 'fail');
  assert.equal(reviewRevision({ before, after, recordChange: { baseRevision: 0, updates: { decisions: after.record.decisions } } }).status, 'fail');
  const change = { baseRevision: 0, updates: { decisions: [{ ...before.record.decisions[0], status: 'open', choice: null }] }, reopen: [{ decisionId: 'choice', reason: 'The user explicitly reopens the title.' }] };
  const reopened = { record: reviseRecord(before.record, change) };
  assert.equal(reviewRevision({ before, after: reopened, recordChange: change }).status, 'pass');
  assert.equal(before.record.decisions[0].status, 'chosen');
  assert.throws(() => reviewRevision({ before: {}, after: {}, protectedFields: ['not-a-pointer'] }));
});

test('revision review rejects public-option accessors before any property reads', () => {
  let reads = 0;
  assert.throws(() => reviewRevision({ get before() { reads++; return {}; }, after: {} }), /JSON/);
  assert.throws(() => reviewRevision({ before: {}, get after() { reads++; return {}; } }), /JSON/);
  assert.throws(() => reviewRevision({ before: {}, after: {}, get protectedFields() { reads++; return []; } }), /JSON/);
  assert.equal(reads, 0);
});
