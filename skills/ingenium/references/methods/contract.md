# Shared study contract

<!-- Modified review paragraph below adapts Impeccable e3083ac3301e4d10517dd6cb58ab645bc2cb6e1b under Apache-2.0. See ../../LICENSE-IMPECCABLE and ../../NOTICE-IMPECCABLE. Other original guidance remains MIT. -->

These rules apply to every method leaf. Read only the leaf you selected; combine methods when the uncertainty warrants it. There is no mandatory order or house style. Keep expressed facts, interpretations and scoped choices distinct, and respect withheld references and existing policy. Consequential interactions still go through the [connected-sketch workflow](../interaction-sketches.md), including any authoritative native-source obligations.

## Keep a compact envelope

Record: a stable artifactID, authored revision, primaryMethod and sourceScenario; layout, appearance and content fidelity as separate values; interactivity and specified actions; delivery dimensions and audience; assumptions, omissions and unresolved choices. sourceScenario declares fixture, imported or native acquisition, the exact available revision and mapping status. If there is no model, API or backend, say so. Never invent a SysML binding or call a proposed fixture native source.

Give scene, state and view elements unique IDs, distinct from the shared domainID and scenarioID. A meaningful named element maps to a domain subject, an interaction requirement or a decorative role. The editorial shell is presentation, not a model entity. Declare mapping granularity and omissions; mapped anchors don't imply complete element or requirement coverage.

## State claims precisely

A claim names its subject, result, evidence, limits, toolVersion and the exact source and view revisions. Results are `not-checked`, `pass`, `fail`, `blocked` or `N/A`. Keep authored/specified status separate from the check result: a static interaction can be specified while its execution is not checked. A hash identifies the supplied bytes, nothing more. A separately rendered preview has its own receipt and source/output identities and doesn't replace the editable source.

## Review what you made

For a substantial review, look at the study at its intended size, for its stated task, current state and next useful action, before reading automated summaries where practical. Reconcile what you see with authoritative source or model obligations and the relevant checks. Keep only actionable findings: the affected element or state, the evidence, the observed problem or tentative consequence, the smallest useful correction, and what must stay fixed. Fix misleading meaning or state, lost work, blocked actions and failed recovery before visual refinement. Judge density, terminology and familiarity in the task's context. Recheck the affected views and bindings after edits. Write it as ordinary prose; a routine correction needs no separate review record, score or approval step.

## Stateful studies

Distinguish the raw draft and its version, the valid working revision, view selection, focus and editing owner, the diagnostic version, requestID/requestedRevision/freshness, and the acknowledged durable revision. Invalid raw input never overwrites the valid working model. Follow the selected editing policy: valid updates may be automatic, so don't impose a global Apply gate. Accept a receipt only for its matching request and revision while fresh. Local validity isn't Saved. Resolve an active raw draft before model undo; text undo is separate. Model undo restores a prior value through a NEW semantic revision, without rewinding identity or inheriting obsolete receipts. Static rules aren't an executed state engine.

## Content and revisions

Keep canonical representative content in editable source parameters and project it into the linked views. A content rename updates every visible projection without replacing domain identity; a layout or appearance edit never mutates the semantic fixture. After edits, verify source hashes, rerender to separate files, inspect the actual pixels, and report stale evidence instead of carrying an earlier pass forward.

For model-backed tasks the native source and its acceptance procedures stay authoritative. Check source, action, state and requirement coverage in both directions at exact revisions, with explicit unknowns and external routes. Don't force every model property into a widget.

## Done when

You can deliver verified paths, the scoped choices, the checks that actually ran and the consequential limits, reported separately for integrity, appearance, specified behavior, executed behavior, accessibility, user acceptance and engineering adequacy. These studies authorize no implementation, installation, merge, release or deployment.
