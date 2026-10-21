# Source synthesis validation log

Study baseline: `f70db6171196c2c4452bc53eb24e82ba7cad5d9c` (includes reviewed PR7). Isolated task-local clone; no Builderbob, Kernspan, benchmark, global install or release changes.

## Baseline observations before candidate edits

Windows Node 24.13.0. Git's checkout line-ending conversion initially changed byte-hashed SVG/example and Markdown fixtures; tracked text was restored directly from Git blob bytes for this worktree. This is local environment preparation, not a product change.

- `node --test tests/checks.test.mjs tests/palettes.test.mjs tests/records/records.test.mjs tests/svg/svg.test.js`: 52 pass, 2 optional-renderer skips.
- Same SVG tests with an explicit existing Sharp module: 22 pass, no skips; real rendering/source preservation exercised. No installation.
- `tests/method-studies.test.mjs` after restoring Git bytes: 12 pass, 2 optional-renderer skips, 1 failure from exact equality of retained contrast-report floating values. Differences approximately 1–2e-15; statuses match. This baseline failure is retained as a limitation.
- `tests/package.test.mjs` initially failed on CRLF frontmatter and Windows URL pathname handling in its malformed-record test. Neither failure demonstrates candidate behavior; Windows portability is outside this study's selected changes.

Designed examples and later candidate checks are recorded separately. No claim of future-model compatibility, user acceptance, complete accessibility or installed-client qualification follows from these results.
