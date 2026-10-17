# Original digital textures

Use these six original editable constructions when they help the design question. They are optional digital studies, not photographed materials, physical samples or required decoration.

| ID | Authored category | Construction |
| --- | --- | --- |
| `dot-screen` | geometric-repetition | Circles on a square lattice |
| `parallel-hatch` | geometric-repetition | Clipped diagonal lines |
| `crosshatch` | geometric-repetition | Crossing diagonal line families |
| `woven-grid` | geometric-repetition | Alternating flat bands |
| `repeated-authored-letterform` | typographic-repetition | Original monoline N-shaped geometry, without a font |
| `seeded-grain` | procedural-surface | Deterministic particles with periodic edge copies |

Categories/tags are Ingenium-authored; they are not upstream declarations, material properties or user preferences. Pattern meaning or an engineering encoding requires its own scoped decision. The letterform is not a qualified typeface.

```js
import { discoverTextures, selectTexture, customizeTexture, writeTexture } from './src/textures/index.mjs';
discoverTextures({category:'geometric-repetition', query:'hatch'});
const source = selectTexture('parallel-hatch');
const texture = customizeTexture(source, {
  tileSize:128, density:10, ink:'#6b342b', background:'#f7f1e7',
});
await writeTexture({source, texture, outputDir:'/existing-parent/new-texture'});
```

The module also exports `createTexture({id,...parameters})` and `exportTexture(record,{format:'svg'|'css'|'json'})`. All operations except `writeTexture` are pure; none downloads or installs. Discovery takes query (up to 100 characters), optional category and exact authored tag. Its six-entry catalog is filtered, not paged.

Controls: integer `tileSize` 32..256, integer `density` 2..16, opaque six-digit hex `ink`/`background`. Only seeded-grain accepts unsigned 32-bit `seed` (default 1; zero supported). Unknown controls, alpha colors and arbitrary SVG/fonts/filters/URLs refuse. Density is a construction parameter, not a physical measurement.

`selectTexture(id)` returns a selected default; `createTexture` constructs a record from parameters. `customizeTexture` preserves its input and records supported changes with the direct-parent SVG hash. `writeTexture` requires that direct parent (or the same record) and creates a new directory containing exact `original.svg`/`original.json`, separate `tile.svg`/`source.json`, `texture.css`, a CSS-repeat `preview.html`, full project MIT notice and provenance. Tampered records and existing outputs refuse. Keep editable JSON and derivation history with the exported SVG.

CLI: `ingenium textures discover` or `ingenium textures export SPEC.json NEW_OUTPUT_DIR`. A complete spec is:

```json
{"id":"parallel-hatch","parameters":{"tileSize":64,"density":8},"customize":{"ink":"#6b342b","tileSize":128}}
```

Inspect both tile and repeated field at the delivery size: fine density can alias, grain repeats its finite field, and woven-grid with odd density resets parity at the tile boundary. Even density continues the two-cell parity. No universal seam quality, natural-material simulation or print suitability follows.

Conceptual vocabulary comes from Alex Hass, *Design Elements, Design Principles, and Compositional Organization* (2015), chapter 3, pp. 50–51. These original constructions cover digital repetition only; no source figure, photograph, private annotation or external font is copied. Prior tests/rendering cover the six bounded constructors and separate edits, not broader texture coverage or aesthetic acceptance.
