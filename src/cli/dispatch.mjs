import { resolve } from 'node:path';
import { lstat, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { version } from './version.mjs';
import { health } from './health.mjs';
import { readJson } from './runtime.mjs';
import { CliError, usageError, resultExit } from './errors.mjs';
const camelFlags = { '--renderer-dir': 'rendererDir', '--sharp-module': 'sharpModule', '--adapter-dir': 'adapterDir', '--executable-path': 'executablePath', '--python': 'python' };
const boundedNumber = (value, fallback, name, max = 1000000) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw usageError(`${name} requires a bounded nonnegative integer`);
  return Number(value);
};
const hash = (value, flag) => {
  if (value === 'missing') return null;
  if (!/^[a-f0-9]{64}$/.test(value ?? '')) throw usageError(`${flag} requires a SHA-256 hash or missing`);
  return value;
};
async function stateApi() {
  try { return await import('../project-state/index.mjs'); }
  catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND') throw new CliError('MODULE_UNAVAILABLE', 'Project continuation is unavailable in this package.', { category: 'unavailable', nextStep: 'Use the optional core helper package for project continuation.' }); throw error; }
}
export async function dispatchModern(parsed, write, { product = 'ingenium', signal } = {}) {
  const { entry, flags, positionals: p } = parsed;
  if (entry.path === 'version') { write(await version({ product })); return 0; }
  if (entry.path === 'health') {
    const selectors = Object.fromEntries(Object.entries(camelFlags).filter(([flag]) => flags[flag] !== undefined).map(([flag, name]) => [name, flags[flag]]));
    const probes = flags['--probes']?.split(',');
    const required = flags['--require'];
    if (required && !['renderer', 'browser', 'font-vector', 'resources'].includes(required)) throw usageError('--require expects renderer, browser, font-vector or resources');
    if (required && probes && !probes.includes(required)) throw usageError('--require must name a requested probe');
    const result = await health({ selectors, ...(probes ? { probes } : {}) }, { product });
    write(result);
    const requiredStatus = result.capabilities.find(c => c.id === required)?.status;
    return required ? requiredStatus === 'usable' ? 0 : requiredStatus === 'error' ? 1 : 2 : 0;
  }
  if (entry.path.startsWith('resources task-')) {
    const api = await import('../resources/task-selection.mjs');
    const input = await readJson(p[0]);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CliError('CONFIG_INVALID', 'Task resource request must be a JSON object.');
    const operation = entry.path.slice('resources task-'.length);
    const result = operation === 'search' ? await api.searchTaskResources(input) : operation === 'detail' ? await api.inspectTaskResource(input) : await api.acquireTaskResource({ ...input, outputDir: p[1], allowNetwork: !!flags['--allow-network'] });
    write(result); return resultExit(result);
  }
  if (entry.path.startsWith('project ')) {
    const api = await stateApi(), operation = entry.path.slice(8);
    if (operation === 'continue') {
      const state = await readJson(p[0], { maxBytes: 1024 * 1024 });
      const validation = api.validateProjectState(state);
      if (!validation.valid) { const first = validation.errors[0]; throw new CliError(first?.code ?? 'CONTINUATION_INVALID', first?.message ?? 'Invalid continuation.', { field: first?.path, nextStep: first?.nextStep }); }
      const { summarizeContinuation } = await import('./continuation.mjs');
      const summary = await summarizeContinuation(state, p[0]);
      write(summary); return summary.sourceVerification.status === 'fail' ? 1 : 0;
    }
    const store = api.createProjectStore({ root: resolve(p[0]) });
    if (operation === 'history') {
      const offset = boundedNumber(flags['--offset'], 0, '--offset');
      const limit = boundedNumber(flags['--limit'], 24, '--limit', 128);
      if (!limit) throw usageError('--limit must be positive');
      write(await store.history({ offset, limit })); return 0;
    }
    if (operation === 'open-version') { write(await store.materializeVersion({ versionId: p[1], outputDir: resolve(p[2]) })); return 0; }
    if (operation === 'diff') {
      const before = await store.readVersion({ versionId: p[1] }), after = await store.readVersion({ versionId: p[2] });
      const project = selected => ({ ...structuredClone(selected.state), sources: structuredClone(selected.version.sources), outputs: structuredClone(selected.version.previews) });
      const sourceText = async selected => {
        const texts = {};
        for (const ref of selected.version.sources) {
          if (!/^(text\/|application\/(json|javascript|xml)|image\/svg\+xml)/.test(ref.mediaType)) continue;
          const path = resolve(p[0], ref.path), stat = await lstat(path);
          if (!stat.isFile() || stat.isSymbolicLink()) throw new CliError('CORRUPT_STATE', 'Selected retained source is not a regular file.', { category: 'operation', stage: 'source-verification', nextStep: 'Inspect the selected project recovery inventory.' });
          if (stat.size > 1024 * 1024) continue;
          const bytes = await readFile(path);
          if (createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw new CliError('CORRUPT_STATE', 'Selected retained source hash changed.', { category: 'operation', stage: 'source-verification', nextStep: 'Inspect the selected project recovery inventory.' });
          try { texts[ref.id] = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
          catch { /* Unsupported text encoding remains not-run, not fabricated normalized text. */ }
        }
        return texts;
      };
      write(api.compareProjectVersions({ before: project(before), after: project(after), sourceTexts: { before: await sourceText(before), after: await sourceText(after) } })); return 0;
    }
    if (operation === 'recover') {
      const modes = ['--inspect', '--select', '--release-lock'].filter(key => Object.hasOwn(flags, key));
      if (modes.length !== 1) throw usageError('recover requires exactly one of --inspect, --select or --release-lock');
      if (modes[0] === '--inspect') {
        if (Object.keys(flags).length !== 1) throw usageError('--inspect cannot be combined with recovery write options');
        write(await store.recover({ mode: 'inspect' })); return 0;
      }
      if (!flags['--reason']?.trim()) throw usageError('recovery writes require --reason TEXT');
      if (modes[0] === '--select') {
        const commitHash = hash(flags['--select'], '--select');
        if (commitHash === null) throw usageError('--select requires a SHA-256 hash');
        write(await store.recover({ mode: 'select', commitHash, expectedHeadHash: hash(flags['--expected-head'], '--expected-head'), expectedHeadFileHash: hash(flags['--expected-head-file'], '--expected-head-file'), reason: flags['--reason'] }));
      }
      else {
        if (flags['--expected-head'] !== undefined || flags['--expected-head-file'] !== undefined) throw usageError('--release-lock cannot use head selection options');
        write(await store.recover({ mode: 'release-lock', expectedLockToken: flags['--release-lock'], reason: flags['--reason'] }));
      }
      return 0;
    }
  }
  throw usageError(entry.syntax);
}
