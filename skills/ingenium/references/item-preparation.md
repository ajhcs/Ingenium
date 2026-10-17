# Prepare selected local item sources

`tools/prepare-item-source.mjs` makes one selected item source portable for `src/items/index.mjs`. It supports only Fluent Emoji Flat illustrations and Hero Patterns SVG tiles. It performs no network request, installation, registry script, service registration or full-library export. It does not create a generic rights declaration for arbitrary sources.

The caller must already have source files and rights evidence acquired under the applicable approvals. A retained document's hash proves local byte identity, not its origin or legal sufficiency. Keep acquisition receipts separately; the preparation tool never labels them network-verified. Do not retry a denied acquisition or infer an unknown release/license document has been obtained.

## Use

```sh
node tools/prepare-item-source.mjs preparation.json
```

The CLI accepts one JSON configuration file. Relative input/output paths resolve from the current working directory, not from the configuration's directory. It prints a JSON receipt with the new manifest path. The optional parser is existing local `saxes` 6.0.0; specify `parserDir` as the existing npm installation directory containing `node_modules/saxes`, or use normal package-local resolution. Missing/unsupported parsers refuse rather than bypass SVG admission.

The named API is:

```js
import { prepareItemSource } from './tools/prepare-item-source.mjs';
import { createItemLibrary } from './src/items/index.mjs';
const prepared = await prepareItemSource(config);
const library = createItemLibrary({ sources: [prepared.manifestPath], parserDir: config.parserDir });
await library.discover();
await library.inspect({ sourceId: config.source, assetId: config.assetId });
// Acquisition and customization remain explicit subsequent item-library operations.
```

Importing the preparation module performs no I/O. `runPreparationCli(args)` is also exported for explicit CLI invocation. This helper must remain included beside `src/` in a portable package; installed-client discovery is a separate qualification.

## Common configuration

All fields below are required unless marked optional. Unknown keys refuse. Every input must be a canonical regular local file without symlink ancestors. SHA256 values are lowercase 64-character digests. `outputDir` must be a new directory under an existing canonical parent; an existing destination refuses without replacing work. Write failures can leave a partial new output directory for inspection; the tool does not delete it automatically. One trusted owner must prevent concurrent source changes during preparation.

| Field | Meaning |
| --- | --- |
| `source` | `fluent` or `hero` |
| `assetId` | Selected lowercase hyphenated name, at most 100 characters |
| `title` | Explicit human title, 1..128 characters |
| `rightsEvidenceFile` | Explicit retained local rights document/snapshot |
| `rightsEvidenceSHA256` | Expected rights bytes hash |
| `rightsScope` | 1..650 characters preserving exactly what evidence supports and what remains unknown |
| `outputDir` | New local output directory |
| `parserDir` | Optional existing npm directory for SVG admission |

The output contains exact `original.svg`, exact retained `rights-evidence.txt`, compatible `manifest.json`, and hash-bound `preparation.json`. The receipt has no input filesystem paths. The manifest records the rights scope and a fixed qualification: origin, legal sufficiency and release binding are not inferred. SVGs are statically admitted under the existing bounded item policy; unsupported semantics refuse without silently stripping them. The original bytes are retained, and the item library separately handles selection, modifications, derived SVG and preview export.

## Fluent illustration

Additional fields: `packageDir`, `utilsDir`, `rightsCommit`.

`packageDir` names the already acquired `@iconify-json/fluent-emoji-flat` **1.2.6** root, containing exact `package.json`, `info.json` and `icons.json`. Those files are pinned by SHA256 in the helper. The package/collection must both declare MIT. The package data remains data: it is never imported as JavaScript. Only the selected `assetId` is exported. Alias resolution uses the actual Iconify helpers.

`utilsDir` names an already acquired `@iconify/utils` **3.1.7** package root. Before importing code, the helper verifies its package identity bytes and every file in the complete static import closure of `getIconData`, `iconToSVG` and `iconToHTML`. No arbitrary helper implementation, unpinned fallback, package entrypoint or package installation is used. This explicit operation executes the pinned local utility functions. Files must remain unchanged during use; this is a trusted local workflow, not isolation from a concurrent malicious writer or import-cache tampering.

`rightsCommit` is the full 40-character Microsoft repository commit used for the supplied LICENSE snapshot. It labels only the rights evidence URL. It does **not** bind the Iconify package to a Microsoft release. Keep the full Microsoft notice and describe that limit in `rightsScope`. Metadata declaring MIT and a separately acquired notice snapshot are distinct evidence.

Package JSON and info are bounded to 65,536 bytes each; icons JSON to 10,000,000 bytes; utility files to 65,536 bytes each. A new package/version requires deliberate pin reconciliation and review, not a configuration override.

## Hero tile

Additional fields: `svgFile`, `svgSHA256`, `sourceCommit`.

`svgFile` names the explicit original selected SVG (at most 524,288 bytes); `svgSHA256` is its expected hash. `sourceCommit` is the full 40-character commit supplied by the caller. `assetId` maps to the declared source path `svg/ASSET.svg` in `sschoger/hero-patterns`. The helper preserves this declared binding and verifies bytes, but does not check a repository or infer that an arbitrary local file came from that path. The manifest says so.

The source mode records Steve Schoger and CC BY 4.0 from the selected source contract. Supply the official site's retained licensing statement as evidence and retain acquisition provenance. A repository commit without a rights declaration does not establish licensing. Preserve absent legalcode or unknown release information in `rightsScope`; do not relabel the website snapshot as a retrieved full license text. Rights evidence is bounded to 100..65,536 bytes in either mode.

To prepare another tile, supply a newly inspected original SVG, exact commit/digest, selected ID/title and the appropriately scoped rights evidence. There is no bulk provider crawl or template/page support.

## Verification limits

Original synthetic fixtures exercise exact-byte/rights-hash preservation, round-trip into the item library, refusal of existing output, invalid hashes/commits/unknown options, symlink/oversized evidence, unpinned package impersonation and executable SVG. Real selected package/item preparation is separately qualified in ignored local receipts. Successful preparation establishes scoped deterministic behavior, not taste, legal acceptance, universal SVG compatibility or installed-client integration.
