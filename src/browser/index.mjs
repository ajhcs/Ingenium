import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, isAbsolute, join } from 'node:path';
import { realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { localProjectUrl, isProjectRequest } from './local-url.mjs';
import { capturePageInventory } from './inventory.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.parse(JSON.stringify(value));
const limitations = ['Owned local synthetic HTML only; external network is blocked.', 'Geometry and clipping are review candidates, not semantic correctness or WCAG certification.', 'Font checks report CSS availability and loaded faces, not exact glyph provenance.', 'Authored CSS viewports are not browser zoom; screenshots do not establish readability.', 'No overlap, target-size or all-device compliance inference; clip paths, masks and filters need visual review, not bounding-box conclusions.'];

async function dependencies(adapterDir) {
  const require = createRequire(import.meta.url);
  const result = {};
  for (const name of ['playwright', '@axe-core/playwright']) {
    // Explicit selectors never search ancestor node_modules or fall back to checkout packages.
    const entry = adapterDir ? await realpath(join(resolve(adapterDir), 'node_modules', name)) : name;
    const loaded = await import(adapterDir ? pathToFileURL(require.resolve(entry)).href : name);
    result[name] = loaded;
  }
  return result;
}

/** Explicit optional adapter. The supplied HTML must be owned, trusted synthetic content. */
export async function createBrowserSession({ adapterDir, executablePath } = {}) {
  return prepareSession({ adapterDir, executablePath });
}

/** Explicit project entrypoint. Fixture inspection never enables local networking. */
export async function createProjectBrowserSession({ url, adapterDir, executablePath } = {}) {
  const origin = localProjectUrl(url).origin;
  return prepareSession({ adapterDir, executablePath, origin });
}

async function prepareSession({ adapterDir, executablePath, origin }) {
  for (const [key, value] of Object.entries({ adapterDir, executablePath })) {
    if (value !== undefined && (typeof value !== 'string' || !value.trim())) return { status: 'error', capability: { available: false, reason: `${key} must be a nonempty string when provided`, code: 'INVALID_SELECTOR' } };
  }
  let modules;
  try { modules = await dependencies(adapterDir); }
  catch (error) {
    return { status: ['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'ENOENT'].includes(error.code) ? 'not-run' : 'error', capability: { available: false, reason: error.message, code: error.code ?? 'LOAD_ERROR' } };
  }
  let browser;
  try {
    const playwright = modules.playwright.default ?? modules.playwright;
    const AxeBuilder = modules['@axe-core/playwright'].default;
    const Builder = typeof AxeBuilder === 'function' ? AxeBuilder : AxeBuilder?.default;
    if (!playwright.chromium?.launch || typeof Builder !== 'function') throw new Error('Incompatible Playwright/axe adapter API');
    browser = await playwright.chromium.launch({ headless: true, chromiumSandbox: true, ...(executablePath ? { executablePath } : {}) });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    let network = [];
    await context.route('**/*', async route => {
      const url = route.request().url();
      if (origin && isProjectRequest(url, origin)) {
        // Chromium can follow redirects without invoking another route handler.
        // Fetch with no redirects, then fulfill; require the final URL explicitly.
        let response;
        try {
          response = await route.fetch({ maxRedirects: 0, timeout: 15000 });
          if (response.status() >= 300 && response.status() < 400) {
            network.push({ url, status: 'blocked-redirect', reason: 'Select the final loopback URL explicitly' });
            return await route.abort('blockedbyclient');
          }
          return await route.fulfill({ response });
        } catch {
          network.push({ url, status: 'request-error' });
          return await route.abort('failed').catch(() => {});
        } finally { await response?.dispose(); }
      }
      network.push({ url, status: 'blocked' }); return route.abort('blockedbyclient');
    });
    if (typeof context.routeWebSocket !== 'function') throw new Error('Compatible Playwright routeWebSocket required for external network guard');
    await context.routeWebSocket('**/*', socket => {
      if (origin && isProjectRequest(socket.url(), origin, true)) { socket.connectToServer(); return; }
      network.push({ url: socket.url(), status: 'blocked-websocket' }); socket.close();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const consoleErrors = [];
    page.on('pageerror', error => consoleErrors.push(error.message));
    let closed = false;
    let busy = false;
    const adapterVersions = {};
    const versionRequire = createRequire(import.meta.url);
    for (const name of ['playwright', '@axe-core/playwright']) {
      const packagePath = adapterDir ? join(resolve(adapterDir), 'node_modules', name, 'package.json') : `${name}/package.json`;
      adapterVersions[name] = versionRequire(packagePath).version;
    }
    const environment = { adapters: adapterVersions, browser: browser.version(), node: process.version, platform: process.platform, sandbox: true };
    async function steps(items = []) {
      const evidence = [];
      for (const step of items) {
        const locator = step.selector ? page.locator(step.selector) : undefined;
        if (step.action === 'click') await locator.click();
        else if (step.action === 'focus') await locator.focus();
        else if (step.action === 'press') await (locator ? locator.press(step.key) : page.keyboard.press(step.key));
        else if (step.action === 'fill') await locator.fill(step.value);
        else if (step.action === 'waitFor') await locator.waitFor({ state: 'visible' });
        else if (step.action === 'expectFocus') {
          const matches = await locator.evaluate(el => el === document.activeElement);
          evidence.push({ ...step, status: matches ? 'pass' : 'fail' });
          continue;
        } else if (step.action === 'expectText' || step.action === 'expectValue') {
          const value = step.action === 'expectText' ? await locator.innerText() : await locator.inputValue();
          evidence.push({ ...step, status: value === step.value ? 'pass' : 'fail' });
          continue;
        } else throw new Error(`Unsupported journey action: ${step.action}`);
        evidence.push({ ...step, status: 'pass' });
      }
      return evidence;
    }
    const session = {
      async inspect({ html, url, profile, state = { name: 'default' }, journeys = [], screenshotPath } = {}) {
        const scope = { profile: typeof profile?.name === 'string' ? profile.name : 'unspecified', state: typeof state?.name === 'string' ? state.name : 'default' };
        let authoredExceptions = [];
        const issues = [];
        const raw = { network: [], console: [], journeys: [] };
        const issue = (rule, target, status, measurement, residual) => {
          const exception = authoredExceptions.find(e => e.rule === rule && e.target === target && typeof e.reason === 'string' && e.reason.trim());
          issues.push({ rule, target, status, scope, measurement: json(measurement), ...(residual !== undefined ? { residual } : {}), ...(exception ? { authoredException: { ...exception } } : {}) });
        };
        if (busy || closed) return { status: 'error', scope, issues: [{ rule: 'browser-session', target: 'session', status: 'error', scope, measurement: { reason: closed ? 'Session closed' : 'Concurrent inspection unsupported' } }], raw, limitations };
        busy = true;
        let sourceHash;
        try {
          if (origin) { localProjectUrl(url, origin); if (html !== undefined) throw new TypeError('Project inspection takes a URL, not fixture HTML'); }
          else if (url !== undefined || typeof html !== 'string' || !html.trim()) throw new TypeError('html must contain owned synthetic HTML; use the project entrypoint for URLs');
          const allowedProfile = new Set(['name', 'viewport', 'textSpacing', 'expectedFonts', 'exceptions', 'delivery', 'reducedMotion']);
          if (!profile || typeof profile !== 'object' || Array.isArray(profile) || Object.keys(profile).some(key => !allowedProfile.has(key))) throw new TypeError('Unsupported profile field; browser zoom is not implemented');
          if (typeof profile.name !== 'string' || !profile.name.trim() || !Number.isInteger(profile.viewport?.width) || !Number.isInteger(profile.viewport?.height) || profile.viewport.width < 1 || profile.viewport.height < 1 || Object.keys(profile.viewport).some(key => !['width', 'height'].includes(key))) throw new TypeError('profile requires name and positive integer viewport width/height only');
          if (profile.textSpacing !== undefined && typeof profile.textSpacing !== 'boolean') throw new TypeError('textSpacing must be boolean');
          if (profile.reducedMotion !== undefined && typeof profile.reducedMotion !== 'boolean') throw new TypeError('reducedMotion must be boolean');
          if (profile.delivery !== undefined && typeof profile.delivery !== 'string') throw new TypeError('delivery must be a string');
          if (profile.expectedFonts !== undefined && (!Array.isArray(profile.expectedFonts) || profile.expectedFonts.some(font => typeof font !== 'string' || !font.trim()) || new Set(profile.expectedFonts).size !== profile.expectedFonts.length)) throw new TypeError('expectedFonts must be distinct nonempty CSS font strings');
          if (profile.exceptions !== undefined && (!Array.isArray(profile.exceptions) || profile.exceptions.some(e => !e || typeof e !== 'object' || ['rule', 'target', 'reason'].some(key => typeof e[key] !== 'string' || !e[key].trim())))) throw new TypeError('exceptions must be an array of authored rule/target/reason records');
          authoredExceptions = profile.exceptions ?? [];
          if (!state || typeof state.name !== 'string' || !state.name.trim()) throw new TypeError('state requires a name');
          if (!Array.isArray(journeys)) throw new TypeError('journeys must be an array');
          if (screenshotPath && !isAbsolute(screenshotPath)) throw new TypeError('screenshotPath must be absolute');
          if (!origin) sourceHash = hash(html);
          network = [];
          consoleErrors.length = 0;
          await page.goto('about:blank');
          await page.setViewportSize(profile.viewport);
          await page.emulateMedia({ reducedMotion: profile.reducedMotion ? 'reduce' : 'no-preference' });
          if (origin) {
            const response = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
            localProjectUrl(page.url(), origin);
            if (!response || !response.ok()) throw new Error(`Project navigation failed: HTTP ${response?.status() ?? 'unavailable'}`);
            raw.url = page.url();
          } else await page.setContent(html, { waitUntil: 'load', timeout: 10000 });
          if (profile.textSpacing) await page.addStyleTag({ content: '* {line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important} p {margin-block-end:2em !important}' });
          raw.state = await steps(state.steps);
          if (origin) localProjectUrl(page.url(), origin);
          if (raw.state.some(step => step.status === 'fail')) issue('state-assertion', state.name, 'fail', { steps: raw.state, note: 'Authored state assertion did not hold.' });
          await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Font readiness timed out')), 5000))]));
          if (origin) { sourceHash = hash(await page.content()); raw.inventory = await page.evaluate(capturePageInventory); }
          raw.fonts = await page.evaluate(expected => ({ status: document.fonts.status, faces: [...document.fonts].map(f => ({ family: f.family, status: f.status })), expected: expected.map(font => ({ font, available: document.fonts.check(font) })) }), profile.expectedFonts ?? []);
          issue('font-readiness', 'document', raw.fonts.status === 'loaded' && !raw.fonts.faces.some(f => f.status === 'error') ? 'pass' : 'fail', raw.fonts);
          for (const font of raw.fonts.expected) issue('font-availability', font.font, font.available ? 'review-needed' : 'fail', { ...font, note: 'CSS FontFaceSet availability does not prove exact glyph selection; fallback may occur.' });
          raw.geometry = await page.evaluate(() => {
            function target(el) { if (el === document.documentElement) return 'html'; if (el.id) return `#${CSS.escape(el.id)}`; const parts = []; while (el && el !== document.documentElement) { const siblings = [...el.parentElement.children].filter(n => n.tagName === el.tagName); parts.unshift(`${el.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(el) + 1})`); el = el.parentElement; } return `html > ${parts.join(' > ')}`; }
            const boxes = [];
            for (const el of document.querySelectorAll('body *')) {
              const style = getComputedStyle(el), rect = el.getBoundingClientRect();
              if (style.display === 'none' || style.visibility === 'hidden' || !rect.width || !rect.height || ['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
              const clippedBy = [];
              for (let parent = el.parentElement; parent; parent = parent.parentElement) {
                const s = getComputedStyle(parent), r = parent.getBoundingClientRect();
                if ((/hidden|clip/.test(s.overflowX) && (rect.left < r.left - 0.5 || rect.right > r.right + 0.5)) || (/hidden|clip/.test(s.overflowY) && (rect.top < r.top - 0.5 || rect.bottom > r.bottom + 0.5))) clippedBy.push(target(parent));
              }
              let nativeBBox;
              if (typeof el.getBBox === 'function') { try { const b = el.getBBox(); nativeBBox = { x: b.x, y: b.y, width: b.width, height: b.height }; } catch {} }
              boxes.push({ target: target(el), rect: rect.toJSON(), nativeBBox, transform: style.transform, svg: el instanceof SVGElement, clippedBy, overflowX: el.scrollWidth - el.clientWidth, overflowY: el.scrollHeight - el.clientHeight, overflowStyle: { x: style.overflowX, y: style.overflowY }, uncertainEffects: { clipPath: style.clipPath, maskImage: style.maskImage, filter: style.filter }, font: { family: style.fontFamily, size: style.fontSize, lineHeight: style.lineHeight } });
            }
            return { scroll: { x: scrollX, y: scrollY }, viewport: { width: innerWidth, height: innerHeight }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, boxes };
          });
          const overflow = raw.geometry.document.width - profile.viewport.width;
          issue('viewport-horizontal-overflow', 'document', overflow > 0.5 ? 'review-needed' : 'pass', { overflow, delivery: profile.delivery ?? 'unspecified', note: 'Intentional two-dimensional content and scrolling require scoped review.' }, overflow);
          for (const box of raw.geometry.boxes) {
            if (Object.values(box.uncertainEffects).some(value => value && value !== 'none')) issue('complex-visual-effects', box.target, 'review-needed', { effects: box.uncertainEffects, note: 'Clip paths, masks and filters are recorded, not intersected or evaluated for painted visibility/content loss.' });
            if (box.clippedBy.length) issue('ancestor-clipping', box.target, 'review-needed', { clippedBy: box.clippedBy, rect: box.rect });
            if ((box.overflowX > 0.5 && /hidden|clip/.test(box.overflowStyle.x)) || (box.overflowY > 0.5 && /hidden|clip/.test(box.overflowStyle.y))) issue('content-clipping', box.target, 'review-needed', { overflowX: box.overflowX, overflowY: box.overflowY, style: box.overflowStyle });
          }
          raw.measurementState = { ...scope, phase: 'after-state-before-journeys' };
          raw.axe = await new Builder({ page }).analyze();
          for (const [group, status] of [['violations', 'fail'], ['incomplete', 'review-needed'], ['passes', 'pass'], ['inapplicable', 'not-applicable']]) {
            for (const rule of raw.axe[group]) {
              const nodes = rule.nodes.length ? rule.nodes : [{ target: ['document'] }];
              for (const node of nodes) issue(`axe:${rule.id}`, JSON.stringify(node.target), status, { impact: node.impact ?? rule.impact, summary: node.failureSummary, helpUrl: rule.helpUrl });
            }
          }
          if (screenshotPath) { await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' }); raw.screenshotPath = screenshotPath; raw.screenshotState = { ...raw.measurementState };  }
          for (const journey of journeys) {
            if (!journey.name) throw new Error('Journey requires a stable name');
            try {
              const result = await steps(journey.steps);
              raw.journeys.push({ name: journey.name, steps: result });
              const assertions = result.filter(s => s.action === 'expectFocus');
              issue('keyboard-focus-journey', journey.name, assertions.length ? (assertions.some(s => s.status === 'fail') ? 'fail' : 'pass') : 'review-needed', { steps: result, note: 'Only authored actions and explicit focus assertions were tested.' });
              const contentAssertions = result.filter(s => ['expectText', 'expectValue'].includes(s.action));
              if (contentAssertions.length) issue('authored-journey', journey.name, contentAssertions.some(s => s.status === 'fail') ? 'fail' : 'pass', { steps: result, note: 'Exact authored text/value assertions only; keyboard coverage is separate.' });
            } catch (error) {
              raw.journeys.push({ name: journey.name, error: error.message });
              issue('keyboard-focus-journey', journey.name, 'error', { reason: error.message });
            }
          }
          if (!journeys.length) issue('keyboard-focus-journey', 'document', 'not-run', { reason: 'No named journeys authored' });
          if (origin) localProjectUrl(page.url(), origin);
          raw.network = [...network]; raw.console = [...consoleErrors];
          if (network.length) issue('blocked-network', 'document', 'review-needed', { count: network.length });
          if (consoleErrors.length) issue('page-errors', 'document', 'error', { errors: [...consoleErrors] });
          const limits = origin ? ['Selected loopback origin and captured states only; redirects are refused. Blocked resources may affect the result.', ...limitations.slice(1), 'Inventory does not prove event handlers or backend behavior.'] : limitations;
          return { status: issues.some(i => i.status === 'error') ? 'error' : issues.some(i => i.status === 'fail') ? 'fail' : issues.some(i => i.status === 'review-needed') ? 'review-needed' : 'pass', scope, sourceHash, environment, issues, raw, limitations: limits };
        } catch (error) {
          issue('browser-inspection', 'document', 'error', { reason: error.message });
          raw.network = [...network]; raw.console = [...consoleErrors];
          return { status: 'error', scope, sourceHash, environment, issues, raw, limitations };
        } finally { busy = false; }
      },
      async close() { closed = true; await browser.close(); }
    };
    return { status: 'pass', capability: { available: true, environment }, session };
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    return { status: 'error', capability: { available: false, reason: error.message, code: error.code ?? 'BROWSER_START_ERROR' } };
  }
}
