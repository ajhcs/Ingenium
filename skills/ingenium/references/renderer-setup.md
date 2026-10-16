# Optional PNG renderer setup

Creative guidance, editable SVG and records work without Sharp. A plugin host may copy the package without installing npm dependencies. An `absent` renderer result is a missing optional capability, not permission to install one silently.

For PNG export, choose a user-owned directory outside the plugin cache and outside unrelated projects. With Node 22+ and npm available, run this explicitly authorized setup once (POSIX shell example, from your chosen working directory):

```sh
renderer="$PWD/ingenium-renderer"
npm install --prefix "$renderer" --save-exact --include=optional --ignore-scripts sharp@0.35.4
```

npm creates that directory's own manifest, lock and dependency tree. Retain its lockfile; `npm ci --prefix "$renderer" --include=optional --ignore-scripts` restores it on the current platform. Sharp provides platform-specific binaries through optional dependencies. If your platform/runtime cannot load them, leave rendering unavailable and consult [Sharp installation](https://sharp.pixelplumbing.com/install/). Do not install compilers, fonts or system packages as an automatic fallback. Preserve third-party licenses/notices in the dependency tree.

Locate the actual installed plugin root from the client's skill metadata. Set `plugin` to that directory, then use the same renderer boundary for discovery and export:

```sh
node "$plugin/bin/ingenium.mjs" capabilities --renderer-dir "$renderer"
node "$plugin/bin/ingenium.mjs" render study.svg preview.png --renderer-dir "$renderer"
```

The probe must report `present` before treating rendering as available. Export creates a new PNG and preserves source bytes. Choose an existing output directory and a fresh output filename. No development checkout, shared cache, persistent configuration or plugin-cache write is needed. The explicit directory resolves only its own `node_modules/sharp`; an empty directory never falls back to another project's dependency.

Missing modules report `absent`; incompatible modules, missing native/transitive dependencies and failed probes report `errored`, with setup guidance. Render failures exit nonzero. Discovery never installs anything. After changing Node, OS or CPU, reinstall from the lockfile for that platform and probe again; no cross-platform qualification is implied.

`--sharp-module` remains available for advanced existing module locators. Use only one selector at a time. Without either selector, the helper uses normal package-relative resolution (useful for a checkout or npm consumer with dependencies already installed). A self-contained npm installation can run its installed `ingenium` binary directly; a plugin installed by copying files should use the separate renderer boundary above.
