# Editable method studies

Ingenium supports eight small design studies for resolving different questions: structural wireframes, wireflows, same-screen state sequences, complex desktop workflows, empty/error states, element collages, palette families and fontplates/type specimens. Choose one useful study or combine a few. They do not impose a fixed sequence, a visual identity or a requirement to implement a product.

The compact [method router](../skills/ingenium/references/design-methods.md) loads the shared contract and only the selected method leaf. The existing [connected-sketch workflow](../skills/ingenium/references/interaction-sketches.md) remains the route for consequential interactions, including CSE source bindings, recovery behavior and feedback before expansion.

## Ask for the question you need resolved

These are natural-language requests to the Ingenium skill, not new CLI subcommands:

| Method | Example invocation | Review focus |
| --- | --- | --- |
| Structural wireframe | “Use Ingenium to sketch the hierarchy of a request review screen with this content.” | Can the reviewer find the decision and supporting evidence? |
| Wireflow | “Show a connected low-fidelity path from creating a request to resolving a validation failure.” | Are triggers, branches and recovery explicit? |
| Same-screen state sequence | “Keep the workspace fixed and show selected, edited and saved states.” | What changes locally, and when is it persisted? |
| Complex desktop workflow | “Study a desktop workspace with a list, working surface and context pane for this task.” | Who owns selection and values across panes? |
| Empty/error states | “Show first use, no matches and a failed save, preserving the person's draft.” | Does each state explain the known situation and useful next action? |
| Element collage | “Explore a compact visual vocabulary using original type, shape and surface fragments.” | Do the fragments support a coherent direction? |
| Palette families | “Compare three color families on the same content and semantic roles.” | Does each family work in application as well as swatches? |
| Fontplate/type specimen | “Compare type roles using these headings, body copy, labels and numbers.” | Are actual sizes, wrapping and font uncertainty visible? |

Bring existing content, constraints and settled choices. Keep facts, interpretations and scoped user decisions separate. A palette choice for one specimen does not become a project-wide identity. A button drawn in an SVG does not establish an implemented action. Color, proximity and connecting lines need explicit meaning when used semantically.

## Reusable artifact contract

For each study, retain:

- Purpose, intended audience, delivery size and representative content.
- Stable artifact/scenario identity, source revision and a separately generated preview.
- Fidelity, interactivity and model/source version, or an explicit unavailable/not-applicable reason.
- Stable view-element IDs distinct from shared domain subject IDs when needed for review or bindings.
- Assumptions, omitted routes and unresolved choices.
- Claim-level evidence states for specified behavior, exercised behavior, checks and acceptance.
- External source and license evidence when resources are acquired; original synthetic examples need no user records.

The example manifest uses `ingenium-method-study/1`. `artifactID`, `revision`, `primaryMethod` and `sourceScenario` identify the authored study and exact fictional fixture revision. Layout, appearance and content fidelity remain separate. `modelVersion: null` and the absent native mapping/backend are explicit. Each claim carries subject, result, evidence, limits, toolVersion and source/view revisions; results are `not-checked`, `pass`, `fail`, `blocked` or `N/A`, separate from authored/specification status. Generated static claims have no executed check receipt.

The assignment sequence draws four aligned snapshots: retained invalid raw input, repaired input with automatic valid update, applied local working value and scoped model undo. All retain the prior durable acknowledgement r1. Invalid input leaves the valid model intact; undo restores the prior value as NEW r3. Automatic valid updates are this fixture’s declared policy, not a new project-wide Apply rule. Metadata separately tracks raw draft version, working revision, owner/focus, diagnostic version and stale-receipt rules. The desktop adds a drawn event trace and detailed owner/draft/pending-operation ledger; neither is an executed runtime.

The collage includes a controlled filled/outlined badge comparison with frozen wording, color and type inside a broader exploratory assemblage. Its compatibility and tradeoff annotations leave the choice open. The fontplate actually compares identical copy/nominal metrics in generic sans and serif requests. Tuned-fit is omitted and no metric deltas or universal winner are claimed; actual per-glyph faces remain unresolved.

Use a compact handoff when that suffices. Machine-readable decision records remain optional; the [record contract](../skills/ingenium/references/record-contract.md) supports them when useful. For model-backed work, preserve the native source's meaning, units, constraints and acceptance procedures; the visual study is a proposed view of that meaning.

## Generate the original examples

