# Known limitations and open verification

The 0.2.0-alpha.2 prerelease retains the following limits, ordered by observed user impact. The [compatibility matrix](compatibility.md) identifies actual tested client routes and release identities.

## 1. Generated narrow layouts still need actual inspection

After the responsive-guidance revision, two of three fresh generated pages still overflowed at 320 CSS pixels with 200% text; the third needed visual review. A subsequent browser-guided repair passed the selected checks while preserving content and interaction. These are separate outcomes, not a first-run reliability pass.

The alpha.2 curated document and recipe fixes repair those specific delivered examples. They do not establish reliable layout for arbitrary generated content. Inspect representative long text, narrow widths, enlarged text and affected keyboard interactions before delivery; preserve the initial failure and the corrected version. Repeated fresh generation and independent visual review remain the highest-priority follow-up in the [roadmap](../ROADMAP.md).

## 2. Three actual-client checks remain open

| Follow-up | Scope and evidence needed |
| --- | --- |
| [Claude Code lifecycle #12](https://github.com/ajhcs/Ingenium/issues/12) | Discovery, actual invocation, two edits, upgrade, removal and retained user outputs in an authenticated client |
| [Codex desktop lifecycle #13](https://github.com/ajhcs/Ingenium/issues/13) | Actual desktop discovery and invocation, with exact package identity and complete lifecycle |
| [Chat upload and continuation #14](https://github.com/ajhcs/Ingenium/issues/14) | Actual ChatGPT/Claude chat route, reference access, editable-file handoff and fresh-context continuation |

Codex CLI, package extraction and automated browser checks do not substitute for these routes. The maintained local plugin catalog is also distinct from a public marketplace catalog.

## 3. Seven CSE selections remain held for font closure

Resource availability, exact source identity, supported edits, rendered glyph identity and qualification are separate fields. Seven font-dependent CSE selections remain unavailable for complete handoff qualification until their font closure is resolved. A catalog entry alone is not a qualified resource. Selected artwork is not a native engineering-model binding or an assertion of engineering adequacy.

## Other bounded checks

The local store's flush/rename behavior is qualified on the exercised Linux filesystem, not against physical power loss or every operating system. Ambiguous foreign-process locks require investigation and are not stolen by age. Continuation checks explicit current source/output references; historical versions require their own selected verification.

Inspection executes a deliberately selected trusted local application's scripts; it is not a hostile-page sandbox. Its checks cover visited routes, states and the selected browser, not general accessibility certification or backend behavior. The separate [trusted-study SVG exporter](study-export.md) supports styles, patterns and filters through a selected browser; the strict SVG helper deliberately retains a narrower accepted input set. Neither renderer availability nor a successful export establishes visual adequacy without inspection.

Keep failed attempts and unresolved output-specific findings with their evidence. A repaired follow-up does not change a failed initial evaluation into a first-run pass.
