# Slice 1 validation scope

Candidate checked on Linux x64 with Node 22.23.2 and project-local Sharp 0.35.4. The checkout lockfile was installed with `npm ci --ignore-scripts`. No shared tool cache or explicit Sharp locator was required for the assembled tests or packaged CLI.

`npm test` executed 38 individual tests: 38 passed, zero failed, zero skipped. Coverage includes detached record revisions, protected chosen context, explicit reopening, stale revisions, malformed JSON references, absent/errored capability probes, refused SVG inputs, output collisions, source preservation and actual raster pixels for clipping, transforms and a hole. CLI tests exercise an npm-style binary symlink from another directory. The skill authoring validator also passed; it establishes metadata structure only.

An `npm pack --ignore-scripts` archive was installed in a separate local consumer. Its installed binary validated the packaged synthetic record, probed its own local renderer and exported the packaged SVG to a separate PNG from the consumer directory. Actual named module exports were inspected. The archive contained the skill, references, helpers and synthetic examples, with no private work receipts or dependency tree. The repository lockfile pins checkout dependencies; a consumer installing the archive resolves dependencies under its own lockfile.

An independent code review found that malformed reference objects could throw during validation. The fix rejects invalid IDs before reference bookkeeping, with regression coverage across all reference arrays. Integration review also covered packaging and CLI execution. The CLI entrypoint was corrected to recognize npm binary symlinks.

Seven independent manual workflow exercises covered explicit magazine-cover exploration, implicit bookshelf exploration, a single editable invitation, contradictory feedback with a preserved composition, reuse with missing agreed inputs, and unrelated arithmetic and correctness-only code requests. A real invitation SVG was rendered and its PNG inspected. An unsupported `letter-spacing` attribute was refused on the first attempt; that failure was retained, the study simplified and the retry inspected. These exercises assess instructions and observable outputs, not automatic client routing or human acceptance.

## Remaining qualification

Installed-client discovery and invocation have not been tested. Only the stated Linux/Node/Sharp environment was qualified. Host fonts affect rasterized text. The SVG recognizer supports a conservative subset, not arbitrary SVG or an untrusted-input sandbox. No font build pipeline, production print qualification, engineering acceptance, deployment or release was performed. User inspection and scoped choices remain necessary for design acceptance.

The next qualification step is to install through a supported client source, verify discovery and invocation in a fresh chat, and try a real scoped brief with user review. Preserve accepted choices and source artifacts during that evaluation.
