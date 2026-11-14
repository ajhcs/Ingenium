/** Inert command inventory shared by validation, help and both entrypoints. */
const renderer = ['--renderer-dir', '--sharp-module'];
const browser = ['--adapter-dir', '--executable-path'];
const row = (path, syntax, min, max = min, flags = [], extra = {}) => ({ path, syntax, min, max, flags, ...extra });
const selected = { catalog: ['capabilities', 'search', 'inspect', 'acquire', 'preview'], 'svg-pack': ['categories', 'search', 'inspect', 'acquire', 'preview'], 'font-pack': ['capabilities', 'search', 'details', 'inspect', 'acquire', 'preview'], atomic: ['capabilities', 'search', 'discover', 'navigate', 'inspect', 'acquire', 'preview', 'prepare'], 'local-assets': ['capabilities', 'discover', 'search', 'details', 'acquire'], 'font-download': ['capabilities', 'search', 'details', 'acquire'], 'brand-download': ['capabilities', 'search', 'discover', 'details', 'acquire', 'prepare'] };
export const commands = Object.freeze([
  row('version', 'version', 0, 0, [], { modern: true }),
  row('health', 'health [--renderer-dir DIR | --sharp-module MODULE] [--adapter-dir DIR] [--executable-path FILE] [--python FILE] [--probes IDS] [--require ID]', 0, 0, [...renderer, ...browser, '--python', '--probes', '--require'], { modern: true }),
  row('capabilities', 'capabilities [--renderer-dir DIR | --sharp-module MODULE]', 0, 0, renderer),
  row('check', 'check RECORD.json', 1),
  row('render', 'render SOURCE.svg NEW_OUTPUT.png [--renderer-dir DIR | --sharp-module MODULE]', 2, 2, renderer),
  row('review', 'review FIXTURE.json NEW_OUTPUT_DIR [--adapter-dir DIR] [--executable-path FILE] [--renderer-dir DIR] [--previous REPORT.json]', 2, 2, [...browser, '--renderer-dir', '--previous']),
  row('resources discover', 'resources discover', 0),
  row('resources search', 'resources search PROVIDER_ID [REQUEST.json]', 1, 2),
  row('resources details', 'resources details PROVIDER_ID [REQUEST.json]', 1, 2),
  row('resources task-search', 'resources task-search REQUEST.json', 1, 1, [], { modern: true }),
  row('resources task-detail', 'resources task-detail REQUEST.json', 1, 1, [], { modern: true }),
  row('resources task-acquire', 'resources task-acquire REQUEST.json NEW_OUTPUT_DIR [--allow-network]', 2, 2, ['--allow-network'], { modern: true, booleans: ['--allow-network'] }),
  row('textures discover', 'textures discover', 0), row('textures export', 'textures export SPEC.json NEW_OUTPUT_DIR', 2),
  ...Object.entries(selected).flatMap(([family, operations]) => operations.map(op =>
    ['capabilities', 'categories'].includes(op) ? row(`${family} ${op}`, `${family} ${op} CONFIG.json`, 1)
      : ['acquire', 'preview', 'prepare'].includes(op) ? row(`${family} ${op}`, `${family} ${op} CONFIG.json REQUEST.json NEW_OUTPUT_DIR`, 3)
      : row(`${family} ${op}`, `${family} ${op} CONFIG.json [REQUEST.json]`, 1, 2))),
  row('shapes discover', 'shapes discover', 0), row('shapes create', 'shapes create PARAMETERS.json NEW_OUTPUT_DIR', 2),
  row('palettes discover', 'palettes discover [QUERY]', 0, 1), row('palettes inspect', 'palettes inspect ID', 1), row('palettes export', 'palettes export SPEC.json NEW_OUTPUT_DIR', 2),
  row('materials discover', 'materials discover CONFIG.json [QUERY]', 1, 2), row('materials capabilities', 'materials capabilities CONFIG.json', 1), row('materials inspect', 'materials inspect CONFIG.json ID', 2), row('materials acquire', 'materials acquire CONFIG.json SELECTION.json NEW_OUTPUT_DIR', 3),
  ...['items', 'ui'].flatMap(family => [row(`${family} discover`, `${family} discover CONFIG.json [QUERY]`, 1, 2), row(`${family} inspect`, `${family} inspect CONFIG.json SELECTION.json`, 2), row(`${family} acquire`, `${family} acquire CONFIG.json SELECTION.json NEW_OUTPUT_DIR`, 3)]),
  row('ui capabilities', 'ui capabilities CONFIG.json', 1),
  row('library capabilities', 'library capabilities CONFIG.json', 1), row('library search', 'library search CONFIG.json font|symbol QUERY', 3), row('library details', 'library details CONFIG.json SELECTION.json', 2), row('library acquire', 'library acquire CONFIG.json SELECTION.json NEW_OUTPUT_DIR', 3),
  row('project continue', 'project continue CONTINUATION.json', 1, 1, [], { modern: true }),
  row('project history', 'project history STORE_DIR [--offset N] [--limit N]', 1, 1, ['--offset', '--limit'], { modern: true }),
  row('project diff', 'project diff STORE_DIR FROM_VERSION TO_VERSION', 3, 3, [], { modern: true }),
  row('project recover', 'project recover STORE_DIR --inspect | --select HASH --expected-head HASH|missing --expected-head-file HASH|missing --reason TEXT | --release-lock TOKEN --reason TEXT', 1, 1, ['--inspect', '--select', '--expected-head', '--expected-head-file', '--reason', '--release-lock'], { modern: true, booleans: ['--inspect'] }),
  row('project open-version', 'project open-version STORE_DIR VERSION_ID NEW_OUTPUT_DIR', 3, 3, [], { modern: true }),
]);
export const toolCommands = Object.freeze([
  ...commands.filter(c => ['version', 'health'].includes(c.path)),
  row('capabilities', 'capabilities [--adapter-dir DIR] [--executable-path FILE]', 0, 0, browser),
  row('inspect', 'inspect LOOPBACK_URL NEW_OUTPUT_DIR [--config JSON] [--previous SNAPSHOT.json] [--adapter-dir DIR] [--executable-path FILE]', 2, 2, [...browser, '--config', '--previous']),
  row('inspect-set', 'inspect-set PLAN.json NEW_OUTPUT_DIR [--previous SNAPSHOT.json] [--adapter-dir DIR] [--executable-path FILE]', 2, 2, [...browser, '--previous'], { modern: true }),
]);
export const inventoryFor = product => product === 'ingenium-tools' ? toolCommands : commands;
