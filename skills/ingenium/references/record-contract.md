# Creative record contract, version 1

Records preserve expressed evidence, tentative interpretations, scoped human choices, and artifact descriptions separately. They are portable JSON, with no file reads or writes in either API. Validation establishes structural consistency only; it does not establish truth, provenance, taste, acceptance, engineering adequacy, artifact existence, or user authorization. A caller must obtain the user's choice before recording it as chosen.

Optional helpers require Node 22 or later. Import the named exports from the installed package's `src/records/index.mjs`, resolving that path relative to the plugin root rather than the current working directory. The original synthetic example is `examples/records/poster.json`.

## Exact record shape

Every field listed below is required unless marked optional. Unknown fields are refused. All strings must contain a non-whitespace character. IDs match `/^[A-Za-z][A-Za-z0-9._:-]*$/` and are unique across the record and all four arrays. References must be unique within each reference array and must resolve to the specified kind of entry in the same record. Empty arrays are valid.

| Object | Fields |
| --- | --- |
| Record | `version: 1`, `id: ID`, `revision: nonnegative safe integer`, `purpose: string`, `evidence: Evidence[]`, `interpretations: Interpretation[]`, `decisions: Decision[]`, `artifacts: Artifact[]` |
| Evidence | `id: ID`, `statement: string`, optional `source: string` |
| Interpretation | `id: ID`, `statement: string`, `status: "tentative"`, `evidenceIds: EvidenceID[]` |
| Decision | `id: ID`, `question: string`, `scope: string`, `status: "open" or "chosen"`, `choice: null or string`, `evidenceIds: EvidenceID[]`, `interpretationIds: InterpretationID[]` |
| Artifact | `id: ID`, `description: string`, `evidenceIds: EvidenceID[]`, `decisionIds: DecisionID[]`, optional `path: string` |

Open decisions require `choice: null`. Chosen decisions require a nonempty string choice. Interpretation status is always tentative; choosing a decision does not promote its supporting interpretation. There is no confidence or taste score field, and helpers never invent one. Free text remains the author's claim and is not semantically verified. `source` and `path` are descriptive strings; no link is fetched, path opened, or file existence asserted.

Inputs must be plain JSON data: no undefined values, nonfinite numbers, cycles, sparse arrays, extra array properties, accessors, symbols, or class instances. Version 1 deliberately has no generic extension object that could silently carry unsupported state. Persist version 1 through ordinary JSON serialization. No canonical byte order or signing scheme is promised.

## APIs

```js
import { validateRecord, reviseRecord } from './src/records/index.mjs';

const result = validateRecord(record); // { valid: boolean, errors: string[] }
const next = reviseRecord(record, {
  baseRevision: record.revision,
  updates: { artifacts: revisedArtifactArray }
});
```

`validateRecord(record)` returns errors for invalid JSON-shaped input or schema/reference errors. It does not mutate input. It does not infer a revision history from a standalone record.

`reviseRecord(record, change)` validates the base and proposed result, returns a fully detached new JSON record, and throws an actionable error on refusal. It never mutates or freezes caller objects. `change` contains exactly:

- Required `baseRevision`, equal to the input record's current revision.
- Required `updates`, a nonempty object containing any subset of `purpose`, `evidence`, `interpretations`, `decisions`, `artifacts`. Each supplied value replaces that whole field; arrays are not merged. Omitted fields are preserved.
- Optional `reopen`, an array of `{ decisionId: ID, reason: nonempty string }` declarations. No extra declaration fields or duplicate IDs are allowed.

Record `id` and `version` cannot be revised. The helper increments `revision` once; it refuses an exhausted safe integer. A valid nonempty replacement increments the revision even if its value is equal to the prior value.

Ordinary revisions preserve each chosen decision's complete object, its directly referenced evidence and interpretations, evidence referenced by those interpretations, and the record purpose. Reordering arrays is allowed when it does not change these protected entry objects. Changing or removing protected context requires explicitly reopening every affected chosen decision. This conservative rule prevents a choice from silently acquiring a different question, scope, evidence, interpretation, or purpose. Unreferenced evidence and artifacts can be revised normally.

Reopening requires an existing chosen decision. The same revision must retain that decision ID with `status: "open"` and `choice: null`; a subsequent revision can record a new explicit choice. An explicit reopen permits changing its former support and scope, subject to reference validation and protection by other chosen decisions. Removing a chosen decision in its reopening revision is refused. An open decision may be removed later if nothing references it.

```js
const reopened = reviseRecord(record, {
  baseRevision: record.revision,
  updates: {
    decisions: record.decisions.map(d => d.id === 'd-palette'
      ? { ...d, status: 'open', choice: null }
      : d)
  },
  reopen: [{ decisionId: 'd-palette', reason: 'The user requested another exploration.' }]
});
```

The change declaration and previous choice are not stored as hidden history in the returned record. If an audit trail is needed, retain both the original record and change in caller-controlled storage. A revision comparison only checks the input snapshot: it provides no lock, transactional persistence, globally unique record identity, authenticated decision, or protection against another writer overwriting a saved file. The caller must compare against the authoritative latest snapshot and handle persistence concurrency separately.

## Verification

Run `node --test tests/records/*.test.mjs` from the plugin root on Node 22+. Tests cover synthetic JSON round trips, input immutability and detachment, preserved chosen context, reopening and later reselection, transitive/shared evidence protection, stale revisions, dangling and wrong-kind references, malformed JSON data, invalid states, and refused numerical confidence fields. No dependencies or external services are needed.
