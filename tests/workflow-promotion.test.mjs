import test from 'node:test';
import assert from 'node:assert/strict';
import { planTask } from '../src/workflow/task.mjs';
import { promoteQuickProject } from '../src/workflow/promotion.mjs';
import { createContinuation, validateProjectState } from '../src/project-state/schema.mjs';
import { reviseRecord } from '../src/records/index.mjs';

function fixture() {
  const choices = [
    { id: 'title-wording', wording: 'Keep the title Field Station.', scope: 'Title wording in the engineering graphic', source: 'CONTINUE.md, retained explicit title choice' },
    { id: 'connection-order', wording: 'Keep Sensor → Controller → Display.', scope: 'Connection directions in the engineering graphic', source: 'CONTINUE.md, retained explicit direction choice' },
  ];
  const sources = [{ id: 'drawing', path: 'drawing.svg', sha256: 'a'.repeat(64), mediaType: 'image/svg+xml' }, { id: 'note', path: 'CONTINUE.md', sha256: 'b'.repeat(64), mediaType: 'text/markdown' }];
  const project = createContinuation({ projectId: 'field-station', brief: `Create an editable overview. ${choices.map(c => c.wording).join(' ')}`, sources, versions: [{ id: 'plain-title', name: 'Plain title', revision: 0, sources, previews: [] }], nextAction: 'Change only the title treatment.' });
  const record = { version: 1, id: 'field-station-record', revision: 0, purpose: project.brief, evidence: choices.map((choice, i) => ({ id: `source-choice-${i}`, statement: choice.wording, source: choice.source })), interpretations: [], decisions: choices.map((choice, i) => ({ id: `decision-${i}`, question: i ? 'Connection order?' : 'Title wording?', scope: choice.scope, status: 'chosen', choice: choice.wording, evidenceIds: [`source-choice-${i}`], interpretationIds: [] })), artifacts: [] };
  return { project, choices, record, mapping: choices.map((choice, i) => ({ choiceId: choice.id, decisionId: `decision-${i}` })) };
}

test('IG-R061-04 quick project gains checked records without restart, discarded choices or mandatory promotion', () => {
  const quickPlan = planTask({ intent: 'create', request: 'Make a small Field Station graphic.' });
  assert.equal(quickPlan.continuation, 'none');
  const input = fixture(), original = structuredClone(input);
  assert.equal(Object.hasOwn(input.project, 'record'), false);
  const result = promoteQuickProject(input);
  assert.equal(validateProjectState(result.project).valid, true);
  const { record: promotedRecord, ...retainedProject } = result.project;
  assert.deepEqual(retainedProject, input.project);
  assert.deepEqual(promotedRecord, input.record);
  assert.deepEqual(result.coverage, [
    { choiceId: 'title-wording', decisionId: 'decision-0', evidenceId: 'source-choice-0' },
    { choiceId: 'connection-order', decisionId: 'decision-1', evidenceId: 'source-choice-1' },
  ]);
  for (const [i, choice] of input.choices.entries()) {
    assert.equal(promotedRecord.decisions[i].choice, choice.wording);
    assert.equal(promotedRecord.decisions[i].scope, choice.scope);
    assert.equal(promotedRecord.evidence[i].statement, choice.wording);
    assert.equal(promotedRecord.evidence[i].source, choice.source);
  }
  assert.equal(result.project.revision, original.project.revision, 'Pure enrichment does not invent a saved revision');
  assert.throws(() => reviseRecord(promotedRecord, { baseRevision: 0, updates: { decisions: [{ ...promotedRecord.decisions[0], choice: 'Renamed' }, promotedRecord.decisions[1]] } }), /protected/);
  result.project.sources[0].path = 'different.svg'; result.project.record.evidence[0].statement = 'different'; result.coverage[0].choiceId = 'different';
  assert.deepEqual(input, original, 'All input project, evidence, choices and mapping remain detached');
});

test('promotion refuses missing, ambiguous or invented choice authority and changed wording/scope/source evidence', () => {
  const cases = [
    ['MISSING_MAPPING', input => input.mapping.pop()],
    ['AMBIGUOUS_MAPPING', input => input.mapping.push(input.mapping[0])],
    ['AMBIGUOUS_MAPPING', input => input.choices.push(input.choices[0])],
    ['AMBIGUOUS_MAPPING', input => input.mapping[1].decisionId = input.mapping[0].decisionId],
    ['UNRESOLVED_MAPPING', input => input.mapping[0].choiceId = 'not-retained'],
    ['UNSOURCED_DECISION', input => { input.choices.pop(); input.mapping.pop(); }],
    ['WORDING_CHANGED', input => input.record.decisions[0].choice = 'Keep the renamed title.'],
    ['SCOPE_CHANGED', input => input.record.decisions[0].scope = 'All future projects'],
    ['MISSING_EVIDENCE', input => input.record.evidence[0].source = 'inferred authority'],
    ['MISSING_EVIDENCE', input => input.record.evidence[0].statement = 'Paraphrased title choice'],
    ['AMBIGUOUS_EVIDENCE', input => { input.record.evidence.push({ ...input.record.evidence[0], id: 'duplicate-evidence' }); input.record.decisions[0].evidenceIds.push('duplicate-evidence'); }],
    ['INVALID_RECORD', input => input.record.revision = 1],
    ['ALREADY_STRUCTURED', input => input.project.record = structuredClone(input.record)],
  ];
  for (const [code, modify] of cases) {
    const input = fixture(); modify(input); const unchanged = structuredClone(input);
    assert.throws(() => promoteQuickProject(input), { code }); assert.deepEqual(input, unchanged);
  }
});

test('promotion never invokes getters, accepts unchosen questions, and checks only explicit inventory', () => {
  let invoked = false;
  assert.throws(() => promoteQuickProject({ get project() { invoked = true; return {}; }, choices: [], record: {}, mapping: [] }), { code: 'INVALID_PROMOTION' });
  assert.equal(invoked, false);
  const input = fixture();
  input.record.decisions.push({ id: 'open-question', question: 'Need a PNG?', scope: 'Optional output', status: 'open', choice: null, evidenceIds: [], interpretationIds: [] });
  const result = promoteQuickProject(input);
  assert.equal(result.coverage.length, 2); assert.equal(result.project.record.decisions.at(-1).status, 'open');
  assert.match(result.limitations[0], /does not discover omitted choices/);
  assert.throws(() => promoteQuickProject({ ...fixture(), autoInferChoices: true }), { code: 'INVALID_PROMOTION' });
});
