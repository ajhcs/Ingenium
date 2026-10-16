# Optional local capabilities

Ingenium can guide creative work without a runtime or server. Use the host's available tools for the requested medium. Never claim a tool is available from its name in these instructions.

When the packaged Node helper is useful, locate the actual installed plugin root, then run:

```sh
node /actual/plugin/root/bin/ingenium.mjs capabilities
node /actual/plugin/root/bin/ingenium.mjs check /path/to/record.json
node /actual/plugin/root/bin/ingenium.mjs render /path/to/study.svg /path/to/preview.png
```

Node 22 or newer is the helper's supported runtime. Sharp is an optional dependency for static PNG rendering. Install the package's declared dependencies in an authorized project environment when needed; never silently install tools during discovery. An explicit `--sharp-module /path/to/sharp/entry.cjs` can select an existing installation. Probe its actual import and renderer versions. A missing or failed renderer must stay unavailable/errored; it does not block prose or editable source work.

The helper does not register this plugin, inspect account access or verify an MCP connection. Check actual client discovery and invocation separately after installation. Existing browser, CAD, image or editor tools need their own appropriate artifact checks. Generated outputs belong in a user-selected or private work directory, not the installed package.
