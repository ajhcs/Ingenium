# Component and interaction research

Research-only comparison against Ingenium baseline `f70db6171196c2c4452bc53eb24e82ba7cad5d9c`. Root is the sole product integration owner. No product code, manifests or installed behavior changed in this lane.

| Source | Exact default-branch pin | Actual skill coverage | Documentation coverage |
| --- | --- | --- | --- |
| [Ant Design](ant-design/findings.md) | `4e3564d0f3088d0ef96210182732f579c38e5df3` | Nine SKILL.md + three local reference leaves, all read; two directory symlink aliases resolved | 319 inventory records: 46 full source-text reads, 13 prose reads with media lines omitted, 260 catalogued-only. Includes all 84 spec docs, 56 React docs and 150 component/shared docs |
| [MUI](mui/FINDINGS.md) | `2a8f217d7919d80d8760a7b63d6d97a70530deaf` | Seven SKILL.md; all colocated skill/support content reviewed; review shim and release directory alias distinguished | 218 records: 44 reviewed, 174 indexed-only. All 183 Material/System Markdown docs inventoried, nine semantically reviewed |

Inventory and link statuses are evidence boundaries. Neither indexed bytes nor semantic text review establishes running behavior, accessibility conformance, rights to remote assets or future-model effectiveness. Both are component monorepos with actual agent skills; neither is merely a generic creative skill library. Combined skill counts include a documented MUI shim, not sixteen independent design methods.

The source reports contain the complete considered candidate/duplicate/rejected matrices, exact source paths, baseline comparisons, applicability, benefits, costs and omissions. Ant rows A01–A10/D01–D05/R01–R08 plus MUI rows MUI-01–MUI-11 account for **34 considered source-level entries**. Several converge on one adaptation; source row count is not a count of independent missing capabilities.

The most defensible incremental synthesis is a small optional component reference:

- Explain token base/semantic-role/component-state relationships and intended override/inheritance scope (Ant A01, MUI-04).
- Keep localized number/date/time/unit presentation separate from canonical typed values and domain identity (Ant A03). Reject fixed regional formats and lowercasing authoritative unit symbols.
- Preserve semantic elements, names, label/help/error associations and actual input/action behavior after visual/root/slot customization (Ant A04/A06/A07, MUI-01).
- Inspect overlays in their actual mounted state: MUI directly documents DOM direction inheritance across portals; Ant separately documents static feedback API context limitations. Do not generalize either into “all portals lose React context” (Ant A02, MUI-02).
- Treat keyboard focus in forced colors or clipped containers as separate evidence from nominal palette contrast (MUI-03). No automatic conformance claim.

Vocabulary discoverability, feedback persistence, purposeful motion and selected-subset/batch scope are additional conditional candidates in Ant's matrix. Recovery, drafts, revisions, preservation, bidirectional native model coverage and the eight optional methods are already stronger in Ingenium; do not replace them with generic lifecycle machinery. A component's visible state, token name or formatted label cannot certify native engineering meaning or persistence.

Full MIT notices are retained in [Ant notice](ant-design/LICENSE.ant-design.txt) and [MUI notice](mui/LICENSE-MUI.txt); README credit alone is insufficient when copying substantial source/documentation. This lane copies no upstream components, demo markup, CSS, screenshots, icons, fonts or other design assets. Candidate wording is original source-grounded synthesis, not a rights determination for unreviewed external material.

[Ingenium baseline inventory](ingenium-baseline.json) identifies the 20 read contract/skill/reference files, including all eight leaves and shared study contract. Builders are original local research helpers. Run from the checkout root with explicit existing source directories:

```text
node research/components/ant-design/build-inventory.mjs <ant-design-source-directory>
node research/components/mui/build-inventory.mjs <material-ui-source-directory>
node research/components/audit-evidence.mjs <ant-design-source-directory>
```

Use the source owner or an already authorized read environment where Git ownership protection applies; do not change trust/security configuration to regenerate this research. These builders hash local files and read Git metadata, and do not execute upstream code. Ant's link audit has 54 literal link/reference edges: 27 local-present, 26 external/site routes, one explicit example placeholder (`scripts/xxx.js`), zero missing actual Markdown targets. Task-input changelog corpora are catalogued, not read wholesale. MUI has 115 link edges: 84 local-present, zero local-missing and 31 external/unresolved. Local-present does not automatically mean semantically reviewed; target status is retained per edge.

Remaining coverage is deliberately explicit: broader semantic documentation reading, externally hosted/generated references, implementations/binaries and actual UI/assistive-technology evaluation are unperformed. All actual SKILL.md bodies and colocated operational reference leaves in the two pinned repositories were read. No denied action or pending approval remains; no merge, release or deployment occurred.
