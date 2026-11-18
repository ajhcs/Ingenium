# Measured composition

Use this when choosing a layout, making its structure inspectable, or investigating a visual weakness. Apply what helps at the fidelity of the current question; a small edit doesn't need a new system.

## What the person will look for

- The reader's next task is easy at the intended medium and viewing size: what they need to notice, find and understand comes first.
- The words, relationships and existing choices that had to survive did survive.
- The structure is real and named (actual spans, insets, gutters and gaps), with exceptions explained rather than silently called aligned.
- Measured claims are separated from visual judgments, and missing evidence is reported as missing.

## Plan from the task

Start with the audience's next task and the intended medium or viewing size. If either is unknown, state a working assumption and keep it revisable. Rank the content by what the reader needs to notice, find and understand. An attractive arrangement can't supply missing facts or audience preferences.

Choose a small visual plan that serves the task:

- **Alignment and proportion:** pick content edges, columns, hang lines or a focal axis, and give their actual spans, insets and gutters. Fit the grid to the content rather than declaring a familiar grid after the fact. A golden split, thirds, axial, modular or other system can help test a particular uncertainty; name the span and try an alternative when that comparison matters. No ratio guarantees a better result.
- **Spacing:** choose a small family of repeated gaps or a module. Distinguish inner padding, related-item spacing and separation between regions. Exceptions are fine when they have a reason, such as an inherited size or an optical adjustment; name the element and the offset.
- **Type and reading order:** assign size, weight, leading and alignment to content roles. A scale can be a practical set of sizes rather than a mathematical progression. Inspect the actual fonts, longest text and glyph bounds at delivery size. A reversed band or large filled region can outrank larger text, so judge the whole hierarchy.
- **Meaning and character:** use shape, color, grouping, rhythm and negative space to support relationships and the subject. Treat an intended association as a hypothesis until evidence grounds it. Keep useful expressive marks; remove unsupported labels or ornament only within the requested scope. Novelty needs a relevant comparison, not a style-detector score.

## Show the structure, then check it

When it helps, keep an editable guide layer or companion overlay showing the real axes, regions, baselines and dimensions, generated from the same layout values as the clean source. Keep guide labels and review notes out of the clean audience view. Inspect both views, since an overlay can reveal alignment while obscuring composition. Keep an unmodified predecessor when comparing a revision.

Measure what can be measured: source content and relationships, guide-to-artifact coordinates, bounds and gaps, type roles, color pairs and export identity. Then, separately, look at reading order, balance and final-size readability. For a findability question, ask a representative reader to locate the information at its intended size when possible; otherwise report that evidence as missing. Raster contrast arithmetic isn't complete accessibility or taste validation. Provide a meaningful text alternative where the delivery requires it.

## Done when

The layout has been inspected at its delivery size, the issues you saw are fixed and rechecked, and the record states (proportionately, often in a few sentences or a compact layout object) the task/medium assumption, chosen hierarchy and geometry, meaningful exceptions, source and preview, what was measured, what was visually inspected and what remains uncertain. Use the record contract only when its preservation machinery is useful. Formal diagrams, scientific figures and interactive products keep their own domain checks; decorative poster curves don't need graph routing or port semantics.

## Worked source

The original synthetic [Listening Garden generator](https://github.com/ajhcs/Ingenium/blob/main/examples/composition/listening-garden.mjs) produces editable clean and guide SVGs plus a layout record from shared values. It's in the full repository, not the standalone guidance skill. Run it from an installed package root with Node 22 or newer:

```sh
node examples/composition/listening-garden.mjs <new-output-directory>
```

Render each source to a separate PNG with the optional [SVG helper](svg.md) and inspect both at size. It's one fixed-size layout study with generic font fallbacks, not an approved template, a phone-ready variant, an installed-client test or evidence of a universally successful design method.

## Reading connections

This is original workflow guidance informed by Alex Hass's *Design Elements, Design Principles, and Compositional Organization* (2015), especially alignment, hierarchy, grids and typography; Rougier, Droettboom and Bourne's *Ten Simple Rules for Better Figures* (2014), especially audience, medium and purposeful visual choices; and the NN/g visual-design glossary's shared perceptual vocabulary. Pissierssens, Claes and Poels's critical review of diagram aesthetics (2019 preprint) supplies useful questions about grouping, information integration and semantic distinctions, with domain-specific limits. These sources inform choices; their varied examples are not a mandatory feature list. No private annotations or source figures are distributed.
