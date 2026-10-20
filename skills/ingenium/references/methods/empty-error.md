# Empty and error states

**Question:** What can the person understand and do when useful content is unavailable?

Distinguish first use, no matches, loading, access refusal, validation failure and service failure where relevant. State only known causes. Pair the relevant message with a realistic next action; show whether entered work, selection or filters are retained. Give a route to correction, clearing filters, retry or leaving the task as appropriate. Mark an action unavailable when the underlying operation cannot be performed.

Scope each state to its region and operation. A background refresh can be loading while a separate editor retains a failed-save message; do not make independent regions mutually exclusive without a domain reason.

**Review:** Check that a first-use empty state does not claim a failure, a no-match state does not erase data, and retry does not claim success. Decorative illustrations and friendly copy cannot replace actionable recovery. Static examples do not prove a service is reachable or that retry is safe.


Use an inventory of cause, region/operation, retained work, available actions, preconditions and exit. Consider first use, no results, invalid input, access unavailable, save failure and malformed import, but claim only the paths actually drawn. Unknown cause remains unknown. Retry is a fresh request whose acknowledgement must match request ID/revision and remain current; pending or stale feedback does not establish success.

Use the [shared study contract](contract.md). Consequential interactions also use [connected sketches](../interaction-sketches.md).
