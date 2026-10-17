# Selected CSS materials

Use `openResourceLibrary({id:'materials'})` from `src/resources/index.mjs` for installed Open Props 1.7.23 data. The lower-level `createMaterialLibrary({packageDir})` in `src/materials/index.mjs` accepts an explicit local package. Neither route installs, downloads or executes upstream JavaScript.

The finite catalog has `gradient-1` through `gradient-30` and `noise-1` through `noise-5`. These are upstream numbered declarations, not physical materials, photographed surfaces or a universal texture taxonomy. Use [original textures](textures.md) for editable geometric/typographic tile constructions.

```js
import { openResourceLibrary } from './src/resources/index.mjs';
const materials = await openResourceLibrary({id:'materials'});
materials.discover({query:'noise'});
const detail = await materials.inspect({id:'noise-1'});
const source = materials.select({id:'noise-1'});
const edited = materials.customize(source, {
  background:'#f0eee8', tileSize:128, opacity:0.4,
});
await materials.acquire({selection:edited, outputDir:'/existing-parent/new-material'});
```

Methods are `capabilities`, `discover`, `inspect`, `select`, `customize`, `render` and `acquire`. Discovery supports a substring query up to 100 characters; this finite 35-item catalog is filtered rather than paged. Inspection verifies pinned package metadata, full MIT notice and stylesheet, returning selected source CSS, hashes, palette and controls. Unsupported or changed sources refuse.

All selections accept six-digit opaque hex `background`, integer `tileSize` 32..512 CSS pixels and `opacity` greater than 0 through 1. Gradients additionally accept `recolor`: up to eight exact existing hex stop spellings from `inspect().palette`. Named colors and rgba() stops stay unchanged; gradients without hex stops support presentation controls only. Noise cannot be recolored. These controls change a separate presentation layer, not the upstream noise algorithm. Unknown controls, absent colors and arbitrary CSS/URLs refuse.

`customize(source,controls)` returns a new record. `render({selection})` returns source/detail/originalCSS/css/html without claiming a browser render. `acquire({selection,outputDir})` writes exact selected `original.css`, separate `material.css`, editable `source.json`, `preview.html`, full `LICENSE.open-props.txt` and hash-bound `provenance.json`. Original CSS means the selected upstream declaration plus its explicit empty `--gradient-space` dependency, not the complete stylesheet. Existing outputs refuse.

For a separately supplied package, CLI config `{"packageDir":"relative/open-props-package"}` resolves relative to its file. Commands: `ingenium materials discover CONFIG.json [QUERY]`, `capabilities CONFIG.json`, `inspect CONFIG.json ID`, or `acquire CONFIG.json SELECTION.json NEW_OUTPUT_DIR`. Selection shorthand: `{"id":"gradient-4","controls":{"opacity":0.7}}`; serialized selected records also work.

Inspect the exported field at its actual scale. Noise uses exact inline SVG feTurbulence data, outside static-icon SVG admission; this adapter does not relax that policy. Repetition may expose boundaries. Gradient contrast cannot be treated as a single solid color pair. Prior bounded Chromium qualification covered all 35 declarations and decoded the five noise images; other engines, physical/tactile properties, print fidelity and user acceptance remain unqualified.
