# Selected user-local Voxel PNGs

`src/catalog/local-assets.mjs` exports `createLocalAssetCatalog` and `inspectPngBytes`. It ships **metadata only** for the30 free PNG files at immutable `BIAsia/voxel-icon` commit `380fbd33513193164b31821ae1ea62b6e9ccd388`:15 under `icons/native/`,15 under `icons/directed/`. Each entry retains its real path, exact byte size and Git blob SHA1. Titles/name tokens are inferred from filename spelling; semantic tags/categories are not invented. A commit is not a release/tag version.

The retained full repository `LICENSE.md` separates skill code/documentation MIT from custom free-icon terms. Those terms permit unlimited personal/commercial projects and modifying, cropping, recoloring or compositing the free icons. They forbid reselling, redistributing or republishing original **or modified icon files themselves**, alone or in another icon pack, asset library, template or generator. This adapter downloads a selected file into a caller-owned **user-local output**; no PNG pixels are bundled into Ingenium, its tests/fixtures, or a prepacked asset library. Do not copy acquired files into a redistributed pack. These are factual source terms, not an added approval requirement or a general legal-clearance claim.

```js
import { createLocalAssetCatalog } from './src/catalog/local-assets.mjs';
const local = createLocalAssetCatalog(); // network disabled, no I/O on construction
local.discover({query:'pencil',variant:'native',offset:0,limit:12});
local.details({id:'pencil'}); // metadata; no image/terms download
await local.capabilities(); // metadata-local/network-disabled; no fetch

// Invoke explicitly when selected network acquisition is intended.
const selected = await createLocalAssetCatalog({allowNetwork:true}).acquire({
  id:'pencil',selected:true,outputDir:'/user/assets/new-selected-pencil'
});
console.log(selected.previewPath);

// A new output from a retained verified export; no network selector needed.
await local.acquire({id:'pencil',selected:true,
  reuseDir:'/user/assets/new-selected-pencil',
  outputDir:'/user/assets/new-offline-pencil'});
```

API paths resolve relative to process cwd; callers may resolve config-relative paths themselves. Output parent must already exist and be canonical. Existing outputs and symlink parents refuse before transport. Each invocation acquires exactly one known catalog ID; no arbitrary URL, commit, path override, bulk-download or editing operation is exposed.

`discover`/`search` are aliases and accept `query` up to128 characters, optional `variant:'native'|'directed'`, `offset`0..30 and `limit`1..32. Results have `total`, `nextOffset` and defensive-copy entries in stable ID order. `details({id})` returns selected metadata, custom-terms pin and not-run image validation; neither operation accesses the network. `capabilities()` does not probe connectivity or infer a global service outage. Default construction does not access local files either.

`acquire({id,selected:true,outputDir,reuseDir?})` checks the complete full terms first, then only the selected immutable raw PNG URL. Only generated `https://raw.githubusercontent.com/BIAsia/voxel-icon/<pinned-commit>/...` URLs are used by the built-in transport. It never executes upstream skill/code, fetches paid packs, installs tools or follows another endpoint after failure. Network is opt-in via `allowNetwork:true`; construction/discovery never invokes it. Redirects/non200 responses refuse without retry. The built-in fetch uses manual redirects, a default15-second per-request deadline and stream bounds; `timeoutMs` may be100..30000. Terms cap65536 bytes; PNG cap2,000,000 bytes and additionally the exact expected source size. An unsuccessful selected acquisition is not proof that all repository/public endpoints are unavailable.

The exact full1831-byte terms are verified against SHA256 `c18474f2be8b6ad8559a9948d51be4b435b2f10e1d2d8dbf2b57ac9a95da89b6` and Git blob `e63dacbcb426ca66f6d8e7cf71a8bff56773e7a6`. The selected PNG must match exact expected size and Git blob SHA1; computed SHA256 is retained for subsequent byte identity checks. PNG signature/IHDR dimensions are bounded at4096×4096 and16,777,216 pixels. These are header/container and pinned-byte checks, not universal image sanitation or full decoding. Use an actual decoder/browser for rendering evidence. Git blob matching and retained commit/tree metadata are consistency evidence, not signed-origin verification.

Each new output contains:

- `original.png`: unchanged selected source bytes.
- `LICENSE.md`: exact full repository terms, including the custom image restrictions.
- `source.json`: selected metadata and source/version/rights scope.
- `preview.html`: local-image preview with restrictive CSP, no external requests.
- `provenance.json`: immutable URL/commit, expected and actual hashes/size/dimensions, full-terms identity, request observations, artifact hashes and acquisition mode.

`reuseDir` reads only this bounded owned artifact set and verifies its retained hashes plus the pinned original PNG/full terms before creating another output. Symlink files, malformed/traversal artifact sets, wrong identity, missing terms or corruption refuse; there is no refetch fallback. Original/terms/source/preview artifact hashes repeat exactly; provenance correctly changes mode to `offline-reuse`. The retained original mode is labelled a receipt claim, not reverified live origin. No global cache or client setting is changed. Filesystem failures can leave a partial new output; existing work is never replaced. Use one trusted owner without competing writers; these checks do not constitute a universal sandbox.

Optional test transport:

```js
const fixture = createLocalAssetCatalog({transport: async request => ({
  status:200, url:request.url,
  body:await readRetainedBytesForExactURL(request.url) // Uint8Array
})});
```

Transport receives `{url,maxBytes,timeoutMs,redirect:'manual',signal}` only on selected acquisition. Its return body/status/final URL and all source pins are checked. Every injected response is labelled `fixture`, even when replaying retained live bytes; it is never relabelled a live provider response. Deadline failure reports a scoped error without retry. The callback is caller-supplied trusted code and should honor its abort signal; the adapter cannot sandbox unrelated callback side effects. Errors retain bounded request observations/status/hash where available and do not capture response body text.

One actual selected native pencil has been acquired from the pinned URLs, exact blob/size/full terms verified and decoded by Chromium. All four content artifacts matched offline reuse and fixture replay; live/offline/fixture provenance remained distinct. This is selected-asset evidence, not validation of all30 PNGs, physical material/printing properties, asset redistribution rights, user acceptance or installed-client discovery. No design candidate is produced by this adapter.
