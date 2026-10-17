# Ingenium

**Make the next creative choice clearer.**

A portable creative workflow for exploring a direction, making editable studies, and keeping the choices that matter. Begin with a question, an existing artifact, or the feeling that something is almost right. A comparison, one useful study or a specification can each be enough.

![Original Common Ground cover studies, with editable sources](https://raw.githubusercontent.com/ajhcs/Ingenium/refs/heads/codex/ingenium-slice1/site/assets/demos/comparison-cover.png)

[Explore the studies](examples/release/README.md) · [Quickstart](docs/quickstart.md) · [User guide](docs/user-guide.md) · [Preview the site](docs/github-pages.md)

## Start with one useful study

Get the source:

```sh
git clone --branch codex/ingenium-slice1 https://github.com/ajhcs/Ingenium.git
cd Ingenium
```

Use your client's documented local-plugin or local-skill source route and select this directory. The portable manifest is [plugin.json](plugin.json); the workflow is [skills/ingenium/SKILL.md](skills/ingenium/SKILL.md). Open a fresh conversation and verify discovery. Portable package structure has been checked; verify discovery in your client. Desktop discovery remains unverified. The package declares `private: true`; use a local checkout or tarball. A [local tarball route](docs/user-guide.md#local-tarball-for-node-helpers) is available for optional helpers.

Try a small original brief:

> Use Ingenium. I am making a poster for a fictional evening garden event. Show two different organizing ideas as editable SVG studies. Keep the wording the same so I can compare the hierarchy. Do not use image generation or external references.

Then give a scoped reaction: “Keep the first layout for this poster. Explore a less formal title.” Ingenium separates expressed facts, tentative interpretations and chosen decisions, and preserves choices until you explicitly reopen them.

## Intent → study → review → preserve

Develop the uncertainty that matters. Make something you can react to. Inspect the actual result at its intended size or state. Keep editable originals, separate exports, relevant notices and a clear account of the choices made.

The repository includes original fictional [publication, website, identity and wayfinding studies](examples/release/README.md), plus a [preserved progression](examples/progression/README.md). These are examples with stated limits, not client work, audience-success evidence or a design-quality guarantee. [Download editable study sources](https://github.com/ajhcs/Ingenium/blob/codex/ingenium-slice1/site/assets/demos/editable-studies.zip).

## See the workflow

[Watch the 90 second walkthrough](https://github.com/ajhcs/Ingenium/blob/codex/ingenium-slice1/site/assets/video/ingenium-demo.mp4), then explore the [20 second landscape](https://github.com/ajhcs/Ingenium/blob/codex/ingenium-slice1/site/assets/video/teaser.mp4) and [portrait](https://github.com/ajhcs/Ingenium/blob/codex/ingenium-slice1/site/assets/video/portrait.mp4) edits. The films are silent with authored captions. A [timed voiceover script](https://github.com/ajhcs/Ingenium/blob/codex/ingenium-slice1/site/assets/video/voiceover-script.md), [captions](https://github.com/ajhcs/Ingenium/blob/codex/ingenium-slice1/site/assets/video/captions.srt) and [editable video source](https://github.com/ajhcs/Ingenium/blob/codex/ingenium-slice1/media/README.md) accompany them.

The static project site includes a working website study, an image gallery and source downloads. [Preview it locally](docs/github-pages.md); GitHub Pages publication is prepared and remains pending.

## Optional tools

The workflow has no required server, backend or account connection. Optional Node helpers target **Node 22+**:

```sh
npm ci --ignore-scripts
node bin/ingenium.mjs capabilities
node bin/ingenium.mjs check examples/records/poster.json
mkdir -p work/first-study
node bin/ingenium.mjs render examples/svg/clipped-orbit.svg work/first-study/orbit.png
```

Use a fresh output filename. PNG export needs optional Sharp and preserves the editable SVG source. For a copied plugin without dependencies, follow [separate renderer setup](skills/ingenium/references/renderer-setup.md). Missing tools remain unavailable; they do not prevent useful source or prose work.

[Selective resources](skills/ingenium/references/resource-libraries.md) cover fonts, symbols, shapes, palettes, illustrations, textures and small UI parts. Catalog browsing does not download assets. Full-design/template libraries are excluded. [Scoped checks](skills/ingenium/references/checks.md) report supported layout, contrast and optional browser evidence. Neither checks nor exports establish taste, user acceptance, accessibility certification or engineering adequacy.

## Status and rights

Experimental package **0.1.0**. V3 names a development study tranche, not a package major version. See [V3 presentation checks](docs/v3-release-validation.md), [validation scope](docs/validation.md), [resource status](docs/resource-library-status.md) and [component contracts](docs/contracts.md) for implementation boundaries and unverified behavior.

Original code and synthetic artwork use [MIT](LICENSE). Selected fonts and other third-party resources retain their own [notices](THIRD_PARTY_NOTICES.md) and [identities](THIRD_PARTY.json). Private briefs, annotations, credentials and local receipts are not distributed.
