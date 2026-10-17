# Selected user-local Simple Icons

Use `createBrandDownloadClient({allowNetwork=false,transport?,timeoutMs=15000})` from `src/catalog/brand-download.mjs`, or `openResourceDownloader({id:'simple-icons'})` from the resource gateway. Browse before enabling the intended selected download.

`capabilities()` is inert; async `search`/`discover` and `details` read the compact installed index. Search supports query/offset/limit 1..32 and returns `nextOffset`. All 3,466 pinned 16.35.0 entries have selected-download descriptors; only ActivityPub artwork is bundled. Preserve actual aliases, slugs, source/license/guideline declarations separately from inferred name tokens.

```js
import { createBrandDownloadClient } from './src/catalog/brand-download.mjs';
const local = createBrandDownloadClient();
await local.search({query:'javascript', limit:4});
await local.details({id:'javascript'});
const acquired = await createBrandDownloadClient({allowNetwork:true}).acquire({
  id:'javascript', selected:true, outputDir:'/existing-parent/new-javascript',
});
await local.acquire({id:'javascript', selected:true, reuseDir:acquired.outputDir,
  outputDir:'/existing-parent/new-offline-javascript'});
```

Acquisition requires `selected:true` and requests one original from immutable commit `4d29a35c954699b389a834aacc97dd6e7e74143c`, verifying exact size/SHA256. It writes unchanged `original.svg`, full project `LICENSE.md`/`DISCLAIMER.md`, original per-entry `declaration.json` and `acquisition.json`. These user-local files are separate from bundled redistribution.

Project CC0 is not an all-icon license. JavaScript, for example, declares MIT; this route preserves that declaration/source URL but does not acquire its separate full notice (`fullPerIconNoticeAcquired:false`). `projectNoticeMatchesExplicitCC0:true` identifies an explicit CC0 declaration whose full project text is retained. Neither field establishes trademark permission or legal sufficiency. Keep available notices and these limits visible without inventing an additional approval workflow.

`reuseDir` accepts exactly the original five-file acquisition and verifies its bytes/declarations/notices. It never refetches corruption. Mode becomes offline-reuse and the retained origin remains a receipt claim. Live requests reject redirects, changed URLs, non-200/encoded responses, size/hash mismatches and deadlines; timeout is 10..30,000 ms, SVG cap 1,000,000 bytes plus exact descriptor size. New canonical output directories only; failures may leave partial output. No bulk archive, retry, installation or upstream code execution occurs.

## Separate presentation and rendering

Acquisition does not parse or render the SVG. Optional `prepare` verifies the retained original and uses existing saxes 6.0.0 for the narrow pinned Simple Icons root/title/path shape:

```js
const prepared = await local.prepare({
  id:'javascript', selected:true, sourceDir:acquired.outputDir,
  outputDir:'/existing-parent/new-javascript-presentation',
  parserDir:'/existing/parser/npm-directory',
  controls:{width:128, height:128, fill:'#2468AC'},
});
```

Width/height are integers 1..2048 (default 64); fill is six-digit hex (default black). The derivative removes root role, adds dimensions/fill and preserves viewBox, title semantics and exact path data, including compact arcs. Unsupported nodes/attributes and controls refuse. This is `simple-icons-pinned-source-presentation/1`, separate from `static-icon-v1`; it neither broadens that policy nor validates arbitrary geometry.

Preparation copies original acquisition artifacts unchanged beside `derived.svg`/`preparation.json`. Retain the original directory for offline reuse; prepared directories have extra files and cannot serve as `reuseDir`. Render `prepared.derivativePath` to a separate PNG with the [SVG helper](svg.md) and inspect it.

CLI supports `brand-download search|details CONFIG REQUEST`, `acquire CONFIG REQUEST NEW_OUTPUT_DIR`, and `prepare CONFIG REQUEST NEW_OUTPUT_DIR`. Config is `{}` for offline work or explicit `{"allowNetwork":true}` for acquisition; optional parserDir is config-relative. Acquire request is `{"id":"javascript","selected":true}`. Prepare adds sourceDir and controls as above; sourceDir/output paths are caller-relative.

Three prior live originals/presentations—ActivityPub, JavaScript and Simple Icons—were rendered and reused offline. That selected coverage does not qualify all descriptors for presentation, rights, rendering, desktop discovery or design acceptance.
