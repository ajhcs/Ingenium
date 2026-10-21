# Independent candidate review

Reviewed 2026-10-21 against baseline `f70db6171196c2c4452bc53eb24e82ba7cad5d9c`. Product guidance was introduced by `134638d`; research closure was inspected through `3fa813e`, with the current uncommitted `docs/method-loading.json` included. Read `integration/AGENTS.md`, `docs/contracts.md` and parent `STUDY-AUTHORIZATION.md`. No evaluation outputs were accessed. No product edits, upstream execution, networking, installs, settings changes or API generation were performed.

## Finding

**P2, resolved locally — Preserve research-evidence navigation in the installed package.** `integration/docs/source-synthesis.md:11` (also lines 13–18 and 25) originally added relative links into `../research/`, while `integration/package.json:20` includes `docs/` but its `files` list excludes `research/`. A consumer of the npm package would receive the study claims but could not open their cited ledgers and matrices. Offline `npm pack --dry-run --ignore-scripts` confirmed 392 packaged files, including all five `docs/source-synthesis*` documents and zero `research/` files. Root replaced the links with immutable GitHub URLs at `3fa813e03e788997097443ca0cef8fae0bf68c24`. I rechecked the current working file: no relative research links remain; all 13 pinned URLs identify files present in that local commit. Hosted availability remains a post-publication check; no network action was taken here.

No additional actionable findings in the reviewed product diff.

## Bounded checks

- The six changed guidance files introduce two conditional leaves, two scoped refinements and routing links. Eight existing study methods, native authoritative-source obligations, draft/model/persistence distinctions and user choice continuity are preserved. No mandatory ninth method, house style, semantic engine or future-model claim was introduced.
- All 34 relative links in the six guidance files resolve. All six recorded SHA-256 identities match current bytes; all 13 loading measurements match actual UTF-8 bytes and whitespace-split word counts. Historical loading evidence remains explicitly historical.
- The guidance ZIP contains 43 files, both new leaves and all three required license/notice files. Every entry byte-matches its source; no unexpected non-Markdown payload is present. The test change enforces those retained notices and explicitly decodes UTF-8. No new third-party program, font, icon, template or artwork was identified in product changes. Source-specific mixed-license and asset-rights limits remain explicit.
- All four presentation PNGs and `diagram-reviewed.png` were personally inspected with `view_image`. Narrow German content is readable without visible cropping; Arabic formatting and scoped direction are visible; the lifecycle cycle/guard and matching sequence acknowledgement are intelligible. Static specifications and incomplete translation/interaction coverage are labeled. Every retained example source/output hash matches its receipt.
- Final Open Design ledger: independently checked all 549 recorded path hashes against the pinned local checkout, 461 distinct hashes, all 302 ordered-block template reconstructions, and 40 receipt batches covering all 2,579 semantic blocks. There are no pending skill-text statuses. Sidecar and external-reference reading remain separately limited; complete skill-text coverage is not presented as holistic evaluation or runtime qualification. The manifests contain hash/offset metadata rather than copied full source text.
- README support rows distinguish exercised presentation examples, static diagrams, guidance-only additions, and untested native/accessibility behavior. Research hypotheses are distinguished from documented authoring guidance and performance evidence.

The reviewer used a study-local read-only harness; its result is retained in `candidate-checks.json`. The initial package file manifest is retained in `npm-pack-dry-run.json`. The private harness is not part of the installed package.

## Missing validations and remaining limits

- This lane did not repeat browser interactions or rerender examples; it inspected actual retained pixels and matching source/output receipts. Screen reader, forced colors, zoom, native binding and broader locale/runtime coverage remain unqualified as documented.
- Python unittest execution was unavailable through the installed `python` alias in this environment. The changed ZIP assertions were reviewed and equivalent archive-entry, notice and byte-identity checks were performed read-only using .NET. No full runtime regression suite was rerun for these prose-only additions; reported baseline Windows test limitations were not treated as candidate defects.
- No live hosted URL retrieval, installed-client discovery, human preference/performance evaluation, full legal clearance or future-model validation was performed. The packaging link correction passed local target/pin verification; after authorized publication, hosted availability still needs confirmation.
- Later Astra reconciliation or post-evaluation prose additions are outside this initial snapshot; the requested separate proposal review is in `source-synthesis-followup-review.md`.

No unresolved actionable finding, denied operation or uncertain operation remains in this initial review lane.
