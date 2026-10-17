# Optional small UI components

This library selects small components only. Full sites, page designs and template libraries remain out of scope. `src/ui/index.mjs` has no network, framework, server, install or import-time I/O. It uses original native HTML/JavaScript wrappers and imports the exact Bulma 1.0.4 stylesheet as data. It does not claim upstream authored the wrappers, behavior or sparse preview shell.

Bulma is a CSS library with upstream MIT code licensing; its website prose has a separate license and is not copied. Official sources: [overview](https://bulma.io/documentation/start/overview/), [1.0.4 release](https://github.com/jgthms/bulma/releases/tag/1.0.4). This is one supported source with six concrete wrappers, not a broad component registry.

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
- `select`: labelled native select,2..6 explicit options, selected index and keyboard form submission with live result.
- `notification`: named status content, editable message and native dismiss button; dismissal moves focus to the separate result.
- `tabs`:2..6 named panels, one roving tab stop, automatic ArrowLeft/ArrowRight/Home/End activation, selected-state/hidden-panel synchronization and focusable active panel.
- `dialog`: native modal dialog, named heading, Cancel autofocus, authored Tab loop, Escape, return focus and explicit confirm/cancel result. This small loop assumes its two enabled buttons; arbitrary injected dialog children are unsupported.

Controls are plain label (1..100 characters), hue (integer 0..359), radius (integer 0..24 pixels), small/normal/large size, and light/dark theme. Labels are escaped; unknown controls refuse. CSS overrides use Bulma variables. The upstream CSS is retained unchanged (677,931 bytes), so unused upstream styles remain present; this is not a modular CSS build or huge library installation. No remote stylesheet, icon, font, dynamic code or user HTML import is accepted.

Keyboard/browser checks establish those scoped interactions only. They do not establish universal accessibility, taste, design acceptance, assistive-technology compatibility or engineering adequacy. Chromium desktop is qualified in private receipts; other engines, arbitrary edited HTML and installed-client routing remain untested. Source acquisition is optional; users without local files can inspect metadata but cannot claim rendered Bulma output.

## Additional V3 controls and coverage

`select` and `tabs` additionally accept `options` (2..6 distinct plain labels,1..60 characters each) and `activeIndex` (existing zero-based index). `notification` additionally accepts `message` (plain1..240 characters). Other components refuse those controls. `customize` preserves previous controls while applying explicit changes; arrays and returned source records are copied. Edited serialized `source.json` remains accepted by the root acquisition CLI. The six wrappers are authored native behavior against the exact unchanged Bulma stylesheet; the many other classes/styles in the full677,931-byte stylesheet are not a promise of supported wrapper coverage. No page templates are added.

Qualify all six chosen wrappers separately with actual keyboard interaction, final exported CSS, narrow viewport checks, full notice and offline reacquisition. Source tests and checkout rendering remain separate from the final installed-consumer gate; installed agent-client discovery remains independently untested until observed.

Hue changes can reduce contrast between upstream text and backgrounds. Check final computed opaque pairs using the checks helper where composition permits; keyboard/viewport evidence alone does not establish text contrast or complete accessibility.

## Larger atomic source: DaisyUI

`createAtomicUiLibrary({packageDir?})` is a separate export from `src/ui/index.mjs` and `src/ui/atomic.mjs`. It preserves the six Bulma APIs above. This adapter uses **DaisyUI 5.7.50** prebuilt CSS as explicitly supplied local data. It never imports upstream JavaScript, executes Tailwind/plugins/build scripts, installs a dependency or modifies a client. Official primary sources are [the component catalog](https://daisyui.com/components/) and [source repository](https://github.com/saadeghi/daisyui). The exact distribution has a full MIT license, Copyright (c) 2020 Pouya Saadeghi, retained verbatim on acquisition.

The pinned distribution contains **61 component CSS files and 35 theme CSS files**. Those are exact file inventory counts, not a count of documentation pages or accepted behaviors. The adapter exposes **26 authored atomic recipes** using 26 selected component styles and light/dark themes. No source CSS is bundled in Ingenium; only small metadata/pins and original native markup/behavior are shipped. Full-page layouts, hero sections, drawers, mockups and templates are excluded.

| Authored category | Supported atomic recipes |
| --- | --- |
| Actions | button, disclosure, dropdown |
| Forms | input, textarea, select, checkbox, radio, toggle, range, file-input, fieldset |
| Feedback | alert, progress, loading, skeleton, status, badge |
| Data | avatar, table, kbd, stat |
| Navigation | breadcrumbs, menu, pagination |
| Layout | divider |

Categories, semantic tags, native recipes and behavior are **Ingenium-authored**, not upstream-supplied component semantics or copied documentation examples. Exact package identity, rights text and selected CSS paths/hashes come from the distribution. Compositions can use multiple source styles: pagination uses button/join CSS; the dropdown uses dropdown/button/menu CSS. Source classes alone are not a complete application component contract.

```js
import { createAtomicUiLibrary } from './src/ui/index.mjs';
const atoms = createAtomicUiLibrary({ packageDir:'/absolute/local/daisyui-package' });
atoms.discover({ category:'Forms', query:'choice', limit:12 });
atoms.search({ tags:['slider'] }); // same bounded discovery interface
atoms.discover({ offset:12, limit:12 });
atoms.navigate({ id:'select' }); // previous/next/related catalog IDs and official docs
await atoms.capabilities(); // local, acquisition-required or error
const detail = await atoms.inspect({ id:'select', theme:'light' });
const source = atoms.select({ id:'select' });
const edited = atoms.customize(source, {
  label:'Review stage', description:'Choose a scoped next step.',
  items:['Draft','Review','Ready'], activeIndex:1,
  theme:'dark', size:'large', tone:'primary',
});
const preview = await atoms.preview({ selection:edited });
await atoms.acquire({ selection:edited, outputDir:'/absolute/new/atomic-export' });
```

Discovery/search performs no I/O. It returns source/coverage, authored categories/tags, bounded matching entries, total/offset/limit/nextOffset and explicit unprobed availability. Query is a case-insensitive substring up to 128 characters; category is one of the six listed names; up to 4 exact semantic tags may filter results; offset is a nonnegative integer and limit 1..32 (default 12). `navigate` returns catalog neighbors and up to 6 related IDs by category/tag overlap; it does not implement application routing or taste ranking. Actual source inspection reads only pinned selected files and the exact full notice; missing/corrupt sources refuse. Capabilities checks the selected pinned source inventory separately from rendering.

Selection is explicit and versioned: `{schemaVersion:1,componentId,sourceName:'daisyui',sourceVersion:'5.7.50',selected:true}`. `customize` returns a defensive copy while retaining earlier controls. Each recipe declares its effective controls in discovery/`inspect().controls`; unsupported per-recipe fields refuse rather than silently entering metadata. Plain label is 1..100 characters; where supported, description is 0..240, theme light/dark, size small/medium/large and tone neutral/primary/success/warning/error. Additional supported fields are: boolean disabled/checked; 2..8 distinct plain items up to 60 characters with an existing activeIndex; numeric value 0..100 for progress/stat and integer value 0..100 for native range. Unsupported fields, arbitrary markup/CSS/URLs and unknown versions refuse. The tone is an authored mapping to upstream theme variables/classes; not every upstream source class has an independent behavior adapter. Plain text is escaped. Font/contrast and long-content suitability require final authored checks.

`preview({selection})` verifies exact package/notice/selected stylesheet bytes and returns editable `source`, `fragment`, authored `script`/`css`, complete `html`, exact selected stylesheet `styles`, authored local-import `upstream`, full license and source-file evidence. Canonical regular source files are individually bounded to 65,536 bytes and checked against shipped byte counts/SHA256. Only finite pinned CSS with embedded SVG data images is admitted; external resource URLs, upstream CSS imports and unsupported execution syntax refuse. This is not an arbitrary CSS/SVG validator. Some source styles use modern CSS nesting, layers, relative colors and customizable native select pickers; cross-browser behavior must be tested. In Chromium 143 the native select opens its picker before ArrowDown changes the focused option; Enter commits it.

`acquire({selection,outputDir})` exclusively creates a new directory under an existing canonical parent. It exports each required source CSS file as exact `original-N.css` bytes, a small `upstream.css` containing only authored sibling imports, separate `custom.css`, `behavior.js`, `component.html`, `preview.html`, editable `source.json`, complete `LICENSE.daisyui.txt`, and hash-bound `provenance.json`. Only common base CSS, one selected theme, and required component styles are copied—roughly 7..132KB source bytes for these recipes, rather than the complete 2.82MB distribution. Exact registry SHA512 consistency belongs to the separately retained acquisition receipt; local source hashes do not imply a new request, signature attestation or legal acceptance. Existing destinations refuse without overwriting; write failures can leave a partial new output for inspection. Use a trusted single owner without competing source writers.

Behavior scope is deliberately explicit. Form controls retain native labels/required validation; checkbox/switch/radio/range use native keyboard behavior with small authored status updates. File input reports only a selected local filename; it does not read or upload file contents. Disclosure uses native details/summary. Dropdown adds selected-action close/return-focus and Escape, with disabled disclosure marked inert. Menu is a native button action list, not an ARIA menu with arrow navigation. Pagination updates one current local button/status; it does not fetch or route pages. Breadcrumb links only navigate a local fragment in the proof. Table uses a caption and row/column headers. Avatar uses authored initials, without remote images. Static atoms do not imply dynamic data, asynchronous loading or a complete product state model.

Loading CSS includes an exact upstream animated inline SVG mask, outside static-icon SVG admission; reduced-motion preview hides it while retaining status text. Skeleton animation is disabled under reduced motion. Animation support, keyboard tests and viewport checks do not establish universal accessibility, assistive-technology behavior, readability of every tone/content, print fidelity or design acceptance. Exported fragments use fixed local IDs for one instance; composing multiple instances requires deliberate ID/association reconciliation.

Checkout qualification exercises all 26 recipes with exact source/notice retention, serialized edits and offline repeat, light-default/dark-edited actual exports, relevant native/authored interactions, reduced-motion and 360px checks. Source checkbox/radio visual transitions take 200ms; screenshots should be captured after settled state. Final installed-consumer qualification and independent review remain separate gates. The earlier frozen V3 package and design-production hold are unaffected by this optional source expansion.
