# Optional local capabilities

Ingenium works as guidance alone, with no runtime or server. Use whatever tools the host actually has for the requested medium, and check that a tool exists before relying on it: a name mentioned in these instructions doesn't make it available.

The standalone skill includes the instructions, references and editable browser examples in `assets/`. Open those HTML files directly. Commands that use `bin/`, `src/` or selected resource packs require the corresponding full checkout or helper package. When those are unavailable, continue with the host's tools or editable source. See the [full repository and setup guide](https://github.com/ajhcs/Ingenium/blob/main/docs/install.md#optional-full-checkout-and-helpers).

When the packaged Node helper is useful, locate the actual installed plugin root, then run:

```sh
node /actual/plugin/root/bin/ingenium.mjs capabilities
node /actual/plugin/root/bin/ingenium.mjs check /path/to/record.json
node /actual/plugin/root/bin/ingenium.mjs render /path/to/study.svg /path/to/preview.png
```

Node 22 or newer is the helper's supported runtime. Sharp is optional. If the installed plugin reports it absent, follow [optional renderer setup](renderer-setup.md): explicitly install Sharp into a user-owned directory, then pass `--renderer-dir` to both capabilities and render. This does not require a development checkout or modification of the plugin cache. Don't install anything during discovery. An explicit `--sharp-module` remains available for advanced existing module locators; use only one selector. Probe the actual renderer, and keep missing or failed rendering unavailable/errored. It does not block prose or editable source work.

The helper does not register this plugin, inspect account access or verify an MCP connection. Check actual client discovery and invocation separately after installation. Existing browser, CAD, image or editor tools need their own appropriate artifact checks. Put generated outputs in a user-selected or private work directory, never the installed package, and clean up temporary renders and background processes you started once they're no longer needed.

**Done when:** you've reported which capabilities the probe found present, absent or errored, and continued with the work those results allow.
