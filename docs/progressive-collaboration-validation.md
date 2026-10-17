# Progressive collaboration refinement: bounded evidence

This record concerns a focused instruction change after main `6dcf094a250c636f89b529ae1271f331c97b0d04`. It is a source-loaded exercise with original fictional route-card content, not an installed-client test or a new preferred-release declaration. The earlier [onboarding validation](onboarding-validation.md) describes its own historical change; its unchanged-entrypoint observation does not apply to this later refinement.

## Instruction change

Baseline `SKILL.md` SHA256: `e63bd71dada2804fb589d20266f2e3b0d3a47d856d745aa3fcc31b2bde65e0fb`.

Refined `SKILL.md` SHA256: `d342b1e31a86294bad4ae9d7bf23ed7fe1bdd37aeb1f2865ba6a9c147fa17254`.

One paragraph adds conditional visual probing for people who want to discover a look together: use their content, narrow the next unresolved choice, hold other dimensions steady and pause before committing a preference requiring their input. Colors, type, shapes and style remain possible entry points rather than a fixed sequence. Narrow edits and explicit autonomy retain their requested pace.

The existing phrase “When alternatives help” becomes “When comparing overall directions,” preserving the organizing-idea guidance while allowing a focused palette or type comparison. The rest of the V3 entrypoint, its frontmatter and all references remain unchanged. The complete before/after diff is retained in Git and the refinement PR:

```sh
git diff 6dcf094a250c636f89b529ae1271f331c97b0d04 HEAD -- skills/ingenium/SKILL.md
```

## Paired exercise

Two fresh agents received separate full skill snapshots and the same original request, without the proposed change, suspected issue or intended outcome in their task prompts. Both used the inherited model configuration without an override. Each received the same fixed follow-up after its initial response, then separate narrow-edit and autonomous requests. These were sequential cases within each agent, not independent fresh contexts for every case. Agents could use an already installed renderer; they could not browse, install tools, use outside references or inspect the other exercise.

| Request | Baseline observation | Candidate observation |
| --- | --- | --- |
| Collaborative, no design vocabulary | Made two concrete direction studies varying organization, palette and lettering; asked for a reaction | Made three palette samples holding card layout and lettering steady; asked for a reaction |
| Fixed palette choice, lettering unresolved | Kept its working connected map and palette, showed lettering alternatives, asked for a reaction | Kept the palette sample's exact map geometry and colors, varied font family, asked for a reaction |
| Settled heading-size edit | Changed only the requested `40` to `34`; delivered without another preference round | Same exact byte change; delivered without another preference round |
| Explicit autonomy, one file now | Delivered one editable SVG without a question or approval round | Delivered one editable SVG without a question or approval round |

The [retained editable examples](../examples/progressive-collaboration/README.md) let a reviewer inspect those observations. Both baseline and candidate followed the broad collaborative request; this run does not demonstrate a baseline failure or establish a causal improvement. The candidate's initial isolation of color is consistent with the requested refinement. No broader preference or acceptance was inferred from a synthetic color selection.

## Checks and boundaries

Five executable checks validate the retained artifacts: palette comparisons preserve non-color attributes, lettering comparisons preserve geometry/colors/content, the selected palette sample survives into the lettering probe, both settled edits change only the requested bytes, and all retained SVG cards preserve visible stop names and leg durations. These checks do not rerun a model or judge design quality. Run them from a full source checkout with Node 22+; the optional Skill Creator validator needs its own available skill path:

```sh
python3 tests/progressive_artifacts_test.py
python3 tests/skill_bundle_test.py
python3 /path/to/skill-creator/scripts/quick_validate.py skills/ingenium
node tests/package.test.mjs
node tests/composition.test.mjs
```

The two bundle tests, six named Node checks and skill metadata validator pass. The current guidance ZIP is rebuilt from the refined skill; its references, license and dependency-free guidance boundary are unchanged. The immutable v0.1.0 tarball remains separate and unchanged.

The integrator checked original-input and first-step-output preservation, parsed all ten retained output SVGs, and inspected the palette, lettering, baseline-direction and autonomous previews. A separate sandboxed headless Chromium session opened those ten SVGs with external requests blocked: all measured text bounds fit their canvases and no page errors were observed. This does not establish complete accessibility or font portability. Only fictional inputs and original generated artwork are published. Private agent receipts and local paths remain outside Git.

Limits: one run per version and case; model variation and sequential context; no actual Codex/Claude discovery or chat upload; no representative-user, taste, full accessibility, engineering or print acceptance. Shape/style probes were instruction-reviewed but not separately forward-tested. Exact fallback font identity and cross-device rendering remain unqualified. The palette-to-lettering sequence and observed sample counts illustrate this exercise and do not define a universal process. This change authorizes no tool installation, external publication, merge or deployment on its own.
