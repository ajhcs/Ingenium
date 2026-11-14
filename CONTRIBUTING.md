# Contributing to Ingenium

Start with the task and its smallest useful change. Read [the current interfaces](docs/api/index.md) before changing a component boundary. Keep the portable guidance usable without Node, CSE, browser tools, or a project journal. Do not turn a short request into a required form.

For a scoped change:

1. Reproduce the problem with original synthetic input. Record which source bytes, command, client route, and expected behavior matter. Keep private briefs and local evidence under ignored `work/`.
2. Name the files you will own. The integrator owns root manifests, lockfiles, versions, workflow definitions, and release metadata. Parallel workers agree on interfaces before dependent edits and do not edit another lane.
3. Implement the smallest complete behavior. Preserve supplied wording, source files, chosen decisions, and unavailable-tool statuses. Keep optional tool imports and installation optional. A selected record or test pass never implies acceptance.
4. Run `npm test` with Node 22+ and Python 3. This runs the Node suite and dependency-free Python checks, and fails if either fails. Temporary files default to the repository's ignored `work/tmp`; an explicitly selected `INGENIUM_TEST_TMPDIR` or `TMPDIR` takes precedence. Targeted runs are useful while editing; the combined command is required before review.
5. For changed browser inspection behavior, use an explicitly selected existing Playwright/axe installation and Chromium. The [inspection contract](docs/api/inspection.md) describes the boundary; the [CI workflow](.github/workflows/inspection-checks.yml) shows the corresponding development-only adapter setup. Missing optional checks are reported as skips, never passed.
6. Inspect actual exports. Open the editable source and requested export, make a second narrow edit, and follow the included local references in a separate directory. Check keyboard and narrow-layout behavior for affected interactive pages. Source hashes and test counts do not substitute for those observations.
7. Have an independent reviewer challenge the change and its failure cases. Retain failed attempts and unresolved limits. Review the complete diff, source notices, examples, and package contents before a non-force push or draft PR. Implementation does not authorize merge, publication, installation into a user's client, or deployment.

Example: for a label-only SVG revision, retain the original file, change only the label's authorized treatment, compare wording and relationship identities, render the result with an explicitly selected renderer, and reopen the delivered source for another edit. A passing XML parse alone does not close the task.

Native font/vector checks are separate: use the explicitly selected Python environment with `tools/font-vector/requirements-linux-py312.lock`, run `tests/font_vector_test.py`, and provide `INGENIUM_FONT_VECTOR_PYTHON` for the Node adapter tests. Do not install a native baseline as a side effect of ordinary tests. Browser CI uses its own locked development-only directory; these dependencies are not part of the guidance or helper runtime.

On BuilderBob, retain all temporary files and package caches on the verified `/workspace` volume. For direct browser commands, select a short existing workspace `TMPDIR` to avoid Chromium's Unix-socket path limit; do not fall back to the Intel root volume. Preserve native Codex state in its existing location. Use an explicitly selected workspace npm cache for development installs.

New fixtures must be original synthetic work or retain exact distribution permission and full notices. Do not commit credentials, customer material, source PDFs, annotations, temporary captures, or private client transcripts. Report actual client invocation separately from extracted-file or package installation checks.
