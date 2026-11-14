import { validateRecord } from '../records/index.mjs';
import { validateDelivery } from '../delivery/schema.mjs';

export const STATE_LIMITS = Object.freeze({ bytes: 1048576, briefBytes: 32768, stringBytes: 8192, refs: 256, collections: 128, depth: 10 });
export const ID = /^[A-Za-z][A-Za-z0-9._:-]*$/;
export const HASH = /^[a-f0-9]{64}$/;
export const clone = value => JSON.parse(JSON.stringify(value));
export function isRelativePath(value) {
  if (typeof value !== 'string' || !value || /[\\\u0000-\u001f\u007f:%?#]/u.test(value) || value.startsWith('/') || /^[A-Za-z]:/.test(value)) return false;
  return value.split('/').every(part => part && part !== '.' && part !== '..');
}
export class ProjectStateError extends Error {
  constructor(code, message, nextStep = 'Inspect the continuation and retry with corrected input.', details = {}) {
    super(message); this.name = 'ProjectStateError'; this.code = code; this.nextStep = nextStep; this.details = details;
  }
}
export function fail(code, message, nextStep, details) { throw new ProjectStateError(code, message, nextStep, details); }

// Descriptor inspection precedes every property read. Accessors, cyclic/non-JSON
// values, sparse arrays, hidden properties and over-depth structures are refused.
export function jsonProblems(value, path = '$', depth = 0, ancestors = new Set(), errors = []) {
  const add = message => errors.push({ code: 'INVALID_JSON', path, message, nextStep: 'Supply bounded plain JSON without accessors or cycles.' });
  if (depth > STATE_LIMITS.depth) { add('Maximum JSON depth is ten.'); return errors; }
  if (value === null || ['boolean', 'string'].includes(typeof value)) return errors;
  if (typeof value === 'number') { if (!Number.isFinite(value)) add('Expected a finite number.'); return errors; }
  if (typeof value !== 'object') { add('Expected JSON data.'); return errors; }
  if (ancestors.has(value)) { add('Cyclic JSON is not supported.'); return errors; }
  const array = Array.isArray(value);
  if (!array && Object.getPrototypeOf(value) !== Object.prototype) { add('Expected a plain JSON object.'); return errors; }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors).filter(key => !(array && key === 'length'));
  if (array && (keys.length !== value.length || keys.some((key, index) => key !== String(index)))) add('Expected a dense JSON array.');
  ancestors.add(value);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) add('Only enumerable string-keyed data properties are accepted.');
    else jsonProblems(descriptor.value, `${path}.${key}`, depth + 1, ancestors, errors);
    if (errors.length > 128) break;
  }
  ancestors.delete(value);
  return errors;
}

