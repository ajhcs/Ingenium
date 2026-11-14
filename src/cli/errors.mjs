export class CliError extends Error {
  constructor(code, message, { category = 'usage', stage = 'preflight', nextStep = 'Run the command with --help for supported arguments.', ...details } = {}) {
    super(message); Object.assign(this, { code, category, stage, nextStep, ...details });
  }
}
export const usageError = message => new CliError('USAGE_INVALID', `Usage: ${message}`);
export function errorPayload(error, fallbackStage = 'operation') {
  const canceled = error?.name === 'AbortError' || error?.code === 'ABORT_ERR' || error?.code === 'CANCELED';
  const unavailable = ['INGENIUM_RENDERER_ABSENT', 'CAPABILITY_UNAVAILABLE', 'MODULE_UNAVAILABLE'].includes(error?.code);
  const category = error?.category ?? (error instanceof SyntaxError ? 'usage' : unavailable ? 'unavailable' : /LOCKED|STALE_HEAD|REPLAY_CONFLICT|EEXIST/.test(error?.code ?? '') ? 'conflict' : 'operation');
  const code = canceled ? 'CANCELED' : error?.code ?? (error instanceof SyntaxError ? 'JSON_INVALID' : 'OPERATION_FAILED');
  const message = error instanceof SyntaxError ? 'Malformed JSON input.' : String(error?.message ?? 'Operation failed.');
  const detail = { schema: 'ingenium-error/1', code, category, message,
    stage: error?.stage ?? error?.details?.stage ?? (category === 'usage' ? 'preflight' : fallbackStage),
    nextStep: error?.nextStep ?? (canceled ? 'Inspect retained outputs; retry with a new output destination.' : category === 'usage' ? 'Correct the input and run the command with --help.' : unavailable ? 'Select an existing optional tool using the documented selector; retry explicitly.' : 'Inspect the reported stage and retained outputs before retrying.'),
    ...(error?.field ? { field: error.field } : {}),
    successfulOutputs: error?.successfulOutputs ?? error?.details?.successfulFiles?.map(file => typeof file === 'string' ? file : file.path) ?? [], incompleteOutputs: error?.incompleteOutputs ?? [] };
  return { payload: { error: message, code, ...(error?.setup ? { setup: error.setup } : {}), ...detail }, exitCode: canceled ? 130 : ['usage', 'unavailable'].includes(category) ? 2 : 1 };
}
export function resultExit(result) {
  if (result?.cancelled) return 130;
  if (['error', 'fail', 'failed'].includes(result?.status)) return 1;
  if ((result?.counts?.error ?? 0) > 0 || (result?.counts?.fail ?? 0) > 0) return 1;
  const coverage = result?.coverage;
  if (coverage && ['failed', 'errors'].some(key => typeof coverage[key] === 'number' && coverage[key] > 0)) return 1;
  if (result?.status === 'not-run' && result?.complete !== true) return 2;
  if (coverage && ['missing', 'notRun', 'not-run'].some(key => typeof coverage[key] === 'number' && coverage[key] > 0)) return 2;
  return 0;
}
