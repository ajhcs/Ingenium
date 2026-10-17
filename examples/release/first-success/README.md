# One editable composition

These are actual outputs from the included Listening Garden example, executed from an isolated installed Ingenium package with Node 22. The optional selected Sharp renderer produced the PNG previews. The source SVGs remained byte-for-byte unchanged by export.

From an installed package root or checkout, select a new output directory:

```sh
node examples/composition/listening-garden.mjs /path/to/new-study
node bin/ingenium.mjs check examples/records/poster.json
node bin/ingenium.mjs render /path/to/new-study/clean.svg /path/to/new-study/preview.png
```

The last command requires an available optional renderer. A copied plugin can use an explicitly installed renderer with `--renderer-dir /path/to/renderer`; see the plugin's renderer setup reference. No account or backend is required for these local helpers. The ordinary creative workflow does not require the helper.

`clean.svg` is the audience view. `guides.svg` exposes its measured companion layout. `layout.json` preserves the example's stated assumptions and open questions. `actual-cli.txt` contains the actual observed check/render commands and their full stdout, using environment variables to avoid publishing local machine paths. The generator command is a reproducible example; the transcript identifies exactly which helper commands it records.

This local helper run is not a desktop-client invocation. Findability, smaller-format readability, aesthetic acceptance and physical use remain unqualified.
