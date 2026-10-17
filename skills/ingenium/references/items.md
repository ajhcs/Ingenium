# Selected illustrations and repeatable textures

`src/items/index.mjs` exports `createItemLibrary({sources, parserDir?})`. Sources are explicit paths to small local manifests, not remote catalogs. Construction performs no I/O. No network, installation, provider credentials, SVG tracing, general pattern editor or template library is included. Prepare a bounded selected source subset separately; keep third-party source packages and receipts outside Git. Do not reinterpret a package code license as artwork rights.

Methods:

- `discover({kind?,query?,limit?})`: search prepared metadata, categories `illustration` or `texture`, limit1..32 (default12), query up to128 characters. Describes its offline curated-source scope.
- `inspect({sourceId,assetId})`: read/hash selected SVG and retained rights evidence, admit actual source with the existing optional strict static SVG parser, return palette, viewport and editable serialized `previewSVG`. Discovery alone is not selected-file validation.
- `acquire({sourceId,assetId,selected:true,outputDir,recolor?,background?})`: explicitly select one inspected entry into a new directory. `recolor` maps up to16 existing exact hex fill/stroke colors to six-digit hex colors, case insensitive. Absent source colors and duplicate case-insensitive keys refuse. `background` is six-digit hex, default white, affecting preview only. Originals stay byte-identical. No generic XML replacements or source overwrites.

Acquisition produces separate `original.svg`, `derived.svg`, `RIGHTS-EVIDENCE.txt` (verbatim bytes, possibly an HTML source-site declaration), `ATTRIBUTION.txt`, `preview.html`, and `provenance.json`. Attribution includes author, selected source URL, license URL, rights-evidence URL, scope and changes. All artifact bytes/hashes are recorded. Preview has no scripts; illustrations display one image, textures repeat the tile with CSS. The parser policy remains `static-icon-v1`, reused to admit bounded static tile/illustration source shapes; this does **not** add SVG `<pattern>`, gradient, filter, text, mask or transform support. CSS repetition is distinct from admitting an SVG pattern element. An authored texture declaration is not proof of mathematical seam continuity.

A minimal manifest has this shape. Values below describe an original synthetic asset; replace them with retained evidence and actual hashes, never invented rights:

```json
{
  "schema": "ingenium-items/1",
  "id": "original-study",
  "kind": "texture",
  "title": "Original synthetic tile",
  "sourceURL": "https://example.test/source",
  "version": "original-v1",
  "rights": {
    "license": "MIT",
    "author": "Original author",
    "licenseURL": "https://example.test/license",
    "evidenceURL": "https://example.test/license",
    "evidenceFile": "LICENSE.txt",
    "evidenceSHA256": "REPLACE_WITH_ACTUAL_64_HEX_HASH",
    "scope": "Explain exactly which source and version this notice covers."
  },
  "assets": [{
    "id": "tile", "title": "Original tile", "file": "tile.svg",
    "sha256": "REPLACE_WITH_ACTUAL_64_HEX_HASH",
    "sourceURL": "https://example.test/tile.svg",
    "sourceNote": "Explain extraction, source identity and any unknown upstream version."
  }]
}
```

Supported declared license identifiers are MIT and CC-BY-4.0. The adapter checks required evidence fields, HTTPS URLs, retained evidence byte identity and length, and actual asset bytes; it does not independently authenticate a local manifest, adjudicate rights or infer release-pinned licensing from a package name. A source-site declaration, floating notice, commit snapshot, package version and upstream artwork release are different evidence. Record the distinction in `rights.scope` and `assets[].sourceNote`. Retain full applicable upstream notices; CC BY attribution must credit the creator, link the source/license and indicate changes. Do not omit additional notices present in the original source. Other rights such as trademarks remain outside this technical check.

Practical bounds:1..8 manifests,128KiB each;1..64 unique assets per source; selected SVG512KiB; rights evidence100..65536 bytes; canonical regular local files without symlink ancestors; source-relative filenames without traversal; existing canonical output parent and new output directory. Repeated access rechecks source hashes; no transport/cache fallback. Use a trusted single owner without competing writers; these file checks are not a race-proof sandbox. Filesystem failures can leave an incomplete new output directory; inspect and remove it explicitly before retrying. Optional `parserDir` follows the existing explicit saxes6.0.0 locator and never installs dependencies. Missing parser refuses inspect/acquire, while metadata discovery remains usable. Render `derived.svg` through the existing optional SVG renderer or open the local preview; rendering is separate from design acceptance.

## Bounded real-source qualification

A private ignored qualification used one Microsoft Fluent Emoji Flat rocket, extracted as data using pinned `@iconify/utils`3.1.7 pure conversion helpers from integrity-verified `@iconify-json/fluent-emoji-flat`1.2.6. Only package/collection JSON was read; no registry scripts or package entrypoints ran. The integrator explicitly raised this one source's unpacked limit to12MB after metadata reported9,163,069 bytes. The512KiB selected-asset bound stayed unchanged. Full Microsoft MIT notice was retained from official repository commit `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc`; the package's upstream release commit remains unknown. Do not label that notice snapshot as proof of an exact artwork-release binding.

The texture was Steve Schoger's80×80 Anchors Away tile from official repository `sschoger/hero-patterns`, commit `6a2ed74a6910a8b1095d15dd31f7f3f0188517ad`. The repository has no declared license; the official [Hero Patterns site](https://heropatterns.com/) explicitly declares [CC BY4.0](https://creativecommons.org/licenses/by/4.0/). The complete site snapshot was retained as rights-declaration evidence with creator attribution, source/license links and modification notice. A request for the external full `legalcode.txt` returned HTTP403; that full legal text was not retrieved. Do not claim it was bundled or that HeroPatterns is MIT.

Both selected original/derived SVG pairs rendered with existing Sharp and existing Chromium with its sandbox enabled. Browser proof used inline selected assets and blocked network requests, with no requests or page errors. Human inspection confirmed visible palette changes and repeated texture rendering; it does not establish artistic acceptance or universal seam correctness. Tests use original synthetic fixtures and cover corruption, path escape/symlinks, absent selection, rights fields, unsupported SVG, new-output collisions, original preservation, palette and attribution. Run Node22 `node --test tests/items.test.mjs`; set `INGENIUM_ITEMS_PARSER_DIR` to an existing npm directory containing qualified saxes6.0.0 for full parsed-SVG tests. No installed-client integration was tested.
