import { isDeepStrictEqual } from 'node:util';
import { assertProjectState, clone, fail, jsonProblems } from './schema.mjs';
const normalizeText = text => text.replace(/\r\n?/g, '\n').normalize('NFC');
function keyedChanges(before, after, key) {
  const left = new Map(before.map(value => [key(value), value])); const right = new Map(after.map(value => [key(value), value])); const changes = [];
  for (const id of new Set([...left.keys(), ...right.keys()])) { const old = left.get(id); const next = right.get(id); if (!isDeepStrictEqual(old, next)) changes.push({ id, kind: !old ? 'added' : !next ? 'removed' : 'changed', before: old === undefined ? null : clone(old), after: next === undefined ? null : clone(next) }); }
  return changes;
}
export function compareProjectVersions(options) {
  if (jsonProblems(options).length || !options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => !['before', 'after', 'expectedChanges', 'sourceTexts'].includes(key))) fail('INVALID_OPTIONS', 'Expected {before,after,expectedChanges?,sourceTexts?}.');
  const { before, after, expectedChanges = [], sourceTexts = {} } = options;
  assertProjectState(before); assertProjectState(after);
  if (before.projectId !== after.projectId) fail('IDENTITY_MISMATCH', 'Cannot compare different project identities.');
  if (!Array.isArray(expectedChanges) || expectedChanges.length > 256 || expectedChanges.some(value => typeof value !== 'string' || !value || value.length > 8192)) fail('INVALID_OPTIONS', 'expectedChanges must be bounded change-path strings.');
  if (!sourceTexts || typeof sourceTexts !== 'object' || Array.isArray(sourceTexts) || Object.keys(sourceTexts).some(key => !['before', 'after'].includes(key))) fail('INVALID_OPTIONS', 'sourceTexts accepts before/after maps keyed by source ID.');
  for (const map of Object.values(sourceTexts)) if (!map || typeof map !== 'object' || Array.isArray(map) || Object.values(map).some(value => typeof value !== 'string' || Buffer.byteLength(value) > 1048576)) fail('INVALID_OPTIONS', 'Text maps must contain bounded strings.');
  const changes = [];
  for (const field of ['brief', 'nextAction', 'openQuestions']) if (!isDeepStrictEqual(before[field], after[field])) changes.push({ path: `$.${field}`, kind: 'changed', before: clone(before[field] ?? null), after: clone(after[field] ?? null) });
  if (!isDeepStrictEqual(before.record, after.record)) {
    if (!before.record || !after.record) changes.push({ path: '$.record', kind: !before.record ? 'added' : 'removed', before: clone(before.record ?? null), after: clone(after.record ?? null) });
    else { if (before.record.purpose !== after.record.purpose) changes.push({ path: '$.record.purpose', kind: 'changed', before: before.record.purpose, after: after.record.purpose }); for (const field of ['evidence', 'interpretations', 'decisions', 'artifacts']) for (const change of keyedChanges(before.record[field], after.record[field], value => value.id)) changes.push({ path: `$.record.${field}[${change.id}]`, ...change }); }
  }
  for (const field of ['sources', 'outputs', 'resources', 'versions']) for (const change of keyedChanges(before[field] ?? [], after[field] ?? [], value => value.id ?? `${value.providerId}:${value.assetId}`)) changes.push({ path: `$.${field}[${change.id}]`, ...change });
  const text = [];
  for (const change of changes.filter(change => change.path.startsWith('$.sources['))) {
    const left = sourceTexts.before?.[change.id]; const right = sourceTexts.after?.[change.id];
    if (typeof left === 'string' && typeof right === 'string' && /^(text\/|application\/(json|javascript|xml)|image\/svg\+xml)/.test(change.after?.mediaType ?? change.before?.mediaType ?? '')) text.push({ id: change.id, status: 'pass', normalizedEqual: normalizeText(left) === normalizeText(right), before: normalizeText(left), after: normalizeText(right), scope: 'Caller-supplied text normalization (Unicode NFC and newline form); no rendering or behavior check.' });
    else text.push({ id: change.id, status: 'not-run', reason: 'Supported text was not supplied for both versions; no file was opened.' });
  }
  return { projectId: before.projectId, beforeRevision: before.revision, afterRevision: after.revision, changes: changes.map(change => ({ ...change, expected: expectedChanges.includes(change.path) })), unexpectedDifferences: changes.filter(change => !expectedChanges.includes(change.path)).map(change => change.path), text, layout: { status: 'not-run', reason: 'No supported explicit layout record is supplied by ProjectStateV1.' }, behavior: { status: 'not-run', reason: 'Hash, record and text comparisons do not establish preserved interaction behavior or acceptance.' } };
}
