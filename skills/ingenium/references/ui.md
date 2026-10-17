# Small native UI components

Choose a component for the current interaction; do not turn a component request into a page/template build. The main route has 26 Ingenium-authored recipes styled with pinned DaisyUI 5.7.50 CSS. A separate optional Bulma route retains six wrappers. Upstream CSS and notices remain exact; recipe categories, tags, markup and behavior are authored here.

## Atomic recipes

Open the installed source with `openResourceLibrary({id:'atomic-ui'})` from `src/resources/index.mjs`. For a separately supplied distribution, use `createAtomicUiLibrary({packageDir})` from `src/ui/atomic.mjs` (also exported by `src/ui/index.mjs`). Discovery needs no source probing; inspection/export verifies exact selected CSS and full MIT notice. The installed package bundles the selected CSS, not the whole distribution or upstream JavaScript/Tailwind runtime.

| Authored category | Recipes |
| --- | --- |
| Actions | button, disclosure, dropdown |
| Forms | input, textarea, select, checkbox, radio, toggle, range, file-input, fieldset |
| Feedback | alert, progress, loading, skeleton, status, badge |
| Data | avatar, table, kbd, stat |
| Navigation | breadcrumbs, menu, pagination |
| Layout | divider |

```js
import { openResourceLibrary } from './src/resources/index.mjs';
const atoms = await openResourceLibrary({id:'atomic-ui'});
const page = atoms.discover({category:'Forms', query:'choice', limit:4});
const detail = await atoms.inspect({id:'select', theme:'light'});
const source = atoms.select({id:'select'});
const edited = atoms.customize(source, {
  label:'Review stage', description:'Choose a next step.',
  items:['Draft','Review','Ready'], activeIndex:1,
  theme:'dark', size:'large', tone:'primary',
});
await atoms.acquire({selection:edited, outputDir:'/existing-parent/new-select'});
```

`search` aliases `discover`: query up to 128 characters, optional exact category, up to four exact tags, offset and limit 1..32 (default 12). Results include `nextOffset`; use another page only if needed. `navigate({id})` gives neighboring/related recipe IDs, not application routing or taste ranking. `capabilities()` probes the pinned local source. `inspect({id,theme?})` exposes supported controls and source/rights evidence. `preview({selection})` returns selected HTML/CSS/JS and source evidence; it does not open a browser. `acquire` writes a new output.

Use each recipe's actual controls from inspection. Shared controls where supported include plain label, description, light/dark theme, small/medium/large size, and neutral/primary/success/warning/error tone. Selected recipes additionally support disabled/checked, 2..8 distinct items and activeIndex, or value 0..100 (integer for range). Unsupported controls, arbitrary HTML/CSS/URLs and unknown versions refuse. `customize` copies the record and retains previous controls.

Exports keep exact required CSS as `original-N.css`, authored local imports in `upstream.css`, separate `custom.css`, `behavior.js`, `component.html`, `preview.html`, editable `source.json`, full `LICENSE.daisyui.txt` and `provenance.json`. Only the common base, selected theme and required component styles are copied. Reuse the serialized selection to regenerate into a new directory; manual HTML/CSS edits need their own recorded identity.

For an explicit local package, CLI config is `{"packageDir":"relative/daisyui-package"}`, resolved relative to that config file:

```sh
node bin/ingenium.mjs atomic discover atomic-config.json query.json
node bin/ingenium.mjs atomic inspect atomic-config.json query.json
node bin/ingenium.mjs atomic acquire atomic-config.json selection.json ./new-component
```

Discovery query: `{"category":"Forms","limit":4}`; inspection query: `{"id":"select","theme":"light"}`. Selection shorthand: `{"id":"select","controls":{"label":"Review stage","theme":"dark"}}`. Use separate query files for the different operations.

Native controls supply their stated keyboard behavior. File input reports a filename without reading/uploading content; menu uses native action buttons; pagination changes local state without fetching; breadcrumbs target a local fragment. Avatar uses initials. Static recipes do not supply asynchronous product state. Fixed proof IDs require reconciliation when composing multiple instances.

Inspect the requested component's real exported preview, relevant keyboard/focus journey, narrow viewport, text and computed colors. Loading's upstream animated SVG mask is outside static-icon SVG admission; reduced-motion hides it while preserving status text, and stops skeleton animation. Modern CSS support and native select behavior vary by browser. All 26 recipes previously received bounded light/dark Chromium checks; new compositions, other engines and complete accessibility remain separate. Tests and generated CSS do not establish user acceptance.

## Optional Bulma wrappers

Use `createUiLibrary({packageDir})` from `src/ui/index.mjs` with an explicitly supplied Bulma 1.0.4 package. Its exact `package.json`, full MIT `LICENSE` and `css/bulma.min.css` are pinned. No download or source-code execution occurs. Missing files report acquisition-required.

Methods: `discover({query})`, `inspect({id})`, `select({id})`, `customize(selection,controls)`, `render(selection)`, async `capabilities()`, and `acquire({selection,controls?,outputDir})`. IDs: button, input, select, notification, tabs, dialog. Shared controls: label, hue 0..359, radius 0..24, size small/normal/large, theme light/dark. Select/tabs add 2..6 options and activeIndex; notification adds message. Inspect per-component behavior and final colors after hue changes.

CLI uses `ui`: `discover CONFIG [QUERY]`, `inspect CONFIG QUERY.json`, `acquire CONFIG SELECTION.json NEW_OUTPUT_DIR`. Config is `{"packageDir":"relative/bulma-package"}`; query `{"id":"dialog"}`; selection `{"id":"dialog","controls":{"label":"Review choice"}}`. Outputs retain the entire unchanged stylesheet, separate authored HTML/CSS/JS, source record, preview, full notice and hashes. This route's six wrappers do not imply support for all upstream classes.
