# Explicit local Fontsource and Iconify packages

Use this route when the task needs a separately supplied font/symbol package. Prefer [installed resources](bundled-resources.md) when suitable. `createPackageLibrary(config)` from `src/assets/packages.mjs` reads explicit local sources; it never downloads them. For larger metadata searches, the [catalog facade](catalog.md) provides paging.

A source has `id`, `kind:'font'|'symbol'` and `packageDir`. Symbol sources also require `license:{path,sha256,declaredURL,retrievedURL?,scope}` with the actual complete artwork notice and its byte hash. Keep uncertainty about release binding visible; software license metadata alone is insufficient. Optional `parserDir` names an existing npm directory containing saxes 6.0.0; `iconUtilsDir` names an explicitly supplied @iconify/utils 3.1.7 package. The latter is trusted executable tooling, separate from source data.

```js
import { createPackageLibrary } from './src/assets/packages.mjs';
const library = createPackageLibrary({sources:[
  {id:'inter', kind:'font', packageDir:'/existing/inter/package'},
]});
await library.search({kind:'font', query:'Inter'});
const detail = await library.details({sourceId:'inter', cssFile:'400.css'});
const face = detail.faces.find(f => f.relativeFile === 'files/inter-latin-400-normal.woff2');
if (!face) throw new Error('Inspect the acquired version and actual face list');
await library.acquire({sourceId:'inter', cssFile:detail.cssFile,
  faceIndex:face.faceIndex, selected:true, outputDir:'/existing-parent/new-font'});
```

Select the returned faceIndex, style, weight, Unicode range and file for the content. Never assume the first CSS rule is Latin. Acquiring one face writes unchanged `font.woff2`, CSS, full notice and provenance. Author typography in separate CSS and select real weight/style files. Inspect actual browser custom-font identity and fallback; a CSS family declaration or container check alone is insufficient. See [Fontsource scope](fonts-catalog.md) for previously exercised faces.

Symbol selection uses `{sourceId,name,selected:true,customize?,outputDir}`. Supported `customize` controls are width/height, replacement of existing currentColor, and explicit existing strokeWidth. Fixed fills and path data are preserved. Unknown edits/unsupported SVG refuse. Output retains resolved/safe/derived SVG separately with source/notice hashes. `customizeSymbol(bytes,controls,{parserDir})` exposes the same bounded editing independently.

CLI config source/tool paths resolve relative to the config file; request/output paths resolve from the caller:

```sh
node bin/ingenium.mjs library capabilities library.json
node bin/ingenium.mjs library search library.json font Inter
node bin/ingenium.mjs library details library.json face-query.json
node bin/ingenium.mjs library acquire library.json chosen-face.json ./new-font-export
```

`library.json`: `{"sources":[{"id":"inter","kind":"font","packageDir":"local/inter/package"}]}`. `face-query.json`: `{"sourceId":"inter","cssFile":"400.css"}`. Build chosen-face.json with the inspected faceIndex and `selected:true`; no fixed index is portable.

## Optional exact package acquisition

Only when selected acquisition is intended, inspect the candidate's official exact-version metadata, distribution size and license, then run the shipped helper from the installed package root:

```sh
python3 tools/acquire-npm-package.py @fontsource/inter 5.3.0 ./local/inter
```

Create the canonical parent `local/` first. The helper accepts Fontsource/Fontsource-variable/Iconify collection package families, @iconify/utils, bulma, open-props and @radix-ui/colors. It does not acquire arbitrary providers or DaisyUI. Supported package names do not imply all versions/resources are qualified.

The helper rechecks registry metadata, exact tarball URL and SHA512, extracts data without running scripts, and retains archive/metadata/hashes/receipt. Bounds: 262,144 metadata bytes, 16,000,000 archive/unpacked bytes, 1,000 members, normally 2,000,000 bytes per member. Only exact `package/icons.json` in Iconify collection packages has a 5,000,000-byte member cap. Signature attestation is not performed. Denials, redirects, wrong hashes and unsafe members stop; inspect partial new output rather than retrying or overwriting silently.
