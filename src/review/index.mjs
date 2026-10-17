import { readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolveLayout } from '../layout/index.mjs';
import { createReport, diffReports, checkTextContrast } from '../checks/index.mjs';
import { createBrowserSession } from '../browser/index.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
async function boundedFile(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw new Error('Review inputs must be regular files of at most 2 MiB');
  return readFile(path, 'utf8');
}
const writeJson = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const overall = counts => ['error', 'fail', 'not-run', 'review-needed', 'pass', 'not-applicable'].find(s => counts[s]) ?? 'not-applicable';
const compact = issue => ({ fingerprint: issue.fingerprint, rule: issue.rule, target: issue.target, status: issue.status, scope: issue.scope,
  ...(issue.residual !== undefined ? { residual: issue.residual } : {}), ...(issue.acceptedException ? { acceptedException: issue.acceptedException } : {}) });

async function cropsFor(changed, observations, directory, rendererDir) {
  const candidates = changed.filter(i => ['fail', 'review-needed', 'error'].includes(i.status));
  if (!candidates.length) return { status: 'not-applicable', items: [] };
  const require = createRequire(import.meta.url);
  let sharp, modulePath;
  try {
    modulePath = require.resolve(rendererDir ? join(resolve(rendererDir), 'node_modules/sharp') : 'sharp');
  } catch (error) { return { status: error.code === 'MODULE_NOT_FOUND' ? 'not-run' : 'error', reason: error.message, items: [] }; }
  try { sharp = require(modulePath); }
  catch (error) { return { status: 'error', reason: error.message, items: [] }; }
  const items = [];
  try {
    if (typeof sharp !== 'function') throw new Error('Selected crop module does not expose the Sharp API');
    await mkdir(directory);
    for (const issue of candidates) {
      if (items.length >= 8) break;
      const observation = observations.find(o => o.scope.profile === issue.scope.profile && o.scope.state === issue.scope.state);
      if (!observation?.raw.screenshotPath) continue;
      let target = issue.target;
      try { const selectors = JSON.parse(target); if (Array.isArray(selectors) && selectors.length === 1 && typeof selectors[0] === 'string') target = selectors[0]; } catch { /* direct stable target */ }
      const box = observation.raw.geometry?.boxes.find(b => b.target === target);
      if (!box) continue;
      const source = observation.raw.screenshotPath, meta = await sharp(source).metadata();
      const scroll = observation.raw.geometry.scroll ?? { x: 0, y: 0 };
      const left = Math.max(0, Math.floor(box.rect.x + scroll.x - 12)), top = Math.max(0, Math.floor(box.rect.y + scroll.y - 12));
      const width = Math.min(meta.width - left, Math.ceil(box.rect.width + 24)), height = Math.min(meta.height - top, Math.ceil(box.rect.height + 24));
      if (width <= 0 || height <= 0) continue;
      const output = join(directory, `${issue.fingerprint}.png`);
      await sharp(source).extract({ left, top, width, height }).png().toFile(output);
      items.push({ fingerprint: issue.fingerprint, file: output, region: { left, top, width, height }, scope: issue.scope });
    }
    return { status: items.length ? 'pass' : 'not-applicable', items, limit: 8, note: 'Relevant target regions only; not a visual-quality or content-preservation check.' };
  } catch (error) { return { status: 'error', reason: error.message, items, note: 'Crop failure retained separately; full browser evidence and report remain available.' }; }
}