The generator creates a small, synthetic collection for inspection and adaptation:

```sh
node tools/generate-method-studies.mjs OUTPUT_DIR
```

Run from the repository root with Node 22 or later and choose a new output directory whose parent already exists. This dependency-free command creates eight editable SVG studies and `manifest.json`. The generator is an example-authoring tool; it does not run an application or exercise the depicted controls.

| Study | SVG basename |
| --- | --- |
| Structural wireframe | `structural-wireframe.svg` |
| Wireflow | `wireflow.svg` |
| Same-screen state sequence | `state-sequence.svg` |
| Complex desktop workflow | `desktop-workflow.svg` |
| Empty/error states | `empty-error.svg` |
| Element collage | `element-collage.svg` |
| Palette families | `palette-families.svg` |
| Fontplate/type specimen | `fontplate.svg` |

Edit the original [fixture options](../examples/methods/fixture-options.json), then author a new collection:

```sh
node tools/generate-method-studies.mjs NEW_SOURCE_DIR --options examples/methods/fixture-options.json
node tools/generate-method-studies.mjs --verify NEW_SOURCE_DIR
```

`subjectTitle` (1–40 visible characters) drives the actual repeated visible labels and subject header across all eight SVGs. Its content hash changes the fixture revision while retaining domain/artifact identity. `collageSpacingScale` (integer 1–5) changes only the drawn magnification of the collage’s spacing bars, preserving semantic content. These are finite source parameters, not a generic model editor or JSON stored beside an unrelated picture. Long-title admission is not proof of fit in every field; inspect edited renders.

The pure API is `buildMethodStudies({subjectTitle?, collageSpacingScale?})`; the exclusive writer accepts the same second options argument. `verifyMethodStudySources(sourceDir)` reads exact filenames and checks their bytes against the supplied manifest. After hand editing a source, it reports a stale binding; a new raw render may still export those actual bytes, but the old source manifest and earlier previews must not be treated as current evidence.

PNG export uses the existing optional renderer separately; for example:

```sh
node bin/ingenium.mjs render OUTPUT_DIR/wireflow.svg OUTPUT_DIR/wireflow.png
```

An explicit existing renderer installation can be selected with `--renderer-dir DIR`; see the [SVG reference](../skills/ingenium/references/svg.md) for its contract. No renderer is installed by generation or export. Editable SVG and PNG preview are separate artifacts. Render availability and any font substitution must be reported honestly; a requested export is not delivered until its file exists, is nonempty and has been inspected.

For the whole collection, render into a separate new output directory:

```sh
node tools/render-method-studies.mjs OUTPUT_DIR NEW_RENDER_DIR --renderer-dir EXISTING_INSTALL
```

The explicit renderer selector is optional when Sharp is already locally resolvable. This creates eight PNG previews and a separate `render-manifest.json` carrying source/output hashes, dimensions and renderer identity. The generator's `manifest.json` describes the source collection; it is not a render receipt. Neither manifest proves semantic correctness or user acceptance.

The [editable examples](../examples/methods/) cover all eight methods with original synthetic content. They illustrate one possible application of each method. They are neither a prescribed Ingenium brand nor evidence that the proposed workflows have been implemented. The examples' palette and layout choices remain local to those studies.

Measure the example's declared opaque text and candidate focus-ink pairs with `node tools/check-method-contrast.mjs NEW_OUTPUT.json`. This uses the existing pure contrast helper; it does not inspect arbitrary SVG composition. The [retained report](../examples/methods/contrast-report.json) identifies pairs and source hashes. Decorative borders and selection fills are not qualified control boundaries. See [validation and provenance](method-studies-validation.md) for results and untested behavior.

## Read validation at its actual scope

Source/manifest checks can establish expected files, identity and declared coverage. Rendering can expose clipping, illegible text and mistaken composition in the inspected output. Neither establishes usability, complete accessibility, correct persistence, complete workflow coverage or engineering acceptance.

Static SVG states specify proposed behavior. To qualify a prototype, exercise the actual controls, keyboard/focus paths and relevant transitions and retain observed results. To qualify a model-backed view, separately check source/action/state coverage at the exact source and study revisions. Do not infer those results from screenshots or a passing generator test.

Installed-client discovery, renderer availability and exact fonts depend on the environment actually tested. Optional tools stay optional; no installation, publication, merge or deployment follows from generating these studies.
