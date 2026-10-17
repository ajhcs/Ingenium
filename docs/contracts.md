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

## Foundation slice contracts

The integrator owns root manifests/locks, CLI, workflow references, integration fixtures and final publication. Exclusive lanes: `src/layout/` plus `tests/layout.test.mjs`; `src/checks/` plus `tests/checks.test.mjs`; `src/browser/` plus `tests/browser.test.mjs`. Workers do not commit or install dependencies. Existing records and SVG interfaces remain unchanged.

Layout exposes small pure construction helpers and `resolveLayout(record)`. Its versioned JSON input retains named tokens, explicit optical exceptions and dependency references; resolution returns boxes, guides, exceptions and issues. It detects conflicting, cyclic and out-of-range constraints rather than adding a general solver. A layout issue uses `rule`, stable `target`, `status`, `scope`, and relevant `measurement`/`residual`; exact helper/input documentation follows implementation reconciliation.

Checks exposes pure solid-pair contrast, issue/report construction, stable fingerprints and report deltas. Status is one of `pass`, `fail`, `review-needed`, `not-run`, `error`, `not-applicable`. Issues identify rule, target and authored profile/state scope. Fingerprints exclude measured values, prose and artifact revision; deltas retain changed measurements/status and newly introduced/resolved identities. Reports preserve source/environment identities and the applicable check/exception scope. Uncertain color composition never silently becomes a solid-pair pass.

Browser support is optional and dynamically loaded only on explicit use. `createBrowserSession({adapterDir?, executablePath?})` returns capability information plus one owned prepared session, or a scoped missing/error result. `session.inspect({html, profile, state?, journeys?, screenshotPath?})` reuses that browser/context/page for geometry, font readiness, axe and named focus journeys on owned synthetic content; `session.close()` releases it. Profiles name viewport and text-spacing/delivery assumptions. Missing dependencies and unsupported operations report explicit status. No import-time installation, permission changes, external-page scan or browser download. Browser issues follow the common rule/target/status/scope fields; raw evidence is retained separately from compact reports.

## Optional renderer setup reconciliation

The integrator extends both SVG APIs with optional `rendererDir`, mutually exclusive with `sharpModule`. It names a user-owned npm installation directory; resolve only its `node_modules/sharp`, with no fallback into the checkout or another ancestor. Normal package-relative resolution remains the default. CLI capabilities and render accept the same selector. Missing/load/probe failures retain honest absent/errored status and provide portable setup guidance. Setup is an explicit npm operation performed by the user or an authorized task, never an automatic discovery/export side effect. No plugin-cache modification or persistent configuration is required.
