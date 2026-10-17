# Offline resource catalog navigation

`src/catalog/index.mjs` exports `createResourceCatalog({sources?,parserDir?,iconUtilsDir?,fluent?})`. This is an optional offline facade, not a remote provider catalog. Supply one to eight current package-library font/symbol sources and/or one exact Fluent Emoji Flat source. Construction imports only shipped helper functions and performs no I/O, network, installation or upstream package execution. Read operations reopen bounded canonical local data; no index/cache is silently persisted.

```js
import { createResourceCatalog } from './src/catalog/index.mjs';
const catalog = createResourceCatalog({
  sources: packageConfig.sources, // same explicit sources as createPackageLibrary
  parserDir: packageConfig.parserDir,
  iconUtilsDir: packageConfig.iconUtilsDir,
  fluent: {
    id: 'fluent',
    packageDir: '/local/fluent-emoji-flat-package', // exact @iconify-json/fluent-emoji-flat1.2.6
    utilsDir: '/local/iconify-utils-package', // exact qualified3.1.7 helper closure
    rightsEvidenceFile: '/local/microsoft-LICENSE.txt',
    rightsEvidenceSHA256: 'c2cfccb812fe482101a8f04597dfc5a9991a6b2748266c47ac91b6a5aae15383',
    rightsCommit: '1ffb34c752ecf5d402f04cfb4b392c77f57c54bc',
    rightsScope: 'Retained full Microsoft MIT notice snapshot. Exact artwork release binding remains unknown.'
  }
});
const page = await catalog.search({kind:'illustration',offset:3000,limit:32});
const following = page.nextOffset === null ? null
  : await catalog.search({kind:'illustration',offset:page.nextOffset,limit:32});
```

Configuration paths are explicit API paths resolved against the process working directory; a caller/CLI may resolve them relative to its own config first. No checkout/private hardcoded paths are shipped. Full rights evidence and package/helper hashes are rechecked by selected preparation/acquisition. The example digest/commit identify the retained Microsoft notice, not a proven artwork release or legal clearance. Other source/license/version claims remain scoped exactly as in the package and item helpers.

`capabilities()` returns source-local/acquisition-required/error states and actual JSON name counts. `search({kind?,sourceId?,query='',offset=0,limit=24,filters={}})` returns `total`, `results`, `nextOffset` and source states. Kinds are `font`, `symbol`, `illustration`; limit1..64, offset0..100000, query up to128 characters. Ordering is stable sourceId/name order, not taste/semantic relevance ranking. Pages are reproducible while source bytes and query/filters remain fixed; no concurrent-writer snapshot or cursor claim. Missing/corrupt sources are explicit states; their results are absent rather than invented or fetched.

Filters:

- `category`: case-insensitive exact **source-supplied** collection/family category.
- `sourceTags`: up to16 case-insensitive exact collection/family tags; all must match.
- `inferredNameTokens`: up to16 exact hyphen-separated name tokens; these are explicitly inferred spelling tokens, never source semantic tags. Font tokens derive from configured sourceId.
- `weight`, `style`, `subset`: declared font family metadata. A family advertising a weight does not prove its corresponding CSS/binary is present.
- `alias`: boolean, and `namePrefix`: exact lowercase name prefix.

Unknown filters refuse. Every result separates `sourceMetadata` and `inferred`. Collection tags apply to the collection; no per-artwork tags are invented. Family metadata and package versions remain distinct from source catalog version labels and actual selected CSS faces. Symbols expose all bounded real icon/alias keys, not just the first32 names. Each symbol JSON is capped at5,000,000 bytes and20,000 icons plus20,000 aliases; combined catalog100,000 records. All names must satisfy bounded supported slug syntax. Unsafe/malformed catalogs report errors instead of truncating silently.

Fluent discovery verifies the same three exact package files pinned by `prepare-item-source.mjs`. The qualified1.2.6 file contains **3174 icon names plus7 aliases**. Its `info.json` declares3145; both actual counts and the differing source declaration remain explicit. Listing metadata does not import helper code, inspect SVG semantics or assert that all listed artwork will pass static admission. No artwork is pre-extracted in bulk.

Selected operations use existing helpers:

```js
// Actual CSS-face inspection; choose the returned faceIndex and Unicode range.
await catalog.inspect({sourceId:'inter',cssFile:'latin-400.css'});
await catalog.acquire({sourceId:'inter',cssFile:'latin-400.css',faceIndex:0,
  selected:true,outputDir:'/local/new-font-export'});

// Selected SVG inspection writes to an explicit NEW preparation directory.
const inspected = await catalog.inspect({sourceId:'fluent',name:'avocado',selected:true,
  preparationDir:'/local/new-avocado-inspection'});
await catalog.preview({sourceId:'fluent',name:'avocado',selected:true,
  recolor:{[inspected.detail.palette[0]]:'#7854ab'},outputDir:'/local/new-avocado-export'});
// Use a real palette entry from inspect().detail.palette; absent colors refuse.
```

`inspect` for a symbol likewise requires `selected:true` and new `preparationDir`; it delegates package acquisition and returns the admitted selected `previewSVG`. Font inspection parses selected CSS without acquiring a binary; explicit acquisition validates the actual selected WOFF2 and full notice. Symbol acquisition supports the existing bounded `customize` controls. Fluent inspect prepares exactly one selected name using the unchanged pinned preparation helper, then calls item inspection; acquisition exports separate `source/` preparation and `asset/` original/derived/rights/attribution/provenance. Fluent recolor/background controls are the existing item controls, not arbitrary SVG rewriting.

`preview` is an alias for explicit selected acquisition, returning `previewPath`; it is not a silent read or screenshot renderer. Font/symbol outputs retain existing helper artifacts plus `catalog-preview.html` and separate `catalog-selection.json`; Fluent uses the item preview and adds that selection receipt. Font preview text is a small Latin/numeric sample; selected subset coverage and actual browser font identity must be checked separately. Unsupported options, absent names, malformed packages, missing/full-notice mismatches and selected SVG policy failures refuse. Some aliases apply transforms outside the current static-icon policy: for example the flipped Fluent `backhand-index-pointing-right` refuses while plain `japanese-hear-button` resolves. No policy relaxation or promise of catalog-wide admission.

All outputs require new exclusive directories with existing canonical parents; existing work is never replaced. A failed nested acquisition or filesystem write may leave a partial new output for inspection. Use a trusted single owner without competing writers. Source byte identity, retained registry consistency, rights applicability, rendering evidence, client discovery and user acceptance are separate claims. No provider lookup, design output or complete template is created by catalog metadata navigation.
