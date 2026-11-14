import { lstat, readFile, mkdir, writeFile, rename, readdir, unlink } from 'node:fs/promises';
import { resolve, join, dirname, parse } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createProjectBrowserRun } from '../browser/index.mjs';
import { localProjectUrl } from '../browser/local-url.mjs';
import { createReport, hashIdentity } from '../checks/index.mjs';
import { compareInventories } from './preservation.mjs';
import { validateInspectionPlan, expandInspectionPlan } from './plan.mjs';
import { writeInspectionReport } from './report.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const writeJson = (path, value) => writeFile(path, json(value), { flag: 'wx' });
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value);
const same = (a, b) => hashIdentity(a) === hashIdentity(b);
const cellKey = c => hashIdentity({ routeId: c.routeId, normalizedURL: c.normalizedURL, profileId: c.scope.profile, stateId: c.scope.state, planHash: c.planHash, ...(c.scope.journey ? { journey: c.scope.journey, mode: c.journeyMode, predecessorChain: c.predecessorChain } : {}) });
const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => fields.includes(k));

export function validateInspectionSnapshot(snapshot) {
  try {
    hashIdentity(snapshot);
    if (!exact(snapshot, ['schema', 'originIdentity', 'planHash', 'cells']) || snapshot.schema !== 'ingenium-inspection-snapshot/2' || !hex(snapshot.originIdentity) || !hex(snapshot.planHash) || !Array.isArray(snapshot.cells) || snapshot.cells.length > 64) throw new TypeError('Expected an inspection snapshot v2 with at most64 cells');
    const keys = new Set(), scopes = new Set();
    for (const [index, c] of snapshot.cells.entries()) {
      if (!exact(c, ['routeId', 'normalizedURL', 'scope', 'planHash', 'inventory', 'sourceHash', 'captured', 'journeyMode', 'predecessorChain']) || !id(c.routeId) || !hex(c.planHash) || c.sourceHash !== undefined && !hex(c.sourceHash) || c.captured !== true) throw new TypeError(`Invalid snapshot cell ${index}`);
      const u = localProjectUrl(c.normalizedURL);
      if (c.normalizedURL !== u.href || snapshot.originIdentity !== hashIdentity({ origin: u.origin })) throw new TypeError(`Invalid snapshot URL/origin at cell ${index}`);
      if (!exact(c.scope, ['route', 'profile', 'state', 'journey', 'phase']) || c.scope.route !== c.routeId || !id(c.scope.profile) || !id(c.scope.state) || (c.scope.journey !== undefined && !id(c.scope.journey)) || c.scope.phase !== (c.scope.journey ? 'after-journey' : 'after-state-before-journeys')) throw new TypeError(`Invalid snapshot scope at cell ${index}`);
      if (c.scope.journey) { if (!['fresh', 'connected'].includes(c.journeyMode) || !Array.isArray(c.predecessorChain) || c.predecessorChain.length > 15 || c.predecessorChain.some(p => !id(p)) || new Set(c.predecessorChain).size !== c.predecessorChain.length || c.predecessorChain.includes(c.scope.journey) || c.journeyMode === 'fresh' && c.predecessorChain.length || c.journeyMode === 'connected' && !c.predecessorChain.length) throw new TypeError(`Invalid journey identity at cell ${index}`); }
      else if (c.journeyMode !== undefined || c.predecessorChain !== undefined) throw new TypeError(`Unexpected journey identity at cell ${index}`);
      if (!exact(c.inventory, ['version', 'items'])) throw new TypeError(`Invalid inventory at cell ${index}`);
      compareInventories(c.inventory, c.inventory);
      for (const item of c.inventory.items) {
        if (!exact(item, ['kind', 'key', 'attributes']) || typeof item.key !== 'string' || item.key.length > 65536 || !exact(item.attributes, ['tag', 'label', 'name', 'type', 'required', 'disabled', 'readonly', 'multiple', 'role', 'aria-required', 'href', 'action', 'method', 'formAction', 'formMethod', 'options', 'onclick', 'onsubmit', 'onchange', 'oninput'])) throw new TypeError(`Invalid inventory item at cell ${index}`);
        for (const [key, value] of Object.entries(item.attributes)) {
          if (key === 'options') { if (!Array.isArray(value) || value.length > 10000 || value.some(o => !exact(o, ['value', 'label', 'disabled']) || typeof o.value !== 'string' || typeof o.label !== 'string' || typeof o.disabled !== 'boolean')) throw new TypeError(`Invalid select options at cell ${index}`); }
          else if (typeof value !== 'string' || value.length > 65536) throw new TypeError(`Invalid inventory attribute at cell ${index}`);
        }
      }
      const scopeKey = hashIdentity(c.scope); if (scopes.has(scopeKey)) throw new TypeError(`Duplicate snapshot scope ${index}`); scopes.add(scopeKey);
      const key = cellKey(c); if (keys.has(key)) throw new TypeError(`Duplicate snapshot cell ${index}`); keys.add(key);
    }
    return { valid: true, errors: [] };
  } catch (error) { return { valid: false, errors: [{ code: 'INVALID_INSPECTION_SNAPSHOT', path: '$', message: error.message, nextStep: 'Select a valid v2 snapshot; v1 remains supported by inspectProject only.' }] }; }
}

