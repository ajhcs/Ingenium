# Optional Ingenium project tools

Inspect a running local project and check what survived a redesign. The creative
skill works independently: none of these tools, Node or browser adapters are
needed to use its instructions or make editable studies with your client's tools.

The companion is a small, separate local package with no mandatory dependencies,
install scripts, hooks, automatic downloads or server. It reuses Ingenium's
browser measurements and report format. No npm publication is claimed.

## Install a supplied companion archive

With Node 22+ and npm, select the `inspection-tools` archive from the supplied `artifacts.json` and verify its SHA-256. A clean `0.2.0-alpha.1` candidate is named `inspection-tools-0.2.0-alpha.1.tgz`; a development build includes a `-development-<buildId>` suffix. Use the actual filename in the manifest. Preparation does not mean an archive has been published.

```sh
npm install --prefix /path/to/consumer --offline --ignore-scripts --omit=optional /absolute/path/to/inspection-tools-0.2.0-alpha.1.tgz
/path/to/consumer/node_modules/.bin/ingenium-tools version --json
```

The second command reads the installed artifact's identity. Substitute the path to your supplied archive and consumer. The companion remains separate from the core helper and guidance; browser adapters are optional and are not installed by this command. Installing it does not register a client skill.

Developers working from a checkout can stage the companion with `node tools/package-companion.mjs NEW_OUTPUT_DIR` and package that stage with npm. The stager refuses an existing destination; inspect a partial failure before retrying elsewhere. The normal end-user archive route above does not require this staging step or a checkout.

## Select an existing browser adapter

Pass an existing npm directory containing compatible `playwright` and
`@axe-core/playwright`, plus an installed Chromium executable. An explicit
directory never falls back into the checkout or another installation.

```sh
ingenium-tools capabilities --adapter-dir /path/to/adapter --executable-path /path/to/chromium
```

Adapter setup is a separate explicit operation, when wanted:

```sh
npm install --prefix /path/to/adapter --save-exact --ignore-scripts playwright@1.57.0 @axe-core/playwright@4.11.1
```

These are the retained compatible versions, not a latest-version claim. Supply a
compatible Chromium separately. Capability checks launch and close a sandboxed
browser; they install nothing and make no page requests. Missing dependencies
remain `not-run`, while incompatible adapters and launch failures are `error`.

## Inspect the project

Start your project's own dev server yourself, then explicitly select its URL:

```sh
ingenium-tools inspect http://127.0.0.1:5173/ work/before --adapter-dir /path/to/adapter --executable-path /path/to/chromium
```

Only HTTP `localhost`, `127.0.0.1` and `[::1]` are supported. The browser permits
requests and WebSockets only to that exact origin. HTTP redirects are refused;
select the final loopback URL explicitly. External fonts,
analytics and a backend on a different port are blocked and reported. Use a
trusted local project: its scripts and your authored actions execute. This is
not a hostile-page sandbox or a production-site scanner. Each run owns a new
browser context; states within it share isolated storage. It never accesses your
existing browser profile or starts a server.

The default captures desktop 1440 × 900 and phone 390 × 844. For meaningful
states and keyboard coverage, pass `--config profiles.json`:

```json
{
  "profiles": [
    {
      "name": "phone",
      "viewport": { "width": 390, "height": 844 },
      "reducedMotion": true,
      "states": [
        { "name": "default" },
        { "name": "details", "steps": [{ "action": "click", "selector": "#open-details" }] }
      ],
      "journeys": [
        { "name": "primary-focus", "steps": [
          { "action": "focus", "selector": "#primary" },
          { "action": "expectFocus", "selector": "#primary" }
        ] }
      ]
    }
  ]
}
```

Use selectors and assertions that match your project. The config accepts only
`profiles`; each supports the existing viewport, text-spacing, font, exception
and delivery fields, plus `reducedMotion`, `states` and `journeys`. At most four
profiles and four states per profile are captured. Steps support `click`,
`focus`, `press` (`key`), `fill` (`value`), `waitFor`, `expectFocus`, `expectText`
and `expectValue` (exact `value`). Each sequence is bounded to 32 steps. Actions
can change the running project; select safe test data. Assertions establish only
the authored checks. Geometry is measured after state setup and before journeys.

Open `views/*.png`, then read `report.json`. Raw observations and the rendered
DOM inventory are retained separately; `summary.json` is a compact handoff. No
keyboard journey means that coverage is explicitly `not-run`. Exit 0 permits
review-needed items, 1 means a failure/error, and 2 means incomplete coverage or
usage. None certifies accessibility, taste or acceptance.

## Check preservation after a change

Use the same route, profile/state names, viewport, setup, journeys and representative data:

```sh
ingenium-tools inspect http://127.0.0.1:5173/ work/after --previous work/before/snapshot.json --config profiles.json --adapter-dir /path/to/adapter --executable-path /path/to/chromium
```

The inventory records visible semantic content, headings, links, form targets,
controls, options and observable inline handlers. Stable IDs, names and optional
`data-preserve` keys help match elements. Duplicate occurrences are retained.
Layout and style coordinates are excluded; current input values and checked
states are excluded. Missing items and changed observed attributes fail the
preservation comparison; additions are reported without failing it. Authorized
content changes still appear for review. Preserve your earlier evidence and
explain intentional differences instead of silently rewriting the baseline.

A missing or failed state, or a changed inspection plan, is incomplete coverage,
never a preservation pass. Text/value journey assertions are recorded separately
from keyboard focus assertions.
The inventory cannot establish framework listeners, accessible-name correctness,
backend behavior, unvisited routes or content that is absent from captured
states. Use authored journeys and inspect the rendered result too. Captures can
contain private content; keep evidence outside Git.

## JavaScript API

Import `inspectProject` and `compareInventories` from `src/project/index.mjs`.
`inspectProject({url, outputDir, profiles?, previousSnapshotPath?, adapterDir?,
executablePath?})` writes only to a new evidence directory and returns its
summary. `compareInventories(before, after)` is pure and returns `removed`,
`changed` and `added`. Its inputs are version 1 inventories with `items`.
Source checks and records in the full helper package remain compatible.
