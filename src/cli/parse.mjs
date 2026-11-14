import { inventoryFor } from './commands.mjs';
import { usageError } from './errors.mjs';
export function parseCommand(input, product = 'ingenium') {
  if (!Array.isArray(input) || input.some(x => typeof x !== 'string')) throw usageError('arguments must be strings');
  // Help deliberately wins before all validation, file reads and dynamic adapter imports.
  if (!input.length || input.includes('--help') || input.includes('-h') || input[0] === 'help') {
    const words = (input[0] === 'help' ? input.slice(1) : input).filter(x => !x.startsWith('-'));
    return { help: true, topic: words.slice(0, 2).join(' '), format: input.includes('--json') || input.some((v, i) => v === '--format' && input[i + 1] === 'json') ? 'json' : 'text', modern: true };
  }
  const inventory = inventoryFor(product);
  const entry = [...inventory].sort((a, b) => b.path.length - a.path.length).find(c => c.path.split(' ').every((word, i) => input[i] === word));
  if (!entry) throw usageError(`unknown command; run ${product} help`);
  const values = input.slice(entry.path.split(' ').length), positionals = [], flags = {};
  let format;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!value.startsWith('--')) { if (value.startsWith('-')) throw usageError(`unsupported flag ${value}`); positionals.push(value); continue; }
    if (value === '--json') { if (format !== undefined) throw usageError('choose one output format'); format = 'json'; continue; }
    if (value === '--format') { if (format !== undefined || !['text', 'json'].includes(values[i + 1])) throw usageError('--format requires text or json, once'); format = values[++i]; continue; }
    if (!entry.flags.includes(value) || Object.hasOwn(flags, value)) throw usageError(`unknown or duplicate flag ${value}`);
    if (entry.booleans?.includes(value)) { flags[value] = true; continue; }
    if (values[i + 1] === undefined || values[i + 1].startsWith('--') || !values[i + 1].trim()) throw usageError(`${value} requires a nonempty value`);
    flags[value] = values[++i];
  }
  if (positionals.length < entry.min || positionals.length > entry.max) throw usageError(entry.syntax);
  if (flags['--renderer-dir'] !== undefined && flags['--sharp-module'] !== undefined) throw usageError('choose --renderer-dir or --sharp-module');
  const args = [...entry.path.split(' '), ...positionals, ...Object.entries(flags).flatMap(([k, v]) => v === true ? [k] : [k, v])];
  return { entry, positionals, flags, args, format: format ?? (entry.modern ? 'text' : 'json'), modern: !!entry.modern };
}
