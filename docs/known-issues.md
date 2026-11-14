# Known limitations and open verification

The 0.2.0-alpha.3 prerelease closes the seven selected font handoffs and adds a tested responsive generation-and-repair route. The following evidence boundaries remain. The [compatibility matrix](compatibility.md) identifies actual tested client routes and release identities.

## 1. Generated pages still require inspection before delivery

The alpha.3 guidance includes an editable responsive starter and a concrete generation, inspection and repair route. Three fresh requested-model tasks (Sol, Terra and Astra) and a repeated original realistic-content case produced delivered pages that passed the selected narrow/enlarged-text, content and keyboard checks. Independent actual Chromium 200% zoom measurements also showed no page overflow at effective widths of 320, 390 and 768 CSS pixels.

One retained first version measured 326px wide at 320px with doubled root text; its repaired delivery measured 320px. The other two first versions had no measured page overflow and received table refinements. These are delivered-output observations, not a guarantee of first-pass generation. Earlier alpha.1/alpha.2 failures remain historical evidence. New content, fonts, state changes and unvisited browsers still need their own inspection. Browser launch refusal remains unverified; the final local evaluation explicitly supplied available tooling and an operator-selected execution environment that permitted Chromium's sandbox.

## 2. Three actual-client checks remain open

| Follow-up | Scope and evidence needed |
| --- | --- |
| [Claude Code lifecycle #12](https://github.com/ajhcs/Ingenium/issues/12) | Discovery, actual invocation, two edits, upgrade, removal and retained user outputs in an authenticated client |
| [Codex desktop lifecycle #13](https://github.com/ajhcs/Ingenium/issues/13) | Actual desktop discovery and invocation, with exact package identity and complete lifecycle |
| [Chat upload and continuation #14](https://github.com/ajhcs/Ingenium/issues/14) | Actual ChatGPT/Claude chat route, reference access, editable-file handoff and fresh-context continuation |

Codex CLI, package extraction and automated browser checks do not substitute for these routes. The maintained local plugin catalog is also distinct from a public marketplace catalog.

## 3. Font qualification identifies the derivative

All seven selected live-text handoffs now contain exact embedded and separate font bytes, complete notices, editable derivatives and source-specific provenance. Copied standalone derivatives were observed offline with the expected custom font glyph identities. Five preserved originals name Arial without a recorded binary; their explicitly authored derivatives use Liberation Sans. Two preserve their named DejaVu families. Qualification covers `derived.svg`, while the historical original font appearance remains unqualified.

The observed route uses Chromium. Native SVG-editor font handling, print behavior, arbitrary replacement text and user acceptance are separate. Selected artwork is not a native engineering-model binding or an assertion of engineering adequacy.

## Other bounded checks

The local store's flush/rename behavior is qualified on the exercised Linux filesystem, not against physical power loss or every operating system. Ambiguous foreign-process locks require investigation and are not stolen by age. Continuation checks explicit current source/output references; historical versions require their own selected verification.

Inspection executes a deliberately selected trusted local application's scripts; it is not a hostile-page sandbox. Its checks cover visited routes, states and the selected browser, not general accessibility certification or backend behavior. The separate [trusted-study SVG exporter](study-export.md) supports styles, patterns and filters through a selected browser; the strict SVG helper deliberately retains a narrower accepted input set. Neither renderer availability nor a successful export establishes visual adequacy without inspection.

Keep failed attempts and unresolved output-specific findings with their evidence. A repaired follow-up does not change a failed initial evaluation into a first-run pass.
