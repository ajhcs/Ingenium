import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBrowserSession } from '../src/browser/index.mjs';

test('explicit missing adapter is not-run and never falls back to ancestor packages', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ingenium-browser-missing-'));
  try {
    const result = await createBrowserSession({ adapterDir: dir });
    assert.equal(result.status, 'not-run');
    assert.equal(result.capability.available, false);
    assert.equal(result.session, undefined);
  } finally { await rm(dir, { recursive: true }); }
});

test('broken adapter surfaces error rather than absent or successful capability', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ingenium-browser-broken-'));
  try {
    await mkdir(join(dir, 'node_modules/playwright'), { recursive: true });
    await writeFile(join(dir, 'node_modules/playwright/package.json'), '{"main":"index.cjs"}');
    await writeFile(join(dir, 'node_modules/playwright/index.cjs'), 'throw new Error("synthetic adapter failure")');
    const result = await createBrowserSession({ adapterDir: dir });
    assert.equal(result.status, 'error');
    assert.match(result.capability.reason, /synthetic adapter failure/);
  } finally { await rm(dir, { recursive: true }); }
});

test('explicit empty or malformed selectors error without normal-resolution fallback', async () => {
  for (const options of [{ adapterDir: '' }, { adapterDir: 42 }, { executablePath: ' ' }]) {
    const result = await createBrowserSession(options);
    assert.equal(result.status, 'error');
    assert.equal(result.capability.code, 'INVALID_SELECTOR');
  }
});

test('adapter without websocket guard errors explicitly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ingenium-browser-old-'));
  try {
    for (const name of ['playwright', '@axe-core/playwright']) {
      await mkdir(join(dir, 'node_modules', name), { recursive: true });
      await writeFile(join(dir, 'node_modules', name, 'package.json'), '{"main":"index.cjs"}');
    }
    await writeFile(join(dir, 'node_modules/playwright/index.cjs'), 'module.exports={chromium:{launch:async()=>({close:async()=>{},newContext:async()=>({route:async()=>{}})})}}');
    await writeFile(join(dir, 'node_modules/@axe-core/playwright/index.cjs'), 'module.exports=class AxeBuilder {}');
    const result = await createBrowserSession({ adapterDir: dir });
    assert.equal(result.status, 'error');
    assert.match(result.capability.reason, /routeWebSocket required/);
  } finally { await rm(dir, { recursive: true }); }
});

const adapterDir = process.env.INGENIUM_BROWSER_ADAPTER_DIR;
const executablePath = process.env.INGENIUM_BROWSER_EXECUTABLE;
const documentOf = content => `<!doctype html><html lang="en"><head><title>Original synthetic inspection fixture</title><meta charset="utf-8"><style>body{margin:0;font-family:Arial,sans-serif}main{padding:16px}button{font-size:18px}</style></head><body><main><h1>Quiet room</h1>${content}</main></body></html>`;

