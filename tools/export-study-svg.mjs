import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hash = data => createHash('sha256').update(data).digest('hex');
const limits = { sourceBytes: 24 * 1024 * 1024, dimension: 4096, pixels: 16 * 1024 * 1024 };

// This is a separate trusted authored-study route, not static-icon admission.
// SVG is decoded as an image: no document scripts, external documents or local file access.
export async function exportStudySvg({ sourcePath, outputDir, trustedSource = false, playwrightModule, executablePath, assetRoot, timeoutMs = 30000 } = {}) {
  if (trustedSource !== true) throw Error('Explicit trustedSource:true / --trusted-study acknowledgement required');
  for (const [key, value] of Object.entries({ sourcePath, outputDir, playwrightModule, executablePath })) {
    if (typeof value !== 'string' || !value.trim()) throw Error(`${key} must explicitly select a nonempty local path`);
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) throw Error('timeoutMs must be 1000..120000');
  sourcePath = path.resolve(sourcePath); outputDir = path.resolve(outputDir);
  const stat = await fs.lstat(sourcePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limits.sourceBytes) throw Error('Select a regular nonsymlink SVG file within the 24MiB bound');
  const source = await fs.readFile(sourcePath);
  let svg = source.toString('utf8');
  const assets = [];
  if (assetRoot !== undefined) {
    if (typeof assetRoot !== 'string' || !assetRoot.trim()) throw Error('assetRoot must be an explicitly selected local directory');
    assetRoot = path.resolve(assetRoot);
    if (await fs.realpath(assetRoot) !== assetRoot || !(await fs.lstat(assetRoot)).isDirectory()) throw Error('assetRoot must be a real nonsymlink directory');
    const matches = [...svg.matchAll(/\b(?:href|src)\s*=\s*(['"])(.*?)\1/gi)];
    for (const match of matches) {
      const ref = match[2];
      if (ref.startsWith('#') || ref.startsWith('data:')) continue;
      if (!/^[a-z0-9_./-]+$/i.test(ref) || path.isAbsolute(ref) || ref.split('/').some(p => p === '..' || p === '')) throw Error('Only confined relative raster asset paths are supported');
      const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }[path.extname(ref).toLowerCase()];
      if (!mime) throw Error('Only selected local raster image assets may be embedded');
      const selected = path.resolve(path.dirname(sourcePath), ref);
      if (!selected.startsWith(assetRoot + path.sep) || await fs.realpath(selected) !== selected) throw Error('Asset escapes selected root or uses a symlink');
      let cursor = path.dirname(selected);
      while (cursor !== assetRoot) { if ((await fs.lstat(cursor)).isSymbolicLink()) throw Error('Asset path uses a symlink'); cursor = path.dirname(cursor); }
      const stat = await fs.lstat(selected);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 12 * 1024 * 1024) throw Error('Select regular raster assets within 12MiB each');
      const data = await fs.readFile(selected);
      const valid = mime === 'image/png' ? data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : mime === 'image/jpeg' ? data[0] === 255 && data[1] === 216 : mime === 'image/webp' ? data.toString('ascii',0,4) === 'RIFF' && data.toString('ascii',8,12) === 'WEBP' : /^GIF8[79]a$/.test(data.toString('ascii',0,6));
      if (!valid) throw Error('Raster asset signature does not match its selected extension');
      assets.push({ path: selected, reference: ref, bytes: data.length, sha256: hash(data) });
      svg = svg.replace(match[0], match[0].replace(ref, `data:${mime};base64,${data.toString('base64')}`));
      if (Buffer.byteLength(svg) > 48 * 1024 * 1024) throw Error('Embedded SVG exceeds 48MiB');
    }
  }
  if (!svg.trimStart().startsWith('<') || /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(svg)) throw Error('DTD, entities and external stylesheets are unsupported');
  // Deliberately conservative preflight for trusted static studies. Not a general SVG sanitizer.
  if (/<\s*(?:script|foreignObject|animate\w*|set|iframe|audio|video)\b|\son[a-z]+\s*=|@import\b/i.test(svg)) throw Error('Active or imported study content is unsupported');
  if (/\b(?:href|src)\s*=\s*(['"])(?!#|data:(?:image\/(?:png|jpeg|webp|gif)|font\/(?:woff2?|ttf|otf));base64,)[\s\S]*?\1/i.test(svg)) throw Error('All referenced study assets must be embedded supported image/font data or fragment references');
  for (const match of svg.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    if (!/^(?:#|data:(?:image\/(?:png|jpeg|webp|gif)|font\/(?:woff2?|ttf|otf));base64,)/i.test(match[2])) throw Error('All CSS study assets must be embedded supported image/font data or fragment references');
  }
  // An explicit selector resolves only the chosen installed module, with no checkout fallback.
  const selectedModule = await fs.realpath(path.resolve(playwrightModule));
  const require = createRequire(import.meta.url);
  const entry = require.resolve(selectedModule);
  const imported = await import(pathToFileURL(entry).href);
  const playwright = imported.default ?? imported;
  const packagePath = path.join((await fs.stat(selectedModule)).isDirectory() ? selectedModule : path.dirname(selectedModule), 'package.json');
  const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
  if (pkg.name !== 'playwright' || !playwright.chromium?.launch) throw Error('Select an existing compatible playwright module directory');
  const executable = await fs.realpath(path.resolve(executablePath));
  // Exclusive directory creation protects source and any prior export/evidence.
  await fs.mkdir(outputDir);
  const report = {
    schema: 'ingenium-trusted-study-export/1', status: 'running',
    source: { path: sourcePath, bytes: source.length, sha256: hash(source) },
    embeddedAssets: assets, embeddedSvgSha256: hash(Buffer.from(svg)),
    renderer: { adapter: 'playwright', adapterVersion: pkg.version, adapterPath: selectedModule, executablePath: executable, browser: 'chromium', chromiumSandbox: true },
    isolation: { svgImageMode: true, documentJavaScript: false, serviceWorkers: 'blocked', requests: 'all blocked', blockedRequests: [] },
    limitations: ['Explicitly selected trusted authored static SVG only; not hostile-content sanitation.', 'Embedded fonts/styles/filter/pattern are rendered by the selected Chromium. System font fallback and browser variation remain possible.', 'PNG appearance is not native-editor, print, accessibility or design acceptance evidence.'],
  };
  const receipt = path.join(outputDir, 'export.json');
  await fs.writeFile(receipt, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true, chromiumSandbox: true, executablePath: executable, timeout: timeoutMs });
    report.renderer.browserVersion = browser.version();
    const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block', deviceScaleFactor: 1 });
    await context.route('**/*', route => { report.isolation.blockedRequests.push(route.request().url().split(':', 1)[0]); return route.abort('blockedbyclient'); });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    const { rasterDecodes, ...dimensions } = await page.evaluate(async ({ svg, limits, timeoutMs }) => {
      const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const root = document.documentElement;
      if (document.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg') throw Error('Expected well-formed namespaced SVG');
      const box = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
      const size = name => { const value = root.getAttribute(name); return value && /^\d+(?:\.\d+)?(?:px)?$/.test(value) ? Number(value.replace(/px$/, '')) : undefined; };
      const width = Math.ceil(size('width') ?? (box.length === 4 ? box[2] : 0));
      const height = Math.ceil(size('height') ?? (box.length === 4 ? box[3] : 0));
      if (!width || !height || width > limits.dimension || height > limits.dimension || width * height > limits.pixels) throw Error('Explicit SVG dimensions/viewBox must fit 4096px and 16Mpixel bounds');
      // Successful outer SVG decoding does not imply its raster children decoded.
      // Inspect parsed references (including entity-escaped values), then decode each
      // distinct embedded raster independently before any completed image is emitted.
      const refs = new Set();
      const add = value => { if (/^data:image\//i.test(value)) refs.add(value); };
      const cssRefs = value => { for (const match of value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) add(match[2]); };
      for (const element of document.querySelectorAll('*')) {
        for (const attribute of element.attributes) {
          if (attribute.localName === 'href' || attribute.localName === 'src') add(attribute.value);
          if (attribute.localName === 'style') cssRefs(attribute.value);
        }
        if (element.localName === 'style') cssRefs(element.textContent);
      }
      if (refs.size > 256) throw Error('At most 256 distinct embedded raster images are supported');
      const rasterDecodes = [];
      for (const ref of refs) {
        const image = new Image(); image.src = ref;
        let timer;
        try {
          await Promise.race([image.decode(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Raster decode timeout')), timeoutMs); })]);
          if (!image.naturalWidth || !image.naturalHeight) throw Error('Raster image has no decoded dimensions');
          rasterDecodes.push({ ordinal: rasterDecodes.length + 1, width: image.naturalWidth, height: image.naturalHeight, status: 'pass' });
        } catch { throw Error(`Raster image decode failed at ordinal ${rasterDecodes.length + 1}; no completed export`); }
        finally { clearTimeout(timer); image.src = ''; }
      }
      return { width, height, rasterDecodes };
    }, { svg, limits, timeoutMs });
    report.rasterDecodes = rasterDecodes;
    await page.setViewportSize(dimensions);
    const data = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    await page.setContent(`<html><body style="margin:0;background:transparent"><img alt="Selected authored study" width="${dimensions.width}" height="${dimensions.height}" src="${data}"></body></html>`, { waitUntil: 'load', timeout: timeoutMs });
    await page.locator('img').evaluate(async image => { await image.decode(); if (!image.naturalWidth || !image.naturalHeight) throw Error('SVG image did not decode'); });
    if (report.isolation.blockedRequests.length) throw Error('Study attempted a blocked external request');
    const png = await page.screenshot({ type: 'png', omitBackground: true, timeout: timeoutMs });
    const after = await fs.readFile(sourcePath);
    if (hash(after) !== report.source.sha256) throw Error('Source changed during export; no completed image emitted');
    for (const asset of assets) if (hash(await fs.readFile(asset.path)) !== asset.sha256) throw Error('Selected asset changed during export');
    await browser.close(); browser = undefined;
    await fs.writeFile(path.join(outputDir, 'export.png'), png, { flag: 'wx' });
    Object.assign(report, { status: 'pass', sourcePreserved: true, output: { path: 'export.png', bytes: png.length, sha256: hash(png), ...dimensions } });
    await fs.writeFile(receipt, JSON.stringify(report, null, 2) + '\n');
    return report;
  } catch (error) {
    report.status = 'error'; report.error = { message: error.message, code: error.code ?? 'STUDY_EXPORT_FAILED' };
    await fs.writeFile(receipt, JSON.stringify(report, null, 2) + '\n');
    throw error;
  } finally { if (browser) await browser.close().catch(() => {}); }
}

async function main(args) {
  const options = {}, positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--trusted-study') options.trustedSource = true;
    else if (arg === '--playwright-module' || arg === '--executable-path' || arg === '--asset-root') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error(`Missing value for ${arg}`);
      options[arg === '--playwright-module' ? 'playwrightModule' : arg === '--asset-root' ? 'assetRoot' : 'executablePath'] = args[++i];
    } else if (arg.startsWith('--')) throw Error(`Unknown option ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 2) throw Error('Usage: node tools/export-study-svg.mjs --trusted-study --playwright-module /existing/node_modules/playwright --executable-path /existing/chromium [--asset-root SOURCE_DIRECTORY] SOURCE.svg NEW_OUTPUT_DIRECTORY');
  console.log(JSON.stringify(await exportStudySvg({ ...options, sourcePath: positional[0], outputDir: positional[1] }), null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => { console.error(JSON.stringify({ status: 'error', message: error.message })); process.exitCode = 1; });
