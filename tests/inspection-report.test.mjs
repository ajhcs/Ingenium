import test from 'node:test';
import assert from 'node:assert/strict';
import { renderInspectionReport } from '../src/project/report.mjs';
import { createDependencyCollector } from '../src/browser/network-observations.mjs';

test('static report escapes findings, refuses path escapes and leads with actual incomplete coverage', () => {
  const scope = { route: 'a', profile: 'p', state: 's', phase: 'after-state-before-journeys' };
  const input = { report: { issues: [{ scope, target: '<img src="https://evil.test" onerror="alert(1)">', rule: '<script>bad</script>', status: 'error' }] }, coverage: { requested: 2, captured: 1, failed: 1, missing: 0, cells: [{ scope, status: 'failed', failedStage: '<failed>', screenshot: 'views/absent.png' }] }, files: [] };
  const result = renderInspectionReport(input); assert.ok(result.html.includes('2 requested · 1 captured · 1 failed · 0 missing')); assert.ok(result.html.includes('&lt;script&gt;')); assert.ok(!result.html.includes('<img')); assert.ok(!result.html.includes('<script')); assert.ok(result.html.includes('unavailable (capture stage incomplete)')); assert.ok(result.html.includes("default-src 'none'"));
  const global = renderInspectionReport({ ...input, report: { issues: [{ scope: { route: 'all', phase: 'preparation' }, rule: 'browser-capability', target: 'document', status: 'error' }] } }); assert.ok(global.html.includes('Run findings')); assert.ok(global.html.includes('browser-capability')); assert.ok(global.html.includes('1 errors'));
  for (const path of ['../secret', 'https://evil.test/p.png', '/absolute', 'views/%2e%2e/secret', 'views/a".png']) assert.throws(() => renderInspectionReport({ ...input, files: [{ path, sha256: '0'.repeat(64), bytes: 0 }] }), /relative file path/);
});

test('dependency collector retains practical bounds and never invents affected element causality', () => {
  const collector = createDependencyCollector(); for (let i = 0; i < 300; i++) collector.observe({ type: 'font', outcome: 'blocked-policy' });
  const result = collector.snapshot({ route: 'a' }); assert.equal(result.entries.length, 256); assert.equal(result.observedCount, 300); assert.equal(result.truncated, true); assert.ok(result.entries.every(e => e.correlation === 'capture-only' && !e.affectedTargets.length)); result.entries[0].scope.route = 'changed'; assert.equal(collector.snapshot({ route: 'a' }).entries[0].scope.route, 'a');
});

test('real report opens without JavaScript, blocks external requests and wraps at320 pixels with enlarged text', { skip: !process.env.INGENIUM_BROWSER_ADAPTER_DIR && 'Explicit browser adapter not supplied' }, async t => {
  const { createRequire } = await import('node:module');
  const { mkdtemp, rm, writeFile } = await import('node:fs/promises');
  const { resolve, join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const require = createRequire(import.meta.url), playwright = require(join(process.env.INGENIUM_BROWSER_ADAPTER_DIR, 'node_modules/playwright'));
  const root = await mkdtemp(resolve('work/inspection-report-')); t.after(() => rm(root, { recursive: true, force: true }));
  const scope = { route: 'overview', profile: 'phone', state: 'default', phase: 'after-state-before-journeys' };
  const report = { issues: [{ scope, rule: 'font-availability', target: '<img src="https://external.invalid/font">' + 'LongSelector'.repeat(20), status: 'review-needed' }] }, coverage = { requested: 2, captured: 1, failed: 0, missing: 1, cells: [{ scope, status: 'captured' }] };
  const result = renderInspectionReport({ report, coverage, files: [] }); await writeFile(join(root, 'index.html'), result.html); await writeFile(join(root, 'report.css'), result.css);
  const browser = await playwright.chromium.launch({ headless: true, chromiumSandbox: true, executablePath: process.env.INGENIUM_BROWSER_EXECUTABLE });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 640 } }), page = await context.newPage(), requests = [];
    page.on('request', req => requests.push(req.url())); await page.goto(pathToFileURL(join(root, 'index.html')).href); assert.equal(await page.locator('h1').innerText(), 'Project inspection'); assert.equal(await page.locator('img').count(), 0); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.tagName), 'A');
    await writeFile(join(root, 'report.css'), result.css + 'html{font-size:200%}'); await page.reload(); assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), '32px'); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); assert.ok(requests.every(url => url.startsWith('file:'))); await context.close();
  } finally { await browser.close(); }
});
