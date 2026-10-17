# Explicit selected provider fonts

`src/catalog/font-download.mjs` exports `createFontDownloadClient({allowNetwork=false, transport?, timeoutMs=30000})`. Import, construction, `capabilities()`, `search()` and `details()` never network, install or register fonts. The helper offers three precisely pinned selected examples across Google Fonts, Nerd Fonts and free-font. Broader provider indexes remain metadata discovery; listing a family never implies every face is acquired, licensed uniformly or renderable.

```js
import {createFontDownloadClient} from './src/catalog/font-download.mjs';
import {createFontPackLibrary} from './src/catalog/font-packs.mjs';

const client = createFontDownloadClient({allowNetwork:true});
const candidates = client.search({provider:'google/fonts', limit:12});
const details = client.details({id:'google-abel-regular'});
// Explicitly selected, one bounded file plus its full independently pinned notices.
const selected = await client.acquire({
  id:'google-abel-regular', selected:true, outputDir:'/canonical/existing-parent/abel-source'
});
// All following operations are local and reusable offline.
const local = createFontPackLibrary({manifestPath:selected.manifestPath});
await local.inspect({id:'google-abel-regular'});
await local.acquire({id:'google-abel-regular', selected:true,
  outputDir:'/canonical/existing-parent/abel-preview',
  controls:{fontSizePx:40, lineHeight:1.6, letterSpacingEm:.02}
});
```

`capabilities()` reports original acquisition mode and fixed bounds. `search({query='', provider?, offset=0, limit=12})` returns paged defensive copies: limit 1–32, offset 0–10,000, query up to 128 characters; provider is one of the three repository IDs. `details({id})` returns the exact descriptor, with immutable source URLs and independent notice pins. These synchronous metadata methods are also safe to `await`. `acquire` is asynchronous and requires exactly one `id` or `selection`, `selected:true` and a new `outputDir`. Unknown acquisition options refuse; typography customization belongs to the local font-pack export.

## Exact built-in selections

| ID | Source commit | Selected file | Bytes | Full accompanying notices |
| --- | --- | --- | ---: | --- |
| `google-abel-regular` | google/fonts `47d54ca1ebb14fd864695f1d39dc734f39017c33` | `ofl/abel/Abel-Regular.ttf` | 35,220 | Exact family `OFL.txt` (4,418), `FONTLOG.txt` (1,009) |
| `nerd-hack-regular` | ryanoasis/nerd-fonts `92a27e07169ff364c058699760c08c47baa67eb7` | `patched-fonts/Hack/HackNerdFont-Regular.ttf` | 2,798,160 | Exact Hack `LICENSE.md` (3,744) and independent root `LICENSE` (6,200) |
| `free-font-negatape` | jaywcjlove/free-font `8602c6e4603516ca531e93bf98b64f0382883343` | `docs/fonts/english/other/NegaTape.ttf` | 44,788 | Upstream font `OFL.txt` (4,397), `AUTHORS.txt` (271) at hicchicc/x5y8pxNegaTape `0443bb7c87de9659eceba3c394d3dbcf235084aa` |

All binary/notice Git blob SHA1 pins are included in `details()`, checked with Git's `blob <length>\0` prefix, and supplemented by actual SHA256 in output. The free-font mirror binary and the upstream `fonts/ttf/x5y8pxNegaTape.ttf` have the same Git blob SHA1 `5538789a719ee341944aeeffb39624c5f2794766` and size. This establishes the recorded byte binding to the retained upstream notice source. The free-font repository software MIT license is not substituted for the font license. Hack's complete notice includes its MIT and Bitstream Vera terms; the independent Nerd Fonts mixed-license notice is preserved separately. Recorded rights labels and complete notices are evidence, not a legal sufficiency determination. Licensing decisions remain the user's.

## Explicit additional selections

Other selected standalone TTF/WOFF2 files can use `selection` with this data shape (placeholder hashes are deliberately unusable):

