# Prepare a local candidate

`node tools/prepare-release.mjs NEW_OUTPUT_DIRECTORY` prepares exclusive local artifacts from a clean source tree. Package, plugin and companion versions must agree. The command stages files and creates deterministic archives; it never publishes, installs, deploys, runs package lifecycle scripts or downloads dependencies. Node22+ and Python3 standard library are required to prepare artifacts. Guidance consumers need neither runtime.

Dirty source refuses distributable preparation. `--development` explicitly prepares a nonrelease development build. Its per-flavor identity includes `development:true` and an exact source-content digest. The adjacent `source-content.json` records Git-visible source bytes and staged package members; identities identify the staged bytes rather than treating the baseline commit as their complete provenance. A concurrent source edit prevents a complete `artifacts.json`; preserve that incomplete output and retry in a new directory. Ignored private work is excluded. Keep preparation outputs on the workspace volume.

The result contains `artifacts.json`, guidance ZIP, npm-installable core and inspection `.tgz` files, stage directories and a content inventory. The manifest uses `ingenium-release-artifacts/1`; its artifact paths resolve relative to that manifest. `prepared:true,published:false` describes local preparation only. Per-flavor `release/identity.json` uses `ingenium-release/1`; guidance retains its identity as `ingenium/RELEASE.md` without adding a runtime. One content-derived buildId connects all flavors. The standalone source ZIP builder instead writes an explicitly unprepared `ingenium-guidance-source/1` Markdown identity with its version and exact guidance-content digest; it does not claim a commit stamp. This avoids a circular identity for the ZIP retained inside the source tree. Version/schema identities are separate.

The guidance budget is512KiB compressed. The inspection companion has an explicit runtime closure and budgets384KiB source/96KiB compressed. Core has a separate explicit runtime/helper/data allowlist and a2MiB compressed budget. Staging removes development test scripts/devDependencies from the core package metadata and replaces its broad source `files` list with the actual helper directories; source manifests remain unchanged. Companion staging likewise lists its actual runtime and optional identity directory. Core includes bounded directory/provider metadata, palette data and native helper scripts, and excludes examples and `src/resources/packs`. Resource metadata does not establish installed data availability. Selected pack archives retain source-relative paths; extract explicitly chosen packs into the helper root to supply the corresponding local factories. No data is fetched automatically. A budget failure retains evidence and requires a reviewed adjustment or a separately selected pack.

Programmatic preparation accepts `prepareRelease({outputDir,development?,sourceRoot?,resourcePacks?,studies?})`. Selection arrays contain source-relative JSON manifest paths. `node tools/prepare-resource-selections.mjs NEW_MANIFEST_DIRECTORY` writes exact manifests for the seven reviewed selected resource packs (Hack, CSE fonts, Liberation Sans, CSE masters, atomic CSS, materials and original recipes); inspect those inputs before preparation. `writeStudySelections` from `tools/build-study-bundles.mjs` writes the shared authoritative study inventories consumed by the site builder. These helpers only inventory selected local data; they do not acquire anything. Each explicit manifest has:

```json
{
  "schema": "ingenium-release-selection/1",
  "id": "selected-example",
  "files": [{"path":"examples/example/source.svg","bytes":123,"sha256":"<actual SHA-256>"}],
  "notices": ["LICENSE"],
  "openingFile": "examples/example/source.svg",
  "instructions": "examples/example/OPENING.md",
  "maxCompressedBytes": 10485760,
  "maxSourceBytes": 52428800
}
```

Every opening file and full source notice must appear in `files` with actual bytes/hashes. Optional `generatedFiles:[{path,text,bytes,sha256}]` retains up to64 author-supplied UTF-8 text files, each at most1MiB, for generated opening instructions and inventories. Their lengths/hashes must match exactly; collisions with source files or generated metadata refuse. Study instructions may be a source file or generated text. Select the complete referenced dependency closure, editable sources, exports and applicable full notices. Study instructions explain opening, editing and continuation; completeness and rights require review, not inference from a file extension. Paths must be normalized and contained; symlinks and private/working-data paths refuse. Duplicate artifact IDs or members refuse. Selected sources changing from their manifest hashes refuse. Defaults for packs are10MiB compressed/50MiB source; a reviewed source-specific manifest may declare another budget. The generated `release/selection.json` retains the source manifest inside its ZIP.

Verify by listing archive members, extracting into a new workspace consumer, importing actual exported APIs and invoking binary symlinks outside the checkout. Check legacy records/single-route APIs and the coherent continuation/edit example using installed paths. These checks establish artifact closure and bounded behavior. Actual Codex/Claude discovery, invocation, changed-version upgrade and removal need their own lifecycle receipts. Preparation authorizes no merge, release, client configuration change or deployment.
