# Install Ingenium

Download the [0.2.0-alpha.3 guidance ZIP](https://github.com/ajhcs/Ingenium/releases/download/v0.2.0-alpha.3/ingenium-guidance-0.2.0-alpha.3.zip) from the [release](https://github.com/ajhcs/Ingenium/releases/tag/v0.2.0-alpha.3). It contains creative instructions, supporting references and an original editable responsive HTML starter. Preserve the `assets/` directory when copying it. Your client supplies its model and tools; Ingenium requires no server, API key or renderer. The [downloads page](https://ajhcs.github.io/Ingenium/downloads/) explains the separate optional helpers, resource packs and editable studies.

The release includes `artifacts.json` and `SHA256SUMS` for checking archive identity. `ingenium/RELEASE.md` inside the guidance ZIP records its version, source commit and build. Keep the complete folder, including references and notices.

## Codex CLI or desktop: project-local skill

1. Extract the guidance ZIP using your file manager. Its top-level folder is `ingenium`.
2. In your chosen project, create `.agents/skills/` and place the complete `ingenium` folder inside it. The entry point is `.agents/skills/ingenium/SKILL.md`. Preserve any existing copy and local edits before replacing it.
3. Open a fresh Codex conversation in that project. Confirm Ingenium appears in the skill picker, then send `$ingenium` with [a first brief](quickstart.md).

If it does not appear, check that exact path, reopen the project and restart the client. Check which source the picker shows if another Ingenium skill is installed. This route requires no Node installation. It is project-local, so other projects do not inherit it. See OpenAI's [local skill locations](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills).

The manual project-local route has been exercised in Codex CLI 0.169.0. The desktop lifecycle remains [tracked separately in issue 13](https://github.com/ajhcs/Ingenium/issues/13); see the [observed compatibility record](compatibility.md).

### Optional source installer

With Node/npm, the third-party [Vercel skills installer](https://github.com/vercel-labs/skills) is another route:

```sh
npx skills@1.7.2 add ajhcs/Ingenium --skill ingenium --agent codex
```

Run it in the target project, review the selected skill and scope, and preserve existing edits. It selects repository source at invocation, so its bytes can differ from the versioned release ZIP. It does not install the optional helper package. The observed manual lifecycle does not establish this installer's complete client lifecycle.

### Plugin marketplaces

Root `plugin.json` is the portable OpenAI manifest. A marketplace command needs a catalog; this repository does not publish one. The maintained BuilderBob installation uses a separate local catalog and has its own [observed installation record](compatibility.md). That installation does not make a public marketplace route available to other users. Use the guidance ZIP above, or follow [OpenAI's marketplace instructions](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli) with an explicitly selected catalog.

## Claude Code

Extract the same guidance ZIP and place its complete `ingenium` folder under `.claude/skills/` in your chosen project. Start a fresh Claude Code session, check `/skills`, and invoke `/ingenium` with your brief. The entry point should be `.claude/skills/ingenium/SKILL.md`.

The optional third-party source installer is:

```sh
npx skills@1.7.2 add ajhcs/Ingenium --skill ingenium --agent claude-code
```

If it creates a symlink to a shared `.agents/skills/ingenium` copy, keep both. Inspect paths and organization policy if discovery fails, and avoid a second copy with the same name. See [Anthropic's project skill instructions](https://code.claude.com/docs/en/skills). An authenticated Claude Code lifecycle is unavailable here and remains [issue 12](https://github.com/ajhcs/Ingenium/issues/12).

## ChatGPT and Claude chat

For an ordinary conversation, paste the instruction text from `ingenium/SKILL.md` and add your brief. Attach any named reference files the task needs. Ask for editable downloadable files when the client can create them; otherwise retain the source text and treat its visual review as pending. Pasting instructions does not create persistent skill discovery, and linking a repository does not establish that the chat read it.

Where your account offers custom Skills, upload the complete guidance ZIP through its skill-management interface, enable it, start a fresh conversation and confirm it loads. Account eligibility and interface details are controlled by the client: see [ChatGPT Skills](https://help.openai.com/en/articles/20001066-skills-in-chatgpt), [Claude Skills](https://support.claude.com/en/articles/12512180-use-skills-in-claude), and [Claude's custom ZIP structure](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills). Actual chat upload, file access and later continuation remain [issue 14](https://github.com/ajhcs/Ingenium/issues/14).

## Update or remove

For a manual copy, preserve your existing Ingenium folder and local edits. Download the desired release ZIP, verify its identity, and replace only the folder you installed. Open a fresh session and check the loaded source. To remove it, remove that folder or symlink only; retain files you created during your studies. A retained checkout can also be symlinked deliberately, but updating that checkout changes the linked instructions.

For the source installer, run from the same project:

```sh
npx skills@1.7.2 update ingenium --project
npx skills@1.7.2 remove ingenium
```

Review scope before running either command. In our installer 1.7.2 check, agent-filtered removal reported success while leaving the shared `.agents/skills/ingenium` folder discoverable. Skill-name removal cleared the tested installation. If you share a skill across clients, inspect remaining paths before assuming one client's access has ended. See the [upstream lifecycle commands](https://github.com/vercel-labs/skills#other-commands).

For chat uploads, replace or disable the uploaded skill in that client's management screen. For pasted guidance, start a new conversation with the new text. Updating one route does not update other copies.

## Optional released helpers

Use these only when your task needs their capabilities. Guidance does not contain the helper runtime, resource data or example generators. The release supplies [core-tools-0.2.0-alpha.3.tgz](https://github.com/ajhcs/Ingenium/releases/download/v0.2.0-alpha.3/core-tools-0.2.0-alpha.3.tgz) for continuation, records, resources and delivery, and [inspection-tools-0.2.0-alpha.3.tgz](https://github.com/ajhcs/Ingenium/releases/download/v0.2.0-alpha.3/inspection-tools-0.2.0-alpha.3.tgz) for scoped browser inspection. No npm registry publication is claimed.

After downloading and verifying an archive, use Node 22+ and npm in a selected consumer directory:

```sh
npm install --prefix /path/to/consumer --offline --ignore-scripts --omit=optional /absolute/path/to/core-tools-0.2.0-alpha.3.tgz
/path/to/consumer/node_modules/.bin/ingenium version --json
```

For the separate inspection archive, use the same installation pattern and run `ingenium-tools version --json`. Version output identifies the installed artifact. Browser, SVG and native font adapters are separate explicit selections; helper installation does not register the guidance with a client. See the [user guide](user-guide.md#prepared-node-helpers) and [tool setup](tools.md).

Resource ZIPs overlay the matching core helper root (`CONSUMER/node_modules/@ajhcs/ingenium`); their separate identities live under `release/packs/` and must not replace the core identity. Extract editable study ZIPs into their own new directories and follow the included `OPENING.md`. Missing optional tools leave source and guidance usable.

Developers can prepare archives from a checkout. Dirty source requires explicit development mode and carries a development identity. A local preparation is distinct from the published, versioned release above.
