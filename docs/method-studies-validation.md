# Method study validation

Status: **ready for scoped review, with limitations**. The new helpers author and render static artifacts. No Relay application, client installation, model backend or automatic CSE orchestration is implemented or qualified.

## Evidence retained with the examples

- [Source manifest](../examples/methods/source/manifest.json): eight original synthetic SVGs, exact SHA-256/byte bindings, method, scope, authorship and font limits. Its `renderStatus: not-run` describes the source-only generator.
- [Render manifest](../examples/methods/previews/render-manifest.json): eight separate 1200 × 800 PNGs, exact source/output hashes and Sharp 0.35.4 plus native renderer versions. No machine paths are needed to reuse the source.
- [Contrast report](../examples/methods/contrast-report.json): 25 declared opaque pairs pass their stated thresholds. Palette/type source hashes bind the report to the examples. Candidate focus ink is measured against a surface, not tested as interactive focus geometry. Swatch availability does not qualify every possible application.
- [Host font candidates](../examples/methods/font-environment.json): system Fontconfig 2.15.0 matched five existing DejaVu candidates with file hashes and explicitly mapped notice evidence. Sharp reports Fontconfig 2.18.3, so this is not exact renderer or per-glyph binding evidence. No font binary was added.
- [Research and authorship](method-research.md): original implementation, parent-routed source leads, what was considered and what was not imported. No third-party code, templates, artwork or font binaries were added by this change.

## Checks run

Node 22.23.3 was selected process-locally; the default shell Node 18 was not used to qualify the helpers. Existing Sharp was probed successfully without installation. Full tests were run in host execution context because sandbox child-process output was incomplete.

```sh
node --test tests/*.test.mjs tests/records/*.test.mjs tests/svg/*.test.js
node tools/generate-method-studies.mjs NEW_SOURCE_DIR
node tools/render-method-studies.mjs NEW_SOURCE_DIR NEW_PREVIEW_DIR
node tools/check-method-contrast.mjs NEW_REPORT.json
python3 /path/to/skill-creator/scripts/quick_validate.py skills/ingenium
git diff --check
```

The fresh baseline suite had 204 passes, 28 skips and no failures. The integrated suite has 216 passes, the same 28 skips and no failures (244 total). The twelve added tests cover reproducible published sources, published source/export/contrast bindings, existing-output preservation, explicit missing-renderer refusal without fallback/setup, real export of all eight edited sources with byte preservation, failed SVG admission without a completed manifest, stable view/subject identity with explicit claim states, distinct working/validation/acknowledged-save revisions with honest omitted branches, canonical rename propagation into all eight exported studies, appearance-only semantic preservation, stale source-manifest detection, and visible acknowledgement/cancel edge consistency. Existing optional-client suites were not relabeled as tested.

The 28 skips concern optional XML-parser/assets fixtures, real owned-browser/axe sessions, selected Hack/font/vector tools, exact local Bulma/Open Props/DaisyUI sources and related selected-resource integration. Those fixtures were not supplied to this isolated run. No installs, downloads or client activation were performed to eliminate skips. Installed-renderer consumer tests requiring a separately prepared npm consumer were not part of this suite.

## Render and independent review

The integrator opened all eight final PNGs at 1200 × 800. A separate review agent also opened all eight after the Ingenium editorial-frame update and checked source/export hashes and reproducible contrast output. No visible clipping or footer collision was observed in those renders. This is a scoped visual inspection, not a usability or universal readability result.

Parent review of the initial draft head found that the wireflow picture reached “Assignment saved” from an input-validity guard, although its metadata required acknowledgement. The correction makes the matching current-request/revision acknowledgement explicit in the visible route and derives rendered transition labels and metadata from one finite edge definition. A depicted cancel-before-send branch returns to the original queue without changing its model; this is scoped assignment-command cancellation, not a global edit policy or cancellation of an in-flight save. The refusal branch remains. These are static specifications; no actual request, cancellation or save receipt is executed.

Review found and corrected two misleading labels: an in-place refusal arrow had been described as navigation, and spacing bars drawn at five-times scale lacked a scale legend. The final sequence draws retained invalid input, repair with automatic valid model update, the applied local value and scoped model undo as a NEW revision while durable acknowledgement stays separate. Desktop annotations provide a static event trace with a separate per-step ledger. The collage includes a controlled identical-content treatment comparison and compatibility strip; the fontplate is now an actual same-copy fixed-metrics comparison. Earlier blue/gray-framed exports are superseded; retained public previews match the current paper/serif/acid framing and source hashes.

