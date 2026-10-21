# Open Design final coverage ledger

Pinned source: `nexu-io/open-design` at `8d820a698908dc279ef3d5aeb4ce6d156211a499`; comparison baseline: Ingenium `f70db6171196c2c4452bc53eb24e82ba7cad5d9c`. Research date: 2026-10-21.

**All 549 actual `SKILL.md` source texts have completed reading evidence.** The source contains 461 exact full-file SHA-256 identities. This means 88 additional paths reuse an exact full-file identity; it does not mean all similarly named templates are identical or independently evaluated. `open-design-inventory.csv` / `.json` bind every actual path, source hash, byte size, reader, reading method and evidence artifact. `open-design-byte-aliases.csv` separately names exact-byte alias groups. All 549 checkout hashes were rechecked during the final merge.

| Partition | Paths | Completed reading evidence |
| --- | ---: | --- |
| Functional `skills/` | 169 | 60 complete raw-body reads; 24 complete raw-body reads by the additional reader; 85 complete normalized-form/variable-field reads with 85/85 exact body reconstruction checks and custom additions separately read |
| `design-templates/` and `plugins/_official/examples/` | 302 | 115 + 187 paths; all 2,579 unique semantic blocks read across forty bounded batches by four readers; every file retains ordered block IDs and exact source-byte reconstruction; 236 full-file hashes |
| Other plugins, contribution/example/fixture/tool skills | 78 | All 78 complete bodies directly read; exact-basename scope includes 12 `plugins/spec/examples` that an early coarse directory grouping incorrectly attributed to the official-example partition |
| **Total** | **549** | **162 complete raw-body reads, 85 complete normalized reads, 302 complete ordered-block reads; zero pending skill-text records** |

Reading shared blocks once and preserving their exact original order covers the complete source text; it does not establish holistic per-skill evaluation, all cross-block contradictions, runtime behavior, quality, user acceptance, full accessibility or future-model superiority. The transformed method is named explicitly in the ledger rather than described as 302 independent raw-file reads. The source templates' expert/persona labels and outcome claims remain authored claims.

## Support and local-reference coverage

Linked operational material is inventoried separately from skill-text reading. No global full-reference-read or complete transitive closure claim is made:

- `open-design-functional-support-inventory.csv`: 279 text/source/notice sidecars, including the corrected five Remotion `.tsx` files; 15 full reads and 264 `inventoried-not-read`. All five `.tsx` files remain unread and unexecuted. Six PNG files and one `.gitignore` fall outside this text/source inventory.
- `open-design-extra-reader-mui/support-inventory.json` and `local-reference-edges.json`: selected functional source notices/references and 74 explicit edges, with generated/unresolved paths kept separate. These overlap the functional inventory and must not be summed as new files.
- `open-design-b-inventory.csv`: 637 tracked files in the 78-body partition, including skills, references, source sidecars and notices. Individual read statuses govern; most support files are indexed only.
- `open-design-template-reader-components/linked-reference-inventory.json`: 1,392 candidate files including the 302 skill texts and 1,090 text/code/notice sidecars. All 1,090 sidecars are inventoried, not generally semantically read. Its literal-edge extraction records 1,421 edges: 665 local files, 134 directories, 143 external targets, 43 patterns/commands/placeholders, 39 outside-source literals and 397 unresolved runtime/local/missing literals. Those categories are extraction results, not 397 proven missing files. For example, outside-source literals include `../../../assets/...`, which is an incomplete illustrative path. Binary, symlink, external and runtime-selected paths retain the inventory's limits.

The inventories retain exact source paths and hashes where a concrete local file was resolved. An external URL, glob, generated filename, illustrative ellipsis or runtime `DESIGN.md` is not silently promoted to an existing local dependency or semantic read. No upstream scripts, installation commands, billed generation, credentials or source application runtime were executed.

## Findings and synthesis boundaries

Use these completed analyses together:

- `open-design-functional-findings.md`: 22 candidate/duplicate/rejection mechanisms, baseline evidence, applicability, benefit/cost judgments and selected exact-notice evidence; per-file functional dispositions cover all 169 paths.
- `open-design-extra-reader-mui/FINDINGS.md`: large motion/image/taste workflows; interruption/retargeting, independent input/time/media representation and temporal review candidates; rejection of conflicting aesthetic mandates and unsupported guarantees.
- `open-design-b-review.md`: all 78 remaining skill bodies and their candidate/duplicate/rejection mechanisms.
- `open-design-template-reader-components/FINDINGS.md` plus each reader's progress receipt: all 302 template/example texts, actual delivery-context/dependency boundaries, narrow candidate mechanisms and rejected fixed templates, fabricated realism and scoring machinery.

These are source-grounded synthesis hypotheses, not observed improvement results or documented OpenAI guidance. The main incremental themes are reference adaptation intent, source-aware qualitative evidence, temporal interaction semantics, actual destination/dependency/font behavior and localized export diagnosis. Existing Ingenium scope, eight optional/composable methods, actual source/model traceability and distinction between numeric checks and acceptance remain authoritative. No upstream code, templates, fonts, images or full source skill text are delivered in these research artifacts. Selected notices were inspected; untouched assets/runtime libraries and other notices have not received blanket clearance.

## Reproducing the ledger

The study-authored `open-design-audit.mjs` generates the functional metadata and source-wide path/hash ledger from the pinned local checkout. `open-design-merge-coverage.ps1` then consumes completed B and A evidence, rejects mismatched hashes/read states, verifies all 549 actual files and writes the final global ledger, byte-alias map and `open-design-coverage-summary.json`. The A aggregate is admitted only with 302 complete files, zero partial files, forty completed batches and every semantic block accounted for. A pending map never promotes a file. These helpers analyze source bytes; they do not run upstream code.

Validation performed: 549 source-hash matches; A's 302 exact byte reconstructions and reader receipts; 85 normalized-body reconstructions; 24 additional-reader hash matches; inventory count/status checks; Git whitespace checks. Actual product behavior and outcome evaluation remain outside this research pass.
