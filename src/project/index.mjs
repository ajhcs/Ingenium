import { lstat, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createProjectBrowserSession } from '../browser/index.mjs';
import { localProjectUrl } from '../browser/local-url.mjs';
import { createReport, hashIdentity } from '../checks/index.mjs';
import { compareInventories } from './preservation.mjs';

export { compareInventories } from './preservation.mjs';
const writeJson = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const name = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
const defaults = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'phone', viewport: { width: 390, height: 844 } },
];
export async function readProjectJson(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('Project JSON must be a regular file of at most 8 MiB');
  return JSON.parse(await readFile(path, 'utf8'));
}
function validateProfiles(profiles) {
  if (!Array.isArray(profiles) || !profiles.length || profiles.length > 4) throw new TypeError('Supply 1..4 named profiles');
  const seen = new Set();
  for (const p of profiles) {
    if (!name.test(p?.name) || seen.has(p.name)) throw new TypeError('Profiles need unique stable names');
    seen.add(p.name);
    if (!p.viewport || !Number.isInteger(p.viewport.width) || !Number.isInteger(p.viewport.height) || p.viewport.width < 1 || p.viewport.height < 1 || p.viewport.width > 4096 || p.viewport.height > 4096) throw new TypeError('Profile viewport dimensions must be integers in 1..4096');
    const journeyNames = new Set();
    if (!Array.isArray(p.journeys ?? []) || (p.journeys ?? []).length > 16) throw new TypeError('Supply at most 16 named journeys');
    for (const j of p.journeys ?? []) {
      if (!name.test(j?.name) || journeyNames.has(j.name)) throw new TypeError('Journeys need unique stable names');
      journeyNames.add(j.name);
    }
    const states = p.states ?? [{ name: 'default' }], stateNames = new Set();
    if (!Array.isArray(states) || !states.length || states.length > 4) throw new TypeError('Supply 1..4 named states per profile');
    for (const s of states) {
      if (!name.test(s?.name) || stateNames.has(s.name)) throw new TypeError('States need unique stable names');
      stateNames.add(s.name);
      for (const steps of [s.steps ?? [], ...(p.journeys ?? []).map(j => j.steps ?? [])]) {
        if (!Array.isArray(steps) || steps.length > 32) throw new TypeError('Authored steps must be arrays of at most 32 actions');
      }
    }
  }
}

/** Capture explicitly selected local work. No server startup, install or source writes. */
export async function inspectProject({ url, outputDir, profiles = defaults, previousSnapshotPath, adapterDir, executablePath } = {}) {
  const target = localProjectUrl(url);
  if (typeof outputDir !== 'string' || !outputDir.trim()) throw new TypeError('A new outputDir is required');
  validateProfiles(profiles);
  const previous = previousSnapshotPath ? await readProjectJson(previousSnapshotPath) : undefined;
  if (previous && (previous.version !== 1 || previous.kind !== 'ingenium-project' || !Array.isArray(previous.pages) || previous.pages.length > 16 || previous.route !== target.pathname + target.search + target.hash)) throw new TypeError('Previous snapshot must describe the same route with at most 16 captured states');
  if (previous) {
    const keys = previous.pages.map(p => hashIdentity(p.scope));
    if (new Set(keys).size !== keys.length) throw new TypeError('Previous snapshot contains duplicate scopes');
    for (const p of previous.pages) compareInventories(p.inventory, p.inventory);
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
