# Ingenium

Experimental creative design plugin for discovering a direction, developing useful studies, and preserving scoped choices for revision and reuse.

[Optional selected assets](skills/ingenium/references/assets.md) adds bounded metadata discovery and selected static-icon admission. This interface is offline-qualified with original synthetic fixtures; live provider qualification is blocked. Font file resolution remains unavailable pending verified license/version binding.

[Optional original font/vector tools](skills/ingenium/references/fonts.md) build a limited original UFO3/TTF demonstration and qualify bounded static vector operations through separately installed locked Python tools. This is technical capability evidence, with explicit repertoire, sanitizer and visual limits.

The skill is independently invocable as Ingenium. Begin with a question, an existing artifact or an uncertain impression. Ask for whichever output helps: a comparison, one editable study, a specification, or a combination. Expressed facts, tentative interpretations and chosen decisions remain distinct.

## Package

The portable entrypoint is `plugin.json`; the workflow is `skills/ingenium/SKILL.md`. There is no required server, backend or account connection. Install through a client-supported local plugin source, then verify actual discovery and invocation in a fresh conversation. Local CLI discovery has been observed; desktop discovery remains unverified.

Optional Node helpers target Node 22 or newer. The declared optional Sharp dependency supports a bounded static SVG-to-PNG export while preserving the editable SVG source:

```sh
npm ci --ignore-scripts
node bin/ingenium.mjs capabilities
node bin/ingenium.mjs check examples/records/poster.json
mkdir -p work
node bin/ingenium.mjs render examples/svg/clipped-orbit.svg work/preview.png
npm test
```

Create the output directory before rendering. For a copied plugin without dependencies, follow [optional renderer setup](skills/ingenium/references/renderer-setup.md). Install Sharp explicitly into a user-owned directory and pass `--renderer-dir` to both capabilities and render; no development checkout or plugin-cache write is required. `--sharp-module` remains an advanced alternative. Missing or errored tools remain unavailable; editable source and prose work can continue. Output directories should be user-selected or private.

## Development status

Browse the [example progression](examples/README.md) for early studies, the 2026-10-17 four-case tranche and retained technical sources. [Resource-library status](docs/resource-library-status.md) distinguishes implemented local tools from missing catalogs and unverified provider acquisition.

Slice 1 has assembled record and SVG helpers, project-local locked dependencies and a portable package. Validation covers record preservation/refusal, CLI wiring through npm binary symlinks, an actual renderer probe, source-preserving exports and an isolated packed installation. See [validation scope](docs/validation.md) for evidence and limits. Observed fresh CLI cases include direct and implicit invocation and two negative requests. Desktop discovery remains unverified. Test counts or an export alone do not establish user acceptance, design quality or engineering adequacy.

For behavioral evaluation, `tests/fixtures/requests.json` includes direct, implicit, partial-output, contradictory-feedback, reuse and negative requests. These are evaluation cases, not an executable router or a claim of tested LLM behavior.

For a concrete layout study, [measured composition](skills/ingenium/references/composition.md) describes content-fit guides, spacing/type roles and intentional exceptions. Run `node examples/composition/listening-garden.mjs work/listening-garden` with a new output directory to create editable clean/guide SVGs and a layout record. Optional PNG rendering uses the existing helper. The original synthetic poster demonstrates measurable structure; audience findability, small-screen readability and aesthetic acceptance remain untested.

Formal engineering views retain their authoritative model and semantic renderer. Original font/vector helpers use an explicitly selected isolated Python environment; they install no font tools or dependencies on import. Their bounded qualification and unsupported cases are described in the [font reference](skills/ingenium/references/fonts.md).

The [foundation helpers](skills/ingenium/references/checks.md) add pure layout construction, unrounded solid-pair contrast and machine reports with stable issue deltas. Optional owned-local browser review reuses one prepared Playwright/axe session for named profiles and states, geometry, fonts and focus journeys. `ingenium review FIXTURE.json NEW_OUTPUT_DIR` retains full evidence and returns a compact handoff; missing browser capabilities are explicit. These checks do not establish accessibility certification, complete semantics, visual quality or owner acceptance.

## Rights and provenance

Original code and synthetic artwork use [MIT](LICENSE). The [four worked studies](examples/worked/README.md) include three selected unmodified DejaVu font files with their own notices and hashes. See [third-party notices](THIRD_PARTY_NOTICES.md) and `THIRD_PARTY.json` for component rights. No private reading, annotation or user preference record is distributed.

Selected resource helpers cover fonts, symbols, shapes, palettes, illustrations, textures and small UI components. Start with [resource libraries](skills/ingenium/references/resource-libraries.md) for actual commands and [qualification limits](docs/resource-library-status.md). Full-design/template libraries are excluded.
