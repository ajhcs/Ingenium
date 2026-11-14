import { CliError } from './errors.mjs';
const ids = ['renderer', 'browser', 'font-vector', 'resources'];
const present = (object, key) => Object.hasOwn(object, key);
const adapterNames = ['rendererDir', 'sharpModule', 'adapterDir', 'executablePath', 'python'];
/** Explicit diagnosis. The second argument injects probes for tests; it never changes selection policy. */
export async function health({ selectors = {}, probes = ids } = {}, { product = 'ingenium', adapters = {} } = {}) {
  if (!selectors || typeof selectors !== 'object' || Array.isArray(selectors) || Object.keys(selectors).some(key => !adapterNames.includes(key)) || Object.values(selectors).some(v => typeof v !== 'string' || !v.trim())) throw new CliError('SELECTOR_INVALID', 'Selectors must be supported nonempty strings.');
  if (present(selectors, 'rendererDir') && present(selectors, 'sharpModule')) throw new CliError('SELECTOR_INVALID', 'Choose rendererDir or sharpModule.');
  if (!Array.isArray(probes) || !probes.length || new Set(probes).size !== probes.length || probes.some(id => !ids.includes(id))) throw new CliError('PROBES_INVALID', 'Select unique renderer, browser, font-vector or resources probes.');
  const capabilities = [];
  for (const id of probes) {
    let result;
    const unavailableInCompanion = product === 'ingenium-tools' && id !== 'browser';
    if (unavailableInCompanion) result = { id, status: 'not-selected', operations: [], reason: 'This capability belongs to the optional core helpers.' };
    else if (id === 'browser' && !present(selectors, 'adapterDir') && !present(selectors, 'executablePath')) result = { id, status: 'not-selected', operations: [], reason: 'Select an existing browser adapter or executable explicitly.', nextStep: 'Pass --adapter-dir DIR and, when needed, --executable-path FILE.' };
    else if (id === 'font-vector' && !present(selectors, 'python')) result = { id, status: 'not-selected', operations: [], reason: 'No isolated Python interpreter selected.', nextStep: 'Pass --python FILE for an existing isolated interpreter.' };
    else try {
      if (id === 'renderer') {
        const probe = adapters.renderer ?? (await import('../svg/index.js')).discoverCapabilities;
        const r = (await probe(Object.fromEntries(['rendererDir', 'sharpModule'].filter(k => present(selectors, k)).map(k => [k, selectors[k]])))).sharp;
        result = { id, status: r.status === 'present' ? 'usable' : r.status === 'absent' ? 'absent' : 'error', operations: r.status === 'present' ? ['render-svg-png'] : [], ...(r.version ? { version: r.version } : {}), ...(r.reason ? { reason: r.reason } : {}), ...(r.status !== 'present' ? { nextStep: 'Select an existing compatible renderer with --renderer-dir DIR.' } : {}) };
      } else if (id === 'browser') {
        const probe = adapters.browser ?? (await import('../browser/index.mjs')).createBrowserSession;
        let prepared;
        try {
          prepared = await probe(Object.fromEntries(['adapterDir', 'executablePath'].filter(k => present(selectors, k)).map(k => [k, selectors[k]])));
          const usable = prepared.status === 'pass' && !!prepared.session;
          result = { id, status: usable ? 'usable' : prepared.status === 'not-run' ? 'absent' : 'error', operations: usable ? ['inspect', 'preservation-comparison'] : [], ...(!usable ? { reason: prepared.status === 'not-run' ? 'Selected browser adapters are unavailable.' : 'Selected browser adapter or executable failed its usability probe.' } : {}), ...(prepared.capability?.environment?.browser ? { version: prepared.capability.environment.browser } : {}), ...(!usable ? { nextStep: 'Select existing compatible Playwright/axe adapters and a browser executable.' } : {}) };
        } finally { await prepared?.session?.close(); }
      } else if (id === 'font-vector') {
        const probe = adapters.fontVector ?? (await import('../font-vector/index.mjs')).runFontVector;
        const r = await probe({ python: selectors.python, operation: 'capabilities' });
        const usable = ['pass', 'available', 'usable'].includes(r.status);
        result = { id, status: usable ? 'usable' : r.status === 'not-run' ? 'absent' : 'error', operations: usable ? ['font-demo', 'compile-font', 'normalize', 'boolean'] : [], ...(!usable ? { reason: r.status === 'not-run' ? 'Selected interpreter or locked optional modules are unavailable.' : 'Selected font/vector tools failed their usability probe.' } : {}), ...(!usable ? { nextStep: 'Use an existing isolated interpreter with the documented locked optional tools.' } : {}) };
      } else {
        const probe = adapters.resources ?? (await import('../resources/index.mjs')).discoverResources;
        const r = await probe();
        result = { id, status: 'usable', operations: ['offline-metadata-discovery'], reason: `${r.providers?.length ?? 0} provider summaries; selected acquisition qualification remains separate.` };
      }
    } catch {
      // Adapter exceptions may contain private request strings or environment dumps.
      result = { id, status: 'error', operations: [], reason: 'Selected capability probe failed.', nextStep: 'Check the selected tool and its supported version; retry this probe explicitly.' };
    }
    capabilities.push(result);
  }
  return { schema: 'ingenium-health/1', product, capabilities, nextSteps: [...new Set(capabilities.flatMap(c => c.nextStep ? [c.nextStep] : []))], limitations: ['Diagnosis does not establish installation or discovery in an agent client.', 'No tools were installed, no personal directories were scanned, and no acquisition was requested.'] };
}
