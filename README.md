# Ingenium

Experimental creative design plugin for discovering a direction, developing useful studies, and preserving scoped choices for revision and reuse.

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

Slice 1 has assembled record and SVG helpers, project-local locked dependencies and a portable package. Validation covers record preservation/refusal, CLI wiring through npm binary symlinks, an actual renderer probe, source-preserving exports and an isolated packed installation. See [validation scope](docs/validation.md) for evidence and limits. Observed fresh CLI cases include direct and implicit invocation and two negative requests. Desktop discovery remains unverified. Test counts or an export alone do not establish user acceptance, design quality or engineering adequacy.

For behavioral evaluation, `tests/fixtures/requests.json` includes direct, implicit, partial-output, contradictory-feedback, reuse and negative requests. These are evaluation cases, not an executable router or a claim of tested LLM behavior.

For a concrete layout study, [measured composition](skills/ingenium/references/composition.md) describes content-fit guides, spacing/type roles and intentional exceptions. Run `node examples/composition/listening-garden.mjs work/listening-garden` with a new output directory to create editable clean/guide SVGs and a layout record. Optional PNG rendering uses the existing helper. The original synthetic poster demonstrates measurable structure; audience findability, small-screen readability and aesthetic acceptance remain untested.

Formal engineering views retain their authoritative model and semantic renderer. Font engineering is an optional interface and fixture specification only; this slice installs no font dependencies.

## Rights and provenance

Original code and synthetic examples use [MIT](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) and `THIRD_PARTY.json` for the optional renderer and source guidance. No private reading, annotation, user preference record or font file is distributed.
