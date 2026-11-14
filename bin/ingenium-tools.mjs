#!/usr/bin/env node
import { executeCli, runBinary, isEntrypoint, readJson } from '../src/cli/runtime.mjs';
import { dispatchModern } from '../src/cli/dispatch.mjs';
import { CliError, resultExit } from '../src/cli/errors.mjs';
export async function main(args, write, { signal } = {}) {
  return executeCli(args, write, { product: 'ingenium-tools', signal, dispatch: async (parsed, emit) => {
    if (['health', 'version'].includes(parsed.entry.path)) return dispatchModern(parsed, emit, { product: 'ingenium-tools', signal });
    const flags = parsed.flags, options = {};
    for (const [flag, key] of Object.entries({ '--adapter-dir': 'adapterDir', '--executable-path': 'executablePath', '--previous': 'previousSnapshotPath' })) if (flags[flag] !== undefined) options[key] = flags[flag];
    if (parsed.entry.path === 'capabilities') {
      const { createBrowserSession } = await import('../src/browser/index.mjs');
      const prepared = await createBrowserSession(options);
      try { emit({ status: prepared.status, ...prepared.capability, operations: ['inspect', 'preservation-comparison'], downloads: false, hooks: false }); }
      finally { await prepared.session?.close(); }
      return resultExit(prepared);
    }
    const api = await import('../src/project/index.mjs');
    if (parsed.entry.path === 'inspect-set') {
      const plan = await readJson(parsed.positionals[0], { maxBytes: 1024 * 1024 });
      if (typeof api.inspectProjectSet !== 'function') throw new CliError('MODULE_UNAVAILABLE', 'Multi-route inspection is unavailable in this package.', { category: 'unavailable' });
      const validation = api.validateInspectionPlan(plan);
      if (!validation.valid) { const first = validation.errors[0]; throw new CliError(first?.code ?? 'CONFIG_INVALID', first?.message ?? 'Invalid inspection plan.', { field: first?.path, nextStep: first?.nextStep }); }
      const result = await api.inspectProjectSet({ plan, outputDir: parsed.positionals[1], ...options, signal });
      emit(result); return resultExit(result);
    }
    if (flags['--config']) {
      const config = await readJson(flags['--config']);
      if (!config || Object.keys(config).some(key => key !== 'profiles') || !Array.isArray(config.profiles)) throw new CliError('CONFIG_INVALID', 'Config accepts only profiles.');
      options.profiles = config.profiles;
    }
    const result = await api.inspectProject({ url: parsed.positionals[0], outputDir: parsed.positionals[1], ...options });
    emit(result); return resultExit(result);
  } });
}
if (await isEntrypoint(import.meta.url)) process.exitCode = await runBinary(main, process.argv.slice(2));
