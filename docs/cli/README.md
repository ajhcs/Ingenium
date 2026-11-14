# Ingenium commands

Run `ingenium help` for the current exhaustive operation inventory. Run
`ingenium help FAMILY OPERATION` or add `--help` anywhere for a narrower view.
`ingenium-tools help` covers the separate inspection companion. Help and version
make no adapter probe, install, network request or output file. No arguments return
help with exit 0.

Existing commands print JSON; new version, health, project, task resource and
inspect-set commands print text. Use `--json` or `--format json` for machine output.
Callbacks to the exported `main` functions always receive objects.

```sh
ingenium version
ingenium health --json
ingenium health --adapter-dir existing-adapters --executable-path existing-browser --require browser
ingenium render source.svg new-preview.png --renderer-dir existing-renderer
ingenium shapes create shape.json new-shape
ingenium-tools inspect http://127.0.0.1:3000 new-evidence --adapter-dir existing-adapters
ingenium-tools inspect-set plan.json new-route-evidence --json
```

Every `NEW_OUTPUT_DIR` and new output file must be absent. Shape export retains
editable `shape.json` and `shape.svg`; PNG rendering creates a separate image and
returns source/output hashes. Legacy project inspection retains observations,
screenshots, inventory, report and summary JSON. Multi-route inspection adds
`run.json` progress and a static readable report; use its receipt to distinguish
completed evidence from partial capture. A missing browser adapter is `not-run`,
not a passing capture. Selected loopback project scripts run with your local
authority. No command starts or stops your project server.

Continuation is explicit and local:

```sh
ingenium project continue continuation.json
ingenium project history selected-store --offset 0 --limit 10 --json
ingenium project diff selected-store first-version second-version --json
ingenium project open-version selected-store first-version new-editable-copy
ingenium project recover selected-store --inspect --json
```

`continue` validates the portable envelope and summarizes opening sources,
recorded choices, questions and next action; it does not commit, invoke a model or
launch an editor. History and diff are read-only. Version selectors are a named
version ID or `commit:<sha256>`. `open-version` copies the verified historical
closure to a new destination. Diff uses each selected version's sources and
previews, normalizes verified UTF-8 text sources up to 1 MiB, and leaves other
formats/encodings `not-run`, without changing current state or treating equal hashes as preserved
runtime behavior.

Recovery defaults to explicit `--inspect`. Selection requires `--select HASH`,
`--expected-head HASH|missing`, `--expected-head-file HASH|missing` and
`--reason TEXT`, using identities from the inspected inventory. Releasing an
abandoned lock requires `--release-lock TOKEN --reason TEXT`; the store must prove
the original local process instance is absent. Recovery never automatically
promotes a newest-looking directory, steals a live lock or prunes partial files.

Task resource navigation preserves older provider-specific commands:

```sh
ingenium resources discover
ingenium resources search PROVIDER_ID request.json
ingenium resources task-search task-query.json --json
ingenium resources task-detail selected-resource.json --json
ingenium resources task-acquire selected-request.json new-resource --json
```

Search/detail are bounded offline metadata. Task acquisition defaults to no
network; explicit `--allow-network` enables only the selected provider's supported
route. The request contains `selection` and optional explicit `selectors`; retain
returned original/derived files and complete notices. Availability and advertised
counts do not establish qualified operations, rights or user acceptance. Existing
catalog, SVG/font pack, atomic, shape, palette, texture, item, UI, material, library
and selected download commands remain in the central help inventory.

Health uses ordinary local renderer resolution and static resource metadata by
default. Browser/Python probes require explicit selectors; `--probes` accepts a
comma-separated subset of `renderer,browser,font-vector,resources`.
`--require ID` turns an unusable required capability into exit 2. Missing optional
tools alone do not fail ordinary diagnosis. The companion marks core-only probes
`not-selected`. No automatic installs, home/global directory scan or installed
agent-client inference occurs.

Exit 1 means a check, operation or conflict failed; exit 2 means usage or required
coverage/capability is unavailable. Unknown, duplicate and missing flags, and
malformed JSON, now consistently return 2; missing selected renderers also return
2. Read the structured category/stage/nextStep before retrying. Exit 130 means
interrupted after cleanup where possible; retained outputs may be partial. Keep
them for inspection and retry with a new destination.

Local CLI/help/health behavior was tested with Node 22 on 2026-11-14. Actual
agent-client installation and lifecycle are separate evidence, not established
by these commands. See [CLI API](../api/cli.md) for exports and compatibility.

See [local troubleshooting](troubleshooting.md) for symptoms, narrow recovery and
separate installed-client evidence limits.
