# Task planning and narrow revision review

Import `planTask` and `reviewRevision` from `src/workflow/task.mjs`. Both are pure: they do not open paths, execute a model, probe capabilities, persist a record or install tools. Node 22 or later is required for these optional helpers. Guidance and ordinary source editing remain independently usable.

```js
const plan = planTask({
  intent: 'revise',
  request: 'Change only the title treatment. Preserve the wording and relationships.',
  inputs: ['drawing.svg and its retained source model'],
  deliverables: ['editable SVG']
});
```

`planTask({intent,depth?,request,inputs?,deliverables?})` accepts already classified `create`, `compare`, `revise`, `review` or `continue` requests. `make` aliases `create`. Depth defaults to `quick`; `standard` and `deep` are available, and `progressive` aliases `standard`. `inputs` and `deliverables` are optional arrays of at most 64 nonempty string descriptions. Inputs are retained descriptions, never interpreted as trusted facts or opened as files. Request and description strings are bounded to 32,768 characters. Unsupported options and non-JSON/accessor values refuse.

The detached result is `{schema:'ingenium-task/1',intent,depth,request,assumptions,materialQuestions,operations,deliverables,continuation}`. Each operation is `{id,kind,dependsOn,optional,reason}`; kinds are `inspect-inputs`, `study`, `edit`, `review`, `export` and `handoff`. Dependencies refer only to earlier operations. No persistence is required: continuation is `none` without requested file deliverables and `file` with them. A store is a separate explicit choice.

Quick work defaults to one output and at most one useful targeted visual probe. Standard/deep plans add an optional study stage for named uncertainty; they do not mandate variants, additional edits, records or export formats. A settled edit stays one edit at every depth. The planner does not infer essential missing information from arbitrary prose; `materialQuestions` is empty and the caller remains responsible for material clarifications. The returned review/export operations are proposed work, never claims that tools are available or checks passed.

```js
const review = reviewRevision({
  before: { title: 'Field Station', connections: source.connections, treatment: 'plain' },
  after: { title: 'Field Station', connections: source.connections, treatment: 'framed' },
  protectedFields: ['/title', '/connections'],
  suppliedWording: [{ text: 'Field Station', before: beforeSvg, after: afterSvg }]
});
```

`reviewRevision({before,after,protectedFields?,suppliedWording?,recordChange?})` accepts bounded plain JSON projections supplied by the caller. Protected fields use RFC 6901 JSON pointers; both values must exist and match exactly. `suppliedWording` entries are `{text,before,after}`; they check that a nonzero literal occurrence count remains equal. This measures exact literal strings, including SVG/XML spellings, rather than rendered text, location or language meaning. Each source string is bounded to 262,144 characters; protected-field and wording arrays contain at most 256 entries. Missing protected fields fail rather than silently passing. The whole JSON input is bounded to 1 MiB, ten nested levels and 30,000 nodes.

If either projection includes `record`, both must contain valid unchanged records-v1 records. An altered record requires `recordChange` whose actual `reviseRecord(before.record,recordChange)` result equals `after.record`; chosen decisions keep the existing explicit reopen rules. Ordinary JSON projections do not create decision authority. Source-model identities and connectors are protected only when the caller includes their actual source data and pointers; this helper does not infer a native model binding from an SVG.

The result is `{schema:'ingenium-revision-review/1',checks,changedFields,status,limitations}`. `changedFields` contains JSON pointers to changed values, treating arrays as complete values. Checks use the existing six-status vocabulary and exact scopes. A result with no declared checks is `review-needed`. A passing result establishes only the declared comparisons. Behavior, editor reopening, rendering, engineering adequacy and acceptance need their own observations.

## Optional promotion of an existing quick project

`promoteQuickProject` from `src/workflow/promotion.mjs` enriches the same valid `ProjectStateV1` envelope when structured records are useful. Quick tasks remain valid without calling it. It does not read files, infer decisions from prose, save state or create a new project. Supply an explicitly identified inventory and an authored records-v1 candidate:

```js
const choices = [{
  id: 'title-wording', wording: 'Keep the title Field Station.',
  scope: 'Title wording in the engineering graphic',
  source: 'CONTINUE.md, retained explicit title choice'
}];
const record = {
  version: 1, id: 'field-station-record', revision: 0, purpose: project.brief,
  evidence: [{ id: 'title-source', statement: choices[0].wording, source: choices[0].source }],
  interpretations: [],
  decisions: [{ id: 'title-decision', question: 'Title wording?', scope: choices[0].scope,
    status: 'chosen', choice: choices[0].wording,
    evidenceIds: ['title-source'], interpretationIds: [] }],
  artifacts: []
};
const promoted = promoteQuickProject({
  project, choices, record,
  mapping: [{ choiceId: 'title-wording', decisionId: 'title-decision' }]
});
// promoted.project retains the same brief, identifiers, sources and base revision.
// promoted.coverage === [{choiceId:'title-wording',decisionId:'title-decision',evidenceId:'title-source'}]
```

The exact input is `{project,choices,record,mapping}`. Each choice requires only `id,wording,scope,source`; each mapping requires only `choiceId,decisionId`. IDs are safe record-style strings up to 128 characters; wording, scope and source locator are nonempty strings up to 8 KiB. Both arrays are bounded to 256 entries; the combined plain JSON input retains the shared 1 MiB/depth/node bounds. Admission rejects getters before reading them.

The project must be valid and have no existing record. The supplied record must pass unchanged records-v1 validation and start at revision zero. Every declared retained choice maps to exactly one chosen decision, and every candidate chosen decision maps back to exactly one declared choice. A decision's `choice` and `scope` must exactly retain the inventory wording and scope. Exactly one of its referenced evidence entries must retain that wording as `statement` and the exact source locator as `source`. Missing mappings, duplicate/reused IDs, changed wording/scope, absent/ambiguous source evidence and additional unsourced chosen decisions refuse. Open record questions may remain open. Existing structured projects continue through `reviseRecord` and its reopen rules; promotion cannot replace their authority.

The detached result is `{project,coverage,limitations}`. `coverage` contains only `{choiceId,decisionId,evidenceId}` links; the project gains only the authoritative nested record, with no parallel mutable choice array. All prior project fields, source/version identities and the base revision stay unchanged. The optional store can commit this candidate as an ordinary `edit` without `recordChange`; the store checks the current parent and increments the project revision once. Until that explicit save succeeds, no saved or durable state is claimed.

Inventory completeness and actual authorship remain caller responsibilities: the helper does not discover omitted choices in prose, read the source locator, authenticate authority or infer acceptance. Preserve the original brief/source note and review its explicit choices before supplying the inventory. The checker establishes exact coverage relative to that declared inventory; it assigns no new approval or engineering acceptance. The returned receipt can be retained as evidence of normalization without becoming another decision authority.
