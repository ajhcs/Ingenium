# Empty and error states

**Question:** What can the person understand and do when useful content is unavailable?

**Make:** An inventory of cause, region or operation, retained work, available actions, preconditions and exit, then the states it calls for. Consider first use, no matches, loading, invalid input, access refusal, save or service failure and malformed import, but draw only what the uncertainty needs. State only known causes; an unknown cause stays unknown. Pair each message with a realistic next action and show whether entered work, selection or filters are kept. Offer correction, clearing filters, retry or leaving, as appropriate. Mark an action unavailable when its operation can't be performed.

Scope each state to its region and operation. A background refresh can be loading while a separate editor shows a failed save; don't make independent regions mutually exclusive without a domain reason.

**Review it for:** A first-use state doesn't claim a failure, a no-match state doesn't erase data, and retry doesn't claim success. Retry is a fresh request whose acknowledgement must match its request ID and revision and still be current. Decorative illustration and friendly copy can't replace an actionable recovery.

**Done when:** Every drawn state has a cause, retained-work answer and exit, and you've claimed only the paths actually drawn. Static examples don't show that a service is reachable or that retry is safe.

Use the [shared study contract](contract.md). Consequential interactions also use [connected sketches](../interaction-sketches.md).
