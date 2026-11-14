# Ingenium user guide

Start with [Field Station](quickstart.md): create, compare, revise, review or continue in ordinary language. The graphic, document and website provide editable sources and continuation notes. Structured records and checks are optional when the task calls for them.

Ingenium is an experimental portable creative workflow. It helps explore a direction, make editable studies, react to them and preserve scoped choices for later revision. It can start from a question, an existing artifact, or an impression such as “this feels too corporate.” That impression is a useful clue, not a complete specification.

The workflow is [a readable skill](../skills/ingenium/SKILL.md). Optional Node helpers add selected resources, records, SVG export and bounded checks. There is no required server, backend or account connection. The host client still supplies its own model and tools.

## Start a study

Describe the audience, purpose, medium and content, including anything that must remain unchanged. Ask for an editable source and a separate export when your client supports them. Try the [Field Station brief](quickstart.md), then open and inspect the result.

## Revise and return

Say what to keep and what to change: “Keep the open layout for this invitation; explore a less formal title.” Keep the original and earlier studies for comparison. To change a retained decision later, identify the decision and explicitly reopen it. A choice for one artifact does not establish a universal preference.

## Export and inspect

Request the source and separate export, then open both in the intended application. Check wording, fonts, dimensions and interactions at the intended size. Preserve notices and unresolved questions; report unavailable exports and checks honestly.

## A productive study

1. **Intent:** describe the audience, medium, purpose, content and consequential uncertainty. Existing constraints and withheld references should be explicit.
2. **Study:** request a small discriminating comparison or one useful editable artifact. Alternatives should vary the organizing idea, not merely the accent color.
3. **Review:** inspect the result at its intended size and interaction state. Say what you notice and which part of the comparison it concerns. A reaction may prompt another question or a targeted revision.
4. **Preserve:** retain originals, separate exports, the chosen direction, its scope and unresolved questions. Explicitly identify a decision you want to reopen.

For example, “Keep the open layout for this invitation; explore a less formal title” preserves one choice while reopening another. It does not define a permanent preference for every future design.

## What can I ask for?

A question, text comparison, visual fragment, specification or finished artifact can each be sufficient. Common study types include publication covers, posters, identity explorations, responsive HTML/CSS pages and wayfinding studies. Available tools determine which exports and reviews can actually be performed.

The exact [showcased study snapshots](../examples/release/README.md) preserve the V3 publication, identity and wayfinding sources and the V2 website. The separately retained [earlier worked examples](../examples/worked/README.md) have original synthetic publication, website, identity and wayfinding generators. The commands below generate that earlier tranche, not the showcased V3 snapshots. These generators use Node built-ins and local fonts. They are not in the prepared core helper: use a full source checkout or a separately supplied complete study source with its dependencies. From the source root, choose a new output directory and an existing parent, for example:

```sh
mkdir -p work
node examples/worked/common-ground/build.mjs work/common-ground-study
node examples/worked/fieldwork/build.mjs work/fieldwork-study
```

Keep the generated font notices with the artifacts. Open `work/fieldwork-study/standalone.html` in a browser for the self-contained website study. Existing output directories are refused. Choose a new directory after an interrupted or failed generation; inspect partial output rather than silently overwriting it.

These studies are historical examples with stated limits. They do not demonstrate audience success, broad stylistic range or superiority over another workflow. SVG font behavior varies by renderer and editor; inspect the actual destination. Embedded-font SVGs may be outside the optional strict SVG export helper's supported subset. For the retained process-study SVGs, use the separate [study export guide](study-export.md).

## Installation and discovery

Follow [installation](install.md) for the standalone guidance and optional released archives. A manual project-local source-copy lifecycle was observed in Codex CLI 0.169.0. Desktop, Claude Code, ChatGPT and Claude chat routes have separate outstanding tests; see [compatibility](compatibility.md). Installing helpers does not register the skill with a client.

### Prepared Node helpers

