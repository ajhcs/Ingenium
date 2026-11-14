import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';

const adapterDir = process.env.INGENIUM_BROWSER_ADAPTER_DIR;
const executablePath = process.env.INGENIUM_BROWSER_EXECUTABLE;
const starter = resolve('skills/ingenium/assets/responsive-starter.html');

test('responsive starter preserves readable content and operates at narrow and enlarged text sizes', { skip: !adapterDir ? 'Explicit installed browser adapter not supplied' : false }, async () => {
  const require = createRequire(join(resolve(adapterDir), 'package.json'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath, headless: true, chromiumSandbox: true });
  try {
    for (const [width, textScale] of [[320, 1], [320, 2], [768, 2], [1440, 1]]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      try {
        await page.goto(pathToFileURL(starter).href);
        if (textScale === 2) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
        // New content challenges the example rather than asserting its exact CSS.
        await page.locator('h1').textContent().then(text => assert.ok(text.includes('calibration')));
        await page.locator('h1').evaluate(e => { e.textContent = 'Extraordinary interdisciplinary calibration orientation and maintenance planning'; });
        await page.locator('label[for="review-note"]').evaluate(e => { e.textContent = 'Complete instrumentation observations and corrective maintenance recommendations'; });
        const geometry = await page.evaluate(() => {
          const elements = ['h1', 'label[for="review-note"]', '#preview-note', '.grid > .panel'];
          return { rootFont: getComputedStyle(document.documentElement).fontSize, proseWidth: document.querySelector('.panel .prose').getBoundingClientRect().width, viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, boxes: elements.flatMap(selector => [...document.querySelectorAll(selector)].map(e => ({ selector, width: e.getBoundingClientRect().width, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth }))) };
        });
        assert.equal(geometry.rootFont, textScale === 2 ? '32px' : '16px');
        if (width === 320) assert.ok(geometry.proseWidth > 250, JSON.stringify(geometry));
        assert.ok(geometry.document <= geometry.viewport + 1, JSON.stringify(geometry));
        for (const box of geometry.boxes) { assert.ok(box.width >= 100, JSON.stringify(box)); assert.ok(box.scrollWidth <= box.clientWidth + 1, JSON.stringify(box)); }
        await page.locator('#review-note').fill('Synthetic note: inspect 125 kPa reference.');
        await page.locator('#preview-note').focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator('#note-preview').innerText(), 'Synthetic note: inspect 125 kPa reference.');
        assert.match(await page.locator('#note-status').innerText(), /does not save/i);
        await page.locator('summary').focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator('details').evaluate(e => e.open), true);
        const scroller = page.locator('.table-scroll');
        assert.equal(await scroller.getAttribute('tabindex'), '0');
        await page.locator('body').focus();
        let reached = false; for (let i = 0; i < 20; i++) { await page.keyboard.press('Tab'); if (await scroller.evaluate(e => e === document.activeElement)) { reached = true; break; } }
        assert.ok(reached, 'Table region must be reachable by keyboard');
        const before = await scroller.evaluate(e => ({ left: e.scrollLeft, overflow: e.scrollWidth > e.clientWidth }));
        if (before.overflow) { for (let i = 0; i < 60; i++) await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200); const visibility = await scroller.evaluate(e => { const a=e.getBoundingClientRect(), b=e.querySelector('tbody tr:last-child td:last-child').getBoundingClientRect(); return {left:e.scrollLeft, right:b.right, viewportRight:a.right}; }); assert.ok(visibility.left > before.left); assert.ok(visibility.right <= visibility.viewportRight + 1, JSON.stringify(visibility)); }
        await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.tagName), 'A');
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
