# Title-width regression evidence

These are actual source/PNG exports from the original method generator using the retained options. The full canonical title remains in editable SVG titles/descriptions and source metadata; bounded display labels use ellipsis. Subject IDs are preserved. This is a finite, host/renderer-specific check, not a universal text-layout or accessibility result.

| Input | Desktop | Wireflow |
| --- | --- | --- |
| [40 wide W code points](wide/options.json) | [PNG](wide/desktop-workflow.png) / [SVG](wide/desktop-workflow.svg) | [PNG](wide/wireflow.png) / [SVG](wide/wireflow.svg) |
| [Realistic long title](realistic/options.json) | [PNG](realistic/desktop-workflow.png) / [SVG](realistic/desktop-workflow.svg) | [PNG](realistic/wireflow.png) / [SVG](realistic/wireflow.svg) |

The [manifest](manifest.json) binds exact input/source/export identities. All eight studies were rendered and inspected for both inputs; only the two directly affected screens are duplicated here for focused review.

From the repository root, choose two new output directories and run:

```sh
node tools/generate-method-studies.mjs NEW_SOURCE_DIR --options examples/methods/regressions/title-width/wide/options.json
node tools/render-method-studies.mjs NEW_SOURCE_DIR NEW_PREVIEW_DIR --renderer-dir EXISTING_INSTALL
```

Use the realistic options file for the other case. The renderer selector is optional when an existing Sharp installation resolves normally. No tool is installed by these commands. Save/acknowledgement/failure/disabled-action labels describe static proposed behavior; no request, persistence or validation runtime is executed.
