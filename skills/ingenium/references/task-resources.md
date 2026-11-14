# Select a resource for the task

Use this route first for a small offline resource request. Import from the actual installed plugin root with Node 22+. No project record, broad catalog dump, network, or optional parser is required for discovery.

```js
import {searchTaskResources, inspectTaskResource, acquireTaskResource}
  from './src/resources/index.mjs';
const page = await searchTaskResources({query:'connector', sourceIds:['cse-selected'], limit:4});
// Other useful small searches: sourceIds:['recipes'], query:'requirements';
// sourceIds:['textures'], query:'crosshatch'; sourceIds:['ionicons'], query:'add'.
const chosen = page.entries[0]; // Select only after reviewing the few returned choices.
const detail = await inspectTaskResource(chosen);
```

Use `cse-selected` for bundled CSE source masters, `recipes` for eight document fragments, four charts, four directed diagrams and four conceptual illustrations, `textures` for original digital tiles, `palettes` for Radix scales, `hack`/`cse-fonts`/`liberation-sans` for fonts, `atomic-ui` for web primitives, and `materials` for CSS declarations. Optional packs report missing data explicitly. `cse` is an optional larger metadata catalog requiring `selectors.cseRuntimeDir`; the bundled selection needs no CSE installation. Font-dependent held masters stay held.

For an exact document fragment:

```js
const d = await inspectTaskResource({providerId:'recipes', assetId:'doc-title'});
await acquireTaskResource({
  selection:{providerId:d.providerId, assetId:d.assetId,
    sourceRevision:d.sourceRevision, originalSHA256:d.sourceDetails.sha256},
  selectors:{controls:{title:'Remote station operating specification'}},
  outputDir:'/existing-parent/new-title',
});
```

Open `revised.svg` and follow the delivered README command to regenerate. `examples/<id>.json` saves current values under `current`; edit only fields permitted by `edit`, preserving `original`. Subsequent narrow overrides start from this current state. Document text wraps and the SVG grows vertically; table words, units and relationship wording are retained. Ordinary supported text is bounded to 60 characters per cell/field. Charts retain units and category labels; diagrams retain directed endpoints. Generic font coverage and destination rendering still need inspection.

For palettes, `originalSHA256` is `d.sourceDetails.provenance.selectedFileSha256`. Omit controls to acquire the exact selected palette; use `controls.replacements` only for an intended color edit. Textures use `d.sourceDetails.sha256` and optional finite `density`, `tileSize`, `ink`, `background`, and seeded-grain `seed` controls. CSE masters use `d.sourceDetails.selectedSource.sha256` and optional `scale`/`ink` presentation controls. See [API resource contract](https://github.com/ajhcs/Ingenium/blob/main/docs/api/resources.md) for other source hashes.

Icon results include a `route`: the exact `openResourceLibrary` provider, selected inspect/acquire arguments, optional parser selectors and the appropriate reference. Use that route for acquisition; the task facade keeps icon browsing metadata-only. `ionicons`, `minimal-icons`, `lobe-icons`, `remixicon-apache`, `remixicon-current`, `simple-icons`, and `tabler` are searchable. Source-specific admission and rights can refuse a selection. Metadata-only Remix and unbundled brand payloads are identified; do not infer permission or trigger downloads from a result.

Keep the original, full notices, current editable controls and separate outputs together. Qualification describes the exact exercised source/operation, not engineering adequacy or taste. Inspect the rendered result and report any missing optional tool honestly. See [resource routes](resource-libraries.md) only when a provider-specific workflow is needed.
