# Small resource libraries

Use resources to develop the brief's organizing idea. Search and inspect a small candidate set before selecting; a default resource is not a design direction. Build the composition yourself. Full-page designs and template libraries are outside this interface.

The optional Node22 CLI runs from the package root as `node bin/ingenium.mjs ...`. All output directories below must be new, with an existing canonical parent. Existing work is never replaced. Source paths in bin/ingenium.mjs library/items/ui configurations resolve relative to that configuration file; selection/output arguments resolve relative to the caller. The separate item-preparation command resolves its configuration fields from the caller's working directory, as documented in its reference. Nothing installs or fetches on discovery. Missing optional sources report acquisition required or refuse the selected operation.

| Category | Discovery and selection | Editing and delivery |
| --- | --- | --- |
| Symbols / selected SVG | Local official Iconify collection packages through `library` | Dimensions, currentColor replacement and explicit stroke width; separate original/safe/derived SVG and full notice |
| Fonts | Local official Fontsource packages, actual CSS face inspection | Exact selected WOFF2 and CSS; customize typography in authored CSS; binary stays unchanged |
| Shapes | Six original standard geometric constructors through `shapes` | Parametric geometry, fill, stroke; editable SVG |
| Colors | Four bundled Radix3.0.0 blue/gray light/dark scales through `palettes` | Token subsets, explicit derivatives, anchor ramps; JSON/CSS/SVG |
| Illustrations / textures | Explicit prepared selected Fluent/Hero subsets through `items` | Existing paint substitutions, source-preserving SVG and repeated-tile preview |
| Small UI components | Three native wrappers using exact local Bulma1.0.4 CSS through `ui` | Label, hue, radius, size, theme; editable HTML/CSS/JS and local preview |

These are bounded usable subsets. Neither the catalogs nor SVG admission cover arbitrary upstream resources. No taste, acceptance, font sanitation, legal sufficiency or general accessibility certification follows from passing a check.

## Explicit package acquisition

When networking is authorized, first inspect bounded official registry metadata for a candidate's exact version, distribution size and license. Then:

```sh
python3 tools/acquire-npm-package.py @fontsource/inter 5.3.0 ./local/inter
python3 tools/acquire-npm-package.py @iconify-json/lucide 1.2.145 ./local/lucide
python3 tools/acquire-npm-package.py @iconify/utils 3.1.7 ./local/icon-utils
python3 tools/acquire-npm-package.py bulma 1.0.4 ./local/bulma
```

Create `local/` yourself first. The command checks metadata again before downloading its exact declared tarball, checks SHA512, and extracts data only. It allows only Fontsource/Fontsource-variable/Iconify collection families, Iconify utils, and Bulma; it never executes package scripts. Bounds:262144 metadata bytes,16MB archive/unpacked bytes,1000 members,2MB per member. Redirects and denied HTTP responses stop without retry. Original archive, metadata, file hashes and acquisition receipt remain local. SHA512 consistency is separate from signature verification, which is not run. On failure retain and inspect the new partial directory; never overwrite/retry it silently. Do not retry a denied provider API through another identity, proxy or endpoint.

Symbol acquisition additionally requires the full applicable asset notice, not just provider software rights. Keep notice bytes/hash, declared and retrieved URLs, and scope explicit. An upstream-main notice snapshot is not proven release-pinned evidence. These packages and notices are local inputs, not bundled assets.

## Fonts and symbols

Example `library.json` (replace notice hash with the actual retained bytes):

```json
{
  "sources": [
    {"id":"inter","kind":"font","packageDir":"local/inter/package"},
    {"id":"lucide","kind":"symbol","packageDir":"local/lucide/package",
     "license":{"path":"local/lucide-NOTICE.txt","sha256":"ACTUAL_SHA256",
       "declaredURL":"https://github.com/lucide-icons/lucide/blob/main/LICENSE",
       "retrievedURL":"https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE",
       "scope":"Record snapshot identity and any release-binding uncertainty"}}
  ],
  "parserDir":"local/xml-parser-install",
  "iconUtilsDir":"local/icon-utils/package"
}
```

`parserDir` is an existing npm installation containing qualified saxes6.0.0, not its package directory. No automatic dependency setup occurs. See [asset admission](assets.md) for the strict static SVG policy.

```sh
node bin/ingenium.mjs library capabilities library.json
node bin/ingenium.mjs library search library.json font Inter
node bin/ingenium.mjs library details library.json face-query.json
node bin/ingenium.mjs library acquire library.json chosen-face.json ./font-export
node bin/ingenium.mjs library search library.json symbol sun
node bin/ingenium.mjs library acquire library.json chosen-symbol.json ./symbol-export
```