test('real optional adapter: actual geometry, axe, state and keyboard, reflow, fonts and errors', { skip: !adapterDir ? 'Explicit installed adapter not supplied; real browser checks not run' : false }, async () => {
  const result = await createBrowserSession({ adapterDir, executablePath });
  assert.equal(result.status, 'pass', result.capability.reason);
  const session = result.session;
  const profile = { exceptions: [{ rule: 'viewport-horizontal-overflow', target: 'document', reason: 'Authored scroll candidate, no inferred acceptance' }], name: 'narrow-text-spacing', viewport: { width: 320, height: 640 }, textSpacing: true, expectedFonts: ['16px Arial'] };
  try {
    const html = documentOf(`<style>@font-face{font-family:Broken;src:url(https://invalid.example/absent.woff2)}.bad-font{font-family:Broken,serif}.clip{width:120px;height:20px;overflow:hidden}.wide{width:500px}.shift{transform:translateX(12px)}</style><p class="bad-font">Font fallback evidence</p><div class="clip"><p id="clipped">Text spacing reveals clipped content and needs review.</p></div><div class="wide">Wide authored content</div><div id="masked" style="clip-path:circle(20%);mask-image:linear-gradient(black,transparent)">Uncertain masked content</div><svg width="160" height="80" aria-label="synthetic symbol" role="img"><rect id="transformed" x="10" y="5" width="40" height="20" transform="translate(20 10)"/></svg><button id="open" onclick="document.querySelector('dialog').showModal()">Open panel</button><dialog aria-label="Quiet room details"><button id="unnamed"></button><button id="close" onclick="this.closest('dialog').close()">Close panel</button></dialog>`);
    const inspected = await session.inspect({ html, profile, state: { name: 'dialog-open', steps: [{ action: 'click', selector: '#open' }] }, journeys: [{ name: 'dialog-close-return', steps: [{ action: 'expectFocus', selector: '#unnamed' }, { action: 'press', key: 'Escape' }, { action: 'expectFocus', selector: '#open' }] }] });
    assert.equal(inspected.status, 'fail');
    assert.ok(inspected.issues.some(i => i.rule === 'axe:button-name' && i.status === 'fail'));
    assert.ok(inspected.issues.some(i => i.rule === 'viewport-horizontal-overflow' && i.status === 'review-needed'));
    assert.ok(inspected.issues.some(i => i.rule === 'content-clipping'));
    const overflowIssue = inspected.issues.find(i => i.rule === 'viewport-horizontal-overflow');
    assert.ok(overflowIssue.authoredException);
    assert.equal(overflowIssue.accepted, undefined);
    assert.equal(overflowIssue.acceptedException, undefined);
    assert.ok(inspected.issues.some(i => i.rule === 'complex-visual-effects' && i.target === '#masked' && i.status === 'review-needed'));
    assert.ok(inspected.raw.fonts.faces.some(face => face.status === 'error'));
    assert.ok(inspected.issues.some(i => i.rule === 'font-readiness' && i.status === 'fail'));
    const svg = inspected.raw.geometry.boxes.find(b => b.target === '#transformed');
    assert.equal(svg.nativeBBox.x, 10);
    assert.equal(svg.rect.width, 40);
    assert.notEqual(svg.rect.x, svg.nativeBBox.x);
    assert.ok(inspected.raw.axe.violations && inspected.raw.axe.incomplete && inspected.raw.axe.passes && inspected.raw.axe.inapplicable);
    assert.equal(inspected.issues.find(i => i.target === 'dialog-close-return').status, 'pass');
    assert.ok(inspected.raw.network.some(n => n.url.includes('invalid.example')));
    assert.deepEqual(inspected.raw.geometry.scroll, { x: 0, y: 0 });
    assert.deepEqual(inspected.raw.measurementState, { profile: profile.name, state: 'dialog-open', phase: 'after-state-before-journeys' });
    assert.match(inspected.sourceHash, /^[a-f0-9]{64}$/);
    const second = await session.inspect({ html: documentOf('<p>Short readable paragraph with natural wrapping.</p><button>Join activity</button>'), profile: { name: 'narrow', viewport: { width: 320, height: 640 } } });
    assert.ok(!second.issues.some(i => i.status === 'fail' || i.status === 'error'));
    assert.equal(second.raw.network.length, 0);
    const invalid = await session.inspect({ html: 'invalid fixture', profile: { name: 'invalid' } });
    assert.equal(invalid.status, 'error');
    for (const invalidProfile of [{ ...profile, zoom: 400 }, { ...profile, textSpacing: 'false' }, { ...profile, exceptions: 'invalid' }]) {
      const rejected = await session.inspect({ html: documentOf('<button>Join</button>'), profile: invalidProfile });
      assert.equal(rejected.status, 'error');
      assert.ok(rejected.issues.some(i => i.rule === 'browser-inspection' && i.status === 'error'));
    }
    const failedState = await session.inspect({ html: documentOf('<button id="first">First</button><button id="second">Second</button>'), profile, state: { name: 'expected-second', steps: [{ action: 'focus', selector: '#first' }, { action: 'expectFocus', selector: '#second' }] } });
    assert.equal(failedState.status, 'fail');
    assert.equal(failedState.issues.find(i => i.rule === 'state-assertion').status, 'fail');
    const failedJourney = await session.inspect({ html: documentOf('<button id="first">First</button><button id="second">Second</button>'), profile, journeys: [{ name: 'wrong-focus', steps: [{ action: 'focus', selector: '#first' }, { action: 'expectFocus', selector: '#second' }] }, { name: 'unsupported', steps: [{ action: 'hover' }] }] });
    assert.equal(failedJourney.issues.find(i => i.target === 'wrong-focus').status, 'fail');
    assert.equal(failedJourney.issues.find(i => i.target === 'unsupported').status, 'error');
  } finally { await session.close(); }
  assert.equal((await session.inspect({})).status, 'error');
});