Three independent routing probes considered retaining an invalid draft within one screen, exploring palette families while preserving an existing brand, and sketching a model-backed desktop with an unknown API. The guidance selected scoped editable studies and retained the relevant connected-sketch/source workflow without claiming native backend behavior or replacing the existing product. These were agent reasoning probes, not installed-client end-to-end executions or measured model-performance evaluations.

A fresh Sol forward-test subsequently used only the portable guidance needed to make a two-accent SVG/PNG comparison for an existing reading app. It retained the supplied paper/dark-ink/serif choices, identical content and geometry, inspected the actual render, and left preference unresolved. Its observed guidance load was 24,515 UTF-8 bytes: entrypoint, method router, shared contract, palette leaf and existing SVG/check references. It read no wireflow/desktop leaf or generator example. The integrator opened the result and inspected its output evidence. [Loading measurements](method-loading.json) record exact resource sizes and scope; model tokens, total conversation context and efficiency gains were not measured. The existing 740-word core and longer legacy check reference were preserved; only the new router/shared/leaves meet their proposed local word targets.

Final independent Sol review opened all eight current target-size PNGs and ran the focused file directly: 11 passed, 0 failed, 0 skipped. It reviewed source/export/font/contrast hashes and found no remaining actionable blocker within its stated static-artifact scope. The integrator additionally opened all eight renamed/reexported variants; that edit exposed and prompted repair of an overlong collage title/issue line before final publication.

The final `npm pack --ignore-scripts` used a workspace-local cache. The resulting own-package archive was unpacked without installation or lifecycle scripts; its package-relative generator authored and verified eight sources, and its renderer exported all eight with the existing explicit renderer. This is a helper packaging smoke check, not installed-client discovery or the separately prepared npm-consumer integration suite.

The parent commissioned a separate Astra Max method-design review after Cole's explicit allocation. Local initial implementation and review lanes began under inherited model settings; their exact model variant was not established by the executor. Remaining integration was explicitly dispatched to `gpt-6.1-sol` with high reasoning effort. No claim that the inherited lanes were Astra Max is made. The received proposal and its adopted/modified/deferred items are retained in [design disposition](method-design-proposal.md). Parent exact-head approval remains distinct from local evidence.

## Practical limits

The sheets depict only the labeled paths and states. Empty/error shows first use and a failed assignment, with a no-match recovery annotation; it is not an exhaustive state implementation. Wireflow omits authentication, API timing and concurrency. The desktop note/assignment boundary is proposed behavior, with keyboard, resizing, focus, conflicts and storage untested. Collage fragments imply neither navigation nor semantic relationships. The fontplate draws the same corpus and nominal metrics in two requested generic families. Tuned-fit is omitted. Existing host Fontconfig candidates and per-file notice hashes are recorded separately; exact Sharp per-glyph font binding, all-language coverage, zoom and portable metrics remain unresolved.

Contrast calculations cover declared opaque pairs only. Decorative light borders are not qualified meaningful control boundaries; selection is also labeled, and no selection-fill contrast claim is made. No full WCAG conformance, accessibility audit, acceptance, engineering adequacy, persistence, safe retry, undo or native-model semantics is established. The existing CSE connected-sketch contract remains authoritative where applicable.

## Optional font-environment evidence

`python3 tools/probe-method-fonts.py NEW_REPORT.json` explicitly probes an existing system Fontconfig library for five finite generic-family patterns. `--library EXISTING_LIBRARY` selects an existing library; repeated `--notice FONT_BASENAME=EXISTING_NOTICE` arguments retain caller-mapped notice evidence. Missing tooling reports not-run; existing report paths and symlinks refuse. The Python standard-library probe is inert on import and performs no installation or font redistribution. Its matched family/style/font-file hashes and optional notice declarations are candidate-resolution evidence, not proof that Sharp used those files for every glyph. This optional helper is not included in the guidance-only ZIP.

The captured report maps existing DejaVu faces to their local package notices, which declare Bitstream-Vera terms and public-domain DejaVu changes. Those caller mappings were inspected, not inferred from a filename alone; they do not grant rights to unrelated fonts. The probe's manual checks covered missing library, missing font, absent notice mapping, existing file/symlink refusal, path-free reports and inert import. Windows/client integration and a universal font inspection interface are not claimed.

No merge, release, deployment, installed snapshot refresh or production operation is authorized by these checks. The parent must personally review the rendered examples, source, diffs, tests and provenance before authorizing an exact PR/head.
