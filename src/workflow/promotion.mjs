import { validateRecord } from '../records/index.mjs';
import { validateProjectState } from '../project-state/schema.mjs';
import { deliveryJsonErrors } from '../delivery/schema.mjs';

const idPattern = /^[A-Za-z][A-Za-z0-9._:-]*$/;
const fail = (code, message) => { const error = new TypeError(message); error.code = code; throw error; };
const object = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const id = value => typeof value === 'string' && value.length <= 128 && idPattern.test(value);
const text = value => typeof value === 'string' && value.trim().length > 0 && new TextEncoder().encode(value).length <= 8192;

/** Optional, explicit normalization only. No language interpretation or saving. */
export function promoteQuickProject(options) {
  const jsonErrors = deliveryJsonErrors(options);
  if (jsonErrors.length) fail('INVALID_PROMOTION', jsonErrors[0].message);
  if (!object(options, ['project', 'choices', 'record', 'mapping'])) fail('INVALID_PROMOTION', 'Provide exactly project, choices, record and mapping.');
  const { project, choices, record, mapping } = options;
  const stateValidation = validateProjectState(project);
  if (!stateValidation.valid) fail('INVALID_PROJECT', stateValidation.errors.map(error => `${error.path}: ${error.message}`).join('; '));
  if (Object.hasOwn(project, 'record')) fail('ALREADY_STRUCTURED', 'This project already has its authoritative record; use reviseRecord and its explicit reopen rules.');
  const recordValidation = validateRecord(record);
  if (!recordValidation.valid) fail('INVALID_RECORD', recordValidation.errors.join('; '));
  if (record.revision !== 0) fail('INVALID_RECORD', 'Initial promotion requires a revision-zero record; it does not invent earlier record history.');
  if (!Array.isArray(choices) || choices.length > 256) fail('INVALID_CHOICES', 'Supply an explicit inventory of at most 256 retained choices; no choices are inferred from prose.');
  if (!Array.isArray(mapping) || mapping.length > 256) fail('INVALID_MAPPING', 'Supply at most 256 explicit choiceId-to-decisionId mappings.');

  const inventory = new Map();
  for (const choice of choices) {
    if (!object(choice, ['id', 'wording', 'scope', 'source']) || !id(choice.id) || !text(choice.wording) || !text(choice.scope) || !text(choice.source)) fail('INVALID_CHOICES', 'Each declared choice requires safe id and exact nonempty wording, scope and source locator (up to 8 KiB).');
    if (inventory.has(choice.id)) fail('AMBIGUOUS_MAPPING', `Duplicate source choice ID ${choice.id}.`);
    inventory.set(choice.id, choice);
  }
  const decisions = new Map(record.decisions.filter(decision => decision.status === 'chosen').map(decision => [decision.id, decision]));
  const evidence = new Map(record.evidence.map(entry => [entry.id, entry]));
  const mappedChoices = new Set(), mappedDecisions = new Set(), coverage = [];
  for (const entry of mapping) {
    if (!object(entry, ['choiceId', 'decisionId']) || !id(entry.choiceId) || !id(entry.decisionId)) fail('INVALID_MAPPING', 'Each mapping requires only safe choiceId and decisionId.');
    const choice = inventory.get(entry.choiceId), decision = decisions.get(entry.decisionId);
    if (!choice || !decision) fail('UNRESOLVED_MAPPING', 'Every mapping must identify a declared source choice and a candidate chosen decision.');
    if (mappedChoices.has(entry.choiceId) || mappedDecisions.has(entry.decisionId)) fail('AMBIGUOUS_MAPPING', 'Each source choice and chosen decision must appear exactly once.');
    if (decision.choice !== choice.wording) fail('WORDING_CHANGED', `Decision ${decision.id} must retain the exact wording of source choice ${choice.id}.`);
    if (decision.scope !== choice.scope) fail('SCOPE_CHANGED', `Decision ${decision.id} must retain the exact scope of source choice ${choice.id}.`);
    const matches = decision.evidenceIds.map(evidenceId => evidence.get(evidenceId)).filter(item => item.statement === choice.wording && item.source === choice.source);
    if (matches.length !== 1) fail(matches.length ? 'AMBIGUOUS_EVIDENCE' : 'MISSING_EVIDENCE', `Decision ${decision.id} needs exactly one referenced evidence entry retaining the source choice's exact wording and source locator.`);
    mappedChoices.add(entry.choiceId); mappedDecisions.add(entry.decisionId);
    coverage.push({ choiceId: choice.id, decisionId: decision.id, evidenceId: matches[0].id });
  }
  if (mappedChoices.size !== inventory.size) fail('MISSING_MAPPING', 'Every declared retained source choice requires a mapping; retain the quick project and complete the inventory.');
  if (mappedDecisions.size !== decisions.size) fail('UNSOURCED_DECISION', 'Every candidate chosen decision requires its own declared explicit source choice; promotion cannot invent additional choices.');

  const promoted = structuredClone({ ...project, record });
  const promotedValidation = validateProjectState(promoted);
  if (!promotedValidation.valid) fail('INVALID_PROJECT', promotedValidation.errors.map(error => `${error.path}: ${error.message}`).join('; '));
  return {
    project: promoted,
    coverage,
    limitations: [
      'Coverage checks only the caller-declared explicit choice inventory; it does not discover omitted choices or authenticate their authority from prose.',
      'The supplied record retains exact wording, scope and source evidence. No acceptance, engineering adequacy or new approval is assigned.',
      'This detached enrichment preserves the project identity, source/version identities and base revision. It has not saved or incremented a project revision.',
    ],
  };
}
