# Install Ingenium

Choose the client you use. The standalone skill contains creative guidance and supporting references; your client provides its model and tools. No Ingenium server, API key or renderer is required. Optional helpers use a separate full checkout.

| Client | Install | Invoke |
| --- | --- | --- |
| Codex app / CLI | Project-local `.agents/skills/ingenium` | `$ingenium` |
| Claude Code | Project-local `.claude/skills/ingenium` | `/ingenium` |
| ChatGPT | Paste instructions, or upload when your workspace supports Skills | Ask “Use Ingenium” |
| Claude chat | Upload the guidance ZIP in Customize → Skills | Enable it, then ask “Use Ingenium” |

## Codex app or CLI

Open a terminal in the project you want Codex to work on:

```sh
npx skills@1.7.2 add ajhcs/Ingenium --skill ingenium --agent codex
```

This uses the third-party [Vercel skills installer](https://github.com/vercel-labs/skills), requires Node/npm and installs into this project by default. Confirm the selected skill and project scope. Review any replacement prompt if Ingenium is already installed. It does not install the optional Ingenium helper package.

Open a fresh Codex conversation **in that project**. Confirm Ingenium appears in the skill picker and send `$ingenium` followed by [the first brief](quickstart.md#ask-for-a-useful-result). If it does not appear, check `.agents/skills/ingenium/SKILL.md`, reopen the project and restart the client. Check which source the picker shows if another Ingenium skill is already installed.

This follows OpenAI's [local skill locations and symlink support](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills). The app and CLI share this project-local skill route; installation in one project does not make it available in all projects.

### Plugin marketplaces are separate

Root `plugin.json` remains Ingenium's portable OpenAI manifest. The documented `codex plugin marketplace add owner/repo` command adds a **catalog**; it is not a universal plugin-install command. This repository currently provides no marketplace catalog. Use the skill route above. See [OpenAI plugin authoring and marketplace instructions](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli) for that separate mechanism.

## Claude Code

Run in your target project:

```sh
npx skills@1.7.2 add ajhcs/Ingenium --skill ingenium --agent claude-code
```

Check the installer summary, then start Claude Code in that project. Check `/skills` and invoke `/ingenium` with your brief. Confirm `.claude/skills/ingenium/SKILL.md` exists. If the installer uses a symlink to a canonical `.agents/skills/ingenium` copy, keep both. If it is absent, check those paths, restart Claude Code and inspect any organization policy restricting project skills. Avoid installing a second copy under the same name.

See Anthropic's [project skill locations, invocation and supporting files](https://code.claude.com/docs/en/skills). A standalone skill uses `/ingenium`, without a plugin namespace.

## Manual install without Node

[Download ingenium-skill.zip](https://github.com/ajhcs/Ingenium/raw/refs/heads/main/site/assets/downloads/ingenium-skill.zip). Extract it: the top-level folder is `ingenium`, containing `SKILL.md`, `references/` and `LICENSE`.

In your target project, create `.agents/skills/` for Codex or `.claude/skills/` for Claude Code. Move the complete `ingenium` folder into it. If that destination already exists, preserve it and inspect which version you have before replacing anything. Open a fresh client conversation and verify discovery as above. This works through your file manager and needs no terminal installer.

Alternatively, copy `skills/ingenium/` from a retained full checkout, or symlink that directory into the same project-local location. Keep the checkout available if you use a symlink. Never copy just `SKILL.md`: the references belong with it.

## ChatGPT

### Start in an ordinary conversation

Open [SKILL.md](../skills/ingenium/SKILL.md), copy its instruction text into the conversation and add your brief. Ask ChatGPT to follow those instructions for this conversation. If it needs a named reference, attach that Markdown file from the [guidance ZIP](https://github.com/ajhcs/Ingenium/raw/refs/heads/main/site/assets/downloads/ingenium-skill.zip). Ask for downloadable editable files when file creation is available; otherwise retain the source text yourself and treat visual review as pending.

This route does not require a custom Skills menu and does not create persistent discovery. Merely linking a GitHub repository does not guarantee the chat has read its files.

### Workspaces with Skills enabled

OpenAI currently lists eligible **Business, Enterprise, Healthcare and Edu** users, subject to workspace settings and availability. Do not assume a personal Pro subscription includes custom skill upload. If the UI is available, go to **Plugins → Skills → Create → Upload from your computer**, select the guidance ZIP and complete any product review. Start a new conversation, ask to use Ingenium and confirm it actually loads.

See OpenAI's [current Skills eligibility, upload and management guide](https://help.openai.com/en/articles/20001066-skills-in-chatgpt). Account availability and actual upload have not been tested by this repository. Installing a local Codex skill does not establish that it is available in ChatGPT.

## Claude chat

1. [Download the guidance ZIP](https://github.com/ajhcs/Ingenium/raw/refs/heads/main/site/assets/downloads/ingenium-skill.zip). Keep it zipped for upload.
2. Enable **Code execution and file creation** in **Settings → Capabilities**, subject to organization settings.
3. Open **Customize → Skills → + → Create skill → Upload a skill** and select the ZIP.
4. Enable Ingenium, start a fresh chat and say “Use Ingenium” with your brief. Confirm Claude loads it and open the actual files it produces.

Anthropic currently lists Skills for Free, Pro, Max, Team and Enterprise, with code execution enabled. See [Claude Skills setup](https://support.claude.com/en/articles/12512180-use-skills-in-claude) and [custom-skill ZIP structure](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills). Our ZIP contains `ingenium/SKILL.md` and all its guidance references. Optional full-repository code is linked online and is not bundled. Actual account upload remains untested here.

## Update or remove

For the terminal installer, run from the **same project**:

```sh
# Review updates for this project's Ingenium skill only.
npx skills@1.7.2 update ingenium --project
# Remove this project's Ingenium skill from its agent locations:
npx skills@1.7.2 remove ingenium
```

These are the installer's documented commands; do not add `--global` unless you intentionally manage a user-wide installation. Preserve local edits before updating. See [upstream scope and lifecycle options](https://github.com/vercel-labs/skills#other-commands).

Use the skill-name removal above when retiring Ingenium from the project. In our `1.7.2` check, an agent-filtered Codex removal reported success but retained the shared `.agents/skills/ingenium` folder, which Codex can still discover. Removing by skill name cleared the tested installation. If you share Ingenium with multiple agents and want to remove only one agent's access, inspect the remaining paths instead of assuming a successful message makes it unavailable.

For manual copies, preserve your current copy, download the new ZIP and replace only the Ingenium folder you installed. To remove it, remove that folder or symlink only. For symlinks, update the retained checkout deliberately; removing the link leaves the checkout intact.

For chat uploads, use the client's skill management screen to replace or disable your uploaded skill; uploading a new ZIP does not update existing copies elsewhere. For pasted guidance, start a new conversation with the new instructions. These operations do not remove files you created during a study.

## Optional full checkout and helpers

The guidance ZIP and `skills add` do **not** include `bin/`, `src/`, resource data, example generators or their dependencies. To use those separately:

```sh
git clone https://github.com/ajhcs/Ingenium.git
cd Ingenium
# Node 22+:
npm ci --ignore-scripts
node bin/ingenium.mjs capabilities
```

Then follow [editable example generation](quickstart.md#optional-make-an-editable-result-locally), [renderer setup](../skills/ingenium/references/renderer-setup.md) or [local helper tarballs](user-guide.md#local-tarball-for-node-helpers). Locate the actual full checkout when a reference shows `/actual/plugin/root/`; never infer that a standalone skill's folder contains these tools.

The immutable [0.1.0 preview release](https://github.com/ajhcs/Ingenium/releases/tag/v0.1.0) contains the earlier reviewed full package. Its archive is separate from the current guidance ZIP and has not been replaced by this onboarding update. No npm registry publication is required or claimed.
