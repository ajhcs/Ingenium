# Selected user-local Voxel PNGs

`createLocalAssetCatalog` in `src/catalog/local-assets.mjs` exposes metadata for 30 free PNGs at BIAsia/voxel-icon commit `380fbd33513193164b31821ae1ea62b6e9ccd388`: 15 native and 15 directed. No pixels are bundled. Titles/tokens are inferred from filenames; do not present them as upstream semantic categories.

The retained full repository terms distinguish MIT skill code from custom image terms. The latter permit personal/commercial project use and modification but forbid redistribution or sale of original or modified icon files themselves, including asset packs, templates and generators. Keep acquisitions user-local; do not add pixels to redistributed Ingenium packs. This records the source terms, not general legal clearance or an extra approval gate.

```js
import { createLocalAssetCatalog } from './src/catalog/local-assets.mjs';
const local = createLocalAssetCatalog(); // network disabled
local.discover({query:'pencil', variant:'native', limit:4});
local.details({id:'pencil'});
// Explicit selected acquisition only when network use is intended.
const selected = await createLocalAssetCatalog({allowNetwork:true}).acquire({
  id:'pencil', selected:true, outputDir:'/existing-parent/new-pencil',
});
await local.acquire({id:'pencil', selected:true, reuseDir:selected.outputDir,
  outputDir:'/existing-parent/new-offline-pencil'});
```

`discover`/`search` are aliases: query up to 128 characters, optional native/directed variant, offset 0..30, limit 1..32, stable entries and `nextOffset`. `details({id})` returns metadata/terms pin with image validation not-run. `capabilities()` does not probe connectivity. Discovery never downloads or executes upstream skill/code.

`acquire({id,selected:true,outputDir,reuseDir?})` fetches full terms and exactly one immutable PNG, or verifies retained files offline. No arbitrary URL, override, bulk acquisition or editing operation exists. Output contains unchanged `original.png`, full `LICENSE.md`, `source.json`, local `preview.html` and `provenance.json`. Actual SHA256/size, source Git blob identity, terms hash, mode and request observations are retained. Header inspection is not full decoding; open the actual preview in a browser/decoder.

Built-in requests enforce manual redirects, exact HTTP 200, source size/Git blob checks and deadlines (default 15 seconds; 100..30,000 ms). Caps are 64 KiB terms, 2,000,000 PNG bytes and 4096×4096 dimensions. Existing outputs/symlink parents refuse before requests. Failed new outputs remain for inspection; no retry or alternate endpoint is chosen automatically. A selected failure does not prove provider-wide unavailability.

`reuseDir` verifies the bounded original artifact set and complete terms without refetching. Its mode is offline-reuse; origin remains a retained receipt claim. An optional test `transport(request)` receives url/maxBytes/timeoutMs/redirect/signal and returns `{status,url,body}` with a Uint8Array body; injected results are always labeled fixture. This transport contract differs from the Fetch Response contract in font/brand downloaders. None of these helpers is a hostile-input filesystem sandbox; use a trusted single owner.

CLI: `ingenium local-assets search CONFIG.json REQUEST.json`, `details CONFIG.json REQUEST.json`, or `acquire CONFIG.json REQUEST.json NEW_OUTPUT_DIR`. Config is `{}` or explicit `{"allowNetwork":true}`. Search request `{"query":"pencil","variant":"native","limit":4}`; details `{"id":"pencil"}`; acquisition adds `"selected":true` and optionally a caller-relative reuseDir.

Prior live qualification decoded one native pencil and checked exact offline reuse with full terms. It does not cover every PNG, vector editing, physical/print properties, redistribution permission, user acceptance or desktop skill discovery.
