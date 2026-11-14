# Named local project inspection

`src/project/index.mjs` exports `validateInspectionProfiles(profiles)`,
`validateInspectionPlan(plan)`,
`inspectProjectSet(options)`, `validateInspectionSnapshot(snapshot)`,
`renderInspectionReport(options)` and `writeInspectionReport(options)`.
The existing `inspectProject` API and v1 single-route snapshots retain their shared
context semantics. New v2 inspection does not infer fresh-state equivalence from
old snapshots. No automatic snapshot migration is provided.

`validateInspectionProfiles(profiles)` is an additive pure legacy validator that
returns `{valid,errors:[{code,path,message,nextStep}]}`. Its paths refer to the
supplied `$.profiles[index]` fields, including nested states/journeys/steps; the
internal v2 projection is never shown as an input field. `inspectProject` uses it
before output creation. Omitted states/journeys/steps retain their defaults;
explicit null collections refuse at their supplied fields. Missing state/journey
names also identify the exact supplied field. Invalid profiles and supplied baseline schemas expose
usage/preflight error metadata; the CLI returns 2. Baselines selected by
`--previous` retain their version requirement: v1 for `inspect`, v2 for
`inspect-set`. Missing/unreadable baseline files remain filesystem operation
failures. No validation result implies a browser capture or acceptance.

```js
const plan = {
  schema: 'ingenium-inspection-plan/1',
  origin: 'http://127.0.0.1:3000',
  profiles: [{ id: 'desktop', viewport: { width: 1440, height: 900 } }],
  routes: [{ id: 'overview', path: '/overview', profiles: ['desktop'],
    states: [{ id: 'default', steps: [] }], journeys: [
      { id: 'open', mode: 'fresh', steps: [
        { action: 'click', selector: '#open' },
        { action: 'expectText', selector: '#status', value: 'Open' }
      ] }
    ] }],
  budgets: { maxCaptures: 16, deadlineMs: 120000 }
};
const preflight = validateInspectionPlan(plan); // {valid,errors:[{code,path,message,nextStep}]}
const summary = await inspectProjectSet({ plan, outputDir: '/selected/new-output',
  adapterDir: '/selected/existing-adapters', executablePath: '/selected/chromium' });
```

All fields shown are required. Routes may omit `journeys`. Optional profile fields
are `textSpacing`, `expectedFonts`, `exceptions` (`rule,target,reason`), `delivery`
and `reducedMotion`. Stable IDs begin with a letter, contain only ASCII letters,
digits, underscores or hyphens, and have at most 64 characters. Unknown fields,
ambiguous path encoding, traversal, credentials and foreign origins refuse.

Actions are `click`, `focus`, `press`, `fill`, `waitFor`, `expectFocus`, `expectText`
and `expectValue`. All require `selector` except `press`, which accepts an optional
selector and requires `key`. Fill/text/value actions require string `value`.
`waitFor` means visible and accepts no extra state field. Assertions compare exact
text/value/focus. Empty actions and actions without assertions do not establish a
behavioral outcome pass. Validation cannot establish that a selector will match.

A fresh journey selects `fromStateId` when the route has multiple states. A
connected journey requires `afterJourneyId`, forbids `fromStateId`, and inherits
only its declared predecessor. Chains have one fresh root and at most one
successor per journey. Forks, cycles and missing references refuse before output.

One owned browser process serves a run. Every baseline capture and independent
chain gets an actual new context/page with blocked service workers and explicit
request/WebSocket policies. Connected successors alone inherit cookies and origin
storage. Baselines capture after setup and before journeys. Journey captures
measure after the named actions, with mode and ordered predecessor identities.
The selected project server remains owned by its operator.

Limits are 1–8 routes, 1–4 profiles, 1–4 states per route, 16 journeys per route,
32 steps per setup/journey, 64 total baseline/journey captures, 2048 expanded
executed actions, 4096 pixels per viewport dimension and 1 MiB per plan. A fresh
journey's repeated setup counts toward the action bound. Selectors have at most
512 characters; values at most 8192. Budgets only lower hard limits. The overall
browser deadline is at most 120 seconds; a shorter budget can interrupt startup,
setup, capture or finalization. Optional `signal: AbortSignal` cancels the owned run, outside
plan JSON. Browser startup/cleanup and disk receipt writes are included in
operational outcomes; filesystem receipt completion can extend beyond the timer; no completed manifest is emitted after an observed deadline.

Only the exact loopback origin can serve resources. Redirects refuse. Top-level
navigation must remain among explicitly named route URLs; a link to an unlisted
same-origin route is blocked. No crawling, server startup, installation, persistent
browser profile or existing user session is used. Inspection executes trusted
project scripts with the operator's authority; it is not a hostile-content sandbox.

The output parent must already exist without symlink components. The output
itself is exclusively created after full plan, baseline and path preflight.
`run.json` records requested/captured/failed/missing cells and is updated as work
finishes. Output initialization failures attempt an INCOMPLETE.json receipt; if
filesystem writes fail, the thrown error identifies outputDir and partial:true.
No receipt can be guaranteed on a filesystem that refuses all writes. Failed setup/assertions cannot become baselines. Interrupted work retains
successful raw JSON and screenshots. Missing adapters yield `not-run`, never a
completed manifest. Retry uses a new directory.

`summary.json` leads with execution coverage, separately from check counts.
`report.json` retains common scoped findings. `snapshot.json` uses
`ingenium-inspection-snapshot/2`, exact origin identity, full plan provenance and
successful cells. A comparison matches route ID, serialized URL (including origin,
query ordering and fragment), profile/state, and that cell's actual setup/profile/
chain plan hash. An unrelated added route does not invalidate identical cells.
Changed origin/port/path/setup is incomplete comparison coverage (`not-run`).
Optional `previousSnapshotPath` accepts only bounded regular v2 files. V1 snapshots
remain usable with `inspectProject`.

The static `index.html`/`report.css` report works locally without JavaScript. Links
resolve only to selected relative files whose hashes and sizes were verified.
HTML-looking selectors and messages are escaped; raw project HTML is not embedded.
A restrictive CSP disables scripts, remote dependencies and form actions. Missing
screenshots retain the failed stage and JSON link. `manifest.json` is written last
only after all requested execution cells and the readable report finish. Passing
execution can still contain failing accessibility or preservation findings.

Dependency observations retain coarse type/origin/outcome, optional HTTP status
and elapsed time, with a 256-entry cap and explicit observed count/truncation.
Affected targets remain empty with `correlation:'capture-only'` because the adapter
does not establish DOM/font-resource causality. CSS font availability, loaded face
status and blocked candidate fonts do not prove exact glyph selection. The report
omits private URLs, authored fill values and console bodies; raw JSON remains local
private evidence and can contain those values. Keep captures outside Git. No taste,
full accessibility certification, backend correctness or user acceptance follows
from these measurements.
