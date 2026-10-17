# Original digital texture resources

These six optional original examples make a small part of texture vocabulary tangible. They are not new user requirements, required decoration, photographed materials or physical/tactile samples. No source figure, private annotation, source PDF, external font or material photograph is distributed.

The conceptual reference is Alex Hass, *Design Elements, Design Principles, and Compositional Organization* (2015), chapter 3 of [Graphic Design and Print Production Fundamentals](https://opentextbc.ca/graphicdesign/), printed pp50–51, especially texture/pattern and Figure 3.8. That passage distinguishes visual/tactile qualities, substrate/media choices, typographic/software-generated texture and camera-captured material. Figure 3.8 is a material photograph showing exposed brick/plaster. These constructors are deliberately different original digital representations; they do not reproduce the figure or cover the source's entire taxonomy. Grid repetition is one useful construction vocabulary, not a universal mandate.

| ID | Authored category | Original construction |
| --- | --- | --- |
| `dot-screen` | geometric-repetition | Circles on a square lattice |
| `parallel-hatch` | geometric-repetition | Evenly spaced clipped diagonal line segments |
| `crosshatch` | geometric-repetition | Two crossing diagonal line families |
| `woven-grid` | geometric-repetition | Alternating flat geometric bands; no photographed cloth |
| `repeated-authored-letterform` | typographic-repetition | Original monoline N-shaped geometry, without a font |
| `seeded-grain` | procedural-surface | Deterministic circle distribution with periodic edge copies |

Categories and tags are Ingenium-authored descriptive metadata. They are not asserted source-supplied categories, physical material properties, measured uncertainty or accepted preference. Pattern meaning, including any legend or engineering encoding, requires an explicit separate decision. The letterform is an original repeated outline, not a qualified typeface or all-language typography tool. Grain is a repeated digital particle field, not a camera image or simulation of real film/paper.

## Interface

`src/textures/index.mjs` exports five pure operations and one explicit file writer. Node >=22, standard library only. No runtime networking, dependency setup, server, import-time probing, external image/font loading or SVG-policy change.

```js
import {
  discoverTextures, createTexture, selectTexture, customizeTexture,
  exportTexture, writeTexture,
} from './src/textures/index.mjs';

discoverTextures({ category:'geometric-repetition', query:'hatch' });
const original = selectTexture('parallel-hatch');
const edited = customizeTexture(original, {
  tileSize:128, density:10, ink:'#6b342b', background:'#f7f1e7',
});
const svg = exportTexture(edited); // pure text
const css = exportTexture(edited, {format:'css'});
const json = exportTexture(edited, {format:'json'});
await writeTexture({ source:original, texture:edited, outputDir:'/absolute/new/export' });

const grain = createTexture({
  id:'seeded-grain', tileSize:128, density:10, seed:42,
  ink:'#163c3c', background:'#f4f0e8',
});
```

`discoverTextures({query='',category?,tag?})` returns fresh metadata for matching original constructors. Query is a case-insensitive substring up to 100 characters; category must be one of the three listed categories; tags are exact authored labels up to 60 characters. Discovery does not render or select anything.

`createTexture({id,tileSize=96,density=6,ink='#163c3c',background='#f4f0e8',seed?})` returns an original versioned record with parameters, complete editable SVG, its SHA256, scoped provenance and complete original project MIT notice. `selectTexture(id)` constructs the default source with `selected:true`; selection never means user acceptance. Tile size is an integer 32..256 SVG/CSS pixels. Density is an integer 2..16 marks/motif cells per axis; it is not a physical measurement. Ink/background are opaque six-digit sRGB hex colors. Only `seeded-grain` accepts seed, an unsigned 32-bit integer (default 1, zero supported). Unknown controls, external URLs, font/filter/arbitrary SVG inputs and alpha colors refuse. These limits bound this optional implementation; they are not design requirements.

The grain generator uses a fixed 32-bit linear congruential sequence with rounded coordinates and copied edge particles; identical parameters give identical SVG bytes. The repeated tile necessarily repeats its finite field. This is not a continuous natural-material model or a claim of unrecognizable repetition. Fine density can alias at delivery sizes; inspect actual output. Woven-grid alternates cells within the tile; even density continues its two-cell parity across repeated tiles, while odd density resets parity at the tile boundary. No universal seam quality or texture suitability is inferred.

`customizeTexture(record,changes)` preserves its input, requires nonempty supported changes without changing constructor ID, and returns `kind:'derived'` with direct-parent SVG hash/parameters, explicit changes and previous derivation. Geometry, rights/provenance and direct-parent change consistency are checked before export. Unknown/tampered source records refuse. Controls are regenerated through the finite constructor; this is not an arbitrary SVG editor. Source JSON is a portable record; use create/customize to regenerate geometry after intended parameter changes.

`exportTexture(record,{format='svg'})` returns SVG, CSS or JSON text without file I/O. SVG retains original project MIT/source metadata; carry JSON/provenance when retaining the full derivative history. CSS points to sibling `tile.svg` and repeats it at the recorded pixel tile size. JSON retains the complete source and derivation record. No arbitrary output filename/URL enters generated CSS.

`writeTexture({source,texture=source,outputDir})` verifies intact records and requires `source` to be the edited record's direct parent (or the same record). It exclusively creates a new directory under an existing canonical parent. Outputs are exact input `original.svg`, separate `tile.svg`, `original.json`, editable `source.json`, `texture.css`, local CSS-repeat `preview.html`, full project `LICENSE.txt`, and hash-bound `provenance.json`. Existing work refuses without replacement; filesystem failure can leave a partial new output for explicit inspection. Source SVG and prior artifacts are never rewritten. The operation assumes a trusted single owner, not a concurrent-write sandbox.

## Qualification boundaries

Meaningful synthetic tests exercise all six original sources, unknown/out-of-range/nonopaque controls, zero/max seed repeatability, nonmutation, parent/change tampering, original/full-MIT preservation, offline byte repeat and existing-output refusal. Browser qualification renders original/edited tiles and the same edited CSS-repeat field side by side, checks decoded source dimensions and repeat size, and inspects the actual six-resource contact sheet. Individual local previews are checked at 360px. Package source tests, checkout rendering, later installed-consumer behavior and independent review remain distinct evidence.

These are resource qualification examples, not resumed design-case production. No copied source image, new taste percentage, accepted engineering meaning, tactile/photographic coverage, print-process fidelity, accessibility certification or aesthetic acceptance follows from their construction or render.
