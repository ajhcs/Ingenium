import test from 'node:test';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir, writeFile, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { hashIdentity } from '../src/checks/index.mjs';
import { inspectProjectSet } from '../src/project/index.mjs';
import { startInspectionFixture } from './fixtures/inspection/server.mjs';

const adapterDir = process.env.INGENIUM_BROWSER_ADAPTER_DIR, executablePath = process.env.INGENIUM_BROWSER_EXECUTABLE;
const available = { skip: !adapterDir && 'Explicit browser adapter not supplied; actual browser checks not run' };
const planFor = origin => ({ schema: 'ingenium-inspection-plan/1', origin, profiles: [{ id: 'desktop', viewport: { width: 960, height: 640 }, expectedFonts: ['16px Arial', '16px LocalProof'] }], routes: [{ id: 'overview', path: '/overview', profiles: ['desktop'], states: [{ id: 'clean', steps: [{ action: 'expectText', selector: '#state', value: '0:clean' }] }], journeys: [{ id: 'first', mode: 'fresh', steps: [{ action: 'click', selector: '#increment' }, { action: 'expectText', selector: '#state', value: '1' }] }, { id: 'second', mode: 'connected', afterJourneyId: 'first', steps: [{ action: 'click', selector: '#increment' }, { action: 'expectText', selector: '#state', value: '2' }] }, { id: 'independent', mode: 'fresh', steps: [{ action: 'expectText', selector: '#state', value: '0:clean' }] }] }, { id: 'details', path: '/details', profiles: ['desktop'], states: [{ id: 'clean', steps: [{ action: 'expectText', selector: '#state', value: '0:clean' }] }], journeys: [] }], budgets: { maxCaptures: 16, deadlineMs: 120000 } });
async function temporary(t) { const root = await mkdtemp(resolve('work/inspection-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
const load = path => readFile(path, 'utf8').then(JSON.parse);
const noManifest = async result => assert.rejects(lstat(result.files.manifest), /ENOENT/);

test('invalid late action and malformed previous snapshot refuse without creating outputs', async t => {
  const root = await temporary(t), plan = planFor('http://127.0.0.1:3000');
  plan.routes[1].states[0].steps.push({ action: 'fill', selector: '#a', value: 1 });
  await assert.rejects(inspectProjectSet({ plan, outputDir: join(root, 'invalid') }), /routes\[1\].states\[0\].steps\[1\].value/); assert.deepEqual(await readdir(root), []);
  plan.routes[1].states[0].steps.pop();
  await writeFile(join(root, 'bad.json'), JSON.stringify({ schema: 'ingenium-inspection-snapshot/2', cells: [] }));
  await assert.rejects(inspectProjectSet({ plan, outputDir: join(root, 'previous'), previousSnapshotPath: join(root, 'bad.json') }), /snapshot v2/); assert.deepEqual(await readdir(root), ['bad.json']);
  const missing = await inspectProjectSet({ plan, outputDir: join(root, 'missing'), adapterDir: join(root, 'absent') });
  assert.equal(missing.status, 'not-run'); assert.equal(missing.complete, false); assert.deepEqual([missing.coverage.requested, missing.coverage.captured, missing.coverage.failed, missing.coverage.missing], [5, 0, 0, 5]); await noManifest(missing); assert.equal((await load(missing.files.run)).status, 'partial'); assert.ok((await readFile(missing.files.html, 'utf8')).includes('5 requested'));
});

test('real two-route run isolates contexts, deliberately connects journeys and matches exact baseline cells', available, async t => {
  const root = await temporary(t), fixture = await startInspectionFixture(); t.after(() => fixture.close());
  const plan = planFor(fixture.origin), options = { plan, adapterDir, executablePath };
  const before = await inspectProjectSet({ ...options, outputDir: join(root, 'before') });
  assert.equal(before.complete, true, JSON.stringify(before)); assert.deepEqual([before.coverage.requested, before.coverage.captured, before.coverage.failed, before.coverage.missing], [5, 5, 0, 0]);
  const raw = await load(join(root, 'before/raw/003.overview.desktop.clean.second.json'));
  assert.ok(raw.raw.fonts.faces.some(f => f.family === 'LocalProof' && f.status === 'loaded'));
  assert.equal(raw.raw.execution.inherited, true); assert.deepEqual(raw.raw.execution.predecessorChain, ['first']); assert.equal(raw.raw.state.at(-1).status, 'pass');
  const snapshot = await load(before.files.snapshot); assert.equal(snapshot.cells.length, 5); assert.ok(snapshot.cells.some(c => c.routeId === 'details' && c.inventory.items.some(i => i.attributes.label === 'Detail observations'))); assert.ok(snapshot.cells.every(c => c.normalizedURL.startsWith(fixture.origin)));
  assert.ok(before.coverage.cells.some(c => c.dependencies.entries.some(d => d.type === 'font' && d.outcome === 'blocked-policy'))); assert.ok(before.coverage.cells.some(c => c.dependencies.entries.some(d => d.type === 'font' && d.outcome === 'loaded' && d.origin === 'selected'))); assert.ok(before.coverage.cells.every(c => c.dependencies.entries.every(d => d.correlation === 'capture-only' && d.affectedTargets.length === 0)));
  const same = await inspectProjectSet({ ...options, outputDir: join(root, 'same'), previousSnapshotPath: before.files.snapshot }); assert.equal(same.complete, true); assert.ok(same.preservation.every(i => i.status === 'pass'));
  fixture.change(); const changed = await inspectProjectSet({ ...options, outputDir: join(root, 'changed'), previousSnapshotPath: before.files.snapshot }); assert.ok(changed.preservation.some(i => i.status === 'fail'));
  const newSetup = structuredClone(plan); newSetup.routes[0].states[0].steps.push({ action: 'focus', selector: '#increment' });
  const different = await inspectProjectSet({ ...options, plan: newSetup, outputDir: join(root, 'new-setup'), previousSnapshotPath: before.files.snapshot }); assert.ok(different.preservation.some(i => i.scope.route === 'overview' && i.status === 'not-run')); assert.ok(different.preservation.some(i => i.scope.route === 'details' && i.status === 'fail'));
  const noDetails = structuredClone(plan); noDetails.routes.pop(); const fewer = await inspectProjectSet({ ...options, plan: noDetails, outputDir: join(root, 'less'), previousSnapshotPath: before.files.snapshot }); assert.ok(fewer.preservation.some(i => i.scope.route === 'details' && i.status === 'not-run'));
  const malformed = await load(before.files.snapshot); malformed.cells[0].inventory.items[0].attributes.label = {}; await writeFile(join(root, 'bad-inventory.json'), JSON.stringify(malformed)); await assert.rejects(inspectProjectSet({ ...options, outputDir: join(root, 'bad-prior'), previousSnapshotPath: join(root, 'bad-inventory.json') }), /inventory attribute/);
  const foreignOrigin = structuredClone(snapshot); foreignOrigin.originIdentity = hashIdentity({ origin: 'http://127.0.0.1:12345' }); for (const cell of foreignOrigin.cells) cell.normalizedURL = cell.normalizedURL.replace(fixture.origin, 'http://127.0.0.1:12345'); await writeFile(join(root, 'other-origin.json'), JSON.stringify(foreignOrigin));
  const otherOrigin = await inspectProjectSet({ ...options, outputDir: join(root, 'other-origin'), previousSnapshotPath: join(root, 'other-origin.json') }); assert.ok(otherOrigin.preservation.every(i => i.status === 'not-run'));
  assert.equal((await load(before.files.manifest)).complete, true);
});

test('real named navigation allows selected routes and refuses unlisted paths and redirects', available, async t => {
  const root = await temporary(t), fixture = await startInspectionFixture(); t.after(() => fixture.close());
  const plan = planFor(fixture.origin); plan.routes[0].journeys = [{ id: 'allowed', mode: 'fresh', steps: [{ action: 'click', selector: '#detail' }, { action: 'expectText', selector: 'h1', value: 'Detail observations' }] }, { id: 'blocked', mode: 'fresh', steps: [{ action: 'click', selector: '#unknown' }] }];
  const result = await inspectProjectSet({ plan, adapterDir, executablePath, outputDir: join(root, 'navigation') });
  assert.equal(result.complete, false); assert.equal(result.coverage.failed, 1); assert.equal(result.coverage.captured, 3); assert.equal(fixture.hits.includes('/never'), false); await noManifest(result);
  const p = planFor(fixture.origin); p.routes = [{ id: 'redirect', path: '/redirect', profiles: ['desktop'], states: [{ id: 'default', steps: [] }], journeys: [] }]; const redirect = await inspectProjectSet({ plan: p, adapterDir, executablePath, outputDir: join(root, 'redirect') }); assert.equal(redirect.coverage.failed, 1); await noManifest(redirect);
});

test('real cancellation and deadline retain successful raw evidence and truthful partial coverage', available, async t => {
  const root = await temporary(t), fixture = await startInspectionFixture(); t.after(() => fixture.close());
  const plan = planFor(fixture.origin); plan.routes[0].journeys = []; plan.routes[1].path = '/slow'; plan.routes[1].states[0].steps = []; plan.budgets.deadlineMs = 700;
  const deadline = await inspectProjectSet({ plan, adapterDir, executablePath, outputDir: join(root, 'deadline') }); assert.equal(deadline.complete, false); assert.equal(deadline.interruption, 'deadline'); assert.ok(deadline.coverage.captured < 2); await noManifest(deadline);
  const controller = new AbortController(); controller.abort(); const cancelled = await inspectProjectSet({ plan, adapterDir, executablePath, signal: controller.signal, outputDir: join(root, 'cancelled') }); assert.equal(cancelled.cancelled, true); assert.equal(cancelled.coverage.missing, 2); await noManifest(cancelled);
  plan.budgets.deadlineMs = 120000;
  const afterOne = new AbortController(), partialDir = join(root, 'after-one');
  const watcher = setInterval(async () => { try { const progress = await load(join(partialDir, 'run.json')); if (progress.coverage.captured >= 1) afterOne.abort(); } catch {} }, 20);
  let partial; try { partial = await inspectProjectSet({ plan, adapterDir, executablePath, signal: afterOne.signal, outputDir: partialDir }); } finally { clearInterval(watcher); }
  assert.equal(partial.cancelled, true); assert.equal(partial.coverage.captured, 1); assert.equal(partial.coverage.requested, partial.coverage.captured + partial.coverage.failed + partial.coverage.missing); assert.ok(partial.successfulFiles.some(f => f.path.startsWith('raw/'))); await noManifest(partial);
  const finalController = new AbortController(), finalOutput = join(root, 'final-cancel'), originalWrite = fs.promises.writeFile; let summaryWrites = 0;
  fs.promises.writeFile = async function(path, ...args) { if (path === join(finalOutput, 'summary.json') && ++summaryWrites === 2) finalController.abort(); return originalWrite.call(this, path, ...args); }; syncBuiltinESMExports();
  let finalCancelled; try { finalCancelled = await inspectProjectSet({ plan: { ...plan, routes: [plan.routes[0]] }, adapterDir, executablePath, signal: finalController.signal, outputDir: finalOutput }); } finally { fs.promises.writeFile = originalWrite; syncBuiltinESMExports(); }
  assert.equal(finalController.signal.aborted, true); assert.equal(finalCancelled.cancelled, true); assert.equal(finalCancelled.complete, false); assert.equal((await load(finalCancelled.files.run)).status, 'partial'); await noManifest(finalCancelled);
});
