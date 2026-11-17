# Observed client compatibility

Observations below were made on 2026-11-14. Client support is specific to a
route, client version, environment and identified bytes. The current distribution is
[0.2.0-alpha.3](https://github.com/ajhcs/Ingenium/releases/tag/v0.2.0-alpha.3);
its release notes carry the subsequent publication and installation verification.
The retained observations below identify their own source or release explicitly.
Package extraction and helper tests do not establish agent discovery.
The basic guidance remains independently usable; optional helpers require their
separately documented capabilities.

| Route | Current evidence | Remaining work |
| --- | --- | --- |
| Codex CLI, project-local `.agents/skills/ingenium` | CLI 0.169.0 on Ubuntu 24.04 x86-64, observed 2026-11-14. Actual fresh discovery, invocation, editable output, two title-only edits in separate sessions, changed-source candidate upgrade, removal and fresh discovery absence were observed. User outputs survived upgrade/removal unchanged. | Evidence qualifies the manual project-local copy route with ephemeral CLI sessions and existing authentication. A prepared release-package upgrade is still distinct from the observed source-candidate upgrade. |
| Codex desktop, project-local skill | This development conversation is not a desktop lifecycle receipt. | Observe a selected actual desktop session against the candidate, including fresh discovery, upgrade and removal. Tracked in [issue 13](https://github.com/ajhcs/Ingenium/issues/13). |
| Codex CLI, BuilderBob local plugin catalog | Observed with CLI 0.169.0 on Ubuntu 24.04 x86-64: enabled `ingenium@ingenium-local-review` upgraded to released 0.2.0-alpha.2 using the supported CLI. All 1,049 source/cache files matched the selected release composition. A fresh external-project session discovered the installed guidance, edited only a requested title and acquired an offline crosshatch texture with the requested density. | This qualifies the selected local catalog and fresh CLI session, not a public marketplace or desktop lifecycle. See the current release notes for the alpha.3 upgrade and readback. Removal of the user's global installation was not exercised. |
| Claude Code, project-local skill | No authenticated Claude Code environment was available. | Exercise discovery, invocation, edits, upgrade and removal in an existing accessible client/account and disposable project. Tracked in [issue 12](https://github.com/ajhcs/Ingenium/issues/12). |
| ChatGPT chat, guidance paste/upload | Not run; no selected chat upload/session-control route is available to the evaluation harness. | Observe guidance loading, file creation, preview and later persistence separately in an accessible actual chat. Tracked in [issue 14](https://github.com/ajhcs/Ingenium/issues/14). |
| Claude chat, guidance paste/upload | Not run; no selected Claude chat upload/session-control route is available. | Observe guidance loading, file creation, preview and later persistence separately in an accessible actual chat. Tracked in [issue 14](https://github.com/ajhcs/Ingenium/issues/14). |

The retained released alpha.2 global observation binds source commit
`2c3037ea0886e61e3ccce16f1a13c0e966932e8f` and build
`6fcd476500cb74d081f6aab49b8ace4c3b3a0cf172deb4dbd22e2f60dd0bc9ca`.
The full installed path/hash inventory had SHA-256
`c2a4af1799f2d5531d8c0205058591929912bd0d7155d3f08c5767caa9926a9b`.
The composition included exact tagged support files plus the published core,
guidance and seven selected resource packs; this is broader than the guidance ZIP.

The earlier observed source-candidate upgrade began with commit
`35e7059ba419eb176c72889ceb108eb3529bbb1e` and changed the skill entry
to SHA-256 `f56bd00d40b532c7bb856b5ce05fda018182c8108a5c1caee80c41c535eef328`.
All thirty first-slice behavioral runs used the same 45-file skill inventory,
identified by its canonical inventory SHA-256
`fa9cb0a1a063917c714a5704f679b71662b8a012b7ad961f45aa91fdd9e11db9`.
This identifies development source bytes; it is not a published package identity.

The subsequent 46-file guidance candidate has inventory SHA-256
`55aa5ce97fda091c3ece60813d50e0994916ba70104b3a630e78dc7c598fb7d1`
and skill-entry SHA-256
`fffbe372adf14a75b056bb85856ed702667ffce4bfa020867e4f0e079b0ffc0d`.
It adds a source-identity link and responsive reflow guidance. Three fresh actual
web-generation exercises used those bytes. Prepared guidance artifacts have
separate per-build identity and lifecycle receipts; the source-copy observation
does not imply a published package, plugin or desktop installation.

The bounded exercise retained initial unreadable narrow/enlarged layouts as
failures. After the guidance revision, two of three fresh pages still overflowed
at 320 CSS pixels with 200% text; the remaining page needed visual review. One
explicit repair using browser feedback then preserved the original file, content and interaction
and passed the selected reflow and keyboard checks. This intervention and the
earlier failures remain separate outcomes. Model output still needs relevant
artifact inspection; these observations do not establish universal reliability.

The alpha.3 responsive evaluation used a 49-file source skill inventory, SHA-256
`5f533d3493b6e0842cdb282fca3e688916b888a6dd2c7e8987b89d97cacb4cc9`.
Three fresh tasks requested `gpt-6.1-sol`, `gpt-6.1-terra` and `gpt-6-astra`,
and a fourth repeated the original realistic-content task. Each had explicit
existing local browser paths and operator-selected full process access; Chromium's
own sandbox remained enabled. All four delivered pages passed independent
content, keyboard and selected reflow checks; actual 200% browser zoom was
measured separately from doubled root text. One first version overflowed at
320px/200% text and was repaired before delivery; the other two first versions
had no measured page overflow and received table refinements. Earlier failed,
unavailable and interrupted attempts remain separate observations. These runs
qualify the exercised delivery workflow, not every future generation or a client
UI lifecycle. Publication notes identify the later extracted and installed bytes.

The requested model in the Codex availability probe was `gpt-6.1-sol`. The model
reported only the broader identity exposed to its context; this is not independent
confirmation of an exact backend model revision. Actual exercise receipts retain
the requested model and client invocation rather than inventing that identity.

The bounded recurring evaluation uses original synthetic tasks for short briefs,
ambiguous feedback, autonomous work, protected edits, unavailable renderers,
interrupted exports, continuation, explicit reopening, and realistic content.
`tools/run-behavioral-evaluation.mjs` prepares cases by default. `--run` explicitly
launches the selected real Codex executable and model. It defaults to three
repetitions. For browser tasks, select an existing short workspace temporary root with
`--temp-root /absolute/short/workspace/tmp` when Chromium socket paths would exceed
platform limits. Temporary paths are recorded; the harness never changes `HOME`
or `CODEX_HOME`. Completion of the client process is recorded as
`observed-needs-review`. After an independent review, use
`tools/record-behavioral-review.mjs` to write a separate `result.reviewed.json`.
The reviewed file records the judgments and the SHA-256 of the original
`result.json`, which remains the producer receipt. Private receipts belong
under ignored `work/`.

For example, from the source checkout with Node 22 or newer:

```sh
node tools/run-behavioral-evaluation.mjs \
  --case protected-narrow-edit --repeat 3 \
  --skill skills/ingenium --output work/implementation/evaluations/protected-edit
```

This creates fresh disposable projects and records `not-run`. To execute, add
`--run --client /absolute/path/to/codex --model YOUR_SELECTED_MODEL` using an
existing authenticated client.

To record a review, create a JSON file with schema `ingenium-behavioral-review/1`,
the evaluator's `reviewer` label, boolean `versionsMasked`, and
`receiptSHA256` from the producer's `result.json`. The `judgments` array
contains one `{question, answer, evidence}` per manifest question, in order.
Each `evidence` entry is a file path relative to the review JSON. Then run:

```sh
node tools/record-behavioral-review.mjs work/evaluation/run-1 work/review/review.json
```

Pass the custom manifest as a third argument when reviewing a run that used one.
The recorder validates the receipt, questions, and evidence references. The
judgments remain the evaluator's responsibility. An existing reviewed file
is preserved.

By default the runner names `$ingenium` in the prompt and requests low reasoning
effort, matching earlier runs. Use `--skill-cue none` to present the same task
without the runner naming the skill. For a discovery check, choose a task and
inputs that also omit its name. Inspect the client events for a read of the
project-local candidate before attributing the result to that skill.

Use `--reasoning-effort high` to request that level from a compatible model, or
`--reasoning-effort client-default` to omit the override. The client determines
which effort names the model accepts. Each result records the requested settings.
When comparing models, hold the task, skill bytes, cue and effort setting fixed.
If a client run fails, the CLI prints the repetition statuses and exits nonzero.
Its receipt lists the evidence files present after that attempt.

The harness uses `--ignore-user-config`, never
writes client configuration or credentials, and never changes installed user
skills. The default sandbox is `workspace-write`; explicit `--sandbox danger-full-access` disables that boundary for trusted tasks and is recorded in the receipt. Use it only when the selected task and environment authorize unrestricted execution. Client session state remains governed by that client's own ephemeral
execution behavior; no new account or API key is created.

Behavioral repetition is bounded observation, not a population reliability claim.
Browser checks, native editors, glyph coverage, assistive technology, artistic
acceptance and engineering adequacy require their own evidence. Unsupported or
unavailable routes remain open and must not be described as qualified support.

## Delegated direction and ordinary briefs

On 17 November 2026, Codex CLI 0.169.0 ran each of five briefs once per version
with requested model `gpt-6.2-astra`, low reasoning effort, and the same named
project-local skill cue. The two inputs were the skill tree from `afeb130` and
the first revision with `SKILL.md` SHA-256
`d0596a7d2f52cc0f93e615d76decda813a5d86cff2de5f4c66df849248b69e68`.
A separate model evaluator answered the manifest's questions from masked
packets containing the sources, Chromium renders, and handoffs. Common Measure
is a separately authored worked example.

| Brief | Baseline and revised guidance |
| --- | --- |
| Delegated Oriole Cinema commission | Each delivered one editable poster. Both linked the pianist and audience scores through a transition from piano keys to pencil marks. The first revision paired the artwork and times in two columns. The baseline used a stronger free-admission footer. Both handoffs left the cost of the design choice unstated. |
| Explore the same announcement together | Each delivered two studies and left the direction open. Both contrasted equal prominence for the screenings with an invitation that leads with the audience's role. |
| Ambiguous feedback on a card | Each delivered a type-only probe and treated the interpretation as tentative. The original files kept their exact bytes. |
| Protected title edit | Each delivered a separate SVG. A byte comparison confirmed that only the requested title text changed. |
| Ordinary Field Station overview | Each delivered a single editable overview with the supplied wording and both directed links. |

The first follow-up made a cost or compromise mandatory and added an explicit
question to the scoring rubric. In the uncued and named cinema runs, both
handoffs said the free-admission line “reads best up close.” The named run
explicitly tied the cost to the space given to the illustration. This is
observed compliance with the added instruction on that brief. The shared
phrasing leaves open whether the guidance generalizes.

The ordinary overview and cinema brief each ran uncued against the baseline
and the first follow-up. All four logs show successful reads of `SKILL.md`.
Each project supplied one local skill and the CLI ignored user configuration.
These observations cover discovery in that setup. Selection among competing
installed skills remains unmeasured.

The collaborative, ambiguous-feedback, and protected-edit cases were last
run against the first revision. The current guidance asks for a material
compromise when the artifact shows one. In a new pocket-map brief, both the
mandatory and conditional versions named costs of schematic representation.
The conditional run told readers to use the printed numbers because equal
drawn spans represented walks of different lengths. That demonstrates a
different kind of tradeoff on one brief. The same run's title clipped slightly
at the right edge. In the repeated cinema brief, the conditional handoff gave
its rationale but omitted that the headline and artwork pushed showtimes
further down the page.

The assessment covers 18 completed runs. [Per-run judgments, coverage, and
guidance hashes](behavioral-review.md).
