# Same-screen state sequence

**Question:** What changes after an action while the person stays in the same workspace?

Repeat the same frame and preserve spatial anchors so the changed parts are evident. Name each state and its trigger. Where relevant, distinguish raw input, valid working-model value, view state, the semantic revision a validation result inspected, and the revision acknowledged by a save. Local validity is not persistence: use “Saved” only after the required acknowledgement for that revision. Identify which work survives cancel, navigation or retry. Undo restores a prior value through a new semantic revision; it must not rewind revision identity or inherit an earlier save/validation receipt. Show selection/focus consequences if they matter. Do not substitute a new page for every state.

**Review:** Check that state labels agree with visible controls and messages, and that feedback does not imply persistence before confirmation. Static snapshots specify intended transitions; timing, storage, focus restoration and cancellation remain untested until exercised.


Keep an aligned delta ledger: changed raw input, working values, diagnostics and revisions versus unchanged anchors, selection and owner. Draw retained invalid input, its repair/valid update and scoped model undo when those resolve the uncertainty. Preserve the project editing policy: automatic valid updates are compatible; a valid-model transition does not require a global Apply button. Invalid input never overwrites the valid working model. Text undo differs from model undo; resolve a pending raw draft before model undo, which restores a prior value with a new semantic revision. Diagnostics and request/acknowledgement freshness are separate versioned records.

Use the [shared study contract](contract.md). Consequential interactions also use [connected sketches](../interaction-sketches.md).
