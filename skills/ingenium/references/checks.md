# Layout construction and scoped delivery checks

Use the optional helpers to construct a layout, expose a constraint failure, or test an owned local HTML/SVG fixture. They support the creative loop; they do not select taste, accept a design, or certify accessibility. Keep formal domain semantics with their authoritative model.

## Construct from shared values

Import the dependency-free functions from package-relative `src/layout/index.mjs`: `insetBox`, `columns`, `spanColumns`, `stack`, `alignBox`, `baselineGrid`, `ratioSplit`, and `resolveLayout`. Units are authored coordinates. Helpers return new objects or throw an input/constraint error; they do not mutate sources. Ratios name a span, not a quality target.

An editable version1 record contains `canvas:{width,height}`, optional numeric `tokens`, `nodes` and optional optical `exceptions`. Nodes have a stable `id` and operation:

| Operation | Fields |
| --- | --- |
| `box` | `x,y` and `width,height` or `right,bottom`; redundant conflicting edges fail |
| `inset` | `from,insets` (number or top/right/bottom/left object) |
| `columns` | `from,count,gutter` |
| `span` | `from,start,span` (zero-based start into column array) |
| `stack` | `from,items` (sizes or width/height objects), optional `axis,gap,align` |
| `align` | `from,to`, optional `x,y` as start/center/end |
| `baselines` | `from,step`, optional `offset` |
| `split` | `from`, optional `ratio` (golden/equal/positive number), `axis,gap` |

References identify nodes or `$canvas`; numeric fields can use `$token`. Resolve returns `status,boxes,guides,tokens,exceptions,issues`. Cyclic, missing, conflicting and out-of-range constraints fail with scoped evidence; dependent failure does not invalidate independent boxes. This is axis-aligned construction, not a general constraint solver. Browser transforms are measured separately. An optical exception `{target,rule:'layout.bounds',kind:'optical',reason}` retains overflow as `review-needed`, never a silent pass. Actual glyph metrics still need rendered inspection.

## Reports and exact contrast

Package-relative `src/checks/index.mjs` exports `checkTextContrast`, `contrastRatio`, `relativeLuminance`, `createIssue`, `createReport`, `fingerprintIssue`, `hashIdentity` and `diffReports`. Reports use `pass`, `fail`, `review-needed`, `not-run`, `error`, `not-applicable`. They retain source/environment hashes, authored scope, measurements, residuals and explicit exception records. Accepted exceptions require exact rule/target/scope and retain the underlying status. Here `assessment:exact` means a specific arithmetic, authored-invariant or automated-rule result; it does not establish complete semantic correctness. Geometry candidates and inconclusive axe outcomes remain review items.

Contrast accepts opaque `#RGB`, `#RRGGBB` or three finite sRGB channels in0..255. `checkTextContrast` also requires final CSS-pixel `fontSizePx`, numeric `fontWeight`, stable `target` and authored `scope`. It compares the unrounded ratio to4.5, or3 for the criterion's large-text definition. A4.499 result fails4.5; rounding for display never changes the comparison. Composite, gradient, image and unsupported effective colors return review-needed. Authored criterion exceptions require a recognized kind, reason and exact scope, with applicability still subject to human review. [W3C contrast criterion](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

Fingerprints use rule, stable target and profile/state scope, excluding measurements and source revision. Deltas expose introduced, resolved and changed issues plus source/environment/scope/exception changes. They are not a quality score. Keep the full report and raw evidence on disk; inspect changed nonpassing issues and their relevant regions first. A resolved identity may reflect changed content or coverage, so retain the predecessor and context hashes.

## Owned browser fixtures

The adapter dynamically loads compatible installed `playwright` and `@axe-core/playwright` only when requested. `createBrowserSession({adapterDir?,executablePath?})` from `src/browser/index.mjs` returns a status/capability and, on success, one owned session with `inspect` and `close`. An explicit adapter directory resolves only its own `node_modules`; missing/incompatible dependencies or browser launch errors remain explicit. No setup or download occurs on import. Chromium's sandbox stays enabled; inherited process-local runtime library paths may be needed on a rootless host.

`session.inspect({html,profile,state?,journeys?,screenshotPath?})` uses trusted synthetic HTML, blocks external page network, and reuses its prepared browser/context/page. A profile names `viewport:{width,height}`, optional `textSpacing`, `expectedFonts`, delivery context and authored exceptions. A state names explicit click/focus/press/waitFor steps; journeys name their steps plus `expectFocus` assertions. Scan each relevant visible state; an inactive dialog is not checked merely because its markup exists. Inspect returns raw axe outcomes, DOM/SVG viewport geometry and native bounds, font/network/error evidence, journeys and scoped issues. Availability of a CSS font does not establish exact glyph provenance. [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), [axe API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)

Reflow profiles use authored CSS viewports, with vertical scrolling allowed and intentional two-dimensional content reviewed in context. They do not simulate browser zoom through screenshot scaling; unsupported zoom options explicitly error. Text-spacing profiles apply line height1.5, paragraph spacing2em, letter spacing0.12em and word spacing0.16em together to test loss/clipping candidates; those are override conditions, not mandatory default styling. Geometry alone cannot prove no loss of functionality or content. Clip paths, masks and filters remain review candidates rather than inferred painted intersections. Target-size exceptions also require context; there is no blanket size gate. [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), [target-size exceptions](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

## Repeatable file workflow

Create an original fixture and review it with one command; each directory must be new, with an existing parent:

```sh
node examples/foundation/build-study.mjs <fixture-directory>
node bin/ingenium.mjs review <fixture-directory>/fixture.json <evidence-directory> --adapter-dir <adapter-directory> --executable-path <chromium-executable>
```

Use `--broken` or `--guides` on the generator for deliberate failures or the guide view. The fixture JSON names its HTML/layout files, profiles/states/journeys, authored contrast inputs and optional report exceptions. `reviewFixture` in `src/review/index.mjs` is the corresponding file API. Add `--previous <report.json>` to compare a revision; `--renderer-dir <owned-sharp-directory>` can supply optional crops. Complete evidence lives in `raw/`, `views/`, `layout.json`, `report.json`, and optional `delta.json`; `summary.json` contains the compact handoff. At most8 crops are derived from changed nonpassing target regions when Sharp is available. Missing crop tooling does not remove full screenshot evidence.

CLI exit0 means the scoped run has no reported failure/error/not-run outcome (review-needed items may remain); exit1 means a reported failure/error; exit2 means an explicit not-run outcome or command usage. A profile without named keyboard journeys reports that check not-run. Read statuses and counts rather than treating exit0 as certification. Existing evidence is never overwritten. Inputs are trusted local fixtures, not a hostile-content sandbox or an external-site audit interface.

The tested compatible installation is Playwright1.57.0 and `@axe-core/playwright`4.11.1 with a separately supplied Chromium143 runtime. To provision a separate owned adapter only when needed, the official package route is `npm install --prefix <adapter-directory> --save-exact --ignore-scripts playwright@1.57.0 @axe-core/playwright@4.11.1`; browser/runtime setup remains explicit and environment-dependent. Do not disable security or install system packages to turn a failed capability probe into a pass. These versions describe the tested environment, not a latest-version claim. See the official Playwright guide above for supported setup and manual-testing limits.
