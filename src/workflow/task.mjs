import { isDeepStrictEqual } from 'node:util';
import { reviseRecord, validateRecord } from '../records/index.mjs';
import { deliveryJsonErrors } from '../delivery/schema.mjs';

const nonempty = value => typeof value === 'string' && value.trim() && value.length <= 32768;
const assertJson = value => { const errors = deliveryJsonErrors(value); if (errors.length) throw new TypeError(errors[0].message); };

export function planTask(options = {}) {
  assertJson(options);
  if (!options || Array.isArray(options) || typeof options !== 'object') throw new TypeError('Task options must be an object');
  for (const key of Object.keys(options)) if (!['intent', 'depth', 'request', 'inputs', 'deliverables'].includes(key)) throw new TypeError(`Unsupported task option ${key}`);
  const intent = options.intent === 'make' ? 'create' : options.intent;
  const depth = options.depth === 'progressive' ? 'standard' : options.depth ?? 'quick';
  const { request, inputs = [], deliverables = [] } = options;
  if (!['create', 'compare', 'revise', 'review', 'continue'].includes(intent)) throw new TypeError('Expected intent create, compare, revise, review or continue');
  if (!['quick', 'standard', 'deep'].includes(depth)) throw new TypeError('Expected depth quick, standard or deep');
  if (!nonempty(request)) throw new TypeError('Task request must be nonempty, at most 32768 characters');
  for (const [label, list] of [['inputs', inputs], ['deliverables', deliverables]]) if (!Array.isArray(list) || list.length > 64 || list.some(item => !nonempty(item))) throw new TypeError(`${label} must contain at most 64 nonempty descriptions`);
  const operations = [];
  const add = (kind, reason, optional = false) => {
    const operation = { id: `op-${operations.length + 1}`, kind, dependsOn: operations.length ? [operations.at(-1).id] : [], optional, reason };
    operations.push(operation);
  };
  if (inputs.length || intent !== 'create') add('inspect-inputs', intent === 'continue' ? 'Read retained sources, instructions and scoped decisions before continuing.' : 'Inspect supplied content and identify protected wording, units, identities and choices.');
  if (intent === 'compare') add('study', 'Compare only requested alternatives and named decision criteria; do not infer a winner.');
  else if (depth !== 'quick') add('study', depth === 'deep' ? 'Investigate named material uncertainty in stages; stop when the requested outcome is supported.' : 'Investigate a named uncertainty only if it changes the result.', true);
  if (['create', 'revise', 'continue'].includes(intent)) add('edit', intent === 'create' ? 'Produce the requested result; default to one output unless more were requested.' : 'Apply the requested change into a new source while preserving protected content and settled choices.');
  add('review', depth === 'quick' ? 'Check the affected scope; use at most one targeted visual probe by default if useful and available.' : 'Check affected content and dependencies; add probes only to resolve named uncertainty.');
  if (deliverables.length && !['review', 'compare'].includes(intent)) add('export', 'Export only requested derivatives through available supported tools; report absent tools and failed exports honestly.', true);
  add('handoff', deliverables.length ? 'Include editable source, requested successful files and a concise opening/editing/continuation note.' : 'Return the requested result with a short change note and next useful action.');
  return {
    schema: 'ingenium-task/1', intent, depth, request,
    assumptions: [
      'This is a plan for an already classified request; no model, tool, file or capability has been executed.',
      'No project store, record form, fixed variant count or installation is required.',
      ...inputs.map(input => `Supplied input description: ${input}`),
    ],
    materialQuestions: [], operations, deliverables: [...deliverables], continuation: deliverables.length ? 'file' : 'none',
  };
}

function pointer(value, path) {
  if (path === '') return { found: true, value };
  if (!path.startsWith('/') || /~(?![01])/u.test(path)) throw new TypeError('Protected fields must be JSON pointers');
  for (const part of path.slice(1).split('/').map(key => key.replace(/~1/g, '/').replace(/~0/g, '~'))) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) return { found: false };
    value = value[part];
  }
  return { found: true, value };
}

// Callers provide source-grounded JSON projections and literal text, not model-inferred facts.
export function reviewRevision(options = {}) {
  assertJson(options);
  if (!options || typeof options !== 'object' || Array.isArray(options) || !Object.hasOwn(options, 'before') || !Object.hasOwn(options, 'after') || Object.keys(options).some(key => !['before', 'after', 'protectedFields', 'suppliedWording', 'recordChange'].includes(key))) throw new TypeError('Revision review requires before, after and supported options only');
  const { before, after, protectedFields = [], suppliedWording = [], recordChange } = options;
  if (!Array.isArray(protectedFields) || protectedFields.length > 256 || protectedFields.some(field => typeof field !== 'string' || field.length > 1024)) throw new TypeError('Expected at most 256 protected JSON pointers');
  if (!Array.isArray(suppliedWording) || suppliedWording.length > 256) throw new TypeError('Expected bounded supplied wording comparisons');
  const checks = protectedFields.map((field, i) => {
    const a = pointer(before, field), b = pointer(after, field);
    return { id: `protected-${i + 1}`, status: a.found && b.found && isDeepStrictEqual(a.value, b.value) ? 'pass' : 'fail', scope: `Exact protected JSON field ${field || '/'}`, evidenceIds: [] };
  });
  for (const [i, entry] of suppliedWording.entries()) {
    if (!entry || !nonempty(entry.text) || typeof entry.before !== 'string' || typeof entry.after !== 'string' || entry.before.length > 262144 || entry.after.length > 262144 || Object.keys(entry).some(key => !['text', 'before', 'after'].includes(key))) throw new TypeError('Wording comparisons require bounded literal text, before and after');
    const count = content => content.split(entry.text).length - 1;
    checks.push({ id: `wording-${i + 1}`, status: count(entry.before) > 0 && count(entry.before) === count(entry.after) ? 'pass' : 'fail', scope: 'Exact supplied literal wording occurrence count only; position, rendering and meaning untested', evidenceIds: [] });
  }
  if (before?.record !== undefined || after?.record !== undefined) {
    let status = 'pass';
    try {
      if (!validateRecord(before.record).valid || !validateRecord(after.record).valid) throw new Error('Invalid record');
      if (recordChange === undefined) { if (!isDeepStrictEqual(before.record, after.record)) throw new Error('Changed record requires reviseRecord change'); }
      else if (!isDeepStrictEqual(reviseRecord(before.record, recordChange), after.record)) throw new Error('Record differs from protected revision');
    } catch { status = 'fail'; }
    checks.push({ id: 'record-protection', status, scope: 'Existing records-v1 validation and explicit reopen rules', evidenceIds: [] });
  } else if (recordChange !== undefined) throw new TypeError('recordChange requires before and after records');
  const changedFields = [];
  const diff = (a, b, at = '') => {
    if (isDeepStrictEqual(a, b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[key], b[key], `${at}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`);
    } else changedFields.push(at);
  };
  diff(before, after);
  return { schema: 'ingenium-revision-review/1', checks, changedFields, status: checks.some(c => c.status === 'fail') ? 'fail' : checks.length ? 'pass' : 'review-needed', limitations: ['Only supplied bounded JSON projections and literal text are compared.', 'No behavioral preservation, visual quality, engineering adequacy, native model binding or acceptance is established.'] };
}
