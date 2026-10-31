import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { studies } from '../site/studies.mjs';

test('site staging reuses process artwork and verifies every featured source without duplicating it in site/', async t => {
  const root = await mkdtemp(resolve('work/demo-site-')); t.after(() => rm(root, { recursive: true, force: true }));
  const out = join(root, 'site');
  const result = JSON.parse(execFileSync(process.execPath, ['tools/build-release-site.mjs', out], { encoding: 'utf8' }));
  assert.equal(result.reusedProcessImages, 10); assert.equal(result.deployed, false);
  for (const study of Object.values(studies)) if (study.id) {
    assert.deepEqual(await readFile(join(out, study.image)), await readFile(resolve('docs/assets/process', study.id + '-final.jpg')));
    await assert.rejects(stat(resolve('site', study.image)), { code: 'ENOENT' });
    assert.ok((await stat(study.source)).isFile()); assert.ok((await stat(study.case)).isFile());
  }
});

const adapterDir = process.env.INGENIUM_BROWSER_ADAPTER_DIR;
test('rendered gallery: all studies, process switching, source links, clipboard, keyboard and narrow layouts', { skip: !adapterDir && 'Explicit installed browser adapter not supplied' }, async t => {
  const root = await mkdtemp(resolve('work/demo-browser-')); t.after(() => rm(root, { recursive: true, force: true }));
  const out = join(root, 'site');
  execFileSync(process.execPath, ['tools/build-release-site.mjs', out], { encoding: 'utf8' });
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.vtt': 'text/vtt', '.mp4': 'video/mp4' };
  const server = createServer(async (req, res) => {
    try {
      let file = resolve(out, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (file !== out && !file.startsWith(out + sep)) throw Error('outside');
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream'); res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const require = createRequire(import.meta.url);
  const { chromium } = require(join(adapterDir, 'node_modules/playwright'));
  const AxeBuilder = require(join(adapterDir, 'node_modules/@axe-core/playwright')).default;
  const browser = await chromium.launch({ headless: true, chromiumSandbox: true, executablePath: process.env.INGENIUM_BROWSER_EXECUTABLE });
  t.after(() => browser.close());
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}/`;
  await page.goto(url); assert.match(await page.title(), /Shape an idea/);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow at ' + width);
    for (const [id, study] of Object.entries(studies)) {
      await page.locator('[data-study="' + id + '"]').click();
      assert.equal(await page.locator('#study-title').innerText(), study.title);
      assert.ok((await page.locator('#study-source').getAttribute('href')).endsWith(study.source));
      if (study.processImage) {
        await page.locator('[data-view="process"]').click();
        await page.waitForFunction(() => document.querySelector('#study-image').complete && document.querySelector('#study-image').naturalWidth > 0);
        assert.ok((await page.locator('#study-image').getAttribute('src')).endsWith('-stages.jpg'));
        if (width <= 760) {
          await page.locator('.process-image').focus();
          await page.keyboard.press('ArrowRight');
          await page.waitForFunction(() => document.querySelector('.process-image').scrollLeft > 0);
        }
        await page.locator('[data-view="final"]').click();
      } else assert.equal(await page.locator('#live-study').isVisible(), true);
    }
  }
  await page.locator('[data-study="alt"]').click();
  await page.locator('.study-prompt summary').click();
  await page.locator('#copy-study-prompt').click();
  await page.waitForFunction(() => document.querySelector('#study-copy-status').textContent === 'Prompt copied.');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), studies.alt.prompt);
  await page.locator('[data-study="peel"]').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#study-title').innerText(), 'Peel');
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  assert.deepEqual(axe.violations.map(v => v.id), []);
  assert.deepEqual(errors, []);
});
