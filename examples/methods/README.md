# Relay method studies

Eight original, synthetic, editable studies use a fictional repair coordination workspace. Their outer paper, ink, acid accent and serif heading use Ingenium’s existing editorial identity. The charcoal, blue and teal Relay interface is an illustrative product direction, not an accepted product design. All text and geometry remain editable SVG with stable named scene, state and selected component IDs; detailed element mapping is explicitly scoped. These are artifacts for discussion, not functioning software.

| Source | Question made visible |
| --- | --- |
| [Structural wireframe](source/structural-wireframe.svg) | What information belongs in a queue, and in what hierarchy? |
| [Wireflow](source/wireflow.svg) | Which view follows an action, under which guard, and where does invalid input stay? |
| [Same-screen state sequence](source/state-sequence.svg) | How does one panel change through invalid input, repair, automatic valid update and scoped model undo? |
| [Desktop workflow](source/desktop-workflow.svg) | How do queue selection, detail, draft notes and assignment coexist? |
| [Empty and error states](source/empty-error.svg) | What explains absence or failure, and which recovery preserves input? |
| [Element collage](source/element-collage.svg) | Which visual fragments form a useful vocabulary without implying an interaction? |
| [Palette families](source/palette-families.svg) | How does color change the tone when content, layout and typography stay fixed? |
| [Fontplate](source/fontplate.svg) | How do generic family requests compare with identical copy and nominal metrics? |

Generate a fresh source directory from the package root:

```sh
node tools/generate-method-studies.mjs work/relay-studies-new
```

The destination's parent must exist and the destination itself must not exist. Generation refuses existing directories and writes each file with exclusive creation. An I/O failure can leave a partial newly created destination; inspect it and choose a new destination. Generation never renders, installs tools or accesses the network.

`buildMethodStudies(options={})` from `tools/generate-method-studies.mjs` is a pure, dependency-free ES-module API returning eight records with `id`, `title`, `method`, `scope`, dimensions, provenance, limitations and `svg`, plus `ingenium-method-study/1` metadata for stable artifact/scenario identity, authored revision, fidelity/interactivity, claim states and explicit omissions. No native model/API binding is supplied (`modelVersion: null`). `writeMethodStudies(outputDir, options={})` exclusively writes a new directory and returns its manifest. The checked-in [manifest](source/manifest.json) binds exact SVG bytes and describes original MIT provenance. Its `renderStatus: "not-run"` refers to this source-only generator; separately produced PNGs and render evidence must carry their own status and hashes.

All graphics and scenario content are original synthetic examples licensed under the repository MIT license. No external artwork, real repair records, font binaries or third-party templates are used. Generic `sans-serif` and `monospace` UI fonts and `DejaVuSerif, Georgia, serif` editorial fallbacks depend on the rendering host. A diagram arrow records an authored action or transition; it does not establish executable navigation. Color and typography are visual proposals. Rendering and deterministic checks do not establish user acceptance, engineering adequacy, complete accessibility, permissions, API behavior or concurrency safety.

The state sequence draws invalid input retention, repair/automatic valid update, applied local r2 and scoped model undo creating r3. Durable acknowledgement remains r1 in all four snapshots. Desktop annotations provide a static shared-session event trace; metadata retains ownership, draft, focus and pending-request rules. Collage includes a local filled/outline badge comparison with identical words/colors/type and an open choice. Fontplate draws a fixed-metrics generic sans/serif comparison; tuned-fit and exact per-glyph font identities are unqualified. None is an executed product.

Edit [fixture-options.json](fixture-options.json), then generate with `node tools/generate-method-studies.mjs NEW_SOURCE_DIR --options examples/methods/fixture-options.json`. The canonical title updates repeated visible projections across all eight while preserving domain identity. The collage spacing magnification changes only presentation. Verify exact source bindings with `node tools/generate-method-studies.mjs --verify NEW_SOURCE_DIR`; a source edit makes the prior binding stale.
