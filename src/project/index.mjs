import { lstat, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createProjectBrowserSession } from '../browser/index.mjs';
import { localProjectUrl } from '../browser/local-url.mjs';
import { createReport, hashIdentity } from '../checks/index.mjs';
import { compareInventories } from './preservation.mjs';
import { validateInspectionPlan } from './plan.mjs';
import { validateInspectionSnapshot } from './inspect-set.mjs';

export { compareInventories } from './preservation.mjs';
const writeJson = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const name = value => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value);
const defaults = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'phone', viewport: { width: 390, height: 844 } },
];
export async function readProjectJson(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw invalidSnapshot('Project JSON must be a regular file of at most 8 MiB');
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error instanceof SyntaxError) throw Object.assign(invalidSnapshot('Malformed previous snapshot JSON.'), { code: 'JSON_INVALID' }); throw error; }
}
const invalidProfile = (field, message) => Object.assign(new TypeError(`${field}: ${message}`), {
  code: 'INVALID_INSPECTION_PROFILES', category: 'usage', stage: 'preflight', field,
  nextStep: 'Correct the named field in the supplied profiles configuration before inspection.',
});
const invalidSnapshot = message => Object.assign(new TypeError(message), {
  code: 'INVALID_INSPECTION_SNAPSHOT', category: 'usage', stage: 'preflight', field: '--previous',
  nextStep: 'Select a compatible v1 single-route baseline or omit --previous to record a new baseline.',
});
/** Pure legacy preflight with paths into the supplied configuration, never its v2 projection. */
export function validateInspectionProfiles(profiles) {
  const errors = [];
  const add = (path, message) => errors.push({ code: 'INVALID_INSPECTION_PROFILES', path, message, nextStep: 'Correct the named profiles configuration field.' });
  try { hashIdentity(profiles); }
  catch { add('$.profiles', 'Profiles must contain finite plain JSON only'); return { valid: false, errors }; }
  if (!Array.isArray(profiles) || !profiles.length || profiles.length > 4) { add('$.profiles', 'Supply 1..4 named profiles'); return { valid: false, errors }; }
  const names = new Set();
  for (const [profileIndex, p] of profiles.entries()) {
    const at = `$.profiles[${profileIndex}]`;
    if (!p || typeof p !== 'object' || Array.isArray(p)) { add(at, 'Expected a profile object'); continue; }
    for (const field of Object.keys(p)) if (!['name', 'states', 'journeys', 'viewport', 'textSpacing', 'expectedFonts', 'exceptions', 'delivery', 'reducedMotion'].includes(field)) add(at + '.' + field, 'Unsupported field');
    let validNames = name(p.name);
    if (!validNames || names.has(p.name)) add(at + '.name', 'Profiles need unique stable names');
    names.add(p.name);
    const { name: profileName, states: authoredStates, journeys: authoredJourneys, ...options } = p;
    const states = authoredStates === undefined ? [{ name: 'default' }] : authoredStates, journeys = authoredJourneys === undefined ? [] : authoredJourneys;
    for (const [key, values, min, max] of [['states', states, 1, 4], ['journeys', journeys, 0, 16]]) {
      if (!Array.isArray(values) || values.length < min || values.length > max) { add(at + '.' + key, `Supply ${min}..${max} named ${key}`); continue; }
      for (const [index, value] of values.entries()) {
        const where = `${at}.${key}[${index}]`;
        if (!value || typeof value !== 'object' || Array.isArray(value)) { add(where, 'Expected an object'); validNames = false; continue; }
        if (!name(value.name)) { add(where + '.name', 'Expected a stable name (letter, then letters, digits, underscore or hyphen; at most 64 characters)'); validNames = false; }
        for (const field of Object.keys(value)) if (!['name', 'steps'].includes(field)) add(where + '.' + field, 'Unsupported field');
      }
    }
    if (!Array.isArray(states) || !Array.isArray(journeys) || !validNames) continue;
    const validation = validateInspectionPlan({ schema: 'ingenium-inspection-plan/1', origin: 'http://127.0.0.1', routes: [{ id: 'legacy', path: '/', profiles: [profileName], states: states.map(state => ({ id: state?.name, steps: state?.steps === undefined ? [] : state.steps })), journeys: journeys.map(journey => ({ id: journey?.name, mode: 'fresh', fromStateId: states[0]?.name, steps: journey?.steps === undefined ? [] : journey.steps })) }], profiles: [{ id: profileName, ...options }], budgets: { maxCaptures: 64, deadlineMs: 120000 } });
    for (const error of validation.errors) {
      let path = error.path.replace(/^\$\.profiles\[0\]/, at).replace(/^\$\.routes\[0\]/, at);
      path = path.replace(/\.id$/, '.name');
      // The v2-only linkage is synthesized from the first supplied legacy state.
      if (path.endsWith('.fromStateId')) path = at + '.states[0].name';
      if (path === at + '.profiles[0]') path = at + '.name';
      add(path, error.message);
    }
  }
  return { valid: !errors.length, errors };
}
function validateProfiles(profiles) {
  const validation = validateInspectionProfiles(profiles);
  if (!validation.valid) { const first = validation.errors[0]; throw invalidProfile(first.path, first.message); }
}

