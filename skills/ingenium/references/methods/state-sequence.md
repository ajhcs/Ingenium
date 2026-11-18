# Same-screen state sequence

**Question:** What changes after an action while the person stays in the same workspace?

**Make:** Repeat the same frame with fixed spatial anchors so the changed parts stand out; don't swap in a new page per state. Name each state and its trigger. Keep an aligned delta ledger: changed raw input, working values, diagnostics and revisions versus unchanged anchors, selection and owner. Where it matters, separate raw input, the valid working-model value, view state, the semantic revision a validation inspected, and the revision a save acknowledged. Show which work survives cancel, navigation or retry, and any selection or focus consequences.

Follow the project's editing policy. Automatic valid updates are fine; a valid-model transition doesn't need a global Apply button. Invalid input never overwrites the valid working model. Text undo differs from model undo: resolve a pending raw draft first, then model undo restores a prior value through a new semantic revision, without rewinding revision identity or inheriting an earlier save or validation receipt. Draw retained invalid input, its repair and scoped model undo when those resolve the uncertainty.

**Review it for:** State labels agree with the visible controls and messages, and no feedback implies persistence before confirmation. Use "Saved" only after the required acknowledgement for that revision.

**Done when:** Each drawn state has its trigger and ledger entry. Report timing, storage, focus restoration and cancellation as specified but untested until exercised.

Use the [shared study contract](contract.md). Consequential interactions also use [connected sketches](../interaction-sketches.md).
