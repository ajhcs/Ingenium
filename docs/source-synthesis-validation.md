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

[Final integrated manifest](source-synthesis-final-validation.json) records guidance/ZIP identities, package scope and hosted verification. Draft PR #8 was confirmed open; all 15 research-link occurrences resolve to ten files in the complete hosted immutable research tree. The initial push stopped at Git ownership validation before execution; the branch was then pushed from the verified owner-matched shared repository without changing trust settings or permissions.

## Additive README follow-up

Against frozen head `bf851a21623e5d2edda60494fc0c27bb79cb7e45`, the README retains its original text exactly and all 12 existing image references. Four existing rendered previews bring the total to 16; six expandable prompt ideas, a focused-edit starter and navigation links add practical entry points. Captions distinguish authored studies from the observed browser fixture. No public image, guidance, runtime or archive bytes changed, and no new third-party assets were introduced.

Local GFM rendering used existing marked and Chrome 155.0.8059.12 with approximate GitHub styling. All 101 local link occurrences and 12 fragment targets resolve; all 16 images loaded with nonempty alternative text. The first prompt disclosure was exercised. Desktop gallery, expanded prompts and a 420px gallery were inspected, with no horizontal document overflow. Three HTML example states were freshly rendered in Chrome and the diagram was freshly rendered with Sharp 0.35.5; all four were personally inspected in temporary outputs. GitHub's [collapsed-section documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections) and [formatting documentation](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) informed the Markdown choices. This is local preview evidence, not a hosted GitHub UI test.

The parent audit's documentation finding is corrected: proposal-local artifacts are identified as historical working files, delivered references point to the integrated manifest and retained ledgers, and the functional sidecar count is 279, matching the final CSV and coverage ledger. No workflow was expanded by that correction.

Automatic approval review denied the optional GitHub Markdown API POST because disclosure to that separate endpoint was not explicitly authorized. It was not retried; local rendering completed the requested checks. No merge or installation occurred.
