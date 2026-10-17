# Selected provider fonts

Use this only for an intended selected download. Google/Nerd/free-font collection browsing belongs to [directory metadata](bundled-resources.md); a listed face is not automatically an acquisition descriptor. `createFontDownloadClient({allowNetwork=false,transport?,timeoutMs=30000})` in `src/catalog/font-download.mjs` exposes three pinned selections and explicit additional descriptors.

Import, construction, `capabilities()`, `search()` and `details()` never download or register fonts. `search({provider,query,offset,limit})` pages 1..32 selections; provider is a repository ID, not a gateway ID.

| Built-in ID | Provider / selected file | Full accompanying notices |
| --- | --- | --- |
| `google-abel-regular` | google/fonts, Abel-Regular.ttf, 35,220 bytes | Family OFL and FONTLOG |
| `nerd-hack-regular` | ryanoasis/nerd-fonts, HackNerdFont-Regular.ttf, 2,798,160 bytes | Hack notice and separate Nerd mixed-license notice |
| `free-font-negatape` | jaywcjlove/free-font, NegaTape.ttf, 44,788 bytes | Matching upstream x5y8pxNegaTape OFL and AUTHORS |

`details({id})` returns immutable commits, exact file sizes/Git blob identities, full notice pins and any cross-repository binding. The free-font mirror matches the upstream binary; the repository software MIT license is not substituted for the font's notice.

```js
import { createFontDownloadClient } from './src/catalog/font-download.mjs';
import { createFontPackLibrary } from './src/catalog/font-packs.mjs';
const offline = createFontDownloadClient();
offline.search({provider:'google/fonts', limit:4});
const detail = offline.details({id:'google-abel-regular'});
// Run the acquisition only when this selected network operation is intended.
const selected = await createFontDownloadClient({allowNetwork:true}).acquire({
  id:detail.id, selected:true, outputDir:'/existing-parent/new-abel-source',
});
const local = createFontPackLibrary({manifestPath:selected.manifestPath});
await local.inspect({id:detail.id});
await local.acquire({id:detail.id, selected:true,
  controls:{fontSizePx:40, lineHeight:1.6, letterSpacingEm:0.02},
  outputDir:'/existing-parent/new-abel-preview'});
```

The last operations are local and repeatable into new directories. Keep the source pack: unchanged font, all full notices, `manifest.json` and `acquisition.json`. Typography belongs to [font-pack](font-packs.md) HTML/CSS; acquisition accepts no typography controls and never changes font bytes.

CLI: `ingenium font-download search CONFIG.json REQUEST.json`, `details CONFIG.json REQUEST.json`, or `acquire CONFIG.json REQUEST.json NEW_OUTPUT_DIR`. Offline config is `{}`; live acquisition config explicitly sets `{"allowNetwork":true}`. Search request: `{"provider":"google/fonts","limit":4}`; details: `{"id":"google-abel-regular"}`; acquisition adds `"selected":true`.

For an additional selected file, pass `selection` instead of `id`. Use the real shape returned by `details` as a schema example, with independently established values: id/provider/40-hex commit/version; font path/exact bytes/Git blob SHA1 and/or SHA256/family/style/weight/format; and 1..32 full font-specific notices with exact paths, sizes, hashes and license labels. Providers are restricted to the three repositories above. Format is standalone `truetype` or `woff2`; OTF/CFF/TTC refuse. External notice repository/commit requires explicit `noticeBinding` evidence. Do not invent pins or infer a full font license from directory metadata.

The runtime generates only immutable raw GitHub URLs, checks exact sizes and every supplied hash, and refuses redirects, unexpected URLs, non-200/encoded responses, timeouts or corruption. Bounds: 8 MiB TTF, 512 KiB WOFF2, 64 KiB per notice, 10 MiB total declared payload, 10..60,000 ms per request. No automatic retry or fallback. Existing outputs refuse before requests; failed new directories remain for inspection and are not successful acquisitions.

Injected `transport(url,fetchOptions)` returns a Fetch Response and is always labeled fixture-transport. A fixture proves no live origin. Later local font-pack export retains the original acquisition claim. Inspect actual browser custom-font identity and fallback for the selected content; byte/container checks do not establish shaping, sanitation, variable instancing, broad glyph coverage, user acceptance or desktop-client integration.
