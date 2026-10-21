# Source synthesis validation log

Study baseline: `f70db6171196c2c4452bc53eb24e82ba7cad5d9c` (includes reviewed PR7). Isolated task-local clone; no Builderbob, Kernspan, benchmark, global install or release changes.

## Baseline observations before candidate edits

Windows Node 24.13.0. Git's checkout line-ending conversion initially changed byte-hashed SVG/example and Markdown fixtures; tracked text was restored directly from Git blob bytes for this worktree. This is local environment preparation, not a product change.

- `node --test tests/checks.test.mjs tests/palettes.test.mjs tests/records/records.test.mjs tests/svg/svg.test.js`: 52 pass, 2 optional-renderer skips.
- Same SVG tests with an explicit existing Sharp module: 22 pass, no skips; real rendering/source preservation exercised. No installation.
- `tests/method-studies.test.mjs` after restoring Git bytes: 12 pass, 2 optional-renderer skips, 1 failure from exact equality of retained contrast-report floating values. Differences approximately 1–2e-15; statuses match. This baseline failure is retained as a limitation.
- `tests/package.test.mjs` initially failed on CRLF frontmatter and Windows URL pathname handling in its malformed-record test. Neither failure demonstrates candidate behavior; Windows portability is outside this study's selected changes.

Designed examples and later candidate checks are recorded separately. No claim of future-model compatibility, user acceptance, complete accessibility or installed-client qualification follows from these results.

## Candidate and final integration

- Required frontmatter/discovery and relative reference checks pass through the existing canonical-package test. The local skill-creator validator could not run because its Python environment lacks `yaml`; no installation was attempted.
- The standalone guidance ZIP was rebuilt. Both bundle tests pass, including deterministic output, relative link resolution, and exact preservation of the main license plus Impeccable license/notice. The test previously rejected those PR7 notices; the corrected allowlist now verifies all three byte for byte and reads Markdown as UTF-8.
- The original theme/locale fixture was actually rendered and exercised in the existing browser; source record preservation, formatting, narrow overflow and keyboard disclosure were observed. The original diagram was rendered with existing Sharp 0.35.5 and inspected, corrected and re-rendered. See example manifests for hashes and scope.
- [One matched observed task](../examples/source-synthesis/matched/README.md) used the same Sol model/setting/task for baseline and initial candidate. Both passed the tested mechanical conditions. The later optional design-evidence/delivery/interruption additions were separately reviewed, but were not performance-tested by this pair.
- [Independent initial review](reviews/source-synthesis-review.md) found a P2 package research-link issue, now corrected to immutable hosted paths. [Separate follow-up review](reviews/source-synthesis-followup-review.md) found no actionable issue. Final integrated metadata and ZIP checks are recorded separately after applying the follow-up.

Baseline floating-point and Windows URL-path test failures above remain unchanged. Installed-client discovery, full accessibility, actual media jobs, conversion fidelity, animation-interruption execution and native model integration are unqualified.
