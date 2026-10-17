# Onboarding review and validation

Reviewed 17 October 2026. This is a source and packaging review with bounded local exercises. It is not a usability study with representative users or a test of account-specific client interfaces.

## What the README comparison changed

| Repository reviewed | Useful user-facing pattern | Applied to Ingenium |
| --- | --- | --- |
| [Impeccable](https://github.com/pbakaus/impeccable#installation) | Clear setup choices, invocation and update instructions | Put project-local installation and the first invocation together |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill#installation) | Explicit agent targets, prerequisites and example requests | Separate Codex, Claude Code and chat clients; distinguish installer requirements from the guidance |
| [Interface Design](https://github.com/Dammyjay93/interface-design#installation) | Concrete benefit, agent notes, manual fallback and continuity | Lead with editable results; show a first brief followed by a scoped revision |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill#install) | Distinguish standalone skill installation from a namespaced plugin | Document the standalone route and keep full helpers separate |

These observations concern the published READMEs, not independent qualification of those products. Their commands and claims were not adopted as Ingenium compatibility evidence.

Ingenium previously asked users to find their client's documented local-source route after cloning. It now provides project-local commands, exact invocation, a manual route, a guidance ZIP and explicit chat-specific instructions. The opening leads with the editable result and real studies. Development tranche terminology and detailed check limitations remain in the [validation documentation](validation.md) and [release validation](v3-release-validation.md).

## Evidence and limits

| Check | Result and scope |
| --- | --- |
| Public-source installation | Vercel `skills@1.7.2` installed `ajhcs/Ingenium --skill ingenium` for `codex` and `claude-code` in two isolated projects. Each installed 27 Markdown files; the entrypoint matched the candidate. No client conversation was launched. |
| Candidate installation | The same pinned installer copied the candidate from a local source into separate Codex and Claude Code projects. All 28 files, including the MIT license, matched; all local Markdown file links resolved outside the developer checkout. |
| Project lifecycle | Explicit `update ingenium --project --yes` reported both installs current; skill-name `remove ingenium --yes` cleared separate disposable copies. A changed-source upgrade was not exercised. Agent-filtered Codex removal retained the canonical folder despite a success message; the guide uses the removal that actually cleared it. |
| Standalone guidance ZIP | 28 files: unchanged `ingenium/SKILL.md`, 26 references and MIT license. No helper runtime, dependencies, resource data, private material or examples. Extraction, local references, repeatable bytes and refusal to overwrite an existing output checked with `python3 tests/skill_bundle_test.py`. |
| Creative behavior | `SKILL.md` and `composition-concepts.md` remain byte-for-byte unchanged. Three optional-tool references clarify helper availability or replace checkout-relative code links with public links; conceptual composition guidance is unchanged. |
| First useful result and continuation | A separate agent read the installed standalone skill and conceptual composition reference, created two original editable SVG posters, then saved a title-font-only revision. Root parsed all three SVGs, independently confirmed the single changed attribute and all seven predecessor hashes/mtimes, and inspected the first/revised previews. No helper runtime or external references were used. This is a bounded exercise, not actual client invocation or user acceptance. |
| Node checks | Six named package/composition checks pass when running `node tests/package.test.mjs` and `node tests/composition.test.mjs` under Node 22. |
| Staged site | Setup section checked in sandboxed headless Chromium at 1440, 768, 390 and 320 pixels without horizontal overflow. Guidance ZIP download matched source bytes; prompt copy worked; selected axe A/AA rules reported zero violations. This is local staging, not a new production deployment. |
| Full helper package | The separately published immutable 0.1.0 tarball was installed and rendered two original SVG examples with optional Sharp. This earlier qualification does not mean helpers are included in the standalone skill. |
| Actual client discovery | **Unverified.** `clientDiscoveryInvoked: false`, `desktopDiscoveryVerified: false`. Filesystem placement and successful source exercises do not prove Codex app/CLI or Claude Code discovered and invoked the skill. |
| Chat upload | **Unverified.** ZIP structure and official instructions checked; no ChatGPT or Claude account upload or entitlement test performed. |

The installer tests confined caches, temporary files and installer state to disposable work directories, with telemetry disabled. Native `HOME` and `CODEX_HOME` were not redirected. No global client installation was requested.

## Official platform sources

The [setup guide](install.md) cites current primary sources for [OpenAI local skills](https://learn.chatgpt.com/docs/build-skills), [OpenAI plugin catalogs](https://developers.openai.com/plugins/build/plugins), [ChatGPT Skills availability](https://help.openai.com/en/articles/20001066-skills-in-chatgpt), [Claude Code skills](https://code.claude.com/docs/en/skills), [Claude chat setup](https://support.claude.com/en/articles/12512180-use-skills-in-claude) and [Claude ZIP packaging](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills). UI names and account availability can change; the client's current settings control access.

## Rebuild the guidance ZIP

From a full checkout, with Python 3 and a new output filename:

```sh
python3 tools/build-skill-zip.py /path/to/new/ingenium-skill.zip
python3 tests/skill_bundle_test.py
```

The parent output directory must exist. The builder uses Python's standard library and never installs or deploys anything. Replacing a distributed ZIP is a separate integrator action after checking its contents. The 0.1.0 release archive remains unchanged.
