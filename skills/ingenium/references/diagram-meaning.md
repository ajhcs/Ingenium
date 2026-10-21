# Choose the diagram by its meaning

Use this reference when the requested artifact is a diagram and its representation is still open. Start with the reader's question and the authoritative source. Keep established notation, model bindings and meaningful or settled positions. A table or short explanation may communicate the distinction sufficiently.

| Reader's question | Useful representation | Meaning to retain |
| --- | --- | --- |
| What connects to or depends on what? | Topology or dependency graph | Relationship kinds, endpoints and direction; shared dependencies and cycles when present |
| Who sends what to whom, in what order? | Sequence | Participants, messages, ordering and relevant conditions |
| How can one subject change state? | State or lifecycle view | Events, guards, legal transitions and distinct relevant outcomes |
| Who performs each part, and where does work pass between owners? | Lanes | Responsibilities and handoffs |
| What does a customer see while the service performs hidden work? | Service blueprint | Customer actions, visible service actions, backstage work and the visibility boundary |
| When do events or intervals occur? | Timeline | Dates, durations and ordering at the precision the source supports |

These options can complement any of the [eight design studies](design-methods.md); they are not additional required stages. Use the project's semantic rendering path for formal engineering diagrams. A general visual convention does not supply a missing model relationship, guard, capacity or ownership rule.

When importing or simplifying a diagram, retain the source and briefly account for meaningful aggregates, omissions and unresolved mappings. Keep information that carries the question's meaning, such as a queue's capacity when explaining contention or a cancellation outcome when explaining a lifecycle. When comparing versions, distinguish changed relationships from renamed subjects or moved marks. No fixed node limit requires dropping source meaning.

Check source meaning and final-size readability separately. Make endpoints, crossings, boundary labels and significant state distinctions understandable without color alone. Preserve editable source and report which meanings and views were inspected; a static picture does not establish executed behavior or engineering acceptance. Existing [native source obligations](interaction-sketches.md) continue to apply where the task is model-backed.

Source lineage: original synthesis informed by Cathryn Lavery's diagram-design [selection guidance](https://github.com/cathrynlavery/diagram-design/blob/7a12007b5a4246894f342a2e52e78facbc62eca3/skills/diagram-design/SKILL.md), [semantic patterns](https://github.com/cathrynlavery/diagram-design/blob/7a12007b5a4246894f342a2e52e78facbc62eca3/skills/diagram-design/references/semantic-patterns.md) and corresponding type references at that revision. No upstream layout recipe, code, template, font or artwork is included.
