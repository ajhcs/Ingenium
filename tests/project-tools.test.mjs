import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { localProjectUrl, isProjectRequest } from '../src/browser/local-url.mjs';
import { compareInventories, inspectProject } from '../src/project/index.mjs';
import { stageCompanion, companionFiles } from '../tools/package-companion.mjs';
import { main } from '../bin/ingenium-tools.mjs';

async function temporary(t) {
  const root = await mkdtemp(resolve('work/project-tools-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const inventory = items => ({ version: 1, items });
const item = (kind, key, attributes = {}) => ({ kind, key, attributes });

test('local boundary rejects remote targets, credentials, changed origins and unsupported protocols', () => {
  for (const target of ['https://localhost:3000', 'http://localhost.example:3000', 'http://192.168.1.2', 'http://user:pass@127.0.0.1', 'file:///tmp/a', 'http://0.0.0.0', undefined]) assert.throws(() => localProjectUrl(target));
  for (const host of ['localhost', '127.0.0.1', '[::1]']) assert.equal(localProjectUrl(`http://${host}:3000/a`).pathname, '/a');
  assert.equal(isProjectRequest('ws://127.0.0.1:3000/hmr', 'http://127.0.0.1:3000', true), true);
  assert.equal(isProjectRequest('http://127.0.0.1:3001/api', 'http://127.0.0.1:3000'), false);
  assert.equal(isProjectRequest('http://example.com/a', 'http://127.0.0.1:3000'), false);
});

test('preservation catches loss and changed wiring while ignoring order; counts duplicate content', () => {
  const a = item('link', '#help', { label: 'Help', href: '/help' });
  const b = item('control', '#email', { type: 'email', required: '' });
  const c = item('content', 'p Quiet', { label: 'Quiet' });
  const before = inventory([a, b, c, c]), bytes = JSON.stringify(before);
  assert.deepEqual(compareInventories(before, inventory([c, a, c, b])), { removed: [], changed: [], added: [] });
  const delta = compareInventories(before, inventory([{ ...a, attributes: { label: 'Help', href: '/wrong' } }, c]));
  assert.equal(delta.changed.length, 1); assert.equal(delta.removed.length, 2);
  assert.equal(JSON.stringify(before), bytes);
  assert.throws(() => compareInventories(inventory([{}]), before));
});

test('invalid plans refuse before creating output; missing adapter records incomplete capture, never a pass', async t => {
  const root = await temporary(t), url = 'http://127.0.0.1:3000/';
  await assert.rejects(inspectProject({ url, outputDir: join(root, 'invalid'), profiles: [] }));
  assert.deepEqual(await readdir(root), []);
  const missing = await inspectProject({ url, outputDir: join(root, 'missing'), adapterDir: join(root, 'no-adapter') });
  assert.equal(missing.status, 'not-run'); assert.equal(missing.capturedStates, 0);
  const compared = await inspectProject({ url, outputDir: join(root, 'missing-again'), adapterDir: join(root, 'no-adapter'), previousSnapshotPath: missing.files.snapshot });
  assert.equal(compared.status, 'not-run');
  await assert.rejects(inspectProject({ url, outputDir: join(root, 'missing') }), /EEXIST/);
  const output = [];
  assert.equal(await main(['inspect', 'http://example.com', join(root, 'remote')], value => output.push(value)), 1);
  assert.match(output[0].error, /loopback/);
});

test('separate companion stages only its explicit closure and installs offline without dependencies', async t => {
  const root = await temporary(t), staged = join(root, 'package');
  const result = await stageCompanion(staged);
  assert.equal(result.dependencies, 0);
  const manifest = JSON.parse(await readFile(join(staged, 'package.json')));
  assert.equal(manifest.name, '@ajhcs/ingenium-tools');
  assert.equal(manifest.dependencies, undefined); assert.equal(manifest.scripts, undefined);
  assert.equal(companionFiles.some(p => /resources|examples|skills|media/.test(p)), false);
  assert.ok(result.sourceBytes < 65000, 'keep the companion source small');
  await assert.rejects(stageCompanion(staged), /EEXIST/);
  const npm = resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
  const packed = JSON.parse(execFileSync(process.execPath, [npm, 'pack', staged, '--ignore-scripts', '--json', '--cache', join(root, 'cache')], { cwd: root, encoding: 'utf8' }))[0];
  assert.ok(packed.size < 22000, 'compressed companion remains below 22 KB');
  assert.equal(packed.files.length, result.files);
  execFileSync(process.execPath, [npm, 'install', '--prefix', join(root, 'consumer'), '--ignore-scripts', '--offline', '--no-audit', '--no-fund', '--cache', join(root, 'cache'), join(root, packed.filename)], { encoding: 'utf8' });
  const installed = join(root, 'consumer/node_modules/@ajhcs/ingenium-tools');
  const api = await import(join(installed, 'src/project/index.mjs'));
  assert.equal(typeof api.inspectProject, 'function'); assert.equal(typeof api.compareInventories, 'function');
  assert.throws(() => execFileSync(process.execPath, [join(installed, 'bin/ingenium-tools.mjs'), 'capabilities', '--adapter-dir', join(root, 'missing')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), error => error.status === 2 && JSON.parse(error.stdout).available === false);
});

const adapterDir = process.env.INGENIUM_BROWSER_ADAPTER_DIR, executablePath = process.env.INGENIUM_BROWSER_EXECUTABLE;
test('real local project: linked assets, client-rendered DOM, responsive capture and redesign preservation', { skip: !adapterDir && 'Explicit installed browser adapter not supplied' }, async t => {
  const root = await temporary(t);
  let broken = false, restyled = false, foreignRequests = 0;
  const foreign = createServer((req, res) => { foreignRequests++; res.end('should be blocked'); });
  await new Promise(resolve => foreign.listen(0, '127.0.0.1', resolve));
  t.after(() => foreign.close());
  const foreignUrl = `http://127.0.0.1:${foreign.address().port}`;
  const server = createServer((req, res) => {
    if (req.url === '/redirect') { res.writeHead(302, { Location: foreignUrl }); res.end(); return; }
    if (req.url === '/app.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(`document.querySelector('main').insertAdjacentHTML('beforeend','<p id="dynamic">Client-rendered content</p>')`); return; }
    if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end('body{font:18px Arial;margin:24px;background:#fff;color:#222} input,button{font:inherit}' + (restyled ? 'main{display:grid;gap:22px} h1{font-size:44px;color:#243f32}' : '')); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html lang="en"><head><title>Original project fixture</title><link rel="stylesheet" href="/style.css"><script src="/app.js" defer></script></head><body><main><h1>Garden register</h1><form id="signup" action="${broken ? '/wrong' : '/join'}"><label for="email">Email</label><input id="email" name="email" type="email" required><button id="join">Join</button></form>${broken ? '' : '<a id="help" href="/help">Help</a>'}<img alt="" src="${foreignUrl}/pixel"></main></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/`;
  const journeys = [{ name: 'email-to-join', steps: [{ action: 'focus', selector: '#email' }, { action: 'press', key: 'Tab' }, { action: 'expectFocus', selector: '#join' }] }];
  const profiles = [{ name: 'desktop', viewport: { width: 1440, height: 900 }, journeys }, { name: 'phone', viewport: { width: 390, height: 844 }, reducedMotion: true, journeys }];
  const options = { url, profiles, adapterDir, executablePath };
  const staged = join(root, 'independent-companion');
  await stageCompanion(staged);
  const { inspectProject: inspect } = await import(join(staged, 'src/project/index.mjs'));
  const before = await inspect({ ...options, outputDir: join(root, 'before') });
  assert.equal(before.capturedStates, 2);
  const snapshot = JSON.parse(await readFile(before.files.snapshot));
  assert.ok(snapshot.pages[0].inventory.items.some(i => i.key === '#dynamic'));
  const raw = JSON.parse(await readFile(join(root, 'before/raw/desktop.default.json')));
  assert.equal(raw.raw.geometry.boxes.find(b => b.target === '#email').font.size, '18px');
  assert.equal(raw.raw.network.length > 0, true); assert.equal(foreignRequests, 0);
  restyled = true;
  const unchanged = await inspect({ ...options, previousSnapshotPath: before.files.snapshot, outputDir: join(root, 'same') });
  assert.equal(unchanged.preservation.filter(i => i.rule === 'preservation-inventory').every(i => i.status === 'pass'), true);
  assert.notDeepEqual(await readFile(join(root, 'before/views/desktop.default.png')), await readFile(join(root, 'same/views/desktop.default.png')), 'a real visual restyle preserves the inventory');
  broken = true;
  const after = await inspect({ ...options, previousSnapshotPath: before.files.snapshot, outputDir: join(root, 'after') });
  assert.equal(after.status, 'fail');
  for (const check of after.preservation.filter(i => i.rule === 'preservation-inventory')) {
    assert.ok(check.measurement.removed.some(i => i.before.key === '#help'));
    assert.ok(check.measurement.changed.some(i => i.before.key === '#signup'));
  }
  const missingState = await inspectProject({ ...options, profiles: [profiles[0]], previousSnapshotPath: before.files.snapshot, outputDir: join(root, 'less-coverage') });
  assert.ok(missingState.preservation.some(i => i.rule === 'preservation-coverage' && i.status === 'not-run'));
  const changedProfile = await inspectProject({ ...options, profiles: [{ ...profiles[0], viewport: { width: 900, height: 900 } }], previousSnapshotPath: before.files.snapshot, outputDir: join(root, 'different-plan') });
  assert.ok(changedProfile.preservation.every(i => i.status === 'not-run'), 'a changed viewport is incomplete comparison coverage, not a preservation pass');
  const textOnly = await inspectProject({ ...options, profiles: [{ ...profiles[0], journeys: [{ name: 'wrong-title', steps: [{ action: 'expectText', selector: 'h1', value: 'Wrong title' }] }] }], outputDir: join(root, 'text-only') });
  const textReport = JSON.parse(await readFile(textOnly.files.report));
  assert.ok(textReport.issues.some(i => i.rule === 'authored-journey' && i.status === 'fail'));
  assert.ok(textReport.issues.some(i => i.rule === 'keyboard-focus-journey' && i.status === 'review-needed'));
  const redirect = await inspectProject({ ...options, url: url + 'redirect', outputDir: join(root, 'redirect') });
  assert.equal(redirect.status, 'error'); assert.equal(redirect.capturedStates, 0); assert.equal(foreignRequests, 0);
  broken = false;
  const repaired = await inspectProject({ ...options, previousSnapshotPath: before.files.snapshot, outputDir: join(root, 'repaired') });
  assert.ok(repaired.preservation.every(i => i.status === 'pass'));
});