export function validateProjectState(state) {
  const errors = jsonProblems(state);
  if (errors.length) return { valid: false, errors };
  const err = (code, path, message, nextStep = 'Correct this field and validate again.') => errors.push({ code, path, message, nextStep });
  if (Buffer.byteLength(JSON.stringify(state)) > STATE_LIMITS.bytes) err('LIMIT_EXCEEDED', '$', 'Envelope exceeds 1 MiB.');
  const obj = (value, path, required, optional = []) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { err('INVALID_STATE', path, 'Expected an object.'); return false; }
    for (const key of required) if (!Object.hasOwn(value, key)) err('INVALID_STATE', `${path}.${key}`, 'Required field.');
    for (const key of Object.keys(value)) if (![...required, ...optional].includes(key)) err('INVALID_STATE', `${path}.${key}`, 'Unknown field.');
    return true;
  };
  const str = (value, path, max = STATE_LIMITS.stringBytes) => { if (typeof value !== 'string' || !value.trim() || Buffer.byteLength(value) > max) err('INVALID_STATE', path, `Expected nonempty string up to ${max} UTF-8 bytes.`); };
  const id = (value, path) => { str(value, path); if (typeof value !== 'string' || !ID.test(value)) err('INVALID_ID', path, 'Expected safe record-style ID.'); };
  const hash = (value, path) => { if (typeof value !== 'string' || !HASH.test(value)) err('INVALID_HASH', path, 'Expected lowercase SHA-256.'); };
  const revision = (value, path) => { if (!Number.isSafeInteger(value) || value < 0) err('INVALID_STATE', path, 'Expected nonnegative safe integer.'); };
  const list = (value, path, max, check) => { if (!Array.isArray(value) || value.length > max) { err('LIMIT_EXCEEDED', path, `Expected array with at most ${max} members.`); return; } value.forEach((entry, index) => check(entry, `${path}[${index}]`)); };
  const unique = (values, path, key = 'id') => { if (!Array.isArray(values)) return; const seen = new Set(); values.forEach((value, index) => { if (value && seen.has(value[key])) err('DUPLICATE_ID', `${path}[${index}].${key}`, 'Duplicate identity in namespace.'); seen.add(value?.[key]); }); };
  const ref = (value, path) => { if (!obj(value, path, ['id', 'path', 'sha256', 'mediaType'])) return; id(value.id, `${path}.id`); if (!isRelativePath(value.path)) err('PATH_ESCAPE', `${path}.path`, 'Expected normalized contained relative POSIX path.'); hash(value.sha256, `${path}.sha256`); str(value.mediaType, `${path}.mediaType`); };
  const refs = (value, path) => { list(value, path, STATE_LIMITS.refs, ref); unique(value, path); };
  const idList = (value, path) => { list(value, path, STATE_LIMITS.refs, id); if (Array.isArray(value) && new Set(value).size !== value.length) err('DUPLICATE_ID', path, 'Duplicate reference.'); };
  if (!obj(state, '$', ['schema', 'projectId', 'revision', 'brief', 'sources', 'outputs', 'nextAction'], ['record', 'openQuestions', 'versions', 'resources', 'delivery'])) return { valid: false, errors };
  if (state.schema !== 'ingenium-project/1') err('UNSUPPORTED_VERSION', '$.schema', 'Only ingenium-project/1 is supported.', 'Retain the original; use a compatible explicit migration.');
  id(state.projectId, '$.projectId'); revision(state.revision, '$.revision'); str(state.brief, '$.brief', STATE_LIMITS.briefBytes);
  refs(state.sources, '$.sources'); refs(state.outputs, '$.outputs'); unique([...(Array.isArray(state.sources) ? state.sources : []), ...(Array.isArray(state.outputs) ? state.outputs : [])], '$.sources/outputs');
  if (state.nextAction !== null) str(state.nextAction, '$.nextAction');
  if (Object.hasOwn(state, 'record')) for (const message of validateRecord(state.record).errors) err('INVALID_RECORD', '$.record', message, 'Correct the unchanged records-v1 contract.');
  if (Object.hasOwn(state, 'openQuestions')) { list(state.openQuestions, '$.openQuestions', STATE_LIMITS.collections, (value, path) => { if (!obj(value, path, ['id', 'question', 'consequence'])) return; id(value.id, `${path}.id`); str(value.question, `${path}.question`); str(value.consequence, `${path}.consequence`); }); unique(state.openQuestions, '$.openQuestions'); }
  if (Object.hasOwn(state, 'versions')) {
    list(state.versions, '$.versions', STATE_LIMITS.collections, (value, path) => { if (!obj(value, path, ['id', 'name', 'revision', 'sources', 'previews'], ['basedOnVersionId'])) return; id(value.id, `${path}.id`); str(value.name, `${path}.name`); revision(value.revision, `${path}.revision`); refs(value.sources, `${path}.sources`); refs(value.previews, `${path}.previews`); unique([...(Array.isArray(value.sources) ? value.sources : []), ...(Array.isArray(value.previews) ? value.previews : [])], path); if (Object.hasOwn(value, 'basedOnVersionId')) id(value.basedOnVersionId, `${path}.basedOnVersionId`); });
    unique(state.versions, '$.versions');
    if (Array.isArray(state.versions)) { const versions = new Map(state.versions.map(value => [value?.id, value])); for (const version of state.versions) { const seen = new Set(); let cursor = version; while (cursor?.basedOnVersionId) { if (seen.has(cursor.id)) { err('VERSION_CYCLE', '$.versions', 'Version ancestry is cyclic.'); break; } seen.add(cursor.id); if (!versions.has(cursor.basedOnVersionId)) { err('DANGLING_REFERENCE', '$.versions', 'Unknown basedOnVersionId.'); break; } cursor = versions.get(cursor.basedOnVersionId); } } }
  }
  if (Object.hasOwn(state, 'resources')) {
    list(state.resources, '$.resources', STATE_LIMITS.collections, (value, path) => { if (!obj(value, path, ['providerId', 'assetId', 'sourceRevision', 'originalSHA256', 'qualificationEvidenceIds', 'noticeIds', 'acquisitionMode'], ['derivedSHA256'])) return; id(value.providerId, `${path}.providerId`); id(value.assetId, `${path}.assetId`); str(value.sourceRevision, `${path}.sourceRevision`); hash(value.originalSHA256, `${path}.originalSHA256`); if (Object.hasOwn(value, 'derivedSHA256')) hash(value.derivedSHA256, `${path}.derivedSHA256`); idList(value.qualificationEvidenceIds, `${path}.qualificationEvidenceIds`); idList(value.noticeIds, `${path}.noticeIds`); if (!['bundled', 'local', 'network', 'injected-fixture'].includes(value.acquisitionMode)) err('INVALID_STATE', `${path}.acquisitionMode`, 'Unknown acquisition mode.'); });
    if (Array.isArray(state.resources)) { const keys = state.resources.filter(value => typeof value?.providerId === 'string' && typeof value?.assetId === 'string').map(value => `${value.providerId}\u0000${value.assetId}`); if (new Set(keys).size !== keys.length) err('DUPLICATE_ID', '$.resources', 'Resource selection repeated.'); }
  }
  if (Object.hasOwn(state, 'delivery')) { for (const problem of validateDelivery(state.delivery).errors) err(problem.code, `$.delivery${problem.path?.startsWith('$') ? problem.path.slice(1) : ''}`, problem.message, problem.nextStep); if (state.delivery?.projectId !== state.projectId) err('IDENTITY_MISMATCH', '$.delivery.projectId', 'Delivery belongs to a different project.'); }
  // Bound all nested strings, including unchanged record fields.
  const strings = (value, path) => { if (typeof value === 'string' && path !== '$.brief' && Buffer.byteLength(value) > STATE_LIMITS.stringBytes) err('LIMIT_EXCEEDED', path, 'String exceeds 8 KiB.'); else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) strings(child, `${path}.${key}`); }; strings(state, '$');
  return { valid: errors.length === 0, errors };
}
export function assertProjectState(state) { const result = validateProjectState(state); if (!result.valid) fail(result.errors[0].code, result.errors.map(error => `${error.path}: ${error.message}`).join('; '), result.errors[0].nextStep, { errors: result.errors }); }
export function createContinuation(options) {
  const problems = jsonProblems(options); if (problems.length) fail('INVALID_JSON', problems[0].message);
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail('INVALID_STATE', 'Continuation options must be an object.');
  const result = { schema: 'ingenium-project/1', revision: 0, sources: [], outputs: [], nextAction: null, ...options };
  assertProjectState(result); return clone(result);
}
export function migrateProjectState(state) { assertProjectState(state); return clone(state); }
