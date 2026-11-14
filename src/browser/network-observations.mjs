const types = new Set(['document', 'font', 'stylesheet', 'script', 'image', 'fetch', 'websocket']);
/** Bounded capture-level observations. No inferred DOM/font causality. */
export function createDependencyCollector() {
  let entries = [], observedCount = 0;
  return {
    reset() { entries = []; observedCount = 0; },
    observe({ type, selected = false, outcome, httpStatus, elapsedMs }) {
      observedCount++;
      if (entries.length === 256) return;
      entries.push({ schema: 'ingenium-dependency-observation/1', id: `dependency-${observedCount}`, type: types.has(type) ? type : 'other', origin: selected ? 'selected' : 'external', outcome, ...(Number.isInteger(httpStatus) ? { httpStatus } : {}), ...(Number.isFinite(elapsedMs) ? { elapsedMs: Math.max(0, Math.round(elapsedMs)) } : {}), affectedTargets: [], correlation: 'capture-only' });
    },
    snapshot(scope) { return { entries: entries.map(e => ({ ...e, scope: { ...scope }, affectedTargets: [] })), observedCount, truncated: observedCount > entries.length }; },
  };
}
