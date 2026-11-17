import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const adapter = process.env.INGENIUM_BROWSER_ADAPTER_DIR;
const executable = process.env.INGENIUM_BROWSER_EXECUTABLE;
const study = pathToFileURL(resolve('skills/ingenium/assets/common-measure.html')).href;

test('Common Measure plays and exports the selected score offline', {
  skip: !adapter || !executable ? 'Select an existing browser adapter and Chromium' : false,
}, async () => {
  const { chromium } = createRequire(join(resolve(adapter), 'package.json'))('playwright');
  const browser = await chromium.launch({ executablePath: executable, chromiumSandbox: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const requests = [], errors = [];
    page.on('request', req => { if (/^https?:/.test(req.url())) requests.push(req.url()); });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(study);

    const defaultDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save SVG' }).click();
    const defaultScore = await defaultDownload;
    assert.equal(defaultScore.suggestedFilename(), 'common-measure-5-7.svg');
    const scores = await Promise.all([
      readFile(await defaultScore.path(), 'utf8'),
      readFile('examples/common-measure/common-measure-5-7.svg', 'utf8'),
    ]);
    const [downloaded, retained] = await page.evaluate(sources => {
      function structure(element) {
        const attributes = [...element.attributes]
          .filter(attribute => attribute.namespaceURI !== 'http://www.w3.org/2000/xmlns/')
          .map(attribute => [attribute.namespaceURI, attribute.localName, attribute.value])
          .sort((a, b) => String(a.slice(0, 2)).localeCompare(String(b.slice(0, 2))));
        const textual = ['text', 'tspan', 'title', 'desc'].includes(element.localName);
        const children = [...element.childNodes].flatMap(node => {
          if (node.nodeType === Node.ELEMENT_NODE) return [structure(node)];
          if (node.nodeType === Node.TEXT_NODE && (textual || node.data.trim())) return [node.data];
          return [];
        });
        return [element.namespaceURI, element.localName, attributes, children];
      }
      return sources.map(source => {
        const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
        if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('Invalid score SVG');
        return structure(doc.documentElement);
      });
    }, scores);
    assert.deepEqual(downloaded, retained);
    const serifFamilies = await page.evaluate(() => [
      document.querySelector('#masthead text:last-child'),
      document.querySelector('#notation text:first-of-type'),
      document.querySelector('#intervals text'),
      document.querySelector('aside h1'),
    ].map(node => getComputedStyle(node).fontFamily));
    assert.equal(new Set(serifFamilies).size, 1);

    const coverage = await page.evaluate(() => {
      const results = [];
      const woodControl = document.querySelector('#wood');
      const bellControl = document.querySelector('#bell');
      for (const woodOption of woodControl.options) {
        for (const bellOption of bellControl.options) {
          woodControl.value = woodOption.value;
          bellControl.value = bellOption.value;
          bellControl.dispatchEvent(new Event('change'));

          const rim = document.querySelector('#rim');
          const radius = rim.r.baseVal.value, cx = rim.cx.baseVal.value, cy = rim.cy.baseVal.value;
          const box = document.querySelector('#intervals').getBBox();
          const labelRadius = Math.hypot(
            Math.max(cx - box.x, box.x + box.width - cx),
            Math.max(cy - box.y, box.y + box.height - cy),
          );
          let nearest = Infinity;
          for (const path of document.querySelectorAll('#wood-engraving path, #bell-engraving path')) {
            const points = [...path.getAttribute('d').matchAll(/(-?[\d.]+),(-?[\d.]+)/g)]
              .map(([, x, y]) => [Number(x) - cx, Number(y) - cy]);
            for (const [index, [x, y]] of points.entries()) {
              const next = points[(index + 1) % points.length];
              const dx = next[0] - x, dy = next[1] - y;
              const distanceSquared = dx * dx + dy * dy;
              const along = distanceSquared ? -(x * dx + y * dy) / distanceSquared : 0;
              const t = Math.max(0, Math.min(1, along));
              nearest = Math.min(nearest, Math.hypot(x + t * dx, y + t * dy));
            }
          }
          results.push({
            wood: Number(woodOption.value), bell: Number(bellOption.value),
            period: document.querySelector('#period-label').textContent,
            woodStrikes: document.querySelectorAll('#strip rect').length,
            bellStrikes: document.querySelectorAll('#strip circle').length,
            bellRimStrikes: document.querySelectorAll('#attacks circle').length,
            labelClearance: nearest - labelRadius,
            rim: radius > 0 && rim.getAttribute('stroke') !== 'none',
            visibleNumbers: document.querySelector('#wood-pulses').textContent,
          });
        }
      }
      return results;
    });
    assert.equal(coverage.length, 64);
    assert.equal(new Set(coverage.map(pair => pair.wood + '/' + pair.bell)).size, 64);
    for (const pair of coverage) {
      const { wood, bell } = pair;
      let period = wood;
      while (period % bell) period += wood;
      const name = wood + '/' + bell;
      assert.equal(pair.period, 'after ' + period + ' pulses', name);
      assert.equal(pair.woodStrikes, period / wood + 1, name);
      assert.equal(pair.bellStrikes, period / bell + 1, name);
      assert.equal(pair.bellRimStrikes, period / bell, name);
      assert.ok(pair.rim && pair.labelClearance > 1, name + ' ' + pair.labelClearance);
      assert.equal(pair.visibleNumbers, Array.from({ length: period / wood + 1 }, (_, i) => i * wood).join(', '), name);
    }
    await page.locator('#wood').selectOption('8');
    await page.locator('#bell').selectOption('9');

    // Short windows isolate fresh attacks. The bell's decaying tail is quiet by the next pulse.
    const strikes = await page.evaluate(() => {
      const piece = score(), rate = 8000;
      const context = new OfflineAudioContext(1, rate, rate);
      const samples = soundBuffer(context, piece).getChannelData(0);
      return Array.from({ length: piece.length + 1 }, (_, pulse) => {
        const start = Math.round(pulse * .24 * rate);
        return samples.subarray(start, start + 160).some(value => Math.abs(value) > .15);
      });
    });
    assert.deepEqual(strikes, Array.from({ length: 73 }, (_, p) => p % 8 === 0 || p % 9 === 0));

    await page.locator('#play').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Playing'));
    assert.equal(await page.locator('#playhead').getAttribute('visibility'), 'hidden');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save SVG' }).click();
    const file = await download;
    assert.equal(file.suggestedFilename(), 'common-measure-8-9.svg');
    const exported = await readFile(await file.path(), 'utf8');
    const exportedState = await page.evaluate(xml => {
      const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
      return { errors: doc.querySelectorAll('parsererror, script, #playhead').length,
        period: doc.querySelector('#period-label')?.textContent, strikes: doc.querySelectorAll('#strip rect').length };
    }, exported);
    assert.deepEqual(exportedState, { errors: 0, period: 'after 72 pulses', strikes: 10 });

    await page.locator('#wood').selectOption('2');
    assert.equal(await page.locator('#play').textContent(), 'Play one cycle');
    await page.locator('#bell').selectOption('2');
    await page.locator('#play').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Cycle complete.');

    await page.locator('#pulse-list summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#pulse-list').getAttribute('open'), '');
    assert.equal(await page.locator('#bell-pulses').textContent(), '0, 2');
    assert.equal(await page.locator('#masthead text').last().getAttribute('textLength'), null);

    for (const [width, scale] of [[320, 1], [390, 1], [768, 1], [1440, 1], [320, 2]]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(zoom => document.documentElement.style.fontSize = zoom * 100 + '%', scale);
      const geometry = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        rootFont: getComputedStyle(document.documentElement).fontSize,
        strikeListFont: getComputedStyle(document.querySelector('#bell-pulses')).fontSize,
        fits: [...document.querySelectorAll('#plate text')].every(text => {
          const box = text.getBBox(); return box.x >= 0 && box.x + box.width <= 720;
        }),
      }));
      assert.equal(geometry.rootFont, 16 * scale + 'px');
      assert.equal(geometry.strikeListFont, geometry.rootFont);
      assert.ok(geometry.width <= width && geometry.fits, JSON.stringify(geometry));
    }
    assert.deepEqual(requests, []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
