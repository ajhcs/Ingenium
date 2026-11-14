import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectedCseEntries, acquireSelectedCse } from '../src/resources/cse-selected.mjs';

const adapterDir = process.env.INGENIUM_BROWSER_ADAPTER_DIR;
const executablePath = process.env.INGENIUM_BROWSER_EXECUTABLE;
const tempParent = process.env.INGENIUM_TEST_TMP ?? new URL('../work/implementation/', import.meta.url).pathname;
const portIds = [
  'palette-src-ports-direction-right', 'palette-src-ports-direction-left',
  'palette-src-ports-direction-both-h', 'palette-src-ports-direction-none',
];
const topologyIds = [
  'palette-refined-connections-connections-page1-loop-split-rejoin',
  'palette-refined-connections-connections-page2-loop-feedback',
];

// Expectations come from the source typography roles, not the observed CSS family.
function expectedFace(assetId, role) {
  if (portIds.includes(assetId)) return { postScriptName: 'LiberationSans-Bold', requestedWeight: '600', resolvedWeight: 700 };
  if (assetId === 'doc-dimension') return { postScriptName: 'LiberationSans', requestedWeight: '400', resolvedWeight: 400 };
  assert.ok(topologyIds.includes(assetId), `Unspecified font case: ${assetId}`);
  return role === 'reference'
    ? { postScriptName: 'DejaVuSansMono', requestedWeight: '400', resolvedWeight: 400 }
    : { postScriptName: 'DejaVuSans-Bold', requestedWeight: '700', resolvedWeight: 700 };
}

async function observeText(page) {
  await page.evaluate(() => document.fonts.ready);
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument');
    const { nodeIds } = await session.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'text' });
    const nodes = await page.locator('text').evaluateAll(elements => elements.map(element => ({
      text: element.textContent,
      role: element.getAttribute('data-typography-role'),
      requestedWeight: getComputedStyle(element).fontWeight,
    })));
    assert.equal(nodes.length, nodeIds.length);
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].fonts = (await session.send('CSS.getPlatformFontsForNode', { nodeId: nodeIds[i] })).fonts;
    }
    return nodes;
  } finally {
    await session.detach();
  }
}

function assertEmbeddedIdentities(nodes, assetId) {
  assert.ok(nodes.length > 0, `${assetId}: no live text was inspected`);
  for (const node of nodes) {
    const expected = expectedFace(assetId, node.role);
    assert.equal(node.requestedWeight, expected.requestedWeight, `${assetId}: requested weight changed`);
    assert.ok(node.fonts.length > 0, `${assetId}: no rendered glyphs for ${node.text}`);
    for (const font of node.fonts) {
      // A system-installed font with the same family/PostScript name is not proof of embedding.
      assert.equal(font.isCustomFont, true, `${assetId}: non-embedded font for ${node.text}`);
      assert.ok(font.glyphCount > 0, `${assetId}: no glyphs from the reported font`);
      assert.equal(font.postScriptName, expected.postScriptName, `${assetId}: wrong face for ${node.text}`);
    }
  }
}

test('all seven standalone CSE derivatives render exact embedded glyphs offline; removed fonts cannot pass', {
  skip: !adapterDir ? 'Explicit installed browser adapter not supplied; no installation attempted' : false,
}, async () => {
  const require = createRequire(import.meta.url);
  const { chromium } = require(join(resolve(adapterDir), 'node_modules/playwright'));
  await mkdir(tempParent, { recursive: true });
  const temporary = await mkdtemp(join(tempParent, 'cse-font-browser-'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath, headless: true, chromiumSandbox: true });
    const rows = (await selectedCseEntries()).filter(row => row.fontDependent);
    assert.deepEqual(rows.map(row => row.component.id).sort(), [...portIds, ...topologyIds, 'doc-dimension'].sort());
    for (const row of rows) {
      const assetId = row.component.id;
      const acquired = join(temporary, `acquired-${assetId}`);
      await acquireSelectedCse({ id: assetId, originalSHA256: row.sha256, outputDir: acquired, scale: 1.25 });
      const standalone = join(temporary, `standalone-${assetId}`);
      await mkdir(standalone);
      const svgPath = join(standalone, 'derived.svg');
      // No neighboring fonts or project paths are copied into the reopened directory.
      await writeFile(svgPath, await readFile(join(acquired, 'derived.svg')), { flag: 'wx' });
      const provenance = JSON.parse(await readFile(join(acquired, 'font-provenance.json')));
      const context = await browser.newContext({ offline: true });
      try {
        const page = await context.newPage();
        const requests = [];
        page.on('request', request => requests.push(request.url()));
        await page.route(/^https?:/, route => route.abort());
        await page.goto(pathToFileURL(svgPath).href);
        const nodes = await observeText(page);
        assertEmbeddedIdentities(nodes, assetId);
        for (const node of nodes) {
          const expected = expectedFace(assetId, node.role);
          assert.ok(provenance.faces.some(face => face.postScriptName === expected.postScriptName && face.weight === expected.resolvedWeight));
        }
        if (portIds.includes(assetId)) {
          assert.deepEqual(provenance.requestedWeights, [600]);
          assert.deepEqual(provenance.resolvedWeights, [700]);
        }
        assert.deepEqual([...new Set(requests)], [pathToFileURL(svgPath).href], 'Standalone export must not request external files or fonts');

        if (assetId === 'doc-dimension') {
          // Remove the actual font rule through the DOM, independent of its serialization.
          const negative = await page.evaluate(() => {
            const styles = [...document.querySelectorAll('style')].filter(style => style.textContent.includes('@font-face'));
            const removed = styles.length;
            styles.forEach(style => style.remove());
            return { removed, svg: new XMLSerializer().serializeToString(document.documentElement) };
          });
          assert.ok(negative.removed > 0, 'Negative control must remove embedded font rules');
          const negativePath = join(standalone, 'font-removed.svg');
          await writeFile(negativePath, negative.svg, { flag: 'wx' });
          // A new context prevents a prior custom face from satisfying the negative control.
          const negativeContext = await browser.newContext({ offline: true });
          try {
            const negativePage = await negativeContext.newPage();
            await negativePage.route(/^https?:/, route => route.abort());
            await negativePage.goto(pathToFileURL(negativePath).href);
            const withoutFonts = await observeText(negativePage);
            assert.deepEqual(withoutFonts.map(node => node.text), nodes.map(node => node.text));
            assert.ok(withoutFonts.every(node => node.fonts.length > 0), 'Negative control must still render text');
            assert.throws(() => assertEmbeddedIdentities(withoutFonts, assetId), /non-embedded font/);
          } finally {
            await negativeContext.close();
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    try { await browser?.close(); } finally { await rm(temporary, { recursive: true, force: true }); }
  }
});
