import { isDeepStrictEqual } from 'node:util';

const lists = ['evidence', 'interpretations', 'decisions', 'artifacts'];
const idPattern = /^[A-Za-z][A-Za-z0-9._:-]*$/;
const own = (object, key) => Object.hasOwn(object, key);
const clone = value => JSON.parse(JSON.stringify(value));

// Accept JSON data only: no coercion, instance objects, undefined, or cycles.
function jsonErrors(value, path = 'record', ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return [];
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [`${path}: expected finite JSON number`];
  if (typeof value !== 'object') return [`${path}: expected JSON data`];
  if (ancestors.has(value)) return [`${path}: cyclic JSON data`];
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return [`${path}: expected plain JSON object`];
  ancestors.add(value);
  const errors = [];
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !descriptor.enumerable || !own(descriptor, 'value')) errors.push(`${path}: expected enumerable JSON properties`);
    else errors.push(...jsonErrors(descriptor.value, `${path}.${key}`, ancestors));
  }
  if (Array.isArray(value) && (Object.keys(value).length !== value.length || Object.keys(value).some((key, index) => key !== String(index)))) errors.push(`${path}: expected dense JSON array`);
  ancestors.delete(value);
  return errors;
}

export function validateRecord(record) {
  const errors = jsonErrors(record);
  if (errors.length) return { valid: false, errors };
  const object = (value, path, required, optional = []) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { errors.push(`${path}: expected object`); return false; }
    for (const key of required) if (!own(value, key)) errors.push(`${path}.${key}: required`);
    for (const key of Object.keys(value)) if (![...required, ...optional].includes(key)) errors.push(`${path}.${key}: unsupported field`);
    return true;
  };
  const string = (value, path) => { if (typeof value !== 'string' || !value.trim()) errors.push(`${path}: expected nonempty string`); };
  const id = (value, path) => { if (typeof value !== 'string' || !idPattern.test(value)) errors.push(`${path}: expected ID matching ${idPattern}`); };
  const refs = [];
  const ids = new Map();
  const register = (value, path, kind) => {
    id(value, `${path}.id`);
    if (typeof value === 'string') {
      if (ids.has(value)) errors.push(`${path}.id: duplicate ID ${value}`);
      else ids.set(value, kind);
    }
  };
  const references = (value, path, kind) => {
    if (!Array.isArray(value)) { errors.push(`${path}: expected ID array`); return; }
    const seen = new Set();
    value.forEach((entry, index) => {
      id(entry, `${path}[${index}]`);
      if (typeof entry !== 'string' || !idPattern.test(entry)) return;
      if (seen.has(entry)) errors.push(`${path}: duplicate reference ${entry}`);
      seen.add(entry);
      refs.push({ entry, path, kind });
    });
  };
  if (!object(record, 'record', ['version', 'id', 'revision', 'purpose', ...lists])) return { valid: false, errors };
  if (record.version !== 1) errors.push('record.version: supported version is 1');
  register(record.id, 'record', 'record');
  if (!Number.isSafeInteger(record.revision) || record.revision < 0) errors.push('record.revision: expected nonnegative safe integer');
  string(record.purpose, 'record.purpose');
  for (const kind of lists) {
    if (!Array.isArray(record[kind])) { errors.push(`record.${kind}: expected array`); continue; }
    record[kind].forEach((entry, index) => {
      const path = `record.${kind}[${index}]`;
      const required = {
        evidence: ['id', 'statement'],
        interpretations: ['id', 'statement', 'status', 'evidenceIds'],
        decisions: ['id', 'question', 'scope', 'status', 'choice', 'evidenceIds', 'interpretationIds'],
        artifacts: ['id', 'description', 'evidenceIds', 'decisionIds'],
      }[kind];
      if (!object(entry, path, required, { evidence: ['source'], artifacts: ['path'] }[kind] || [])) return;
      register(entry.id, path, kind);
      for (const field of ['statement', 'question', 'scope', 'description', 'source', 'path']) if (own(entry, field)) string(entry[field], `${path}.${field}`);
      if (kind === 'interpretations' && entry.status !== 'tentative') errors.push(`${path}.status: must remain tentative`);
      if (kind === 'decisions') {
        if (!['open', 'chosen'].includes(entry.status)) errors.push(`${path}.status: expected open or chosen`);
        if (entry.status === 'open' && entry.choice !== null) errors.push(`${path}.choice: open decisions require null`);
        if (entry.status === 'chosen') string(entry.choice, `${path}.choice`);
      }
      for (const [field, target] of [['evidenceIds', 'evidence'], ['interpretationIds', 'interpretations'], ['decisionIds', 'decisions']]) {
        if (required.includes(field)) references(entry[field], `${path}.${field}`, target);
      }
    });
  }
  for (const { entry, path, kind } of refs) if (ids.get(entry) !== kind) errors.push(`${path}: dangling or wrong-kind ${kind} ID ${String(entry)}`);
  return { valid: errors.length === 0, errors };
}

