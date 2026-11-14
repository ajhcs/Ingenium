import { inventoryFor } from './commands.mjs';
// Portable examples use synthetic filenames and existing explicitly selected tools.
const argumentsByName = {
  'RECORD.json': 'Records-v1 JSON to validate; no files are changed.',
  'CONTINUATION.json': 'Portable project envelope; current refs resolve from this file directory.',
  'STORE_DIR': 'Existing trusted local project root containing the optional .ingenium store.',
  'VERSION_ID': 'Retained named version ID or commit:<sha256>.',
  'FROM_VERSION': 'Earlier retained named version ID or commit:<sha256>.',
  'TO_VERSION': 'Later retained named version ID or commit:<sha256>.',
  'CONFIG.json': 'Explicit local source/adapter configuration; its paths resolve relative to this file.',
  'REQUEST.json': 'Operation request JSON identifying the selected resource or bounded search.',
  'SELECTION.json': 'Selected resource identity and any supported authored controls.',
  'SPEC.json': 'Authored parameters, selection and optional supported customization.',
  'PARAMETERS.json': 'Shape kind and authored geometric parameters.',
  'PLAN.json': 'Inspection plan v1: loopback origin, routes, profiles, states and budgets.',
  'FIXTURE.json': 'Explicit local review fixture and authored review scope.',
  'SOURCE.svg': 'Editable source SVG; supported static admission is checked before rendering.',
  'NEW_OUTPUT.png': 'Absent destination PNG file with an existing parent directory.',
  'NEW_OUTPUT_DIR': 'Absent destination directory; exclusive creation preserves earlier outputs.',
  'LOOPBACK_URL': 'Selected HTTP loopback project URL; start its server separately.',
  'PROVIDER_ID': 'Provider ID returned by resources discover.',
  'ID': 'Exact ID returned by this family discovery/search.',
  'QUERY': 'Bounded search text; quote text containing spaces.',
};
const examples = {
  version: 'version --json', health: 'health --probes browser --adapter-dir existing-adapters --require browser',
  capabilities: 'capabilities', check: 'check record.json', render: 'render source.svg new-preview.png --renderer-dir existing-renderer',
  review: 'review fixture.json new-review --adapter-dir existing-adapters',
  inspect: 'inspect http://127.0.0.1:3000 new-evidence --config profiles.json --adapter-dir existing-adapters',
  'inspect-set': 'inspect-set plan.json new-route-evidence --json',
  'resources discover': 'resources discover', 'resources search': 'resources search tabler request.json',
  'resources details': 'resources details tabler request.json',
  'resources task-search': 'resources task-search task-query.json --json',
  'resources task-detail': 'resources task-detail selected-resource.json --json',
  'resources task-acquire': 'resources task-acquire selected-request.json new-resource --json',
  'project continue': 'project continue continuation.json --json',
  'project history': 'project history selected-store --offset 0 --limit 10 --json',
  'project diff': 'project diff selected-store first-direction second-direction --json',
  'project open-version': 'project open-version selected-store first-direction new-editable-copy',
  'project recover': 'project recover selected-store --inspect --json',
  'shapes discover': 'shapes discover', 'shapes create': 'shapes create shape.json new-shape',
  'palettes discover': 'palettes discover green', 'palettes inspect': 'palettes inspect radix-green-light',
  'palettes export': 'palettes export palette.json new-palette',
  'textures discover': 'textures discover', 'textures export': 'textures export texture.json new-texture',
  'library search': 'library search sources.json symbol arrow',
};
const outputs = {
  version: 'Package version and retained release identity, or an explicit unprepared checkout identity.',
  health: 'Each requested capability reports usable, absent, error or not-selected with next steps. --require returns 1 for error, 2 for absent/not-selected.',
  capabilities: 'Observed optional capability status and supported operations; no installation or output files.',
  check: 'valid and errors for the record; failed validation exits 1 without rewriting it.',
  render: 'Separate PNG plus source/output hashes, dimensions and renderer identity; source bytes stay unchanged.',
  review: 'Retained fixture review evidence and common report; missing coverage is not a pass.',
  inspect: 'Observations, screenshots, inventory, report and summary JSON for the supplied profiles. Missing browser coverage exits 2.',
  'inspect-set': 'run.json progress, observations/screenshots and snapshot/report files. Read complete and requested/captured/failed/missing coverage before reuse.',
  'project continue': 'Brief, exact recorded choices, questions, next action and current source/preview hash checks relative to the continuation directory. Missing/changed refs exit 1; no store, save or editor launch. Linked dependency completeness and historical refs are outside this check.',
  'project history': 'Read-only newest-first commit entries and nextOffset for the requested page.',
  'project diff': 'Read-only structured differences, verified bounded text comparison and explicit not-run runtime behavior.',
  'project open-version': 'Verified historical source/preview closure and CONTINUATION.md in a newly created directory; no editor launch.',
  'project recover': 'Read-only recovery inventory with --inspect; writes require explicit observed identities and a reason. No automatic promotion or pruning.',
  'shapes create': 'Editable shape.json and shape.svg in the new directory with retained source identity.',
  'palettes export': 'palette.json, palette.css and palette.svg; generated/selected color data does not establish user acceptance.',
  'textures export': 'Editable authored texture source and separate export/provenance files in the new directory.',
};
const familyNames = { catalog: 'catalog entries', 'svg-pack': 'selected SVG pack entries', 'font-pack': 'font faces and proofs', atomic: 'atomic native UI wrappers', 'local-assets': 'user-local asset entries', 'font-download': 'selected font examples', 'brand-download': 'selected brand originals', shapes: 'original geometric shapes', palettes: 'palette scales', textures: 'original texture examples', materials: 'local CSS materials', items: 'selected local items', ui: 'native UI wrappers', library: 'explicit local font/symbol packages', resources: 'provider resource metadata' };
const flagMeanings = {
  '--renderer-dir': 'Existing user-owned npm directory containing optional Sharp; no fallback from this selector.',
  '--sharp-module': 'Explicit existing Sharp module locator; mutually exclusive with --renderer-dir.',
  '--adapter-dir': 'Existing local Playwright/axe adapter directory; no install or download.',
  '--executable-path': 'Existing browser executable for the selected browser adapter.',
  '--python': 'Existing isolated Python interpreter for the optional font/vector probe.',
  '--probes': 'Comma-separated subset of renderer,browser,font-vector,resources.',
  '--require': 'Required capability ID: usable exits 0, absent/not-selected exits 2, error exits 1.',
  '--previous': 'Existing compatible baseline JSON; inspect requires v1 and inspect-set requires v2. Invalid input refuses before output.',
  '--config': 'Legacy JSON containing only profiles; validation paths refer to this supplied configuration.',
  '--allow-network': 'Enable only the explicitly selected supported acquisition route; default is offline.',
  '--offset': 'Nonnegative history entry offset, default 0.', '--limit': 'History page size 1..128, default 24.',
  '--inspect': 'Read-only recovery inventory; cannot combine with recovery write options.',
  '--select': 'Exact inspected commit SHA-256 to recover explicitly.',
  '--expected-head': 'Observed head commit SHA-256 or missing; required for selection.',
  '--expected-head-file': 'Observed HEAD file SHA-256 or missing; required for selection.',
  '--reason': 'Nonempty authored reason for a recovery write.',
  '--release-lock': 'Exact inspected abandoned lock token; requires positive local process-instance absence.',
};
function helpDetails(command, product) {
  const [family, operation] = command.path.split(' ');
  const arguments_ = [...new Set(command.syntax.match(/\b(?:[A-Z][A-Z_]*(?:\.json|\.svg|\.png)?|font\|symbol)\b/g) ?? [])]
    .filter(token => argumentsByName[token] || token === 'font|symbol')
    .map(token => ({ name: token, meaning: argumentsByName[token] ?? 'Explicit local package kind: font or symbol.' }));
  arguments_.push(...command.flags.map(name => ({ name, meaning: name === '--previous' && command.path === 'review' ? 'Existing common review report JSON for report comparison; retain its scoped evidence and environment identity.' : flagMeanings[name] })));
  let example = examples[command.path];
  if (!example) {
    const config = 'sources.json';
    if (['acquire', 'preview', 'prepare'].includes(operation)) example = `${command.path} ${config} selection.json new-${family}-${operation}`;
    else if (['inspect', 'details'].includes(operation)) example = `${command.path} ${config} ${family === 'materials' ? 'selected-id' : 'selection.json'}`;
    else if (operation === 'discover' && ['items', 'ui', 'materials'].includes(family)) example = `${command.path} ${config} paper`;
    else example = `${command.path} ${config}${['search', 'discover', 'navigate'].includes(operation) ? ' request.json' : ''}`;
  }
  let output = outputs[command.path];
  if (!output) {
    const subject = familyNames[family] ?? family;
    output = ['acquire', 'preview', 'prepare'].includes(operation)
      ? `Selected ${subject}: separate retained originals/derivatives, notices and provenance in the new directory. Unsupported selections refuse; availability is not rights or acceptance.`
      : operation === 'capabilities' ? `Optional adapter/source availability and operations for ${subject}; explicit selectors never fall back.`
        : ['inspect', 'details'].includes(operation) ? `Selected ${subject} identity, available detail/proof metadata and source rights; inline source text is represented by byte lengths where applicable.`
          : `Bounded offline ${subject} ${operation} results with IDs for explicit follow-up selection; no acquisition or network request.`;
  }
  return { arguments: arguments_, examples: [`${product} ${example}`], outputs: [output] };
}

