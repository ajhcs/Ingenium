# Installed resources and selected downloads

Use `src/resources/index.mjs` relative to the installed plugin. `discoverResources()` reads compact provider summaries. It does not fetch, execute upstream code, register fonts or admit every catalog entry. Choose a provider and use the matching route below; factories return different interfaces.

| Provider ID | Retained scope | Next operation |
| --- | --- | --- |
| `simple-icons` | 3,466 records at 16.35.0; only ActivityPub artwork bundled | `openResourceLibrary` for that selected pack; [brand download](brand-download.md) for any pinned original |
| `lobe-icons` | 950 SVGs at 1.95.1; Adobe has retained preparation | `openResourceLibrary`, then [SVG pack](svg-packs.md) search/inspect/acquire |
| `minimal-icons` | 100 SVGs at snapshot `99bfaad`; ic-add has retained preparation | Same SVG pack route |
| `ionicons` | 1,357 SVGs at 8.1.0; add has class/unit preparation | Same SVG pack route |
| `remixicon-apache` | 3,058 SVGs at 4.6.0 with its full Apache notice | Same SVG pack route |
| `remixicon-current` | 3,229 metadata records at 4.9.1, actual Remix Icon License 1.0 | Same factory for metadata search; payload acquisition refuses |
| `tabler` | 6,286 icons + 194 aliases from Iconify JSON 1.2.42 | `openResourceLibrary`, then [catalog](catalog.md); explicit parser/utils selectors |
| `hack` | v3.003 regular/bold WOFF2, full combined notice | `openResourceLibrary`, then [font packs](font-packs.md) |
| `hack-index` | Source-foundry/Hack family metadata, one entry | Directory search/details; use `hack` for bundled faces |
| `google-fonts` | 2,039 families / 3,921 TTF file records | Directory search/details; optional selected font downloader |
| `nerd-fonts` | 72 directories: 55 with font blobs, 17 metadata-only | Directory search/details; optional selected font downloader |
| `free-font` | 1,048 font file records | Directory search/details; optional selected font downloader |
| `awesome-stock-resources` | 188 resource links + 3 other links; six template links held | Directory search/details only |
| `voxel-icon` | 30 PNG metadata entries, no bundled pixels | [Local assets](local-assets.md) via `openResourceDownloader` |
| `atomic-ui` | Selected DaisyUI 5.7.50 CSS, 26 authored native recipes | `openResourceLibrary`, then [UI](ui.md) |
| `materials` | Open Props 1.7.23: 30 gradients + five noise declarations | `openResourceLibrary`, then [materials](materials.md) |

The twelve source repositories include Remix once despite its two release routes. UI/material sources and [original textures](textures.md) are additional capabilities. Counts describe retained catalogs, not complete admission or rendering coverage. Provider summaries retain exact source identities and limits.

For font/stock directory metadata, use `searchResourceDirectory({id,query,category,offset,limit})`, then `detailsResourceDirectory({id,entryId,offset,limit})`. Limits are 1..32, default 12; details pages a family's files separately. Use returned IDs and `nextOffset`. A category/license-bucket hint is not a font-specific license; stock-directory CC0 does not license linked assets. Held template links stay withheld.

```js
import { searchResourceDirectory, detailsResourceDirectory } from './src/resources/index.mjs';
const page = await searchResourceDirectory({id:'google-fonts', query:'Abel', limit:4});
if (page.entries.length) {
  const detail = await detailsResourceDirectory({
    id:'google-fonts', entryId:page.entries[0].id, limit:4,
  });
  console.log(detail);
}
```

Equivalent CLI: `ingenium resources discover`, `ingenium resources search google-fonts REQUEST.json`, and `ingenium resources details google-fonts REQUEST.json`. Search request: `{"query":"Abel","limit":4}`. Details request: `{"entryId":"ofl/abel","limit":4}`. These commands serve directory providers only; they do not search SVG/UI packs.

For bundled SVGs, pass `parserDir` only when using an existing optional saxes installation; Tabler also accepts `iconUtilsDir`. Inspect before acquiring:

```js
import { openResourceLibrary } from './src/resources/index.mjs';
const icons = await openResourceLibrary({id:'ionicons', parserDir:'/existing/parser/npm-directory'});
await icons.search({query:'add', limit:4});
await icons.inspect({id:'add'});
await icons.acquire({id:'add', selected:true,
  customize:{width:96, height:96, color:'#006c70', strokeWidth:16},
  outputDir:'/existing-parent/new-icon'});
```

Selected admission can refuse other entries. Preserve original/prepared/derived distinctions; no automatic preparation or general path editing is implied. Fixed fills remain fixed in the SVG pack route.

`openResourceDownloader({id,allowNetwork:false})` supports `simple-icons`, `voxel-icon`, `google-fonts`, `nerd-fonts` and `free-font`. Choose `allowNetwork:true` only for an intended download. The three font IDs return the same downloader containing three built-in selections; filter its `search` by repository (`provider:'google/fonts'`, for example). Directory search results are not download descriptors. Read [font download](font-download.md) for additional explicitly pinned selections.

Keep source declarations/aliases separate from inferred spelling and authored UI/texture tags. Inspect full available notices and the selected preview; technical evidence does not supply trademark permission, user acceptance or all-catalog qualification. Actual desktop-client discovery remains untested.