test('plan browser process closes every explicitly created owned context', async () => {
  const { createProjectBrowserRun } = await import('../src/browser/index.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'ingenium-browser-ownership-'));
  const state = { opened: 0, closed: 0, browserClosed: 0 };
  globalThis.__ingeniumOwnershipProbe = state;
  try {
    for (const name of ['playwright', '@axe-core/playwright']) {
      await mkdir(join(dir, 'node_modules', name), { recursive: true });
      await writeFile(join(dir, 'node_modules', name, 'package.json'), '{"version":"0.0.0","main":"index.cjs"}');
    }
    await writeFile(join(dir, 'node_modules/playwright/index.cjs'), `module.exports={chromium:{launch:async()=>({version:()=>"synthetic",close:async()=>{globalThis.__ingeniumOwnershipProbe.browserClosed++},newContext:async()=>{globalThis.__ingeniumOwnershipProbe.opened++;let closed=false;return {route:async()=>{},routeWebSocket:async()=>{},newPage:async()=>({setDefaultTimeout(){},on(){}}),close:async()=>{if(!closed){closed=true;globalThis.__ingeniumOwnershipProbe.closed++}}}}})}}`);
    await writeFile(join(dir, 'node_modules/@axe-core/playwright/index.cjs'), 'module.exports=class AxeBuilder {}');
    const prepared = await createProjectBrowserRun({ url: 'http://127.0.0.1:3000', allowedURLs: ['http://127.0.0.1:3000/a'], adapterDir: dir });
    assert.equal(prepared.status, 'pass'); const a = await prepared.run.createSession(), b = await prepared.run.createSession(); await a.close(); await Promise.all([prepared.run.close(), prepared.run.close()]); assert.deepEqual(state, { opened: 3, closed: 3, browserClosed: 1 }); assert.equal((await b.inspect()).status, 'error'); await assert.rejects(prepared.run.createSession(), /closed/);
  } finally { delete globalThis.__ingeniumOwnershipProbe; await rm(dir, { recursive: true, force: true }); }
});

test('failed initial context handoff still closes its owned browser process', async () => {
  const { createProjectBrowserRun } = await import('../src/browser/index.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'ingenium-browser-handoff-')); globalThis.__ingeniumFailedHandoffClosed = 0;
  try {
    for (const name of ['playwright', '@axe-core/playwright']) { await mkdir(join(dir, 'node_modules', name), { recursive: true }); await writeFile(join(dir, 'node_modules', name, 'package.json'), '{"version":"0.0.0","main":"index.cjs"}'); }
    await writeFile(join(dir, 'node_modules/playwright/index.cjs'), `module.exports={chromium:{launch:async()=>({version:()=>"synthetic",close:async()=>{globalThis.__ingeniumFailedHandoffClosed++},newContext:async()=>({route:async()=>{},routeWebSocket:async()=>{},newPage:async()=>({setDefaultTimeout(){},on(){}}),close:async()=>{throw Error("Synthetic initial context close failed")}})})}}`);
    await writeFile(join(dir, 'node_modules/@axe-core/playwright/index.cjs'), 'module.exports=class AxeBuilder {}');
    const result = await createProjectBrowserRun({ url: 'http://127.0.0.1:3000', allowedURLs: ['http://127.0.0.1:3000/a'], adapterDir: dir }); assert.equal(result.status, 'error'); assert.equal(result.capability.code, 'BROWSER_CONTEXT_CLOSE_ERROR'); assert.equal(result.run, undefined); assert.equal(globalThis.__ingeniumFailedHandoffClosed, 1);
  } finally { delete globalThis.__ingeniumFailedHandoffClosed; await rm(dir, { recursive: true, force: true }); }
});

test('deadline awaits delayed startup ownership cleanup before returning a partial receipt', async () => {
  const { inspectProjectSet } = await import('../src/project/index.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'ingenium-browser-delayed-')); globalThis.__ingeniumDelayedClosed = false;
  try {
    for (const name of ['playwright', '@axe-core/playwright']) { await mkdir(join(dir, 'node_modules', name), { recursive: true }); await writeFile(join(dir, 'node_modules', name, 'package.json'), '{"version":"0.0.0","main":"index.cjs"}'); }
    await writeFile(join(dir, 'node_modules/playwright/index.cjs'), `module.exports={chromium:{launch:async()=>{await new Promise(r=>setTimeout(r,100));return {version:()=>"synthetic",close:async()=>{await new Promise(r=>setTimeout(r,10));globalThis.__ingeniumDelayedClosed=true},newContext:async()=>({route:async()=>{},routeWebSocket:async()=>{},newPage:async()=>({setDefaultTimeout(){},on(){}}),close:async()=>{}})}}}}`);
    await writeFile(join(dir, 'node_modules/@axe-core/playwright/index.cjs'), 'module.exports=class AxeBuilder {}');
    const plan = { schema: 'ingenium-inspection-plan/1', origin: 'http://127.0.0.1:3000', profiles: [{ id: 'desktop', viewport: { width: 320, height: 640 } }], routes: [{ id: 'overview', path: '/overview', profiles: ['desktop'], states: [{ id: 'default', steps: [] }] }], budgets: { maxCaptures: 1, deadlineMs: 20 } };
    const result = await inspectProjectSet({ plan, adapterDir: dir, outputDir: join(dir, 'output') }); assert.equal(result.interruption, 'deadline'); assert.equal(result.complete, false); assert.equal(globalThis.__ingeniumDelayedClosed, true); assert.equal(result.coverage.captured, 0);
  } finally { delete globalThis.__ingeniumDelayedClosed; await rm(dir, { recursive: true, force: true }); }
});
