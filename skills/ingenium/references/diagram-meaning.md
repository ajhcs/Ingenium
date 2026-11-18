# Choose the diagram by its meaning

Use this when the requested artifact is a diagram and its representation is still open. Start with the reader's question and the authoritative source. Keep established notation, model bindings and meaningful or settled positions. Sometimes a table or a short explanation communicates the distinction better.

| Reader's question | Useful representation | Meaning to retain |
| --- | --- | --- |
| What connects to or depends on what? | Topology or dependency graph | Relationship kinds, endpoints and direction; shared dependencies and cycles when present |
| Who sends what to whom, in what order? | Sequence | Participants, messages, ordering and relevant conditions |
| How can one subject change state? | State or lifecycle view | Events, guards, legal transitions and distinct relevant outcomes |
| Who performs each part, and where does work pass between owners? | Lanes | Responsibilities and handoffs |
| What does a customer see while the service performs hidden work? | Service blueprint | Customer actions, visible service actions, backstage work and the visibility boundary |
| When do events or intervals occur? | Timeline | Dates, durations and ordering at the precision the source supports |

These complement any of the [eight design studies](design-methods.md); they aren't extra required stages. Use the project's semantic rendering path for formal engineering diagrams. A visual convention can't supply a missing model relationship, guard, capacity or ownership rule.

## What the person will look for

- The diagram answers the reader's question, and the meanings in the right-hand column above are still present.
- Endpoints, crossings, boundary labels and significant state distinctions are clear at final size without relying on color alone.
- When you imported or simplified a source, meaningful aggregates, omissions and unresolved mappings are accounted for. Keep what carries the question's meaning, such as a queue's capacity when explaining contention or a cancellation outcome in a lifecycle; there's no node limit that justifies dropping it.
- When comparing versions, changed relationships are distinguished from renamed subjects or moved marks.

## Done when

You've checked source meaning and final-size readability separately, kept the editable source, and reported which meanings and views you inspected. A static picture doesn't establish executed behavior or engineering acceptance. [Native source obligations](interaction-sketches.md) still apply for model-backed tasks.

Source lineage: original synthesis informed by Cathryn Lavery's diagram-design [selection guidance](https://github.com/cathrynlavery/diagram-design/blob/7a12007b5a4246894f342a2e52e78facbc62eca3/skills/diagram-design/SKILL.md), [semantic patterns](https://github.com/cathrynlavery/diagram-design/blob/7a12007b5a4246894f342a2e52e78facbc62eca3/skills/diagram-design/references/semantic-patterns.md) and corresponding type references at that revision. No upstream layout recipe, code, template, font or artwork is included.
