# Selected user-local Simple Icons

`src/catalog/brand-download.mjs` exports `createBrandDownloadClient({allowNetwork=false, transport?, timeoutMs=15000})`. Construction and `capabilities()` perform no I/O. Async `search`/`discover` and `details` read only the compact installed index. They preserve exact source declarations, license fields, guidelines, aliases and original repository slugs; name tokens are separate metadata. All 3,466 names in Simple Icons 16.35.0 have exact selected-download descriptors, rather than only the separately bundled ActivityPub example being accessible.

```js
import {createBrandDownloadClient} from './src/catalog/brand-download.mjs';
const local = createBrandDownloadClient();
const page = await local.search({query:'javascript', offset:0, limit:12});
const metadata = await local.details({id:'javascript'});
const acquired = await createBrandDownloadClient({allowNetwork:true}).acquire({
  id:'javascript', selected:true, outputDir:'/user/assets/new-javascript'
});
await local.acquire({id:'javascript', selected:true,
  reuseDir:acquired.outputDir, outputDir:'/user/assets/new-offline-javascript'});
```

Only explicit `selected:true` acquisition fetches an original. It requests the exact `https://raw.githubusercontent.com/simple-icons/simple-icons/4d29a35c954699b389a834aacc97dd6e7e74143c/icons/<source-slug>.svg` URL, matching a retained npm distribution entry's SHA256 and exact byte count. The compact pins were checked against that repository tree's Git blob identities; the three qualified live samples also matched the immutable raw responses. No archive/bulk download, alternate endpoint, registry script, upstream code execution, dependency installation or retry occurs. A selected failure does not prove provider-wide unavailability.

The new user-local output contains unchanged `original.svg`, exact full bundled project `LICENSE.md` and `DISCLAIMER.md`, the unchanged per-entry declaration as `declaration.json`, and `acquisition.json` with source pins, artifact identities, mode and scope. These selected originals are not added to a redistributed Ingenium pack. The existing separately bundled ActivityPub example remains separate from this download route.

Project CC0 and the disclaimer are **not an all-icon license**. For example JavaScript declares MIT in its per-icon metadata; this adapter retains that declaration and its source URL but does not fetch its separate full MIT notice. `fullPerIconNoticeAcquired:false` records that distinction. `projectNoticeMatchesExplicitCC0:true` identifies entries explicitly declaring CC0, for which the retained full CC0 text is available; it does not establish trademark permission. No additional approval workflow is imposed. The operator owns licensing and use decisions; source declarations, software notices, trademark guidance, deterministic checks and user acceptance remain separate.

`search` accepts a query up to 128 characters, offset 0..10000 and limit 1..32, returning `total`, `nextOffset` and defensive-copy metadata. Aliases are searchable. The index is bounded at 2,000,000 bytes and 3,466 entries; SVGs are bounded at 1,000,000 bytes and their exact descriptor size. Default network access is disabled. `transport(url, fetchInit)` may return a Fetch `Response` for tests; it is always labelled `fixture-transport`. Built-in fetch uses manual redirects, an abort signal and a request/body deadline. `timeoutMs` is 10..30000. Redirects, unexpected final URLs, non-200, encoded responses, wrong Content-Length, byte overrun and SHA256 mismatch refuse.

An output parent must already exist and be canonical; a new directory is reserved exclusively before transport. Existing outputs and symlink parents refuse without a request. Failures can leave a partial new directory; no existing work is replaced. `reuseDir` requires exactly the five expected regular files, validates the original and full notices against current source pins, validates declaration identity and retained artifact hashes, and never refetches corrupted output. Reuse is labelled `offline-reuse`; retained origin is explicitly a receipt claim. Use one trusted owner without competing writers; these bounds are not a universal filesystem sandbox.

## Optional finite presentation

Downloaded originals remain available even if preparation is unsupported. Acquisition by itself claims neither parsed SVG admission nor rendering. `prepare` separately verifies the exact retained acquisition and, using optional existing saxes 6.0.0, admits only the Simple Icons source shape: an SVG root with exact `xmlns`, `viewBox="0 0 24 24"`, `role="img"`, one title and one `path` with only `d`. Other nodes/attributes, namespaces, comments, declarations, DTD, processing instructions and CDATA refuse. The path accepts only bounded SVG command/number characters and stays verbatim, including compact arc flags. This is **`simple-icons-pinned-source-presentation/1`**, a provider-specific presentation policy; it does not change or claim the stricter `static-icon-v1` path grammar, or validate arbitrary path geometry.

```js
const prepared = await local.prepare({
  id:'javascript', selected:true, sourceDir:acquired.outputDir,
  outputDir:'/user/assets/new-javascript-presentation',
  parserDir:'/user/optional-parser', // existing npm directory with saxes 6.0.0
  controls:{width:128, height:128, fill:'#2468AC'}
});
// Existing optional SVG exporter provides a separate actual PNG rendering proof.
// exportSvg({sourcePath:prepared.derivativePath, outputPath:'/user/assets/proof.png', rendererDir});
```

Omit `parserDir` to use normal local optional resolution; explicit selectors have no ancestor fallback. Width and height are integers 1..2048 (defaults 64); fill is six-digit hex (default `#000000`). The derivative removes `role="img"`, adds those dimensions/fill, and preserves viewBox, title semantics and exact path data. There are no geometry transforms, path rewriting, font edits, external references, arbitrary CSS or `currentColor` controls. The original, acquisition receipt, full notices and declaration are copied unchanged alongside separate `derived.svg` and `preparation.json`. Prepared directories contain extra derived artifacts and are not accepted as original-only `reuseDir` inputs; retain the original acquisition separately. Preparation is entirely offline and does not rasterize. Use the existing optional `exportSvg` helper for a separate PNG with renderer identity and source/output hashes.

Qualification: eleven tests cover inert discovery, paging/aliases, exact metadata, default offline behavior, selected-only operations, response/deadline/size/hash/redirect bounds, exclusive paths, verified reuse, altered/source-injection refusal, finite controls, parser absence, preserved originals/notices/path data and deterministic offline presentation. Actual ActivityPub, JavaScript and Simple Icons originals were downloaded individually from the pinned commit, exactly verified and reused offline. All three selected presentation derivatives were rendered with Sharp 0.35.4 at 128×128 and visually inspected, including the Simple Icons compact-arc path. This qualifies those selected samples; the 3,466 download descriptors do not assert all-source presentation compatibility, licensing sufficiency, installed-client integration or accepted design quality.