/** Explicit file workflow for owned local fixtures. A new output directory retains full evidence. */
export async function reviewFixture({ fixturePath, outputDir, adapterDir, executablePath, rendererDir, previousReportPath } = {}) {
  if (typeof fixturePath !== 'string' || typeof outputDir !== 'string') throw new TypeError('fixturePath and new outputDir are required');
  if (rendererDir !== undefined && (typeof rendererDir !== 'string' || !rendererDir.trim())) throw new TypeError('rendererDir must be a nonempty directory string when provided');
  const fixtureFile = resolve(fixturePath), fixtureText = await boundedFile(fixtureFile), fixture = JSON.parse(fixtureText);
  if (fixture.version !== 1 || !namePattern.test(fixture.id) || typeof fixture.html !== 'string' || !Array.isArray(fixture.profiles) || fixture.profiles.length < 1 || fixture.profiles.length > 8) throw new Error('Fixture requires version1, stable id, HTML file and 1..8 authored profiles');
  const names = new Set();
  for (const profile of fixture.profiles) {
    if (!namePattern.test(profile.name) || names.has(profile.name)) throw new Error('Profiles require unique stable names');
    names.add(profile.name);
    const states = profile.states ?? [{ name: 'default' }], stateNames = new Set();
    if (!Array.isArray(states) || states.length < 1 || states.length > 4) throw new Error('Each profile supports 1..4 named states');
    for (const state of states) {
      if (!namePattern.test(state.name) || stateNames.has(state.name)) throw new Error('States require unique stable names');
      stateNames.add(state.name);
    }
  }
  const html = await boundedFile(resolve(dirname(fixtureFile), fixture.html));
  const layoutText = fixture.layout ? await boundedFile(resolve(dirname(fixtureFile), fixture.layout)) : undefined;
  const previous = previousReportPath ? JSON.parse(await boundedFile(resolve(previousReportPath))) : undefined;
  const destination = resolve(outputDir); await mkdir(destination);
  await mkdir(join(destination, 'raw')); await mkdir(join(destination, 'views'));
  const issues = [], observations = [], sources = { fixtureSha256: hash(fixtureText), htmlSha256: hash(html), ...(layoutText ? { layoutSha256: hash(layoutText) } : {}) };
  if (layoutText) {
    const resolved = resolveLayout(JSON.parse(layoutText));
    await writeJson(join(destination, 'layout.json'), resolved);
    issues.push(...resolved.issues.map(i => ({ ...i, assessment: 'exact' })));
    if (!resolved.issues.length) issues.push({ rule: 'layout-resolved', target: fixture.id, status: 'pass', scope: { profile: 'authored-layout', state: 'default' }, assessment: 'exact', measurement: { boxes: Object.keys(resolved.boxes).length, guides: resolved.guides.length } });
  }
  for (const contrast of fixture.contrast ?? []) issues.push(checkTextContrast(contrast));
  const prepared = await createBrowserSession({ adapterDir, executablePath });
  const evidence = [];
  try {
    if (!prepared.session) issues.push({ rule: 'browser-capability', target: 'adapter', status: prepared.status, scope: { profile: 'all', state: 'all' }, measurement: prepared.capability });
    else for (const authored of fixture.profiles) {
      const { states = [{ name: 'default' }], journeys = [], ...profile } = authored;
      for (const state of states) {
        const key = `${profile.name}.${state.name}`;
        const observation = await prepared.session.inspect({ html, profile, state, journeys, screenshotPath: join(destination, 'views', key + '.png') });
        observations.push(observation);
        const file = join(destination, 'raw', key + '.json'); await writeJson(file, observation); evidence.push(file);
        issues.push(...observation.issues.map(i => ({ ...i, assessment: (i.rule.startsWith('axe:') && i.status !== 'review-needed') || ['keyboard-focus-journey', 'state-assertion', 'font-readiness'].includes(i.rule) ? 'exact' : 'heuristic' })));
      }
    }
  } finally { await prepared.session?.close(); }
  const report = createReport({ issues, sources, environment: prepared.capability.environment ?? { node: process.version, browser: 'unavailable' }, scope: { fixture: fixture.id }, exceptions: fixture.exceptions ?? [] });
  const delta = previous ? diffReports(previous, report) : undefined;
  const changed = delta ? [...delta.introduced, ...delta.changed.map(i => i.after)] : report.issues;
  const crops = await cropsFor(changed, observations, join(destination, 'crops'), rendererDir);
  const summary = { version: 1, status: crops.status === 'error' ? 'error' : overall(report.counts), counts: report.counts, sourceHash: report.sourceHash, environmentHash: report.environmentHash,
    issues: changed.filter(i => i.status !== 'pass' && i.status !== 'not-applicable').map(compact),
    ...(delta ? { delta: { introduced: delta.introduced.length, resolved: delta.resolved.length, changed: delta.changed.length, unchanged: delta.unchanged.length, contextChanged: delta.contextChanged,
      introducedIssues: delta.introduced.filter(i => !['pass', 'not-applicable'].includes(i.status)).map(compact),
      resolvedIssues: delta.resolved.filter(i => !['pass', 'not-applicable'].includes(i.status)).map(compact),
      updatedIssues: delta.changed.filter(i => !['pass', 'not-applicable'].includes(i.before.status) || !['pass', 'not-applicable'].includes(i.after.status)).map(i => ({ changedFields: i.changedFields, before: compact(i.before), after: compact(i.after) })),
    } } : {}),
    files: { report: join(destination, 'report.json'), evidence, ...(delta ? { delta: join(destination, 'delta.json') } : {}) }, crops,
    limits: ['Automated rules and authored journeys are scoped evidence, not accessibility certification.', 'Viewport sizing is not browser zoom; final-size readability and visual judgment remain separate.', 'Only changed issue identities/measurements enter the compact handoff; full evidence is retained.'] };
  await writeJson(join(destination, 'report.json'), report);
  if (delta) await writeJson(join(destination, 'delta.json'), delta);
  await writeJson(join(destination, 'summary.json'), summary);
  return summary;
}
