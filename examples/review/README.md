# Task-based review: controlled recovery example

This original synthetic case demonstrates the selected review paragraph. It is prospective: the deliberately weak “before” is newly authored and is not a historical Ingenium output or a defect attributed to an existing Relay study.

Open the [accessible comparison gallery](index.html). It shows full-size images, textual findings and eight method-specific review cases. Editable sources are [before.svg](source/before.svg) and [after.svg](source/after.svg); separate renders are [before.png](previews/before.png) and [after.png](previews/after.png).

**Task:** recover a failed assignment while keeping the selected order and service note available. **Evidence:** the supplied fixture reports failed save-q1/r2, with unknown cause; working r2/Mina Patel and durable r1/Unassigned remain distinct. The “before” message claims a dropped connection, which the fixture cannot establish. The “after” message states the known failure and retained selection. The likely consequence of the first message—unnecessary connection troubleshooting—is a hypothesis, not a measured user outcome.

**Preserved:** all three simultaneous panes; canonical subject/content; selection; shared assignment owner/session; independent note; invalid raw input retained separately; automatic valid updates; fresh matching request/revision acknowledgement; model Undo as a new revision after resolving raw drafts. The [complete fixture](fixture.json) and SVG metadata retain these fields. Their hashes cover the entire fixture, not only its title and domain ID. Only error copy and variant editorial/accessibility labels change.

**Scope:** static SVG specification, no executable product prototype. “Try again” depicts a proposed control. No editing, request, retry, save, native model or Undo behavior is implemented or tested. The HTML gallery uses ordinary links and native disclosure controls; those interactions are tested separately. No user preference or product acceptance is inferred.

Regenerate sources into a new directory:

```sh
node tools/generate-review-example.mjs NEW_SOURCE_DIR
```

Render each SVG through the existing optional `exportSvg` API with an explicit existing renderer. No dependencies are installed. [Source manifest](source/manifest.json) and [render manifest](previews/render-manifest.json) bind exact bytes. See [validation](../../docs/impeccable-validation.md).
