# Explicit local font packs

`src/catalog/font-packs.mjs` exports only `createFontPackLibrary({manifestPath})`. Construction is inert: no file access, downloads, installation, font registration or client integration. Methods are asynchronous:

- `capabilities()` reports pack identity, counts, limits and selected container support.
- `search({query?,family?,style?,weight?,format?,offset=0,limit=12})` returns `{pack,total,offset,limit,nextOffset,entries,qualification}`. Limit is 1–32; query at most 128 characters. Family comparison is case-insensitive exact match; query searches ID, family and declared PostScript name. Style/weight/format filters are exact. Results are defensive copies. Discovery is metadata only.
- `details({id})` returns one declared font and its independent notice records, without reading font or notice payloads.
- `inspect({id})` verifies selected font and notice lengths/SHA256, canonical source paths and supported bounded container structure. Returned PostScript name/family/version are manifest declarations, not decoded font identities. `verified` contains actual selected hashes.
- `acquire({id,selected:true,outputDir,controls?})` exclusively creates a new output directory and exports the unchanged binary, byte-identical original manifest, all associated notice bytes, authored CSS/HTML preview, selected source metadata and provenance hashes. It performs selected inspection first. Existing output is refused. No automatic cleanup of a partially written new output on filesystem errors; retain it as error evidence.

## Manifest version 1

A trusted, single-owner pack lives in one canonical directory, with a bounded UTF-8 JSON manifest:

```json
{
  "schemaVersion": 1,
  "id": "original-font-pack",
  "provider": "original-synthetic",
  "version": "1.0",
  "commit": "exact-source-revision",
  "fonts": [{
    "id": "regular-woff2",
    "path": "font.woff2",
    "sha256": "ACTUAL_64_LOWERCASE_HEX_DIGEST",
    "bytes": 12345,
    "family": "Original Family",
    "style": "normal",
    "weight": 400,
    "format": "woff2",
    "postScriptName": "DeclaredOptionalName",
    "sourceURL": "https://example.invalid/pinned-font",
    "noticeIds": ["family-license", "additional-notice"]
  }],
  "notices": [{
    "id": "family-license",
    "path": "LICENSE.txt",
    "sha256": "ACTUAL_64_LOWERCASE_HEX_DIGEST",
    "bytes": 1234,
    "license": "Exact source license label; not legal adjudication",
    "sourceURL": "https://example.invalid/pinned-notice"
  }, {
    "id": "additional-notice",
    "path": "NOTICE.txt",
    "sha256": "ACTUAL_64_LOWERCASE_HEX_DIGEST",
    "bytes": 567,
    "license": "Independent applicable notice",
    "sourceURL": "https://example.invalid/pinned-additional-notice"
  }]
}
```

The displayed hashes and byte counts are placeholders, not usable fixture values. IDs must be lowercase alphanumeric segments separated by hyphens. Each font binds its own set of 1–32 notices. No uniform collection license is inferred; non-OFL fonts can be selected with retained exact applicable notices. All notice files are exported as raw bytes, including BOM and non-UTF-8 bytes; no decode/re-encode changes their identity. License labels and provenance establish recorded source identity, not rights sufficiency.

Metadata-only entries use `acquired:false` with ID/family/style/weight/format/sourceURL and no local `path`. They may list `woff2`, `truetype`, `opentype` or `collection` format. `details`/`search` remain available; `inspect`/`acquire` throw `code:'not-acquired'`. OpenType/CFF OTF and TTC acquisition are unsupported; their presence in Google/Nerd/free-font directories cannot imply acquired or rendered fonts.

## Bounds, controls and container scope

Manifest: 2 MiB, up to 10,000 font entries and 10,000 notice metadata records. Selected font: 8 MiB overall, with **the reused WOFF2 gate's stricter 512 KiB limit**. Each notice: 64 KiB. Source paths must be pack-relative, without traversal; absolute/backslash paths, symlinks, symlinked ancestors, noncanonical files and hash/length mismatches refuse. Output requires an existing canonical parent. Source ownership and lack of competing writers are prerequisites; this is not a hostile-input security sandbox or race-proof store.

WOFF2 uses the existing `validateWoff2`: signature/flavor, declared length, bounded table count, reserved field, total decoded-size/compressed-size limits, optional-block bounds. It does not decompress or validate compressed tables/glyphs. TrueType SFNT checks only the standalone 0x00010000 signature, table directory count/range, unique printable tags, aligned bounded table offsets, and nonoverlapping table byte ranges. It does not verify checksums, required tables, table semantics, glyph outlines, hints, shaping or sanitation. Variable-table presence is reported for TrueType when visible in the directory; it is not variable-font qualification. WOFF2 variable metadata is opaque to this container-only gate.

Preview controls: `fontSizePx` 8–160 (default 32), `lineHeight` .8–3 (1.5), `letterSpacingEm` -.1–.5 (0), `previewWidthPx` 240–2000 (900). All must be finite numbers. Unknown controls/acquisition options refuse. Family, real style and real weight come from selected metadata; CSS does not rewrite font binaries or synthesize a requested new face. The exported CSS uses a fixed safe alias and a selected local file. A preview is editable HTML/CSS with a fixed representative specimen; inspect actual browser font identities and fallback separately.

No glyph creation/editing, font patching, sanitation, variable instancing, axis manipulation, subsetting, TTC extraction, OTF conversion or global registration. These require separate tools, source rights and qualification. Existing Fontsource acquisition remains separate and unchanged. Optional Hack integration testing uses `INGENIUM_HACK_MANIFEST` pointing to a normalized local manifest; default tests contain only original synthetic bytes. A successful container fixture does not prove a usable font.

Errors carry `code` for manifest, path, file/bounds, query, selection, not-acquired, format, integrity, container or controls refusals; reused WOFF2 validation retains its existing error contract. Ordinary filesystem/JSON errors also propagate. Installed-consumer/client qualification must be performed by the integrator after packaging; source tests are not installed routing evidence.
