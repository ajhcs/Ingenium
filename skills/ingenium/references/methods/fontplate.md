# Fontplate / type specimen

**Question:** Which type roles make this content readable and appropriately expressive?

**Make:** Comparable real text at actual delivery sizes: headings, body, labels, numerals and ambiguous characters as relevant. Include a realistic long label, numerals, 0O/1lI, units and relevant symbols such as → ≤ Δ, plus the languages and glyphs the content needs. Record the requested family, weight, size, line height and fallback stack.

Keep two comparison modes apart. **Fixed metrics:** hold text, width, size, weight, line height and spacing steady (equal nominal values still don't guarantee equal perceived size). **Tuned fit:** allow per-family adjustments and show the metric deltas; judge the resulting treatment, not the family alone. If you omit tuned fit, say so. Vary role hierarchy separately when that's the question.

For terminal or icon-font use, place the actual codepoints or ligature strings beside representative text and inspect advance width, cell alignment, clipping and baseline in the intended renderer. Nerd Fonts' Mono, ordinary and Propo variants mean different spacing; choose for the context and verify, rather than trusting the suffix or an ASCII-only preview.

**Review it for:** Wrapping, density and character distinctions at intended size. Record the font actually loaded when the renderer can tell you; otherwise label the fallback uncertainty. A family name in SVG isn't an embedded font or proof of exact metrics.

**Done when:** Identical-copy comparisons are actually drawn and inspected at size, with requested family and actual rendered font reported as separate evidence. One specimen doesn't establish a family's superiority or full glyph coverage. Keep binaries, licensing and acquisition out of the specimen; use [resource routes](../resource-libraries.md) or [font tools](../fonts.md) only when those operations are requested.

Use the [shared study contract](contract.md). Consequential interactions also use [connected sketches](../interaction-sketches.md).
