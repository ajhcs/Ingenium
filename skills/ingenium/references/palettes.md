# Local palette helpers

Optional Node >=22 helpers: `src/palettes/index.mjs`, with no new dependencies, runtime network, installation, registration or client configuration. Discovery lists only four bundled selected scales: Radix Colors **3.0.0** blue/gray, light/dark. Other Radix scales require separately reviewed acquisition; unknown IDs refuse. This is a small resource library, not a complete design/template library.

The official [installation docs](https://www.radix-ui.com/colors/docs/overview/installation) identify `@radix-ui/colors`. One exact registry distribution was integrity-checked before selecting four CSS files. `source/provenance.json` records the pinned package, tarball SHA256/SHA512 registry integrity, selected source hashes and extraction scope. `source/LICENSE` is the exact **3.0.0 package** MIT license (Copyright 2021 Radix); it differs from current repository-main notices. Original CSS bytes include wide-gamut overrides and remain unmodified. Token inspection extracts only its twelve exact opaque sRGB hex declarations. No P3/alpha conversion is claimed.

## Callable interface

All exports are synchronous; selection, customization, generation and export are pure with respect to caller input. No helper writes files. Inspection reads and hash-checks the selected bundled CSS and license. Returned objects are independently editable.

```js
import {
  discoverPalettes, inspectPalette, selectPalette, customizePalette,
  generatePalette, paletteContrast, contrastCandidates, exportPalette,
} from './src/palettes/index.mjs'; // relative to an Ingenium checkout

discoverPalettes({ query: 'blue', mode: 'light' });
const source = inspectPalette('radix-blue-light');
const selected = selectPalette('radix-blue-light', {
  tokens: ['blue-1', 'blue-9', 'blue-12'],
});
const derivative = customizePalette(selected, {
  id: 'studio-accent', replacements: { 'blue-9': '#006c70' },
});
const generated = generatePalette({
  id: 'warm-study', from: '#fff8eb', to: '#683815', steps: 12,
});
const issue = paletteContrast(source, {
  foreground: 'blue-12', background: 'blue-1',
  fontSizePx: 16, fontWeight: 400, target: 'sample-body',
  scope: { profile: 'desktop', state: 'default' },
});
const candidates = contrastCandidates(source, {
  background: 'blue-1', minimum: 4.5,
});
const css = exportPalette(derivative, { format: 'css', prefix: 'studio' });
// CSS variables include --studio-blue-9; serialization returns text.
const json = exportPalette(derivative, { format: 'json' });
const svg = exportPalette(derivative, { format: 'svg' });
```

`discoverPalettes({query='',mode?})` returns matching local entries with id, family, mode, source file, exact version, color space and token count. Mode is `light` or `dark`. Search is a case-insensitive substring over identifiers/family, not a remote or semantic search.

`inspectPalette(id)` returns `{schemaVersion:1,id,kind:'source',colorSpace:'srgb',tokens,license,provenance}`. `tokens` is a name-to-`#RRGGBB` map. `selectPalette(id,{tokens?})` optionally returns a nonempty subset with an explicit selection record; it does not declare the palette accepted or suitable.

`customizePalette(palette,{id,replacements})` requires a distinct identifier and nonempty existing-token replacements. It returns `kind:'derived'`, retains source rights/provenance and records parent ID, parent-token hash, changes and prior derivation. Source bytes and input objects remain unchanged. Unknown tokens and alpha colors refuse. This is an explicitly attributed derivative, not an upstream palette.

`generatePalette({id,from,to,steps=12})` returns `kind:'generated'` with 2..64 tokens named `step-1` onward. It interpolates encoded sRGB channels between two opaque hex anchors with 8-bit rounding. It makes no perceptual-uniformity or contrast promise. Generated values use `NOASSERTION` rights metadata; supplied-anchor rights are not assessed or reassigned.

`paletteContrast(palette,{foreground,background,fontSizePx,fontWeight,target?,scope?})` resolves existing token names into the checks component's opaque solid-pair AA text check. Authored final text metrics are required; missing metrics return `error`. It reports exact unrounded ratios and normal/large text thresholds. Gradients, transparency, images, composition, rendering color management and overall accessibility require separate work. `contrastCandidates(palette,{background,minimum=4.5})` returns all qualifying tokens ordered by measured ratio, without automatically choosing one or claiming taste.

`exportPalette(palette,{format='json',prefix='palette'})` returns text: JSON record; CSS custom properties inside `:root`; or a standalone editable SVG swatch sheet. Each retains license/provenance; derivative history is retained. CSS output deliberately uses opaque sRGB only, so it cannot silently pick the original P3 overrides. Prefixes/IDs/token names are bounded lowercase identifiers; tokens are 1..64 opaque six-digit hex values. The SVG labels are black on white independently of swatches. Caller-owned file writing should preserve original files and put derivatives/exports in separate paths.

## Qualification and limits

Focused synthetic tests compare all 48 imported tokens against the actual retained source CSS, verify source hashes and rights text, preserve original/derived records, exercise interpolation and contrast, and check all export formats. A local technical proof rendered source, modified derivative and generated ramp in existing sandboxed Chromium; all 36 computed CSS backgrounds matched exported values with zero page requests/errors. Actual SVG exports were separately rasterized using optional Sharp. Private acquisition/render receipts stay under ignored `work/`; they are not package claims about an installed agent client.

This helper does not import arbitrary CSS, execute package JavaScript, acquire remote palettes, create a universal palette catalog, solve palette aesthetics or certify accessibility. Optional installed-client discovery, engineering suitability and user acceptance are untested/separate.
