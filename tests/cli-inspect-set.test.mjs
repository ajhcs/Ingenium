import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { main } from '../bin/ingenium-tools.mjs';
import { resultExit } from '../src/cli/errors.mjs';
const plan = () => ({ schema: 'ingenium-inspection-plan/1', origin: 'http://127.0.0.1:3000', routes: [{ id: 'home', path: '/', profiles: ['desktop'], states: [{ id: 'default', steps: [] }] }], profiles: [{ id: 'desktop', viewport: { width: 800, height: 600 } }], budgets: { maxCaptures: 4, deadlineMs: 1000 } });
async function temporary(t) { await mkdir('work', { recursive: true }); const root = await mkdtemp(resolve('work/cli-inspect-set-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
const capture = async (args, options) => { let result; const exit = await main(args, value => { result = value; }, options); return { result, exit }; };

test('inspect-set CLI validates late actions before creating output and missing adapters return2 with coverage', async t => {
  const root = await temporary(t), path = join(root, 'plan.json'), output = join(root, 'evidence');
  const invalid = plan(); invalid.routes[0].states[0].steps = [{ action: 'expectText', selector: 'h1' }]; await writeFile(path, JSON.stringify(invalid));
  const rejected = await capture(['inspect-set', path, output]); assert.equal(rejected.exit, 2); assert.equal(rejected.result.category, 'usage'); assert.match(rejected.result.field, /steps/); assert.deepEqual(await readdir(root), ['plan.json']);
  await writeFile(path, JSON.stringify(plan()));
  const absent = await capture(['inspect-set', path, output, '--adapter-dir', join(root, 'missing-adapters')]); assert.equal(absent.exit, 2, JSON.stringify(absent.result)); assert.equal(absent.result.coverage.requested, 1); assert.equal(absent.result.coverage.captured, 0); assert.equal(absent.result.coverage.missing, 1); assert.equal(absent.result.complete, false); assert.ok(absent.result.files.run); assert.equal(JSON.parse(await readFile(absent.result.files.run, 'utf8')).status, 'partial');
});

test('aggregate failures outrank unavailable coverage; missing cells cannot be masked by passing status', () => {
  assert.equal(resultExit({ status: 'pass', coverage: { failed: 1, missing: 2 } }), 1);
  assert.equal(resultExit({ status: 'not-run', coverage: { failed: 1, missing: 2 } }), 1);
  assert.equal(resultExit({ status: 'pass', coverage: { failed: 0, missing: 1 } }), 2);
  assert.equal(resultExit({ status: 'error', coverage: { failed: 0, missing: 1 } }), 1);
  assert.equal(resultExit({ status: 'review-needed', coverage: { failed: 0, missing: 0 } }), 0);
  assert.equal(resultExit({ status: 'not-run', complete: true, coverage: { failed: 0, missing: 0 } }), 0);
  assert.equal(resultExit({ status: 'not-run', complete: false, coverage: { failed: 0, missing: 0 } }), 2);
});

test('explicit real browser CLI health closes its probe and inspect-set retains actual capture/report files', { skip: !process.env.INGENIUM_BROWSER_ADAPTER_DIR && 'Explicit installed browser selectors not supplied; no installation attempted' }, async t => {
  const { startInspectionFixture } = await import('./fixtures/inspection/server.mjs');
  const root = await temporary(t), fixture = await startInspectionFixture(); t.after(() => fixture.close());
  const flags = ['--adapter-dir', process.env.INGENIUM_BROWSER_ADAPTER_DIR, ...(process.env.INGENIUM_BROWSER_EXECUTABLE ? ['--executable-path', process.env.INGENIUM_BROWSER_EXECUTABLE] : [])];
  const health = await capture(['health', '--probes', 'browser', '--require', 'browser', ...flags]); assert.equal(health.exit, 0, JSON.stringify(health.result)); assert.equal(health.result.capabilities[0].status, 'usable');
  const configured = plan(); configured.origin = fixture.origin; configured.budgets.deadlineMs = 30000;
  configured.routes[0].states[0].steps = [{ action: 'expectText', selector: '#state', value: '0:clean' }];
  const file = join(root,'plan.json'); await writeFile(file,JSON.stringify(configured));
  const result = await capture(['inspect-set',file,join(root,'captured'),...flags]);
  assert.equal(result.exit,1,JSON.stringify(result.result)); assert.equal(result.result.status,'fail'); assert.ok(result.result.counts.fail>0); assert.deepEqual([result.result.coverage.requested,result.result.coverage.captured,result.result.coverage.failed,result.result.coverage.missing],[1,1,0,0]); assert.equal(result.result.complete,true);
  assert.match(await readFile(result.result.files.html,'utf8'),/1 requested/); assert.equal(JSON.parse(await readFile(result.result.files.manifest,'utf8')).complete,true);
});