export function commandHelp({ product = 'ingenium', topic = '' } = {}) {
  const all = inventoryFor(product), matching = all.filter(c => c.path === topic || c.path.startsWith(topic + ' '));
  const entries = matching.length ? matching : all;
  return { schema: 'ingenium-help/1', product, topic: matching.length ? topic : '',
    commands: entries.map(command => ({ path: command.path, usage: `${product} ${command.syntax}`, defaultFormat: command.modern ? 'text' : 'json', ...helpDetails(command, product) })),
    options: ['--help or -h anywhere: no probes, writes or network', '--format text|json; --json aliases --format json'],
    notes: ['NEW_OUTPUT destinations must not exist. Sources remain separate from exports.', 'Discovery is offline. Only explicit selected acquisition with allowNetwork/--allow-network may use network.', 'Optional adapters are never installed automatically; an explicit selector never falls back.', 'Version and help do not establish installed-client integration.'],
    examples: entries.flatMap(command => helpDetails(command, product).examples),
    outputs: entries.flatMap(command => helpDetails(command, product).outputs) };

}
export function formatText(value) {
  if (value?.schema === 'ingenium-help/1') return [`Usage: ${value.product} COMMAND [--help]`, ...value.commands.flatMap(c => [`  ${c.usage}`, ...c.arguments.map(argument => `    ${argument.name}: ${argument.meaning}`)]), '', ...value.options, ...value.notes, '', ...value.examples.map(e => `Example: ${e}`), ...value.outputs].join('\n');
  if (value?.schema === 'ingenium-version/1') return `${value.product} ${value.version}\n${value.prepared ? `Build ${value.release.buildId} (${value.release.artifactFlavor})` : 'Development checkout; release identity is unprepared.'}`;
  if (value?.schema === 'ingenium-health/1') return [value.product + ' health', ...value.capabilities.map(c => `${c.id}: ${c.status}${c.version ? ` (${c.version})` : ''}${c.reason ? ` — ${c.reason}` : ''}`), ...value.nextSteps].join('\n');
  if (value?.error) return `${value.code ?? 'ERROR'}: ${value.message ?? value.error}\nStage: ${value.stage ?? 'operation'}\nNext: ${value.nextStep ?? 'Inspect retained evidence.'}${value.successfulOutputs?.length ? '\nRetained outputs: ' + value.successfulOutputs.join(', ') : ''}${value.incompleteOutputs?.length ? '\nIncomplete outputs: ' + value.incompleteOutputs.join(', ') : ''}`;
  if (value?.schema === 'ingenium-continuation-summary/1') return [
    `Project ${value.projectId}, revision ${value.revision}`,
    `Brief: ${value.brief}`,
    ...value.openingSources.map(ref => `Source: ${ref.path}`),
    ...(value.choices ?? []).map(choice => `Choice ${choice.id} (${choice.state ?? choice.status ?? 'recorded'}): ${choice.choice ?? choice.question}`),
    ...(value.openQuestions ?? []).map(question => `Question: ${question.question}`),
    `Next: ${value.nextAction ?? 'No next action recorded.'}`,
    `Sources: ${value.sourceVerification.status} (${value.sourceVerification.verified}/${value.sourceVerification.refs.length} verified current sources/previews)`,
    ...value.sourceVerification.refs.filter(ref => ref.status !== 'verified').map(ref => `${ref.code}: ${ref.path} — ${ref.message}`),
    'Envelope validated; no new save was requested. Source checks do not establish linked dependency completeness or acceptance.',
  ].join('\n');
  if (value?.schema === 'ingenium-inspection-summary/1') return [
    `Inspection: ${value.status}; ${value.complete ? 'complete' : 'incomplete'}`,
    `Coverage: ${value.coverage.captured}/${value.coverage.requested} captured, ${value.coverage.failed} failed, ${value.coverage.missing} missing`,
    ...Object.entries(value.files ?? {}).map(([name, path]) => `${name}: ${path}`),
  ].join('\n');
  if (Array.isArray(value?.entries) && Object.hasOwn(value, 'nextOffset')) return [
    `${value.entries.length} entries${value.nextOffset === null ? '' : `; next offset ${value.nextOffset}`}`,
    ...value.entries.map(entry => entry.commitHash ? `Revision ${entry.revision}: ${entry.kind} — ${entry.summary}` : `${entry.providerId ?? ''}/${entry.assetId ?? entry.id ?? ''}: ${entry.title ?? entry.name ?? ''} (${entry.availability ?? 'metadata'})`),
    ...(value.sources ?? []).filter(source => source.status !== 'available').map(source => `${source.providerId}: ${source.status}${source.reason ? ' — ' + source.reason : ''}`),
  ].join('\n');
  if (value?.projectId && Array.isArray(value.changes)) return [
    `Project ${value.projectId}: revision ${value.beforeRevision} → ${value.afterRevision}`,
    `${value.changes.length} changes; ${value.unexpectedDifferences.length} not marked expected`,
    ...value.changes.map(change => `${change.path}: ${change.kind}${change.expected ? ' (expected)' : ''}`),
    `Behavior: ${value.behavior.status} — ${value.behavior.reason}`,
  ].join('\n');
  if (Array.isArray(value?.files)) return [
    value.selection ? `Acquired ${value.selection.providerId}/${value.selection.assetId}` : `Opening file: ${value.openingFile ?? 'See retained files'}`,
    ...value.files.map(file => file.path),
    ...(value.notices ? [`${value.notices.length} notice files retained.`] : []),
  ].join('\n');
  if (value?.providerId && value?.assetId) return [
    `${value.providerId}/${value.assetId}: ${value.title}`,
    `${value.availability}; source ${value.sourceRevision}`,
    `Qualified operations: ${value.qualifiedOperations.length ? value.qualifiedOperations.join(', ') : 'none recorded'}`,
    ...value.usage.limits,
  ].join('\n');
  // Remaining recovery inventories and legacy explicit text requests retain all data.
  return JSON.stringify(value, null, 2);
}
