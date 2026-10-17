# Your first Ingenium study

Ingenium helps turn an uncertain creative direction into something you can react to: a useful comparison, an editable study, or a clear specification. Start small. You do not need a server, backend or account connection for the workflow itself.

## 1. Get the portable plugin

Clone the repository into a directory you own:

```sh
git clone --branch codex/ingenium-slice1 https://github.com/ajhcs/Ingenium.git
cd Ingenium
```

Or download and extract the repository's source archive from GitHub. Keep `plugin.json`, `skills/`, `src/`, `bin/` and the supporting files together. The workflow entrypoint is [skills/ingenium/SKILL.md](../skills/ingenium/SKILL.md).

In a client that supports local plugins or skills, use its documented local-source installation route and select this directory. Ingenium does not provide a universal client installation command. Open a fresh conversation and verify the client actually discovers Ingenium before relying on it. Portable package structure has been checked; verify discovery in your client. Desktop discovery remains unverified. Copying files alone does not establish discovery.

The package declares `private: true`. Use the source checkout or a local tarball; these instructions do not rely on an npm registry publication. See the [local tarball route](user-guide.md#local-tarball-for-node-helpers) if you want a separate optional helper installation.

## 2. Ask for one useful thing

Try this original synthetic brief:

> Use Ingenium. I am making a poster for a fictional evening garden event. It should feel quiet and welcoming, with a title, a date and a short invitation. Show two different organizing ideas as editable SVG studies. Keep the wording the same so I can compare the hierarchy. Do not use image generation or external references.

Ask for the output you need. One question, a text comparison, one editable study, or a specification can be enough. If your client lacks an SVG renderer, ask for editable source and a description of the unresolved visual review.

## 3. Give a reaction with a scope

For example:

> The first study is easier to scan. Keep its hierarchy for this poster. The title still feels too formal; show two type treatments while keeping the layout and wording.

A choice about this poster should stay a choice about this poster. Ingenium separates what you said, what it tentatively interprets, and what you chose. You can explicitly reopen a choice later.

## 4. Keep something you can revise

Ask for the editable source, the export if available, a short record of the chosen direction, and anything still untested. Open the actual files before treating the result as delivered. A successful export or a numeric check does not establish design quality or acceptance.

Browse the [preserved release studies](../examples/release/README.md) and their generators for examples of the editable formats. These are fictional historical studies, not client work or a quality guarantee.

## Optional: make an editable result locally

With Node 22 or newer, from the cloned repository, this original example needs no dependency installation:

```sh
mkdir -p work
node examples/composition/listening-garden.mjs work/first-editable-study
node bin/ingenium.mjs check examples/records/poster.json
```

Use an output directory that does not exist yet. Open the generated `clean.svg` and `guides.svg` in a compatible browser; retain `layout.json` as the layout record. These are separate from the example decision record checked above.

For optional PNG export, explicitly set up or select a renderer using the [renderer guide](../skills/ingenium/references/renderer-setup.md). A checkout can also install its locked optional dependency:

```sh
npm ci --ignore-scripts
node bin/ingenium.mjs capabilities
node bin/ingenium.mjs render examples/svg/clipped-orbit.svg work/first-editable-study/orbit.png
```

Choose a fresh output filename. The check validates the example record's structure and references; it does not review the poster. The render command uses optional Sharp to export this supported static SVG while preserving its source. If Sharp is absent or errored, follow the [separate renderer setup](../skills/ingenium/references/renderer-setup.md), or continue with editable source. No automatic download or installation is performed by capability discovery.

For study generation, selective resources, installation details and limitations, continue to the [user guide](user-guide.md).
