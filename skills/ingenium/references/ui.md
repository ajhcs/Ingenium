# Optional small UI components

This library selects small components only. Full sites, page designs and template libraries remain out of scope. `src/ui/index.mjs` has no network, framework, server, install or import-time I/O. It uses original native HTML/JavaScript wrappers and imports the exact Bulma 1.0.4 stylesheet as data. It does not claim upstream authored the wrappers, behavior or sparse preview shell.

Bulma is a CSS library with upstream MIT code licensing; its website prose has a separate license and is not copied. Official sources: [overview](https://bulma.io/documentation/start/overview/), [1.0.4 release](https://github.com/jgthms/bulma/releases/tag/1.0.4). Bulma was selected over discontinued Pico CSS. This is one supported source with three concrete wrappers, not a broad component registry.

## Entry points

```js
import { createUiLibrary } from './src/ui/index.mjs';
const ui = createUiLibrary({ packageDir: '/absolute/local/bulma-package' });
ui.discover({ query: 'dialog' }); // metadata-first, works with no acquired package
ui.inspect({ id: 'dialog' }); // exact source, rights, hashes, controls and authorship
const selection = ui.select({ id: 'dialog' });
await ui.capabilities(); // local, acquisition-required, or error
const edited = ui.customize(selection, {
  label: 'Review choice', hue: 210, radius: 12, size: 'large', theme: 'light'
});
ui.render(edited); // pure source generation: html, fragment, css, script and source
await ui.acquire({ selection, outputDir: '/absolute/new/directory', controls: edited.controls });
```

Standalone exports are `discover`, `inspect`, `select`, `customize`, `render` and `createUiLibrary`. No hardcoded machine path is shipped. The caller explicitly supplies a canonical local package root and a new output directory under an existing canonical parent. Existing output refuses; source bytes are never overwritten. The local source must contain exact matching `package.json`, `LICENSE`, and `css/bulma.min.css`; all three SHA256 values are pinned in the module. No package code is imported. Each file is bounded at 800,000 bytes.

## Source acquisition and provenance

Acquire only `bulma@1.0.4` from the official npm registry under the applicable tool/network approvals. Official exact tarball is `https://registry.npmjs.org/bulma/-/bulma-1.0.4.tgz`; SHA512 SRI is:

```
sha512-Ffb6YGXDiZYX3cqvSbHWqQ8+LkX6tVoTcZuVB3lm93sbAVXlO0D6QlOTMnV6g18gILpAXqkG2z9hf9z4hCjz2g==
```

Read the archive as data with scripts disabled, verify SRI before extracting selected files, and retain a separate acquisition receipt. Do not run a package entrypoint, copy all Sass sources, or treat metadata alone as acquired component proof. This helper deliberately does not implement downloading; `capabilities()` says acquisition-required until the pinned local files exist. Its local hash check proves byte identity, not a new registry request or signature attestation. No retries or policy changes occur.

`acquire` exports separate editable `source.json`, `component.html`, `custom.css`, `behavior.js`, a clean `preview.html`, unchanged `upstream.css`, complete `LICENSE.bulma.txt`, and hash-bound `provenance.json`. Keep the MIT notice with copies and derived delivery. `preview.html` references these local siblings, includes a no-network CSP, and can be opened locally; it is a component test shell, not a page design export. Modify `source.json` and pass it to `render` to regenerate; direct manual edits to generated HTML/CSS remain possible but are outside its recorded generation identity.

## Semantics and controls

- `button`: native button, Enter/Space activation, live saved count.
- `input`: native labelled required text input, description, native refusal for empty values, Enter submission and live saved result. Submitted text enters `textContent`.
- `dialog`: native modal dialog, named heading, Cancel autofocus, authored Tab loop, Escape, return focus and explicit confirm/cancel result. This small loop assumes its two enabled buttons; arbitrary injected dialog children are unsupported.

Controls are plain label (1..100 characters), hue (integer 0..359), radius (integer 0..24 pixels), small/normal/large size, and light/dark theme. Labels are escaped; unknown controls refuse. CSS overrides use Bulma variables. The upstream CSS is retained unchanged (677,931 bytes), so unused upstream styles remain present; this is not a modular CSS build or huge library installation. No remote stylesheet, icon, font, dynamic code or user HTML import is accepted.

Keyboard/browser checks establish those scoped interactions only. They do not establish universal accessibility, taste, design acceptance, assistive-technology compatibility or engineering adequacy. Chromium desktop is qualified in private receipts; other engines, arbitrary edited HTML and installed-client routing remain untested. Source acquisition is optional; users without local files can inspect metadata but cannot claim rendered Bulma output.
