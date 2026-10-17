# Measured composition

Use this reference when choosing a layout, making its structure inspectable, or investigating a visual weakness. Apply the useful parts at the fidelity of the current question. A small edit does not need a new system or a completed form.

Start with the audience's next task and the intended medium or viewing size. If these are unknown, state the working assumption and keep it revisable. Rank the content by what the reader needs to notice, find and understand. Identify which words, relationships and existing choices must survive the study. An attractive arrangement cannot supply missing facts or audience preferences.

Review hierarchy and density against that task: which elements compete with the primary message or action, and which support it? Reduce competition through grouping, scale or emphasis before dropping useful content. Simplicity should clarify purpose while retaining character; dense and sparse, symmetric and asymmetric arrangements can all serve it.

Choose a small visual plan that serves that task:

- **Alignment and proportion:** select content edges, columns, hang lines or a focal axis; give their actual spans, insets and gutters. Use a content-fit grid, rather than declaring a familiar grid after the fact. A golden split, thirds, axial, modular or other system can help compare a particular uncertainty; name the span and inspect an alternative when that comparison matters. No ratio guarantees a better result.
- **Spacing:** choose a small family of repeated gaps or a useful module. Distinguish inner padding, related-item spacing and separation between regions. Exceptions are legitimate when they have a reason, such as an inherited size or optical adjustment; name the element and offset instead of silently calling it aligned.
- **Type and reading order:** assign family, size, weight, leading and alignment consistently to content roles. Coherent role relationships matter more than minimizing the number of sizes or families. A scale can be a practical set of sizes rather than a universal mathematical progression. Inspect the actual fonts, longest text and glyph bounds at the delivery size. A reversed band or large filled region can outrank larger text, so evaluate the whole hierarchy.
- **Meaning and character:** use shape, color, grouping, rhythm and negative space to support relationships and the subject. Explain the intended association as a hypothesis until grounded by evidence. Keep useful expressive marks; remove unsupported labels or ornament only within the requested scope. Novelty needs a relevant comparison, not a style-detector score.

Make the structure visible when it helps: retain an editable guide layer or companion overlay showing real axes, regions, baselines and relevant dimensions. Generate it from the same layout values as the clean source. Keep guide labels and review provenance out of the clean audience view. Inspect both views: an overlay can reveal alignment while obscuring composition. Preserve an unmodified predecessor when comparing a revision.

Check the claims you can actually measure: source content/relationships, guide-to-artifact coordinates, bounds and gaps, type roles, color pairs, and export identity. Inspect reading order, balance and final-size readability separately. Keep reactions about appeal distinct from observed task performance: finding a destination, identifying an offer or locating an action. For a findability question, ask a representative reader to locate the information at its intended size when possible; otherwise report the missing evidence. Record moderation and test conditions that limit interpretation; one person's response does not establish a general design rule. Numeric checks support scoped facts, not taste thresholds or complete accessibility. Provide a meaningful text alternative where the delivery requires it.

Keep the record proportionate: task/medium assumption, chosen hierarchy and geometry, meaningful exceptions, source and preview, what was measured, what was visually inspected, and what remains uncertain. A few sentences or a compact layout object can suffice. Use the record contract only when its preservation machinery is useful. Formal diagrams, scientific figures and interactive products retain their own domain checks; decorative poster curves do not need graph routing or port semantics.

## Worked source

The original synthetic [Listening Garden generator](../../../examples/composition/listening-garden.mjs) produces editable clean and guide SVGs plus a layout record from shared values. Run from an installed package root with Node 22 or newer:

```sh
node examples/composition/listening-garden.mjs <new-output-directory>
```

Use the optional [SVG helper](svg.md) to render each source to a separate PNG. This is one fixed-size layout study with generic font fallbacks, not an approved template, a phone-ready variant, an installed-client test or evidence of a universally successful design method.

## Reading connections

This is original workflow guidance informed by Alex Hass's *Design Elements, Design Principles, and Compositional Organization* (2015), especially alignment, hierarchy, grids and typography; Rougier, Droettboom and Bourne's *Ten Simple Rules for Better Figures* (2014), especially audience, medium and purposeful visual choices; and the NN/g visual-design glossary's shared perceptual vocabulary. Pissierssens, Claes and Poels's critical review of diagram aesthetics (2019 preprint) supplies useful questions about grouping, information integration and semantic distinctions, with domain-specific limits. These sources inform choices; their varied examples are not a mandatory feature list. No private annotations or source figures are distributed.
