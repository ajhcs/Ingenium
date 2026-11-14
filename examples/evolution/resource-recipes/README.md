# Editable resource recipes

Open `assets/<id>.svg` in an SVG editor. Live text and vector geometry remain separate. Browse `catalog.json` for exact IDs, source hashes, roles and editable fields; `examples/<id>.json` contains the synthetic source values and one permitted second edit. The four chart examples explicitly retain their sample data and units; diagram examples retain explicit directed endpoints and labels. Illustrations are conceptual and do not imply engineering behavior.

With Node 22+ in a full checkout, create a separate original and edited copy with its source data, opening note, hashes and notices:

```sh
node examples/evolution/resource-recipes/recipes.mjs chart-bar NEW_OUTPUT_DIR
```

The directory must not exist. `writeRecipe({id, outputDir, overrides})` accepts only fields listed in that example's `edit`. Supply changed values in the same shape as the source; chart values are nonnegative bounded samples, and diagram connection labels can change while their supplied endpoints remain fixed; chart category and time labels remain fixed. A new export is separate from its original. Selected task handoffs save effective values under `current` in both `input.json` and `examples/<id>.json`; the README regeneration command reproduces that state. Edit permitted fields under `current` for the next narrow revision, leaving `original` intact. Document text wraps within its column and increases fragment height; it is never shortened. Each supported document field/cell is bounded to 60 characters. Other examples keep fixed canvases. These are finite recipes, not general layout, plotting, drawing or semantic-validation engines; check text fit, units, relationships and rendering for adapted content. No check implies taste, user acceptance or engineering adequacy. Generic fonts and glyph coverage depend on the rendering environment.

These examples and their code are original synthetic MIT work under [LICENSE](LICENSE). Named color values C32-B `#90B6CB` and C27-B `#DA5C18` were selected from CSE 0.2.0-alpha.8 `assets/engineering-library/tokens/color-swatches.json` (SHA-256 `0e5e5137edb8a541b7d608f70473fdd0b4f1351253a91788a9850270c18a7c49`); retain [CSE-LICENSE.txt](CSE-LICENSE.txt). Colors express no engineering meaning. No CSE runtime is needed. Original illustrations do not copy a CSE master.