function assertValid(record, label) {
  const result = validateRecord(record);
  if (!result.valid) throw new Error(`${label}: ${result.errors.join('; ')}`);
}

export function reviseRecord(record, change) {
  assertValid(record, 'Invalid base record');
  const errors = jsonErrors(change, 'change');
  if (errors.length) throw new Error(errors.join('; '));
  if (!change || typeof change !== 'object' || Array.isArray(change)) throw new Error('change: expected object');
  for (const key of Object.keys(change)) if (!['baseRevision', 'updates', 'reopen'].includes(key)) throw new Error(`change.${key}: unsupported field`);
  if (change.baseRevision !== record.revision) throw new Error(`Stale baseRevision: expected ${record.revision}`);
  if (!change.updates || typeof change.updates !== 'object' || Array.isArray(change.updates)) throw new Error('change.updates: expected object');
  if (Object.keys(change.updates).length === 0) throw new Error('change.updates: provide at least one field');
  for (const key of Object.keys(change.updates)) if (!['purpose', ...lists].includes(key)) throw new Error(`change.updates.${key}: immutable or unsupported field`);
  if (record.revision === Number.MAX_SAFE_INTEGER) throw new Error('Revision exhausted: cannot increment safe integer');
  const reopen = own(change, 'reopen') ? change.reopen : [];
  if (!Array.isArray(reopen)) throw new Error('change.reopen: expected declaration array');
  const reopened = new Set();
  for (const declaration of reopen) {
    if (!declaration || typeof declaration !== 'object' || Array.isArray(declaration) || Object.keys(declaration).length !== 2 || !own(declaration, 'decisionId') || !own(declaration, 'reason') || typeof declaration.reason !== 'string' || !declaration.reason.trim()) throw new Error('change.reopen: each declaration requires decisionId and nonempty reason');
    if (reopened.has(declaration.decisionId)) throw new Error('change.reopen: duplicate decisionId');
    if (!record.decisions.some(item => item.id === declaration.decisionId && item.status === 'chosen')) throw new Error(`Cannot reopen ${declaration.decisionId}: expected existing chosen decision`);
    reopened.add(declaration.decisionId);
  }
  const next = clone({ ...record, ...change.updates, revision: record.revision + 1 });
  assertValid(next, 'Invalid revised record');
  const find = (data, kind, id) => data[kind].find(entry => entry.id === id);
  for (const decision of record.decisions.filter(entry => entry.status === 'chosen')) {
    const revised = find(next, 'decisions', decision.id);
    if (reopened.has(decision.id)) {
      if (!revised || revised.status !== 'open' || revised.choice !== null) throw new Error(`Reopen ${decision.id}: retain ID and set status open, choice null before choosing again`);
      continue;
    }
    if (!isDeepStrictEqual(decision, revised)) throw new Error(`Chosen decision ${decision.id} is protected; declare reopen with a reason`);
    const evidenceIds = new Set(decision.evidenceIds);
    for (const interpretationId of decision.interpretationIds) {
      const interpretation = find(record, 'interpretations', interpretationId);
      if (!isDeepStrictEqual(interpretation, find(next, 'interpretations', interpretationId))) throw new Error(`Chosen decision ${decision.id} protects interpretation ${interpretationId}; declare reopen`);
      interpretation.evidenceIds.forEach(id => evidenceIds.add(id));
    }
    for (const evidenceId of evidenceIds) if (!isDeepStrictEqual(find(record, 'evidence', evidenceId), find(next, 'evidence', evidenceId))) throw new Error(`Chosen decision ${decision.id} protects evidence ${evidenceId}; declare reopen`);
    if (record.purpose !== next.purpose) throw new Error(`Chosen decision ${decision.id} protects record purpose; declare reopen`);
  }
  return next;
}