/** Capture explicitly selected local work. No server startup, install or source writes. */
export async function inspectProject({ url, outputDir, profiles = defaults, previousSnapshotPath, adapterDir, executablePath } = {}) {
  const target = localProjectUrl(url);
  if (typeof outputDir !== 'string' || !outputDir.trim()) throw new TypeError('A new outputDir is required');
  validateProfiles(profiles);
  const previous = previousSnapshotPath ? await readProjectJson(previousSnapshotPath) : undefined;
  if (previousSnapshotPath && (!previous || typeof previous !== 'object')) throw invalidSnapshot('Previous snapshot must be an object');
  if (previous && (Object.keys(previous).some(key => !['version', 'kind', 'route', 'pages'].includes(key)) || previous.version !== 1 || previous.kind !== 'ingenium-project' || !Array.isArray(previous.pages) || previous.pages.length > 16 || previous.route !== target.pathname + target.search + target.hash)) throw invalidSnapshot('Previous snapshot must describe the same route with at most 16 captured states');
  if (previous) {
    for (const p of previous.pages) {
      if (!p || Object.keys(p).some(key => !['scope', 'planHash', 'inventory'].includes(key)) || !p.scope || Object.keys(p.scope).some(key => !['profile', 'state'].includes(key))) throw invalidSnapshot('Previous snapshot has unsupported nested fields');
      const validated = validateInspectionSnapshot({ schema: 'ingenium-inspection-snapshot/2', originIdentity: hashIdentity({ origin: target.origin }), planHash: '0'.repeat(64), cells: [{ routeId: 'legacy', normalizedURL: target.href, scope: { route: 'legacy', ...p.scope, phase: 'after-state-before-journeys' }, planHash: p.planHash, inventory: p.inventory, captured: true }] });
      if (!validated.valid) throw invalidSnapshot(validated.errors[0].message);
    }
    const keys = previous.pages.map(p => hashIdentity(p.scope));
    if (new Set(keys).size !== keys.length) throw invalidSnapshot('Previous snapshot contains duplicate scopes');
  }
  const destination = resolve(outputDir);
  await mkdir(destination); await mkdir(join(destination, 'raw')); await mkdir(join(destination, 'views'));
  const prepared = await createProjectBrowserSession({ url: target.href, adapterDir, executablePath });
  const issues = [], pages = [], observations = [];
  const captureIssue = (rule, scope, status, measurement, target = 'document') => issues.push({ rule, target, scope, status, assessment: 'exact', measurement });
  try {
    if (!prepared.session) captureIssue('browser-capability', { profile: 'all', state: 'all' }, prepared.status, prepared.capability);
    else for (const authored of profiles) {
      const { states = [{ name: 'default' }], journeys = [], ...profile } = authored;
      for (const state of states) {
        const key = `${profile.name}.${state.name}`;
        const observation = await prepared.session.inspect({ url: target.href, profile, state, journeys, screenshotPath: join(destination, 'views', key + '.png') });
        await writeJson(join(destination, 'raw', key + '.json'), observation);
        observations.push({ scope: observation.scope, sourceHash: observation.sourceHash ?? null });
        issues.push(...observation.issues);
        // A failed setup/state cannot become a baseline or a preservation pass.
        if (!observation.raw.inventory || observation.issues.some(i => i.status === 'error' || i.rule === 'state-assertion' && i.status === 'fail')) continue;
        const page = { scope: observation.scope, planHash: hashIdentity({ profile, state, journeys }), inventory: observation.raw.inventory };
        pages.push(page);
        if (previous) {
          const old = previous.pages.find(p => hashIdentity(p.scope) === hashIdentity(page.scope));
          if (!old || old.planHash !== page.planHash) captureIssue('preservation-coverage', page.scope, 'not-run', { reason: old ? 'Profile, state setup or authored journeys differ from the baseline' : 'This state has no baseline' });
          else {
            const delta = compareInventories(old.inventory, page.inventory);
            captureIssue('preservation-inventory', page.scope, delta.removed.length || delta.changed.length ? 'fail' : 'pass', delta);
          }
        }
      }
    }
  } finally { await prepared.session?.close(); }
  for (const old of previous?.pages ?? []) if (!pages.some(p => hashIdentity(p.scope) === hashIdentity(old.scope))) {
    captureIssue('preservation-coverage', old.scope, 'not-run', { reason: 'Baseline state was not captured successfully in this run' });
  }
  const snapshot = { version: 1, kind: 'ingenium-project', route: target.pathname + target.search + target.hash, pages };
  const report = createReport({ issues, sources: { url: target.href, renderedStates: observations, ...(previous ? { previousSnapshotHash: hashIdentity(previous) } : {}) }, environment: prepared.capability.environment ?? { node: process.version, browser: 'unavailable' }, scope: { route: snapshot.route } });
  const status = ['error', 'fail', 'not-run', 'review-needed', 'pass', 'not-applicable'].find(s => report.counts[s]) ?? 'not-run';
  const files = Object.fromEntries(['report', 'snapshot', 'summary'].map(key => [key, join(destination, key + '.json')]));
  const summary = { version: 1, status, counts: report.counts, capturedStates: pages.length, inventoryItems: pages.reduce((n, p) => n + p.inventory.items.length, 0),
    preservation: previous ? report.issues.filter(i => i.rule.startsWith('preservation-')) : { status: 'not-run', reason: 'No previous snapshot selected; this run records a baseline' },
    files, limits: ['Rendered DOM and captured states only; runtime listeners and backend effects are not verified.', 'Shared isolated browser context; authored journeys run in order. No existing user browser session is accessed.', 'No taste score, full accessibility certification or inferred acceptance. Keep private captures outside Git.'] };
  await writeJson(files.snapshot, snapshot); await writeJson(files.report, report); await writeJson(files.summary, summary);
  return summary;
}

export { validateInspectionPlan };
export { inspectProjectSet } from './inspect-set.mjs';
export { validateInspectionSnapshot };
export { renderInspectionReport, writeInspectionReport } from './report.mjs';
