# Optional font interface and proposed fixture

This first slice installs no font-engineering dependencies and does not claim to build or qualify fonts. Existing text rendering and font outlining are separate capabilities.

If a requested artifact needs a usable original font, propose a bounded owned subsystem: editable UFO through ufoLib2, fontmake as build controller, FontTools assertions and one shaping interface. Verify actual versions, source and asset rights, supplied features/anchors and the target runtime before adoption. Avoid redundant wrappers and a full editor fork without an unmet requirement.

A proposed original monochrome 1000-UPM fixture contains .notdef, space, A, V, O, f, i, fi, acutecomb and dotaccentcomb. Supply an O counter, widths and A/V kerning, A top anchor, compatible mark and stacking anchors, and an explicit f+i ligature. Round-trip editable sources; compile; inspect cmap/hmtx/GSUB/GPOS; compare AV kerning on/off, fi ligatures on/off, and A with both marks using exact glyphs, clusters and offsets. Render the exact delivered font at small/large sizes without silent fallback.

Keep sanitizer input/output hashes separate and test the delivered bytes. Structural sanitation alone proves no universal correctness. Add negative missing-Unicode, malformed-contour/feature and unsupported-import fixtures. A transformed/stroked/clipped O is a separate SVG-import test. Paragraph layout/bidi/line breaking need the appropriate layout layer; variable-master compatibility is a separate milestone. These are fixture requirements, not completed tests.
