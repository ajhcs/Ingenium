# Observed client compatibility

Observations below were made on 2026-11-14. Client support is specific to a
route, client version, environment and candidate bytes. Package extraction and helper tests do not establish agent discovery.
The basic guidance remains independently usable; optional helpers require their
separately documented capabilities.

| Route | Current evidence | Remaining work |
| --- | --- | --- |
| Codex CLI, project-local `.agents/skills/ingenium` | CLI 0.169.0 on Ubuntu 24.04 x86-64, observed 2026-11-14. Actual fresh discovery, invocation, editable output, two title-only edits in separate sessions, changed-source candidate upgrade, removal and fresh discovery absence were observed. User outputs survived upgrade/removal unchanged. | Evidence qualifies the manual project-local copy route with ephemeral CLI sessions and existing authentication. A prepared release-package upgrade is still distinct from the observed source-candidate upgrade. |
| Codex desktop, project-local skill | This development conversation is not a desktop lifecycle receipt. | Observe a selected actual desktop session against the candidate, including fresh discovery, upgrade and removal. Tracked in [issue 13](https://github.com/ajhcs/Ingenium/issues/13). |
| Codex plugin/marketplace install | Not run. | Observe this separate installation route; CLI project-local evidence cannot establish it. |
| Claude Code, project-local skill | No Claude Code executable found in PATH or the inspected existing local tool directories. No Claude Code authentication check was possible. | Supply an existing accessible Claude Code client/account and a disposable project; run its complete lifecycle. Installing or configuring a real client is outside this implementation action. Tracked in [issue 12](https://github.com/ajhcs/Ingenium/issues/12). |
| ChatGPT chat, guidance paste/upload | Not run; no selected chat upload/session-control route is available to the evaluation harness. | Observe guidance loading, file creation, preview and later persistence separately in an accessible actual chat. Tracked in [issue 14](https://github.com/ajhcs/Ingenium/issues/14). |
| Claude chat, guidance paste/upload | Not run; no selected Claude chat upload/session-control route is available. | Observe guidance loading, file creation, preview and later persistence separately in an accessible actual chat. Tracked in [issue 14](https://github.com/ajhcs/Ingenium/issues/14). |

The observed source-candidate upgrade began with commit
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
`observed-needs-review`, never an automatic behavioral pass. Producer prompts,
actual client events, editable outputs and independent evaluator observations
remain separate. Private receipts belong under ignored `work/implementation/`.

For example, from the source checkout with Node 22 or newer:

```sh
node tools/run-behavioral-evaluation.mjs \
  --case protected-narrow-edit --repeat 3 \
  --skill skills/ingenium --output work/implementation/evaluations/protected-edit
```

This creates fresh disposable projects and records `not-run`. To execute, add
`--run --client /absolute/path/to/codex --model YOUR_SELECTED_MODEL` using an
existing authenticated client. The harness uses `--ignore-user-config`, never
writes client configuration or credentials, and never changes installed user
skills. Client session state remains governed by that client's own ephemeral
execution behavior; no new account or API key is created.

Behavioral repetition is bounded observation, not a population reliability claim.
Browser checks, native editors, glyph coverage, assistive technology, artistic
acceptance and engineering adequacy require their own evidence. Unsupported or
unavailable routes remain open and must not be described as qualified support.
