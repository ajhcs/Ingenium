# CLI API and compatibility

Both `bin/ingenium.mjs` and `bin/ingenium-tools.mjs` export asynchronous
`main(args, write?, {signal?} = {}) -> Promise<number>`. `args` is an array of
strings. An explicit `write` callback always receives an object, once; existing
successful command payloads retain their keys and JSON defaults. The executable
prints new commands as deterministic text, independent of TTY; `--json` or
`--format json` requests JSON. Existing commands also accept `--format text`.

The inert command inventory is `commands` / `toolCommands` in
`src/cli/commands.mjs`; `parseCommand(args, product?)` and
`commandHelp({product?,topic?})` use the same inventory. `--help` and `-h` anywhere
preempt argument validation, probes, input reads and output creation. No arguments
print root help and return 0. `help [family [operation]]` narrows the inventory.

`version({product?})` resolves package-relative `release/identity.json`, without
Git or network. Prepared artifacts expose their retained release identity;
a checkout without identity reports `prepared:false`, `release:null` and the
package version. This is not evidence of installation in an agent client.

`health({selectors = {}, probes = ['renderer','browser','font-vector','resources']})`
returns `ingenium-health/1` with product, capabilities and nextSteps. Selectors are
`rendererDir`, `sharpModule`, `adapterDir`, `executablePath` and `python`; empty,
unknown or conflicting selectors refuse. Explicit selectors never fall back.
Ordinary renderer resolution and bundled resource metadata are the default
probes; browser and isolated Python require explicit selection. Each selected
browser session closes before the result is returned. Probe failures remain
independent. The inspection companion reports core-only capabilities
`not-selected`; it does not import or require them. The optional second health
argument `{product,adapters}` exists for package routing and controlled test probe
injection, not installation or broader tool discovery.

Errors retain legacy `error`, `code` and optional `setup` keys, with additive
`schema:'ingenium-error/1'`, category, message, stage, nextStep and output arrays.
Malformed JSON reports no raw payload. Exit codes are 0 completed/help/version,
1 failed check/operation/conflict/corrupt state, 2 malformed usage or required
selected capability unavailable, and 130 interruption. Plain health returns 0
for a completed diagnosis even when optional tools are missing;
`health --require browser` returns 2 unless browser is usable.

Migration: malformed flags and JSON that previously reached generic error catches
now return 2. Rendering with a missing explicitly selected renderer now returns 2;
incompatible or broken selected tooling remains an operation failure, 1. Old
records-v1, single-route inspection and successful legacy JSON callback payloads
remain supported. No automatic continuation rewrite or installation occurs.

The optional AbortSignal cooperates with multi-route inspection. The binary owns
the SIGINT listener and waits for adapter cleanup. Other operations finish their
bounded in-flight call before cancellation is reported. Cancellation may leave
complete or partial new files; the receipt lists known retained outputs without
labeling them complete. Retry uses a new destination. No signal kills or stops a
user-owned project server.

See [command guide](../cli/README.md) for commands, expected files and recovery.