```js
{
  id:'selected-font', provider:'google/fonts',
  commit:'EXACT_40_LOWERCASE_HEX_COMMIT', version:'exact-source-version',
  font:{path:'family/Face.ttf', bytes:12345,
    gitBlobSha1:'EXACT_40_LOWERCASE_HEX_GIT_BLOB',
    family:'Declared Family', style:'normal', weight:400, format:'truetype'},
  notices:[{id:'full-font-license', path:'family/OFL.txt', bytes:1234,
    sha256:'EXACT_64_LOWERCASE_HEX_SHA256', license:'Exact full source font notice'}]
}
```

Providers are limited to `google/fonts`, `ryanoasis/nerd-fonts`, `jaywcjlove/free-font`. A selected file must match its provider repository/commit and supported extension. Each notice defaults to that repository/commit; optional `repository` and `commit` bind an external full notice. Cross-repository/commit notices require explicit `noticeBinding` text recording the font-specific evidence, as the built-in free-font selection does. The caller owns source and binding accuracy; the runtime verifies selected bytes against those declarations, rather than discovering or adjudicating rights. Missing full font-specific evidence means no supported selected acquisition. A repository software license or metadata license tag alone does not establish that evidence. No operation fetches an entire tree, release archive or collection.

## Network, integrity and local reuse

Live requests use only generated HTTPS `raw.githubusercontent.com` URLs with an exact 40-hex revision; arbitrary URLs, branch names, traversal and query/fragment source paths refuse. Each file requires its exact byte count and Git blob SHA1 and/or SHA256. Both hashes must match when both are supplied. Requests use manual redirects and accept exact HTTP 200 only, rejecting redirects, changed response URLs and encoded responses. Content-Length, when present, must match. Streamed bytes are counted and stopped at the exact expected size. No retry, fallback endpoint or implicit cache refetch occurs.

Bounds are 8 MiB per TTF, 512 KiB per WOFF2, 64 KiB per notice, 1–32 notices per selection and a per-request headers-plus-body deadline of 10–60,000 ms. Total declared font/notice payload is at most 10 MiB; temporary copies and runtime overhead require additional memory. Requests run sequentially. The default three selected binaries total 2,878,168 bytes. Timeouts abort the request and cancel a readable body. Underlying native network/filesystem errors may also propagate. Practical limits and canonical paths assume a trusted single owner without competing writers; this is not a hostile-input sandbox or race-proof store.

An injected `transport(url, fetchOptions)` returns a Fetch `Response`; it is always labeled `fixture-transport`, even with `allowNetwork:true`. Without it, the mode is `live-network` only when explicitly enabled, otherwise `network-disabled`. A fixture transport remains the caller's code and can have its own side effects; it never establishes live evidence. The original mode and full source pins are carried inside the generated manifest and acquisition receipt, so later offline export does not relabel fixtures live.

Acquisition exclusively reserves a new directory before requesting bytes; existing outputs refuse without any request. A canonical existing output parent is required, and symlinked parents refuse. An error retains that newly created directory as evidence; no automatic deletion or reuse occurs. Download/integrity failures happen before source files are written. A container failure may retain raw files and a manifest but cannot produce a successful `acquisition.json`; such a partial directory is not a successful acquisition receipt.

Successful output contains unchanged `font.ttf`/`font.woff2`, all complete notices as byte-identical separate files, a generic `manifest.json` accepted by `createFontPackLibrary`, and `acquisition.json` with actual SHA256/lengths, original mode, immutable descriptors and bounded container inspection. Manifest paths are local; it can be discovered, inspected and rendered through the font-pack helper without this downloader or network. Offline typography controls author separate HTML/CSS and never alter font binaries. Keep selected fonts, full notices and acquisition evidence together when reusing or exporting.

Standalone TrueType and WOFF2 container limits match the existing font-pack route. OTF/CFF and TTC selections refuse explicitly; metadata discovery can still list them. No glyph editing, patching, subsetting, variable instancing, font conversion, sanitation, broad glyph-coverage assertion, global installation, engineering acceptance or design approval is supplied. Inspect actual browser custom-font identity and fallback separately; a valid container is not a browser render proof.

Default tests use original synthetic bytes and injected responses, including corrupted/missing/oversize bodies, redirects, timeouts, notice preservation and offline reuse. Live selected examples and sandbox-enabled browser render evidence are separate task receipts; installed-package/client qualification remains a separate integration check.