The optional **core** archive supplies the `ingenium` command and core modules. The smaller **inspection** companion supplies `ingenium-tools`; browser adapters remain separately selected. Both need Node 22+ and neither is necessary for a simple conversation. The [0.2.0-alpha.2 prerelease](https://github.com/ajhcs/Ingenium/releases/tag/v0.2.0-alpha.2) provides `core-tools-0.2.0-alpha.2.tgz` and `inspection-tools-0.2.0-alpha.2.tgz`. Local development preparations include a `-development-<buildId>` suffix. Use the exact paths and hashes in the accompanying `artifacts.json`; local preparation does not itself publish files.

With a supplied archive and a chosen consumer directory, install without a clone, registry lookup or install scripts:

```sh
npm install --prefix /path/to/consumer --offline --ignore-scripts --omit=optional /absolute/path/to/core-tools-0.2.0-alpha.2.tgz
/path/to/consumer/node_modules/.bin/ingenium version --json
```

For inspection, substitute the supplied `inspection-tools` archive and run `ingenium-tools version --json`. Use the actual filename from the manifest, especially for development builds. The core archive contains helper code and provider metadata; selected data packs and editable examples are separate. See [tools](tools.md) for inspection capabilities and [installation](install.md#optional-released-helpers) for details. No npm registry publication is required or claimed.

### Optional renderer

Sharp supports a bounded static SVG-to-PNG export. A copied plugin may have no Node dependencies. You can explicitly install the renderer into a separate user-owned directory and pass `--renderer-dir` to both discovery and export; follow the exact [renderer setup](../skills/ingenium/references/renderer-setup.md). Discovery never installs tools. A missing renderer leaves prose, records and editable source work available.

## Resources without a template

Start with the organizing idea. Then select only the resources that help it. Ingenium includes compact provider discovery and selected fonts, SVG packs, shapes, palettes, textures and atomic UI parts. Catalog browsing does not itself download assets. Source catalog totals and selected usable coverage are different things.

Use the [resource route guide](../skills/ingenium/references/resource-libraries.md), then read the route you need. Optional user-local downloads require explicit selection and preserve available notices and provenance. Full-design and template libraries are excluded. Missing tooling or denied acquisition is reported as such; it should not become a claim that an asset was delivered.

## Records and checks

The [record format](../skills/ingenium/references/record-contract.md) distinguishes evidence, tentative interpretations, scoped decisions and artifacts. A selected decision requires an explicit reopen declaration before a revision changes it. The optional `check` command validates the record contract; it does not judge taste or confirm the existence of planned artifacts.

[Scoped checks](../skills/ingenium/references/checks.md) cover supported layout construction, solid-pair contrast and optional owned-local browser review. Reports retain the named profile/state and statuses such as not-run or review-needed. A passing check is bounded evidence, not accessibility certification, complete semantics, engineering adequacy or user acceptance. Formal engineering models retain their own authority and semantic tools.

## Delivery checklist

- Open the actual source and exported files; confirm the listed paths exist and contain the intended result.
- Inspect intended sizes, fonts, interactions and representative responsive states where relevant.
- Preserve editable originals, earlier studies, source rights and separate exports.
- State checks performed and meaningful uncertainties. Missing exports remain unavailable.
- Keep private briefs, annotations, credentials and local review receipts out of public packages and Git.

## Status and rights

Current distribution: experimental [0.2.0-alpha.2 prerelease](https://github.com/ajhcs/Ingenium/releases/tag/v0.2.0-alpha.2). The immutable 0.1.0 preview is historical. “V3” identifies a development study tranche; it is not a semantic package version or a claim of general release qualification. Optional Node helpers target Node 22+. Actual desktop discovery and broad cross-client/browser qualification remain unverified.

Original code and synthetic artwork use [MIT](../LICENSE). Retained third-party resources have separate terms: see [third-party notices](../THIRD_PARTY_NOTICES.md), [component identities](../THIRD_PARTY.json) and [worked-study font notices](../examples/worked/fonts/FONT-NOTICES.txt). Resource availability does not itself establish that a particular use is legally sufficient.