async function preflightOutput(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('Select a new outputDir');
  const path = resolve(value), parent = dirname(path); let cursor = parse(parent).root;
  for (const part of parent.slice(cursor.length).split('/').filter(Boolean)) { cursor = join(cursor, part); const s = await lstat(cursor); if (!s.isDirectory() || s.isSymbolicLink()) throw new TypeError('Output parent must be an existing directory without symlink components'); }
  try { await lstat(path); const e = new Error('Output directory already exists'); e.code = 'EEXIST'; throw e; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  return path;
}
async function fileReceipts(root) {
  const result = [];
  async function walk(relative = '') {
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      const path = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && !entry.name.startsWith('.progress-') && entry.name !== 'manifest.json') { const bytes = await readFile(join(root, path)); result.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); }
      else throw new TypeError('Unexpected output entry');
    }
  }
  await walk(); return result.sort((a, b) => a.path.localeCompare(b.path));
}

/** Execute only an explicitly validated local route set. Optional signal is outside plan JSON. */
export async function inspectProjectSet({ plan, outputDir, previousSnapshotPath, adapterDir, executablePath, signal } = {}) {
  const validation = validateInspectionPlan(plan);
  if (!validation.valid) { const error = new TypeError(validation.errors.map(e => `${e.path}: ${e.message}`).join('\n')); error.code = 'INVALID_INSPECTION_PLAN'; error.category = 'usage'; error.stage = 'preflight'; error.field = validation.errors[0]?.path; error.errors = validation.errors; throw error; }
  plan = structuredClone(plan);
  if (signal !== undefined && (!(signal instanceof AbortSignal))) throw new TypeError('signal must be an AbortSignal');
  for (const [key, value] of Object.entries({ adapterDir, executablePath, previousSnapshotPath })) if (value !== undefined && (typeof value !== 'string' || !value.trim())) throw new TypeError(`${key} must be a nonempty string`);
  let previous;
  if (previousSnapshotPath) {
    const stat = await lstat(previousSnapshotPath); if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw Object.assign(new TypeError('Previous snapshot must be a regular file of at most8 MiB'), { code: 'INVALID_INSPECTION_SNAPSHOT', category: 'usage', stage: 'preflight', field: '--previous' });
    previous = JSON.parse(await readFile(previousSnapshotPath, 'utf8')); const valid = validateInspectionSnapshot(previous); if (!valid.valid) throw Object.assign(new TypeError(valid.errors[0].message), { code: 'INVALID_INSPECTION_SNAPSHOT', category: 'usage', stage: 'preflight', field: '--previous' });
  }
  const destination = await preflightOutput(outputDir), expanded = expandInspectionPlan(plan), planHash = hashIdentity(plan), originIdentity = hashIdentity({ origin: plan.origin });
  const coverage = { requested: expanded.cells.length, captured: 0, failed: 0, missing: expanded.cells.length, cells: expanded.cells.map(c => ({ scope: c.scope, status: 'missing' })) };
  const issues = [], snapshots = [], observations = [];
  let run, environment = { node: process.version, browser: 'unavailable' }, capability, interruption, prepared;
  const started = Date.now(), deadlineAt = started + plan.budgets.deadlineMs;
  const progress = () => ({ schema: 'ingenium-inspection-run/1', planHash, status: interruption ? 'partial' : 'running', startedAt: new Date(started).toISOString(), deadlineAt: new Date(deadlineAt).toISOString(), coverage, ...(interruption ? { interruption } : {}) });
  const atomicProgress = async (value = progress()) => { const temp = join(destination, '.progress-' + randomUUID()); await writeJson(temp, value); await rename(temp, join(destination, 'run.json')); };
  await mkdir(destination);
  try { await atomicProgress(); await mkdir(join(destination, 'raw')); await mkdir(join(destination, 'views')); }
  catch (error) {
    try { await writeJson(join(destination, 'INCOMPLETE.json'), { schema: 'ingenium-inspection-incomplete/1', stage: 'output-initialization', planHash, coverage }); } catch {}
    error.outputDir = destination; error.partial = true; throw error;
  }
  const stop = reason => { if (interruption) return; interruption = reason; void run?.close().catch(() => {}); };
  const abort = () => stop('cancelled'); signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => stop('deadline'), Math.max(1, deadlineAt - Date.now()));
  if (signal?.aborted) abort();
  const issue = (rule, scope, status, measurement, target = 'document') => issues.push({ rule, target, scope, status, measurement, assessment: 'exact' });
  const cellIndex = new Map(expanded.cells.map((c, i) => [c, i]));
  async function capture(cell, session, resume) {
    const index = cellIndex.get(cell), result = coverage.cells[index], key = `${String(index + 1).padStart(3, '0')}.${cell.scope.route}.${cell.scope.profile}.${cell.scope.state}${cell.journey ? '.' + cell.journey.id : ''}`;
    result.raw = 'raw/' + key + '.json';
    const screenshot = 'views/' + key + '.png';
    let observation;
    try {
      const setup = cell.journey ? [...(resume ? [] : cell.state.steps), ...cell.journey.steps] : cell.state.steps;
      observation = await session.inspect({ url: cell.normalizedURL, profile: cell.profile, state: { name: cell.state.id, steps: setup }, journeys: [], scope: cell.scope, resume, screenshotPath: join(destination, screenshot) });
      observation.raw.execution = { mode: cell.journey?.mode ?? 'fresh-state', predecessorChain: cell.chain?.slice(0, -1).map(j => j.id) ?? [], inherited: Boolean(resume), authoredActions: setup.length };
      issues.push(...observation.issues);
      if (cell.journey) {
        const ownSteps = (observation.raw.state ?? []).slice(resume ? 0 : cell.state.steps.length), assertions = ownSteps.filter(s => s.action.startsWith('expect'));
        issue('authored-journey-outcome', cell.scope, assertions.some(s => s.status === 'fail') ? 'fail' : assertions.length ? 'pass' : 'review-needed', { assertions: assertions.length, note: 'Only exact authored assertions establish outcomes; successful actions alone do not.' }, cell.journey.id);
      }
      await writeJson(join(destination, result.raw), observation);
      if (observation.raw.screenshotPath) result.screenshot = screenshot;
      result.dependencies = observation.raw.dependencies;
      const success = !interruption && observation.raw.inventory && !observation.issues.some(i => i.status === 'error' || i.rule === 'state-assertion' && i.status === 'fail');
      if (success) {
        result.status = 'captured'; coverage.captured++;
        const snapshotCell = { routeId: cell.routeId, normalizedURL: observation.raw.url, scope: cell.scope, planHash: cell.planHash, inventory: observation.raw.inventory, ...(observation.sourceHash ? { sourceHash: observation.sourceHash } : {}), captured: true, ...(cell.journey ? { journeyMode: cell.journey.mode, predecessorChain: cell.chain.slice(0, -1).map(j => j.id) } : {}) };
        snapshots.push(snapshotCell);
        if (previous) {
          const old = previous.cells.find(p => cellKey(p) === cellKey(snapshotCell));
          if (!old) issue('preservation-coverage', cell.scope, 'not-run', { reason: 'No baseline with the exact route URL, profile, state and setup/chain identity' });
          else { const delta = compareInventories(old.inventory, snapshotCell.inventory); issue('preservation-inventory', cell.scope, delta.removed.length || delta.changed.length ? 'fail' : 'pass', delta); }
        }
      } else { result.status = 'failed'; result.failedStage = interruption ?? 'setup-or-capture'; coverage.failed++; }
      observations.push({ scope: cell.scope, sourceHash: observation.sourceHash ?? null });
    } catch (error) {
      result.status = 'failed'; result.failedStage = interruption ?? 'capture-write'; coverage.failed++;
      issue('capture-execution', cell.scope, 'error', { reason: error.message });
    }
    coverage.missing--; await atomicProgress(); return result.status === 'captured';
  }
  try {
    if (!interruption) {
      const startup = createProjectBrowserRun({ url: plan.origin, allowedURLs: plan.routes.map(r => new URL(r.path, plan.origin).href), adapterDir, executablePath, timeoutMs: Math.max(1, deadlineAt - Date.now()) });
      // Startup must settle before returning any receipt: a late launcher may still own resources.
      prepared = await startup;
      capability = prepared?.capability;
      if (prepared?.run) { run = prepared.run; environment = capability.environment; }
      else if (!interruption) { interruption = 'capability'; issue('browser-capability', { route: 'all', profile: 'all', state: 'all', phase: 'preparation' }, prepared.status, prepared.capability); }
    }
    if (run) {
      const groups = [...expanded.cells.filter(c => !c.journey).map(c => [c]), ...expanded.chains];
      for (const group of groups) {
        if (interruption) break;
        let session;
        try {
          session = await run.createSession();
          for (let index = 0; index < group.length; index++) {
            if (interruption) break;
            if (!await capture(group[index], session, index > 0)) { for (const child of group.slice(index + 1)) coverage.cells[cellIndex.get(child)].failedStage = 'predecessor-failed'; break; }
          }
        } catch (error) { interruption = interruption ?? 'context'; issue('browser-context', group[0].scope, 'error', { reason: error.message }); }
        finally { try { await session?.close(); } catch (error) { interruption = interruption ?? 'cleanup'; issue('browser-cleanup', group[0].scope, 'error', { reason: error.message }); } }
      }
    }
  } catch (error) { interruption = interruption ?? 'execution'; issue('inspection-execution', { route: 'all', profile: 'all', state: 'all', phase: 'execution' }, 'error', { reason: error.message }); }
  finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abort);
    try { await run?.close(); } catch (error) { interruption = interruption ?? 'cleanup'; issue('browser-cleanup', { route: 'all', profile: 'all', state: 'all', phase: 'cleanup' }, 'error', { reason: error.message }); }
  }
  for (const cell of coverage.cells) if (cell.status === 'missing') { cell.failedStage ??= interruption ?? 'unexecuted'; issue('capture-coverage', cell.scope, 'not-run', { reason: cell.failedStage }); }
  for (const old of previous?.cells ?? []) if (!snapshots.some(c => cellKey(c) === cellKey(old)) && !issues.some(i => i.rule === 'preservation-coverage' && same(i.scope, old.scope))) issue('preservation-coverage', old.scope, 'not-run', { reason: 'This exact baseline identity was not successfully recaptured' });
  const complete = !interruption && coverage.failed === 0 && coverage.missing === 0;
  if (!complete && !interruption) interruption = 'capture-failure';
  const snapshot = { schema: 'ingenium-inspection-snapshot/2', originIdentity, planHash, cells: snapshots };
  const report = createReport({ issues, sources: { planHash, originIdentity, renderedStates: observations, ...(previous ? { previousSnapshotHash: hashIdentity(previous) } : {}) }, environment, scope: { plan: planHash } });
  const status = interruption === 'capability' ? prepared.status : interruption === 'cancelled' || interruption === 'deadline' || coverage.failed ? 'error' : ['error', 'fail', 'not-run', 'review-needed', 'pass', 'not-applicable'].find(s => report.counts[s]) ?? 'not-run';
  await writeJson(join(destination, 'snapshot.json'), snapshot); await writeJson(join(destination, 'report.json'), report);
  const files = Object.fromEntries(['report', 'snapshot', 'summary', 'run', 'html', 'manifest'].map(key => [key, join(destination, ({ html: 'index.html', manifest: 'manifest.json' })[key] ?? key + '.json')]));
  const summary = { schema: 'ingenium-inspection-summary/1', status, complete, cancelled: interruption === 'cancelled', ...(interruption ? { interruption } : {}), coverage, capturedStates: coverage.captured, counts: report.counts, preservation: previous ? report.issues.filter(i => i.rule.startsWith('preservation-')) : { status: 'not-run', reason: 'No previous snapshot selected' }, files, capability: capability ?? { available: false, reason: interruption }, limits: ['Fresh owned contexts per baseline and independent chain; only explicitly connected successors inherit state.', 'Rendered DOM and authored assertions only; no backend, runtime-listener, exact font glyph or acceptance claim.', 'Private raw evidence may contain request URLs, authored values and console data.'] };
  await atomicProgress();
  // Final progress has immutable completion status before its hash enters the final receipt.
  const finalRun = { ...progress(), status: complete ? 'complete' : 'partial', coverage };
  await atomicProgress(finalRun);
  await writeJson(files.summary, summary);
  try { await writeInspectionReport({ outputDir: destination, report, coverage, files: await fileReceipts(destination) }); }
  catch (error) { summary.complete = false; summary.status = 'error'; summary.interruption = 'report'; summary.reportError = error.message; await writeFile(files.summary, json(summary)); await atomicProgress({ ...finalRun, status: 'partial', interruption: 'report' }); }
  const finalInterruption = () => signal?.aborted ? 'cancelled' : Date.now() >= deadlineAt ? 'deadline' : undefined;
  const markPartial = async reason => { summary.complete = false; summary.status = 'error'; summary.cancelled = reason === 'cancelled'; summary.interruption = reason; await atomicProgress({ ...finalRun, status: 'partial', interruption: reason }); };
  if (summary.complete && finalInterruption()) await markPartial(finalInterruption());
  summary.successfulFiles = (await fileReceipts(destination)).filter(f => f.path !== 'summary.json');
  await writeFile(files.summary, json(summary));
  if (summary.complete) {
    const manifest = { schema: 'ingenium-inspection-files/1', complete: true, planHash, files: await fileReceipts(destination) };
    if (finalInterruption()) await markPartial(finalInterruption());
    else {
      const pendingManifest = join(destination, '.manifest-' + randomUUID());
      await writeJson(pendingManifest, manifest);
      if (finalInterruption()) { await unlink(pendingManifest); await markPartial(finalInterruption()); }
      else {
        await rename(pendingManifest, files.manifest);
        if (finalInterruption()) { await unlink(files.manifest); await markPartial(finalInterruption()); }
      }
    }
    if (!summary.complete) {
      summary.successfulFiles = (await fileReceipts(destination)).filter(f => f.path !== 'summary.json');
      await writeFile(files.summary, json(summary));
    }
  }
  return summary;
}
