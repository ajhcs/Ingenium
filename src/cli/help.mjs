import { inventoryFor } from './commands.mjs';
export function commandHelp({ product = 'ingenium', topic = '' } = {}) {
  const all = inventoryFor(product), matching = all.filter(c => c.path === topic || c.path.startsWith(topic + ' '));
  const entries = matching.length ? matching : all;
  return { schema: 'ingenium-help/1', product, topic: matching.length ? topic : '',
    commands: entries.map(({ path, syntax, modern }) => ({ path, usage: `${product} ${syntax}`, defaultFormat: modern ? 'text' : 'json' })),
    options: ['--help or -h anywhere: no probes, writes or network', '--format text|json; --json aliases --format json'],
    notes: ['NEW_OUTPUT destinations must not exist. Sources remain separate from exports.', 'Discovery is offline. Only explicit selected acquisition with allowNetwork/--allow-network may use network.', 'Optional adapters are never installed automatically; an explicit selector never falls back.', 'Version and help do not establish installed-client integration.'],
    examples: product === 'ingenium-tools' ? [
      `${product} inspect http://127.0.0.1:3000 new-evidence --adapter-dir existing-adapters`,
      `${product} inspect-set plan.json new-evidence --json`,
    ] : [`${product} shapes create shape.json new-shape`, `${product} render source.svg new-preview.png --renderer-dir existing-renderer`, `${product} project history selected-store --limit 10`],
    outputs: product === 'ingenium-tools' ? ['inspect: observations, screenshots, inventory, report and summary JSON', 'inspect-set: run.json progress; completed snapshot/report files only after execution'] : ['shapes create: editable shape.json and shape.svg', 'render: separate PNG plus hashes in the result', 'project open-version: verified historical files in a new directory; no editor launch'] };
}
export function formatText(value) {
  if (value?.schema === 'ingenium-help/1') return [`Usage: ${value.product} COMMAND [--help]`, ...value.commands.map(c => `  ${c.usage}`), '', ...value.options, ...value.notes, '', ...value.examples.map(e => `Example: ${e}`), ...value.outputs].join('\n');
  if (value?.schema === 'ingenium-version/1') return `${value.product} ${value.version}\n${value.prepared ? `Build ${value.release.buildId} (${value.release.artifactFlavor})` : 'Development checkout; release identity is unprepared.'}`;
  if (value?.schema === 'ingenium-health/1') return [value.product + ' health', ...value.capabilities.map(c => `${c.id}: ${c.status}${c.version ? ` (${c.version})` : ''}${c.reason ? ` — ${c.reason}` : ''}`), ...value.nextSteps].join('\n');
  if (value?.error) return `${value.code ?? 'ERROR'}: ${value.message ?? value.error}\nStage: ${value.stage ?? 'operation'}\nNext: ${value.nextStep ?? 'Inspect retained evidence.'}${value.successfulOutputs?.length ? '\nRetained outputs: ' + value.successfulOutputs.join(', ') : ''}${value.incompleteOutputs?.length ? '\nIncomplete outputs: ' + value.incompleteOutputs.join(', ') : ''}`;
  if (value?.schema === 'ingenium-continuation-summary/1') return [
    `Project ${value.projectId}, revision ${value.revision}`,
    ...value.openingSources.map(ref => `Source: ${ref.path}`),
    ...(value.choices ?? []).map(choice => `Choice ${choice.id} (${choice.state ?? choice.status ?? 'recorded'}): ${choice.statement ?? choice.summary ?? choice.id}`),
    ...(value.openQuestions ?? []).map(question => `Question: ${question.question}`),
    `Next: ${value.nextAction ?? 'No next action recorded.'}`,
    'Validated continuation; no new save was requested.',
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
