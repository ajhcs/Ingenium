# Slice 1 component contracts

Version 1, frozen for initial independent lanes. Changes require integrator reconciliation before dependent work.

## Package and runtime

Canonical root plugin.json; skills/ingenium/SKILL.md; no MCP/hooks/server. Node >=22 for optional helpers, ES modules, built-in node:test. Root package/locks belong to integrator. Node packages only for a concrete adapter. Project license is MIT, selected by the owner. Original synthetic inputs only.

## Records lane

Own src/records/, tests/records/, examples/records/, and skills/ingenium/references/record-contract.md. Export validateRecord(record) returning {valid:boolean,errors:string[]} and reviseRecord(record, change) returning a new record or throwing an actionable error. Neither API writes files or mutates input. Define compact JSON version/revision, purpose, evidence, tentative interpretations, scoped decisions, artifacts. Preserve chosen decisions across ordinary edits; changing a chosen decision requires an explicit reopen declaration tied to that decision. Reject stale base revision, dangling IDs and invalid states. No automatic semantic acceptance or invented numerical taste confidence. Document exact input shape and provide meaningful round-trip/preservation/refusal tests. No root manifest edits or commits by worker.

## SVG lane

Own src/svg/, tests/svg/, examples/svg/, and skills/ingenium/references/svg.md. Export discoverCapabilities(options={}) and exportSvg({sourcePath,outputPath,sharpModule?}); ES modules. Capability discovery reports present/absent/errored and versions from actual probes, without claiming installed-client integration. Support explicit optional Sharp module locator for an existing installation; normal local dependency resolution remains default. No private hardcoded tool paths in shipped code. Preserve source bytes and editable text/IDs; PNG output must be a separate file. Bounded safe static SVG only: reject unsupported external resources/DTD/scripts and source-overwrite/symlink collisions. State limits rather than claim a universal SVG validator or security sandbox. Do not implement Canvas booleans or fonts. Return source/output hashes, dimensions, renderer identity. Include an original nontrivial SVG with transforms, clipping and a hole plus tests of preservation, negative inputs and actual render when optional Sharp is available. No root manifest edits or commits by worker.

## Workflow/integration lane

Integrator owns skills/ingenium/SKILL.md, other domain references, CLI, package/manifest, README, notices, packaging tests and integration examples. Worker-owned reference files above must not be edited concurrently. Helpers must be reachable from installed package-relative paths. Any subset of requested deliverables is valid. User instructions outrank workflow preferences.

## Evidence and public delivery

Private tests/review receipts under ignored work/. Public sources/examples use original synthetic content; public validation reports contain no user records or machine paths. An independent evaluator gets realistic tasks without intended answers. Integrator reviews complete staged diff and third-party rights before non-force push/PR. Installation/discovery in an actual client remains separately pending until tested.
