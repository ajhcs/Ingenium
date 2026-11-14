import { readdir, lstat, readFile, realpath } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCommand } from './parse.mjs';
import { commandHelp, formatText } from './help.mjs';
import { errorPayload, CliError } from './errors.mjs';
export async function readJson(path, { maxBytes = 8 * 1024 * 1024 } = {}) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size > maxBytes) throw new CliError('JSON_INPUT_INVALID', 'JSON input must be a bounded regular file.');
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error instanceof SyntaxError) throw new CliError('JSON_INVALID', 'Malformed JSON input.'); throw error; }
}
function outputDestination(parsed) {
  const p = parsed.positionals, path = parsed.entry?.path;
  if (path === 'render') return { path: p[1], file: true };
  if (['review', 'inspect', 'inspect-set', 'resources task-acquire', 'shapes create', 'palettes export', 'textures export'].includes(path)) return { path: p[1] };
  if (path === 'project open-version' || / (?:acquire|preview|prepare)$/.test(path ?? '')) return { path: p.at(-1) };
}
async function snapshot(destination) {
  if (!destination) return [];
  const root = resolve(destination.path), files = [];
  try {
    if (destination.file) return (await lstat(root)).isFile() ? [root] : [];
    const walk = async (directory, depth = 0) => {
      if (depth > 10 || files.length >= 512) return;
      for (const item of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, item.name);
        if (item.isFile()) files.push(path);
        else if (item.isDirectory()) await walk(path, depth + 1);
        if (files.length >= 512) break;
      }
    };
    await walk(root); return files.sort();
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
/** Collect the one callback payload before presentation so interruption receipts stay truthful. */
export async function executeCli(args, write, { product = 'ingenium', signal, dispatch } = {}) {
  let parsed, payload, exitCode;
  const emit = value => { payload = value; };
  let destination, destinationWasAbsent = false;
  try {
    parsed = parseCommand(args, product);
    if (parsed.help) { payload = commandHelp({ product, topic: parsed.topic }); exitCode = 0; }
    else {
      destination = outputDestination(parsed);
      if (destination) {
        try { await lstat(resolve(destination.path)); }
        catch (error) { if (error.code === 'ENOENT') destinationWasAbsent = true; }
      }
      if (signal?.aborted) throw Object.assign(new Error('Interrupted before execution.'), { code: 'CANCELED' });
      exitCode = await dispatch(parsed, emit, { signal });
    }
  } catch (error) {
    ({ payload, exitCode } = errorPayload(error, parsed?.entry?.path ?? 'preflight'));
    if (product === 'ingenium-tools' && payload.category === 'usage') payload.usage = commandHelp({ product }).commands.map(command => command.usage).join(' | ');
  }
  if (!parsed?.help && (signal?.aborted || payload?.schema === 'ingenium-error/1')) {
    let outputs = [];
    if (destinationWasAbsent) try { outputs = await snapshot(destination); } catch { /* no claim about unreadable outputs */ }
    const successfulOutputs = payload?.successfulOutputs ?? payload?.successfulFiles?.map(file => resolve(destination?.path ?? '.', typeof file === 'string' ? file : file.path)) ?? [];
    const incompleteOutputs = [...new Set([...(payload?.incompleteOutputs ?? []), ...outputs.filter(file => !successfulOutputs.includes(file))])];
    if (signal?.aborted) ({ payload, exitCode } = errorPayload(Object.assign(new Error('Interrupted; retained outputs may be complete or partial.'), { code: 'CANCELED', stage: parsed?.entry?.path ?? 'preflight', successfulOutputs, incompleteOutputs })));
    else Object.assign(payload, { successfulOutputs, incompleteOutputs });
  }
  if (write) write(payload);
  else console.log(parsed?.format === 'text' ? formatText(payload) : JSON.stringify(payload, null, 2));
  return exitCode;
}
export async function runBinary(main, args) {
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.on('SIGINT', interrupt);
  try { return await main(args, undefined, { signal: controller.signal }); }
  finally { process.off('SIGINT', interrupt); }
}

export async function isEntrypoint(metaURL, argument = process.argv[1]) {
  if (!argument || argument === '-') return false;
  try { return fileURLToPath(metaURL) === await realpath(argument); }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
