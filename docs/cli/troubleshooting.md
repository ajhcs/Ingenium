# Local command diagnosis

Local Node 22 command cases below were exercised on 2026-11-14. Installed agent
client discovery, upgrade and removal are separate lifecycle checks; those steps
are not established by these command tests.

| Symptom | Diagnosis and smallest recovery | Evidence boundary |
| --- | --- | --- |
| Unknown or duplicate flag, missing argument | Exit 2, category `usage`. Run the exact operation with `--help`; correct only that argument. | Tested before input access/output creation. |
| JSON input fails to parse | Exit 2, `JSON_INVALID`. Correct the selected JSON file and retry; the diagnostic omits its raw content. | Tested with a synthetic secret-bearing malformed input. |
| Missing PNG renderer | `health --renderer-dir DIR --probes renderer` reports `absent`; render returns 2. Select an existing compatible renderer explicitly. | Tested with an empty selected directory; no fallback/install. |
| Incompatible selected renderer | Health reports `error`; rendering returns 1. Check the selected module against the documented renderer version. | Missing versus incompatible adapters are distinct outcomes. |
| No browser selected | Health reports `not-selected`; ordinary health exits 0. Select existing adapters and executable when browser work is needed. | No browser probe runs without a selector. |
| Selected browser cannot start/load | Required health or inspection returns 2 for missing capability, 1 for a broken selected adapter. Retain the diagnosis and correct the exact selector. | Missing adapters tested; successful selected lifecycle uses an owned session that closes. |
| Inspection captures only part of the plan | Read requested/captured/failed/missing counts and `run.json`. Keep the partial directory; retry into a new destination after correcting the named stage. | Missing coverage returns 2; actual failure outranks missing coverage and returns 1. |
| Font or preview differs after reopening | Compare source files, font dependencies/notices and actual renderer selections. Preserve editable source independently from the preview. | Health does not establish exact glyph provenance or appearance; native editor behavior remains separate. |
| Output already exists | Exit 1, conflict/operation. Inspect retained files; choose a new destination. | Repeated exports and historical materialization refuse replacement. |
| Interrupted export | Exit 130 after cleanup where possible. Inspect `successfulOutputs` and `incompleteOutputs`; files may already exist. Retry into a new destination. | Actual child SIGINT test retained a partial source and verified owned cleanup. |
| Store lock or uncertain save | Run `ingenium project recover STORE_DIR --inspect --json`. Keep pending/orphan files and use the returned identities for any explicit recovery. | No age-based lock stealing or automatic promotion/pruning. |
| More than one installation appears to exist | Invoke each already known binary path with `version --json`; compare build IDs/flavors and the client's configured selected path. | No global/home scan or competing-install deletion. Actual client selection must be checked separately. |
| Local files changed before an upgrade | Copy and validate the retained continuation/source closure before any separately authorized replacement. Keep the predecessor; do not overwrite edited install files to force agreement. | CLI version equality alone proves neither upgrade success nor preserved client behavior. |

The binary prints short next steps without stack traces. Use `--json` to retain the
structured stage and output receipt. No diagnosis changes ownership, restarts a
server, rewrites configuration or installs a tool automatically.
