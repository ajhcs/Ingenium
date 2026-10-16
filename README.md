# Ingenium

Experimental creative design plugin for discovering a direction, developing useful studies, and preserving scoped choices for revision and reuse.

The skill is independently invocable as Ingenium. Begin with a question, an existing artifact or an uncertain impression. Ask for whichever output helps: a comparison, one editable study, a specification, or a combination. Expressed facts, tentative interpretations and chosen decisions remain distinct.

## Package

The portable entrypoint is `plugin.json`; the workflow is `skills/ingenium/SKILL.md`. There is no required server, backend or account connection. Install through a client-supported local plugin source, then verify actual discovery and invocation in a fresh conversation. This repository does not claim installed-client qualification yet.

Optional Node helpers target Node 22 or newer. The declared optional Sharp dependency supports a bounded static SVG-to-PNG export while preserving the editable SVG source:

```sh
npm install --ignore-scripts
node bin/ingenium.mjs capabilities
node bin/ingenium.mjs check examples/records/example.json
node bin/ingenium.mjs render examples/svg/study.svg work/preview.png
npm test
```

Use actual example filenames present in the completed records and SVG lanes; those lanes are under integration. An explicit `--sharp-module /path/to/sharp/entry.cjs` selects an existing installation without silently installing one. Missing or errored tools remain unavailable; editable source and prose work can continue. Output directories should be user-selected or private.

## Development status

Slice 1 is in progress. Record and SVG workers have exclusive paths under the frozen `docs/contracts.md`. Full suite, actual render inspection, independent behavioral/code review and installed-client checks remain pending until recorded against the assembled candidate. Test counts or an export alone do not establish user acceptance, design quality or engineering adequacy.

For behavioral evaluation, `tests/fixtures/requests.json` includes direct, implicit, partial-output, contradictory-feedback, reuse and negative requests. These are evaluation cases, not an executable router or a claim of tested LLM behavior.

Formal engineering views retain their authoritative model and semantic renderer. Font engineering is an optional interface and fixture specification only; this slice installs no font dependencies.

## Rights and provenance

Original code and synthetic examples use [MIT](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) and `THIRD_PARTY.json` for the optional renderer and source guidance. No private reading, annotation, user preference record or font file is distributed.
