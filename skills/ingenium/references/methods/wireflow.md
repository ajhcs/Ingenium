# Wireflow

**Question:** How does an action lead to a result, including an alternate or failed route?

**Make:** Small recognizable views connected by directional links labeled with the triggering action or condition. Name the entry state, key branch, outcome and recovery. Distinguish navigation from an in-place state change. Give every scene, state and edge a stable name; an edge records source and destination state IDs, trigger kind, control reference, guard, effect and preserved work. Thumbnails should show the action, not a flowchart label standing in for a view. An in-place refusal returns to the same state identity.

**Review it for:** Follow the representative path forward and back. Look for dead ends, unexplained effects and a missing route from refusal to correction. Every arrow should say what it means, not just connect nearby boxes.

**Done when:** The representative path, its branch and its recovery are drawn, and missing-title, cancellation and back routes are each recorded as drawn or omitted, along with external handoffs. A drawn path is a proposed sequence, not an executed journey or a mandate for a fixed order.

Use the [shared study contract](contract.md). Consequential interactions also use [connected sketches](../interaction-sketches.md).
