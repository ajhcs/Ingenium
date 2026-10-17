# Your first Ingenium study

Explore a direction, make something you can react to, then refine it without losing the choices you want to keep.

## Set up your client

Use the [platform setup guide](install.md) for Codex app/CLI, Claude Code, ChatGPT or Claude chat. It includes a no-Node manual route and a guidance ZIP. The basic skill uses your client's model and tools; the optional Ingenium helper package is separate.

In Codex, invoke `$ingenium`. In Claude Code, invoke `/ingenium`. In a chat client with Ingenium enabled, say “Use Ingenium.” Without custom skill upload, paste the [instructions](../skills/ingenium/SKILL.md) into the conversation first.

## Ask for a useful result

> Make a poster for a fictional event called Evening Garden, on 24 May at 6 pm. The invitation is “An evening of listening, planting and conversation.” It should feel quiet and welcoming. Show two distinct organizing ideas as editable SVG files, keeping the wording the same. Use no image generation or external references. Preview the files if your tools allow it, and give me the actual files to open.

This brief requests two studies to compare. A different task can need just one study, a useful question or a text comparison. If file creation is unavailable, ask for editable source text; visual inspection remains pending until you open it.

If you want to discover the look together, say so: “Help me find a direction before finishing. I don't know design terms; show me something I can react to.” Ingenium can begin with a relevant visual probe, then narrow the next choice while keeping settled dimensions steady. For example, compare palettes using the same content, then apply type variants to the chosen palette. The starting point and pace follow your task; a quick autonomous request or a settled edit does not need this sequence.

## Refine a choice

> Keep the first study's layout and wording for this poster. Make only the title feel less formal. Save a new editable version and keep the previous files.

Keep the choice scoped to this poster. If the interpretation of “less formal” would change something consequential, clarify it; otherwise use a small, revisable change. You can explicitly reopen earlier choices later.

## Keep something you can revise

Open the actual files. Keep the editable source, any successful preview, a short account of the chosen direction and anything still untested. An export or a numeric check does not establish design quality or acceptance.

Browse the [original fictional studies](../examples/release/README.md) for other formats.

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