`face-query.json`: `{"sourceId":"inter","cssFile":"400.css"}`. Inspect every returned face's family/style/weight/unicodeRange and relativeFile. Choose the actual faceIndex matching the content; do not assume the first rule is Latin. `chosen-face.json` adds `"faceIndex":6,"selected":true` **only if those are the inspected rule/index for your exact package**. Package version, catalog version label and undecoded binary revision are separate. The route requires matching OFL1.1 declarations/full notice and container admission; actual browser shaping/fallback checks remain necessary.

`chosen-symbol.json`: `{"sourceId":"lucide","name":"sun","selected":true,"customize":{"width":48,"height":48,"color":"#006c70","strokeWidth":1.5}}`. Edits are optional. Color requires existing currentColor paint, stroke requires explicit source stroke-width. Unknown edits or unsupported SVG refuse. Acquisition preserves `resolved.svg`, admitted `safe.svg`, and separate `derived.svg` when edited, plus hashes/notices/provenance. Package version and collection timestamp do not establish the upstream artwork release.

API: `createPackageLibrary(config)` exposes async capabilities/search/details/acquire. `customizeSymbol(bytes,controls,{parserDir})` returns a separate admitted SVG buffer with parent/output hashes. Explicit Iconify utils3.1.7 package directory is required; only pure conversion helpers are imported, never its barrel/loaders/install helpers. This is locally supplied executable tooling, separate from data-only source packages; use a trusted verified distribution and retain its acquisition receipt.

## Shapes and palettes

```sh
node bin/ingenium.mjs shapes discover
node bin/ingenium.mjs shapes create shape-parameters.json ./shape-export
node bin/ingenium.mjs palettes discover blue
node bin/ingenium.mjs palettes inspect radix-blue-light
node bin/ingenium.mjs palettes export palette-spec.json ./palette-export
```

Shape parameters: `{"id":"star","width":200,"height":200,"fill":"#006c70","stroke":"#17283a","strokeWidth":2,"starPoints":7}`. IDs:circle/ellipse/rectangle/triangle/hexagon/star. Bounds:dimensions8..2048, six-digit hex/none paint, stroke up to a quarter of minimum dimension, star3..12 points; rectangle cornerRadius fits inner geometry. `src/shapes/index.mjs` exports discoverShapes/createShape/customizeShape/exportShape; customization returns a new shape with derivedFrom hash. This is original geometry, not a downloaded shape collection.

Palette spec: `{"id":"radix-blue-light","select":{"tokens":["blue-1","blue-9","blue-12"]},"customize":{"id":"study-teal","replacements":{"blue-9":"#006c70"}}}`. For generated ramps use `{"generate":{"id":"warm-ramp","from":"#fff8eb","to":"#683815","steps":12}}`. Exports include provenance and applicable notice. Read [palette API](palettes.md) for contrast and opaque-sRGB limits. Generation does not guarantee perceptual quality or reassign anchor rights.

## Items and UI

Prepare selected source data with [item preparation](item-preparation.md), then [inspect/acquire items](items.md):

```sh
node tools/prepare-item-source.mjs preparation.json
node bin/ingenium.mjs items discover items-config.json rocket
node bin/ingenium.mjs items inspect items-config.json item-selection.json
node bin/ingenium.mjs items acquire items-config.json item-selection.json ./item-export
```

Items config: `{"sources":["prepared/manifest.json"],"parserDir":"local/xml-parser-install"}`. Selection: `{"sourceId":"YOUR_PREPARED_ID","assetId":"rocket","selected":true,"recolor":{"#ca0b4a":"#006c70"}}`. Inspect the actual palette first; absent paint refuses. Texture preview repeats the admitted tile with CSS. Preserve attribution/source/license/change records; unsupported source semantics refuse.

UI config: `{"packageDir":"local/bulma/package"}`. Commands:

```sh
node bin/ingenium.mjs ui capabilities ui-config.json
node bin/ingenium.mjs ui discover ui-config.json dialog
node bin/ingenium.mjs ui inspect ui-config.json component-query.json
node bin/ingenium.mjs ui acquire ui-config.json component-selection.json ./component-export
```

Query: `{"id":"dialog"}`. Selection shorthand: `{"id":"dialog","controls":{"label":"Review choice","hue":220,"radius":12,"size":"large","theme":"light"}}`. Actual API select/customize objects and exported source.json are also accepted. See [UI API](ui.md). Inspect the local preview with actual keyboard interaction and relevant narrow viewport checks; a generated wrapper is not a tested complete product flow.

Finally render selected SVG using the existing `render` command, or render authored HTML in a qualified local browser. Inspect actual font identity and final-size previews, preserve source/derived hashes, and correct observed problems. Resource acquisition and deterministic checks do not replace visual review.
