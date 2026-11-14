# Editable file handoff

Import pure `validateDelivery` from `src/delivery/schema.mjs`, or `validateDelivery` and explicit async `writeDelivery` from `src/delivery/index.mjs`. There are no import-time probes, installs or network operations. These optional Node 22 helpers do not require CSE or a project store.

```js
const delivery = {
  schema: 'ingenium-delivery/1',
  projectId: 'field-station', versionId: 'title-treatment', openingFile: 'drawing.svg',
  artifacts: [
    { id: 'drawing', path: 'drawing.svg', sha256: drawingHash,
      mediaType: 'image/svg+xml', role: 'source', editableKind: 'live-text',
      editingNote: 'SVG title remains live text; system font fallback can vary.', dependsOnIds: [] },
    { id: 'instructions', path: 'CONTINUE.md', sha256: instructionsHash,
      mediaType: 'text/markdown', role: 'instructions', dependsOnIds: ['drawing'] }
  ],
  tools: [{ id: 'svg-editor', purpose: 'Edit live SVG text', required: true,
    tested: 'no', limitations: ['Native editor opening has not been exercised.'] }],
  checks: [{ id: 'png', status: 'not-run', scope: 'Optional PNG renderer is absent.', evidenceIds: [] }],
  limitations: ['Original fictional illustration; no engineering acceptance is claimed.']
};
const result = validateDelivery(delivery); // {valid, errors:[{code,path,message,nextStep}]}
const handoff = await writeDelivery({ root: sourceDirectory, delivery, outputDir: newDirectory });
```

Hashes are lowercase SHA-256 of exact bytes. Paths are normalized relative POSIX paths with no absolute/drive/UNC path, empty/dot/dotdot component, percent encoding, backslash, control character, colon, query or fragment. Paths may contain `.ingenium` when an explicit project store projects its references; portable materialization must consistently restore local paths before packaging linked files. Every artifact has `id,path,sha256,mediaType,role,dependsOnIds`; optional `editableKind,editingNote` describe the actual source. Unknown fields refuse. Roles are `source|export|preview|notice|instructions`; editing kinds are `live-text|outlined-lettering|vector-geometry|linked-image|raster-layer|code|structured-data`.

`tools` entries require `id,purpose,required,tested,limitations` and optionally `version`. Tested is `yes|no`; an untested required editor can be named without inventing successful opening evidence. `checks` entries require `id,status,scope,evidenceIds`; status uses `pass|fail|review-needed|not-run|error|not-applicable`. Check evidence IDs and dependency IDs resolve to artifacts. Artifact/tool/check IDs are unique across their combined namespace; project/version IDs are separate. IDs use `[A-Za-z][A-Za-z0-9._:-]*`, at most 128 characters. File dependency cycles are allowed: mutual website navigation is a valid finite closure. No recursive traversal is necessary to verify listed files.

The pure validator checks the exact schema, bounds, ID resolution, safe paths, recognized extension/media-type consistency, at least one source plus instructions, and an opening file that resolves to a source or instructions. Bundled WOFF/WOFF2/TTF/OTF artifacts must declare an included notice dependency. This verifies retained notice presence, never legal sufficiency. Dependencies needed by selected third-party resources, including full notices, must be declared explicitly; arbitrary artwork bytes cannot reveal their ownership. Source/editability descriptions must distinguish live text, outlines and replaceable rasters truthfully.

The JSON manifest is limited to 1 MiB, ten nested levels, 30,000 nodes, 256 entries per array, 1,024 characters per path and 8,192 characters per descriptive string. The tooling JSON Schema is `schemas/delivery-v1.schema.json`; runtime checks additionally enforce cross-field identities and semantic bounds. The schema file alone does not verify actual source bytes.

`writeDelivery({root,delivery,outputDir})` snapshots input data and reads all listed regular files without following source symlink components. Each file is bounded to 16 MiB, dependency-inspected text to 1 MiB and the total to 64 MiB. It checks exact hashes, nonempty instructions/notices, and the finite supported local reference subset before creating any output. A notice containing only a URL or Markdown link refuses. The caller's instructions should name the opening file, requested edit, preserved scope and next action. No prescribed headings are needed; the helper does not claim to understand or approve their meaning.

The shared pure `src/delivery/dependencies.mjs` helper exposes `extractDeliveryDependencies({path,role},bytes)` for the writer and optional store. It returns normalized local paths or throws a scoped refusal. Supported inspection covers quoted SVG hrefs; quoted HTML resource paths and local navigation links; embedded SVG image/use/feImage hrefs in HTML/Markdown; CSS `url()` and quoted `@import`; static relative JS imports/exports; and Markdown inline, reference, collapsed-reference and shortcut images/local links. Markdown fences and simple inline code are excluded. Definitions must resolve; ambiguous nested/escaped Markdown destinations refuse. Referenced files must be included and listed in that artifact's `dependsOnIds`. External navigation links are allowed; external resource URLs refuse an offline complete bundle.

Static JS imports may also name actual Node built-ins with the explicit `node:` prefix, verified by the current runtime's `node:module.isBuiltin`. These are external Node runtime prerequisites rather than local files; declare the required Node runtime and supported version in `tools`, and retain the actual regeneration command in instructions. Inspection does not load the built-ins, execute the generator, bundle Node or prove another runtime version supports it. Relative module imports still require their complete listed file closure. Bare `fs`, package names and unknown `node:` specifiers refuse. The selected recipe test retains its generator, selected JSON/catalog data and notices, then regenerates it from materialized sources in a separate process after deleting predecessor folders.

Dynamic imports, require calls, fetch/eval/URL construction, inline scripts/event handlers, embedded documents, base/srcset/srcdoc/appcache indirection, indirect CSS image construction, CSS escapes, unparsed CSS URLs, unquoted resource attributes, SVG script/foreignObject/entities and unsupported source extensions refuse with a scoped error. The markup tokenizer respects quoted angle brackets, and CSS/JS comments cannot hide imports. Text sources must be valid UTF-8. JSON, plain text, supported rasters and font binaries have no automatically interpreted resource language; their dependencies must be declared. This finite packaging grammar is deliberately narrower than arbitrary Markdown/HTML/CSS/JS/XML; unsupported syntax must be simplified or delivered through another explicitly supported route. It is not a font validator or hostile-content sandbox and does not execute every possible runtime resource construction.

The writer requires an existing real output parent and exclusively creates a new directory. Reserved generated names are `delivery.json`, `DELIVERY.md`, `INCOMPLETE.json` and `.delivery-manifest.pending`. It copies only listed files without modifying sources, writes `DELIVERY.md` with source/editability/tool/check inventories and instruction links, and publishes `delivery.json` last from a completed pending file. It returns `{status:'complete',manifestPath,inventoryPath,artifactIds}` only after packaging completes. Complete describes this verified package operation; a recorded `not-run` or failed check stays unchanged, and native-editor or behavioral success is not inferred.

Preflight errors create no output. Errors after directory creation retain partial files and, when writing remains possible, `INCOMPLETE.json` with stage, successful IDs, failure code and a new-destination retry instruction. The thrown error also carries `deliveryReceipt`. A failed package has no final complete manifest; pending manifest bytes may remain identifiable. The writer does not promise crash durability, fetch missing data, install tools, infer resource rights, overwrite an earlier handoff or retry automatically. Requested derivative subsets are valid; missing optional PNG/PDF tools do not prevent useful editable-source delivery when no missing derivative is claimed successful.
