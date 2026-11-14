# Current helper interfaces

Ingenium's guidance works without these helpers. The optional helpers require Node 22 or later. This is the current interface index for the 0.2.0-alpha.2 release; [contracts.md](../contracts.md) retains earlier implementation decisions and their chronology.

| Task | Interface | Contract |
| --- | --- | --- |
| Choose a small work plan, review a narrow edit, or explicitly promote retained choices | `src/workflow/task.mjs`, `src/workflow/promotion.mjs` | [Task, revision review, and optional promotion](workflow.md) |
| Retain portable continuation and optional durable history | `src/project-state/index.mjs` | [Project state](project-state.md) |
| Deliver editable source and its complete declared local dependencies | `src/delivery/index.mjs` | [Delivery](delivery.md) |
| Find and acquire one selected resource | `src/resources/index.mjs` | [Resources](resources.md) |
| Inspect selected local routes and journeys | `src/project/index.mjs` | [Inspection](inspection.md) |
| Invoke the optional helper commands | `bin/ingenium.mjs`, `bin/ingenium-tools.mjs` | [CLI](cli.md) |

The new project envelope is `ingenium-project/1`; the nested records-v1 object remains the sole structured decision authority. Delivery and inspection schemas have independent versions. Unknown versions refuse; there is no speculative migration. The original records, SVG, resource-provider, and `inspectProject` interfaces remain available. The inspection v2 snapshot is not silently treated as v1.

Validation means that the specified data constraints passed. A complete export, durable save, successful browser capture, engineering acceptance, and a user choice are separate observations. Public methods report their own scope and unavailable capabilities; none installs an adapter or accepts a design on the user's behalf.
