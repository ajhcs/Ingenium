# Presentation across themes and locales

Use this when a theme, locale, direction or local visual override could change how the same content is understood. Work with the project's existing representation; a short mapping or annotated specimen is usually enough.

## What the person will look for

- The same meaning survives every theme, locale and direction you touched: roles, units, precision, dates and distinctions such as zero versus unknown.
- Overrides are scoped to the intended change, and an affected use is compared with a representative inherited one.
- Long labels, formatted quantities, dates and mixed-direction text were inspected at the intended size.

## Trace roles before changing values

Identify which source governs content meaning and which governs visual vocabulary. Trace relevant base values through semantic roles to their component, state and region uses. Equal color values can serve different roles; keep those roles distinct so a later theme can vary them independently. For anonymous imported tokens, use the observed elements, states and foreground/background relationships as evidence, and keep conflicting role assignments tentative rather than resolving them by color similarity.

State what inherits from the surrounding theme and where a local override applies, choosing the smallest scope that matches the change and following the project's own derivation and override rules. A named token or theme algorithm doesn't establish contrast; use the [palette study](methods/palette-families.md) and [scoped checks](checks.md) for the rendered pairs and states that matter.

## Treat localized text as a projection

Localized text and formatting are projections of the same typed content. Make the locale, time zone, numeric precision, unit and missing-value policy explicit. Preserve date-only versus timestamp meaning, authoritative unit symbols, source precision and zero versus unknown. An editable localized value needs a stated parsing policy; keep incomplete or invalid raw input under the existing editing contract. Display formatting never replaces canonical values or stable IDs.

Check reading order and directional cues in context; switching direction doesn't mean every symbol should mirror. For web overlays rendered outside their originating DOM subtree, inspect direction and style inheritance at the actual open container, and check framework context separately from DOM inheritance. Apply the same thinking to native products through their own runtime and model contracts.

## Done when

The changed source and a relevant specimen are delivered with the scope you actually inspected. Theme, locale and direction evidence stays separate from semantic model coverage, complete accessibility and user acceptance.

Source lineage: original synthesis informed by Ant Design's [theme model](https://github.com/ant-design/ant-design/blob/4e3564d0f3088d0ef96210182732f579c38e5df3/docs/react/customize-theme.en-US.md) and [formatting guidance](https://github.com/ant-design/ant-design/blob/4e3564d0f3088d0ef96210182732f579c38e5df3/docs/spec/data-format.en-US.md), Open Design's [token-role evidence](https://github.com/nexu-io/open-design/blob/8d820a698908dc279ef3d5aeb4ce6d156211a499/plugins/_official/atoms/token-map/SKILL.md), and MUI's [RTL scope](https://github.com/mui/material-ui/blob/2a8f217d7919d80d8760a7b63d6d97a70530deaf/docs/data/material/customization/right-to-left/right-to-left.md). These sources do not establish the effectiveness of this combined workflow. No upstream code, template or asset is included.
