# Optional Fontsource catalog: selected static faces

The existing package library supports explicit local Fontsource packages. Open Sans and Fraunces are now qualified through an installed Ingenium consumer, in addition to earlier Inter qualification. This catalog describes technical source support, not a recommended type pairing or an approved design direction.

Official family pages: [Open Sans](https://fontsource.org/fonts/open-sans), [Fraunces](https://fontsource.org/fonts/fraunces). Package metadata was inspected before exact-version acquisition. Package distribution was downloaded as data from the official npm registry with the shipped acquisition helper; scripts were disabled and registry SHA512 integrity checked. Registry signatures/attestations were not verified.

| Package pin | Declared package contents | Exact rendered faces qualified |
| --- | --- | --- |
| `@fontsource/open-sans@5.3.0` | Weights 300,400,500,600,700,800; normal/italic; ten subsets | Latin 400 normal, 700 normal, 400 italic |
| `@fontsource/fraunces@5.3.0` | Weights 100 through 900 by 100; normal/italic; Latin, Latin-ext, Vietnamese | Latin 400 normal, 700 normal, 400 italic |

Other faces/subsets were present in metadata and the acquired family packages but were not rendered or glyph-coverage qualified. Static packages were deliberately selected; variable-axis metadata in `metadata.json` does not establish variable-font support. Fontsource catalog labels `v44` and `v38` are separate from package versions and independently decoded binary revisions.

## Agent workflow

1. Inspect bounded official package metadata, select an exact version and record its SHA512 SRI before acquiring distribution bytes. Use `tools/acquire-npm-package.py PACKAGE EXACT_VERSION NEW_DIRECTORY` only under the applicable acquisition authorization; no automatic download occurs in package-library methods.
2. Configure `createPackageLibrary` with one explicit acquired `packageDir` per source, where each root has `package.json`, `metadata.json`, CSS, font files and full LICENSE. A missing source reports acquisition-required.
3. Call `search({kind:'font',query:'Open Sans'})`, then `details({sourceId:'open-sans',cssFile:'400.css'})`. Inspect returned faces. Select the actual `faceIndex` whose `relativeFile` identifies the intended Latin face; do not hardcode an index across families or versions.
4. Call `acquire({sourceId,cssFile,faceIndex,selected:true,outputDir})` into a new directory. It exports selected `font.woff2`, `font.css`, complete `LICENSE.txt` and byte-hash provenance. Package-local identity and registry-acquisition evidence remain separate.
5. Author size, line-height, tracking, color and layout in separate CSS. Select real weight/style exports when changing those properties. Font binaries remain unchanged; this route does not create/modify fonts or infer font sanitation.
6. Render locally with external requests blocked. Check actual browser font identity, not just a CSS family declaration or `document.fonts.check()`. Retain render evidence separately from taste or accessibility acceptance.

```js
import { createPackageLibrary } from './src/assets/packages.mjs';
const library = createPackageLibrary({sources:[
  {id:'open-sans',kind:'font',packageDir:'./acquired-open-sans/package'},
  {id:'fraunces',kind:'font',packageDir:'./acquired-fraunces/package'}
]});
await library.search({kind:'font',query:'Fraunces'});
const detail = await library.details({sourceId:'fraunces',cssFile:'400.css'});
const latin = detail.faces.find(f => f.relativeFile === 'files/fraunces-latin-400-normal.woff2');
if (!latin) throw new Error('Selected Latin face absent; inspect source/version');
await library.acquire({sourceId:'fraunces',cssFile:detail.cssFile,
  faceIndex:latin.faceIndex,selected:true,outputDir:'./selected-fraunces'});
```

Both packages and family metadata declare OFL-1.1, and the selected exports retain complete family notices. Keep these notices with redistributed font bytes. The adapter's container checks, the selected sample glyphs and Chromium rendering are bounded evidence; they do not qualify arbitrary scripts/languages, all glyphs, other engines, all family faces or a modified font binary.

## Qualification evidence scope

The frozen installed consumer successfully executed search, details and selected acquire for all six faces. Offline repeats matched exact selected WOFF2 hashes. Chromium CDP reported one custom font per specimen: OpenSans-Regular, OpenSans-Bold, OpenSans-Italic, Fraunces-Regular, Fraunces-Bold and Fraunces-Italic. No fallback font appeared in the tested ASCII sentence. Authored CSS computed as 38px size, 1.3 line-height and .025em tracking, with real 400/700 and normal/italic faces. The proof made zero external requests and reported no page errors. Fullscreen/font-client installation and design acceptance remain separate.
