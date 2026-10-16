# Slice 1 validation scope

Candidate checked on Linux x64 with Node 22.23.2 and project-local Sharp 0.35.4. The checkout lockfile was installed with `npm ci --ignore-scripts`. No shared tool cache or explicit Sharp locator was required for the assembled tests or packaged CLI.

The initial `npm test` executed 38 individual tests: 38 passed, zero failed, zero skipped. Coverage includes detached record revisions, protected chosen context, explicit reopening, stale revisions, malformed JSON references, absent/errored capability probes, refused SVG inputs, output collisions, source preservation and actual raster pixels for clipping, transforms and a hole. CLI tests exercise an npm-style binary symlink from another directory. The skill authoring validator also passed; it establishes metadata structure only.

An `npm pack --ignore-scripts` archive was installed in a separate local consumer. Its installed binary validated the packaged synthetic record, probed its own local renderer and exported the packaged SVG to a separate PNG from the consumer directory. Actual named module exports were inspected. The archive contained the skill, references, helpers and synthetic examples, with no private work receipts or dependency tree. The repository lockfile pins checkout dependencies; a consumer installing the archive resolves dependencies under its own lockfile.

An independent code review found that malformed reference objects could throw during validation. The fix rejects invalid IDs before reference bookkeeping, with regression coverage across all reference arrays. Integration review also covered packaging and CLI execution. The CLI entrypoint was corrected to recognize npm binary symlinks.

Seven independent manual workflow exercises covered explicit magazine-cover exploration, implicit bookshelf exploration, a single editable invitation, contradictory feedback with a preserved composition, reuse with missing agreed inputs, and unrelated arithmetic and correctness-only code requests. A real invitation SVG was rendered and its PNG inspected. An unsupported `letter-spacing` attribute was refused on the first attempt; that failure was retained, the study simplified and the retry inspected. These exercises assess instructions and observable outputs, not automatic client routing or human acceptance.

## Remaining qualification

Fresh local CLI sessions subsequently demonstrated direct and implicit installed-skill selection, with two unrelated requests avoiding activation. An installed-client synthetic revision preserved earlier records and sources. These bounded observations do not establish universal routing, desktop propagation or owner acceptance. Only the stated Linux/Node/Sharp environment was qualified. Host fonts affect rasterized text. The SVG recognizer supports a conservative subset, not arbitrary SVG or an untrusted-input sandbox. No font build pipeline, production print qualification, engineering acceptance, deployment or release was performed. User inspection and scoped choices remain necessary for design acceptance.

The next qualification step is desktop discovery and a real scoped brief with user review. Preserve accepted choices and source artifacts during that evaluation.

## Portable optional renderer

The renderer-directory change adds three assembled tests, bringing `npm test` to 41 passing tests with zero skips. Explicit empty directories remain absent even with a renderer available in an ancestor checkout. Incompatible modules and broken native/transitive dependencies report errored status with setup help; discovery does not install or write files. Existing export refusal tests still verify that unsupported SVG is rejected before module resolution.

A fresh npm-installed consumer omitted optional dependencies. A separate user-owned directory installed Sharp 0.35.4 using the setup guide's npm command. The installed binary was run from another directory, with spaces in both consumer and renderer paths. `npm run test:installed-renderer` passed one end-to-end test covering setup guidance, missing/incompatible dependencies, record use without rendering, actual capability/render output, SHA-256 source/output identity, exact source preservation and output overwrite refusal. The installed package did not contain its own Sharp; its explicit renderer boundary supplied it. An independently inspected 320 by 240 PNG was also retained. The test does not install dependencies or access the network itself.

To reproduce that opt-in test, prepare a fresh npm consumer from an `npm pack --ignore-scripts` archive with `--omit=optional --ignore-scripts`, and prepare a separate renderer directory using [the setup guide](../skills/ingenium/references/renderer-setup.md). Then run from the source checkout:

```sh
INGENIUM_TEST_CONSUMER_DIR="/your/fresh-consumer" \
INGENIUM_TEST_RENDERER_DIR="/your/owned-renderer" \
npm run test:installed-renderer
```

The consumer must contain `node_modules/@ajhcs/ingenium` and its npm binary link. Use new owned directories for fixture setup. No existing native client cache was mutated for this test; the earlier installed-client evidence remains a preserved snapshot of its earlier candidate. This change is verified in a fresh installed package, not as a desktop refresh.
