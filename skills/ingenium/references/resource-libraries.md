# Choose a resource route

For an ordinary small resource task, start with [Task resources](task-resources.md): bounded search across bundled CSE masters, document recipes, palettes, fonts, original textures, web primitives and icon metadata, then inspect one exact selection. It's the shortest route to the expanded library.

Start with the design purpose, then inspect a few relevant candidates. A resource serves the organizing idea; a default icon, font or effect isn't a direction by itself. Full-design and template libraries stay excluded, and any reference withholding in the brief still applies.

## What the person will look for

- The selected resource fits the purpose and was inspected rendered, at the size and in the interaction or font behavior where it will be used.
- Only what was selected was acquired, with original bytes, full available notices, source declarations and derivation records kept.
- Upstream categories, inferred name tokens and Ingenium-authored tags are distinguishable. Catalog counts don't mean every entry passes admission, rendering or rights review.

## Pick one route

Read only the route you choose. Prefer installed data when it fits; browsing a catalog doesn't require a download. If you need to search several unrelated routes (say, icons and fonts), use subagents as needed and compare their shortlists.

| Need | Route |
| --- | --- |
| CSE connector, document fragment, palette, texture or small mixed resource request | [Task resources](task-resources.md): bounded unified search and exact selection |
| Browse the twelve source repositories and bundled assets | [Bundled resources](bundled-resources.md): compact provider summaries, paged metadata, selected factories |
| Select a Simple Icons original for user-local use | [Brand download](brand-download.md): optional selected download, separate finite presentation |
| Select a Voxel PNG for user-local use | [Local assets](local-assets.md): full custom terms, unchanged pixels, offline reuse |
| Browse Google/Nerd/free-font metadata, then acquire a selected face | [Bundled resources](bundled-resources.md), then [font download](font-download.md) only for acquisition |
| Use retained TTF/WOFF2 or bundled Hack faces | [Font packs](font-packs.md): separate typography edits; binaries stay unchanged |
| Use explicitly supplied Fontsource or Iconify packages | [Local packages](package-sources.md); [catalog](catalog.md) for paged navigation or Fluent selection |
| Adapt a selected SVG pack | [SVG packs](svg-packs.md); unsupported source semantics refuse |
| Construct geometric shapes or choose colors | [Shapes and palettes](palettes.md#shapes); sixteen Radix scales and original constructors |
| Build a small native UI component | [UI](ui.md): 26 atomic recipes or six Bulma wrappers |
| Use an Open Props gradient/noise declaration | [Materials](materials.md): 35 pinned CSS declarations |
| Construct an original digital tile | [Textures](textures.md): six editable constructions |
| Use a prepared illustration or tile source | [Items](items.md); [preparation](item-preparation.md) only if the selected source needs it |
| Work with the older remote asset client | [Assets](assets.md): separate provider/API qualification limits |

## Working with a route

Use the actual installed plugin root. With Node 22+, the CLI is `node /actual/plugin/root/bin/ingenium.mjs`; JavaScript examples use ES modules with imports relative to that root. Replace sample paths with explicit existing source and tool directories and new output paths. Helpers create export directories under existing canonical parents and refuse existing outputs; a failed operation can leave a partial new directory for you to inspect.

The flow is: discover metadata, request a small page, inspect a selected entry and its notices, then explicitly acquire or adapt it. Follow `nextOffset` only when another page is useful, and don't load whole indexes into context. The task facade unifies supported offline selections and returns scoped routes for icon acquisition; legacy provider methods each have their own interface, so use the linked route's actual fields.

Download clients have networking off by default. Turn it on only for the intended selected acquisition. Don't bulk-download a collection, install optional tooling during discovery, retry a denied route through another endpoint, or silently refetch corrupt retained output.

## Done when

The selected resource is acquired or adapted, its rendered result has been inspected in context, and provenance travels with it. A missing optional helper limits only that operation; carry on with other useful design work and say what was unavailable. Installed Node behavior and actual desktop skill discovery are separate claims. Remove scratch downloads and temporary outputs you no longer need.
