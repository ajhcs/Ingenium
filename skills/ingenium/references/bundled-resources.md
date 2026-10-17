# Compact bundled resources

Use `src/resources/index.mjs` relative to the installed package. Importing it does not fetch, install, register fonts, execute upstream code or admit every listed SVG. Start with `discoverResources()`, then open one provider with `openResourceLibrary({id, parserDir?, iconUtilsDir?})`. Query a small page; never print the complete metadata files into context.

`ingenium resources discover` lists provider summaries. `ingenium resources search google-fonts REQUEST.json` pages directory metadata. `ingenium resources details google-fonts REQUEST.json` retrieves one selected family with paged file listings. Requests support query, category, offset and limit1..32; details uses entryId. Font and stock directories provide source links and declared file/notice paths. Linked asset rights remain source-specific; no directory-wide font license is inferred. HTML template links remain held. Google Fonts, Nerd Fonts and free-font payload collections are not bundled. Nerd's72 directories include55 with actual font blobs and17 metadata-only directories.

Bundled runtime routes:

| Provider id | Route and scope |
| --- | --- |
| lobe-icons |950 source SVGs; selected Adobe has explicit presentation preparation, original and receipt. Other entries still require selected static admission. |
| ionicons |1357 distinct SVGs from dist/svg; selected add has explicit class/unit preparation. |
| minimal-icons |100 SVGs; selected ic-add retains its original and presentation receipt. |
| remixicon-apache |3058 SVGs from pinned4.6.0 under its exact Apache2.0 notice. This is a different release from current4.9.1. |
| remixicon-current |3229 current4.9.1 metadata records with its actual Remix Icon License1.0, not the stale Apache label in npm metadata. No current-release SVG payload bundled. |
| simple-icons |3466 metadata records, full source declarations/disclaimer. One explicitly CC0 ActivityPub selected SVG, original and preparation receipt bundled; remaining3465 metadata-only. Individual license and branding declarations vary; no blanket CC0 claim. |
| tabler |Reused @iconify-json/tabler1.2.42 JSON:6286 icons+194 aliases, full pinned MIT notice. Optional pure Iconify utils and saxes remain separate. |
| hack |Exact v3.003 regular/bold WOFF2 and full combined MIT/Bitstream Vera/DejaVu notice; bytes remain unchanged. |
| atomic-ui |26 original native recipes against selected DaisyUI5.7.50 CSS; two themes, full MIT notice. No upstream JS or Tailwind runtime. |
| materials |All30 Open Props1.7.23 gradients and five noise declarations; exact MIT notice. Finite edits only. |
| voxel-icon |30 PNG metadata records; no bundled pixels. Explicit selected user-local acquisition with full custom terms and immutable byte checks; default network off. See [local assets](local-assets.md). |

SVG sources use one concatenated data file per pack with exact selected offset/length/SHA256. Metadata is paged; acquisition reads only the selected range, performs the existing strict static policy, and creates a new output directory with original/safe/derived SVG, complete notice and provenance. Supported controls are size, currentColor substitution and existing stroke widths; fixed source fills are preserved. An unsupported selected entry refuses. View original/prepared/derived differences before treating a prepared asset as suitable. No general SVG importer, script support, path rewriting, glyph editing or source-wide compatibility claim.

For example:

```js
const api = await import('/absolute/installed/package/src/resources/index.mjs');
const icons = await api.openResourceLibrary({id:'ionicons', parserDir:'/existing/parser/npm-directory'});
await icons.search({query:'add',limit:4});
await icons.acquire({id:'add',selected:true,customize:{width:96,height:96,color:'#006c70',strokeWidth:16},outputDir:'/new/output'});
```

See [font packs](font-packs.md), [catalog](catalog.md), [UI](ui.md), [materials](materials.md) and [textures](textures.md) only when that task needs them. Local acquisition and browser inspection provide technical evidence; licensing decisions, trademarks, taste and user acceptance remain distinct.

For one bounded live example each from Google Fonts, Nerd Fonts and free-font, use [selected provider font acquisition](font-download.md). It defaults offline and retains exact independently pinned full font notices, then emits a manifest usable by the local font-pack API for separate typography edits and offline previews. The three example TTFs total2,878,168 bytes; broader directories remain metadata. CLI: `ingenium font-download search CONFIG.json REQUEST.json`, then explicitly selected `acquire CONFIG.json REQUEST.json NEW_OUTPUT_DIR`. Config must explicitly set allowNetwork:true for live acquisition; no implicit fallback/download on browse.

For all3466 Simple Icons source originals, use [selected brand acquisition](brand-download.md), separate from bundled redistribution. `openResourceDownloader({id:'simple-icons',allowNetwork:true})` returns that explicit local route; default is offline. Exact original, complete project notice/disclaimer and individual source/license/guideline declarations travel together. An individual declaration is distinguished from obtaining its full separate notice. No additional trademark approval gate is invented. The narrow selected presentation operation preserves path data and records explicit size/fill changes under its own source-format policy; it does not broaden static-icon-v1. Other downloader IDs are google-fonts/nerd-fonts/free-font and voxel-icon; bundled sources use openResourceLibrary.
