import { readFile, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, dirname, sep, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256, reject } from './transport.mjs';
import { validateIconSvg, validateWoff2 } from './svg.mjs';

const own = (o, k) => Object.hasOwn(o, k);
const word = s => typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
async function bytes(file, max = 1048576) {
  const path = resolve(file), stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > max || await realpath(path) !== path) reject('package-file', 'Expected bounded canonical regular file');
  const data = await readFile(path);
  if (data.length > max) reject('package-file', 'File exceeded byte bound');
  return data;
}
async function json(file, max) { return JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(await bytes(file, max))); }
function inside(root, name) {
  if (typeof name !== 'string' || !name || isAbsolute(name) || /[\\\0]/.test(name) || name.split('/').some(s => !s || s === '.' || s === '..')) reject('package-path', 'Expected a package-relative file');
  const file = resolve(root, name);
  if (!file.startsWith(root + sep)) reject('package-path', 'File is outside package');
  return file;
}
function faces(css, file) {
  if (/url\([^)]*\/\*/i.test(css)) reject('font-css', 'Comments in source URLs are unsupported');
  let clean = '', quote = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      clean += c;
      if (c === '\\') { if (++i < css.length) clean += css[i]; }
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") { quote = c; clean += c; }
    else if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) reject('font-css', 'Unterminated CSS comment');
      clean += ' '; i = end + 1;
    } else clean += c;
  }
  if (quote) reject('font-css', 'Unterminated CSS string');
  css = clean;
  if (/@import|<|>|expression\s*\(/i.test(css)) reject('font-css', 'Unsupported CSS');
  const blocks = [...css.matchAll(/@font-face\s*\{([^{}]*)\}/g)];
  if (!blocks.length || blocks.length > 64 || css.replace(/@font-face\s*\{[^{}]*\}/g, '').trim()) reject('font-css', 'Expected bounded static font-face rules only');
  return blocks.map(([, block], index) => {
    const props = {};
    for (const part of block.split(';').filter(s => s.trim())) {
      const m = /^\s*([a-z-]+)\s*:\s*([^;]+)\s*$/.exec(part);
      if (!m || own(props, m[1]) || !['font-family', 'font-style', 'font-display', 'font-weight', 'src', 'unicode-range'].includes(m[1])) reject('font-css', 'Unsupported or duplicate descriptor');
      props[m[1]] = m[2].trim();
    }
    const family = props['font-family']?.replace(/^(['"])(.*)\1$/, '$2');
    const style = props['font-style'], weight = props['font-weight'], unicodeRange = props['unicode-range'] ?? null;
    if (!/^[\w .-]{1,100}$/.test(family ?? '') || !['normal', 'italic'].includes(style) || !/^\d{1,4}(?: \d{1,4})?$/.test(weight ?? '') || weight.split(' ').some(n => +n < 1 || +n > 1000)) reject('font-css', 'Unsupported family/style/weight');
    if (unicodeRange && !/^U\+[0-9A-F?]{1,6}(?:-[0-9A-F]{1,6})?(?:,\s*U\+[0-9A-F?]{1,6}(?:-[0-9A-F]{1,6})?)*$/i.test(unicodeRange)) reject('font-css', 'Unsupported unicode range');
    const sources = [...(props.src ?? '').matchAll(/url\(\s*(?:['"])?(\.\/[^\s)'";]+)(?:['"])?\s*\)\s*format\(['"](woff2|woff)['"]\)/g)];
    const source = sources.find(m => m[2] === 'woff2');
    if (!source || sources.map(m => m[0]).join(', ').replace(/\s/g, '') !== props.src.replace(/\s/g, '')) reject('font-css', 'Expected local WOFF/WOFF2 sources only');
    const relativeFile = source[1].slice(2);
    if (!/\.woff2$/.test(relativeFile)) reject('font-css', 'WOFF2 source extension mismatch');
    return { id: `${file}#${index}`, cssFile: file, faceIndex: index, family, style, weight, unicodeRange, relativeFile };
  });
}

/** Selected static-symbol edits; original remains separately exportable. No geometry rewriting. */
export function customizeSymbol(source, controls, { parserDir } = {}) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls) || !Object.keys(controls).length || Object.keys(controls).some(k => !['width', 'height', 'color', 'strokeWidth'].includes(k))) reject('customization', 'Supply supported width/height/color/strokeWidth controls');
  for (const k of ['width', 'height']) if (own(controls, k) && (!Number.isFinite(controls[k]) || controls[k] < 1 || controls[k] > 2048)) reject('customization', 'Symbol dimensions must be1..2048');
  if (own(controls, 'color') && !/^#[a-f0-9]{6}$/i.test(controls.color)) reject('customization', 'Expected six-digit hex color');
  if (own(controls, 'strokeWidth') && (!Number.isFinite(controls.strokeWidth) || controls.strokeWidth < 0 || controls.strokeWidth > 16)) reject('customization', 'Stroke width must be0..16 source units');
  const original = validateIconSvg(source, { parserDir });
  let svg = original.safe.toString();
  for (const k of ['width', 'height']) if (own(controls, k)) {
    svg = svg.replace(/^<svg\b[^>]*>/, tag => tag.replace(new RegExp(` ${k}="[^"]*"`), '').replace(/>$/, ` ${k}="${controls[k]}">`));
  }
  if (own(controls, 'color')) {
    if (!/ (?:fill|stroke)="currentColor"/.test(svg)) reject('customization', 'No currentColor paint to replace');
    svg = svg.replace(/ (fill|stroke)="currentColor"/g, ` $1="${controls.color}"`);
  }
  if (own(controls, 'strokeWidth')) {
    if (!/ stroke-width="[^"]*"/.test(svg)) reject('customization', 'No explicit stroke width to replace');
    svg = svg.replace(/ stroke-width="[^"]*"/g, ` stroke-width="${controls.strokeWidth}"`);
  }
  const derived = validateIconSvg(Buffer.from(svg), { parserDir });
  return { svg: derived.safe, sourceSHA256: sha256(source), sha256: derived.safeSha256, controls: structuredClone(controls), policy: derived.policy };
}

/** Explicit local data roots only. No I/O on construction, network, installs or automatic acquisition. */
export function createPackageLibrary({ sources, parserDir, iconUtilsDir } = {}) {
  if (!Array.isArray(sources) || !sources.length || sources.length > 8) reject('input', 'Supply 1..8 explicit package sources');
  const selected = sources.map(s => {
    if (!s || !word(s.id) || !['font', 'symbol'].includes(s.kind) || typeof s.packageDir !== 'string' || !s.packageDir.trim()) reject('input', 'Source requires id, kind and packageDir');
    return structuredClone(s);
  });
  if (new Set(selected.map(s => s.id)).size !== selected.length) reject('input', 'Source IDs must be unique');
  async function load(id) {
    const source = selected.find(s => s.id === id);
    if (!source) reject('selection', 'Unknown source ID');
    const root = resolve(source.packageDir), pkgBytes = await bytes(join(root, 'package.json')), pkg = JSON.parse(pkgBytes);
    const pattern = source.kind === 'font' ? /^@fontsource(?:-variable)?\/[a-z0-9-]+$/ : /^@iconify-json\/[a-z0-9-]+$/;
    if (!pattern.test(pkg.name ?? '') || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(pkg.version ?? '')) reject('package-identity', 'Unsupported package identity/version');
    const metaFile = source.kind === 'font' ? 'metadata.json' : 'info.json';
    const metaBytes = await bytes(inside(root, metaFile)), meta = JSON.parse(metaBytes);
    return { source, root, pkg, meta, identity: { sourceId: source.id, kind: source.kind, packageName: pkg.name, packageVersion: pkg.version, packageJSONSHA256: sha256(pkgBytes), metadataFile: metaFile, metadataSHA256: sha256(metaBytes), acquisition: 'local-package', note: 'Local byte identity; registry receipt is separate evidence, not inferred from a package name.' } };
  }
  async function available() {
    return Promise.all(selected.map(async s => { try { const x = await load(s.id); return { ...x.identity, state: 'local' }; } catch (e) { return { sourceId: s.id, kind: s.kind, state: e.code === 'ENOENT' ? 'acquisition-required' : 'error', reason: e.message }; } }));
  }
  async function search({ kind, query = '', limit = 12 } = {}) {
    if (!['font', 'symbol'].includes(kind) || typeof query !== 'string' || query.length > 128 || !Number.isSafeInteger(limit) || limit < 1 || limit > 32) reject('input', 'Expected font/symbol, bounded public query and limit1..32');
    const results = [], states = await available();
    for (const state of states.filter(s => s.kind === kind && s.state === 'local')) {
      const x = await load(state.sourceId);
      if (kind === 'font') {
        if (typeof x.meta.family !== 'string') reject('package-metadata', 'Font family missing');
        if (x.meta.family.toLowerCase().includes(query.toLowerCase())) results.push({ sourceId: x.source.id, family: x.meta.family, packageVersion: x.pkg.version, metadataVersionLabel: x.meta.version ?? null, next: 'details({sourceId,cssFile})' });
      } else {
        const icons = await json(inside(x.root, 'icons.json'), 5_000_000);
        if (icons.prefix !== x.meta.prefix || !icons.icons || Object.keys(icons.icons).length > 20000 || Object.keys(icons.aliases ?? {}).length > 20000) reject('package-metadata', 'Unsupported icon set');
        for (const name of [...Object.keys(icons.icons), ...Object.keys(icons.aliases ?? {})].sort()) {
          if (word(name) && name.includes(query.toLowerCase())) results.push({ sourceId: x.source.id, name, alias: !own(icons.icons, name) });
          if (results.length >= limit) break;
        }
      }
      if (results.length >= limit) break;
    }
    return { mode: 'offline-local-packages', sources: states.map(({ sourceId, kind, state, packageName, packageVersion, reason }) => ({ sourceId, kind, state, ...(packageName ? { packageName, packageVersion } : {}), ...(reason ? { reason } : {}) })), results: results.slice(0, limit), limit, note: 'Missing sources require separate explicit acquisition; no network fallback.' };
  }
  async function details({ sourceId, cssFile } = {}) {
    const x = await load(sourceId);
    if (x.source.kind === 'symbol') return { ...x.identity, prefix: x.meta.prefix, license: x.meta.license ?? null, next: 'acquire({sourceId,name,selected:true,outputDir})' };
    const file = cssFile ?? x.pkg.main;
    if (typeof file !== 'string' || !file.endsWith('.css')) reject('font-css', 'Select one real CSS file');
    const raw = await bytes(inside(x.root, file));
    const found = faces(new TextDecoder('utf8', { fatal: true }).decode(raw), file);
    if (found.some(f => f.family !== x.meta.family)) reject('font-css', 'CSS family disagrees with metadata');
    for (const face of found) inside(x.root, face.relativeFile);
    return { ...x.identity, metadataVersionLabel: x.meta.version ?? null, metadataVersionMeaning: 'Source catalog label; not package version or proven binary revision', license: x.meta.license ?? null, cssFile: file, cssSHA256: sha256(raw), faces: found };
  }
  async function acquire(input = {}) {
    if (input.selected !== true || typeof input.outputDir !== 'string' || !input.outputDir.trim()) reject('selection', 'Explicit selected:true and new outputDir required');
    const x = await load(input.sourceId), artifacts = [], provenance = { ...x.identity, selected: true };
    let license;
    if (x.source.kind === 'font') {
      if (input.customize !== undefined) reject('customization', 'Font binaries stay unmodified; use exported CSS typography controls');
      if (x.pkg.license !== 'OFL-1.1' || x.meta.license?.type !== 'OFL-1.1') reject('license', 'This font route requires matching OFL-1.1 declarations and full notice');
      license = await bytes(inside(x.root, 'LICENSE'), 65536);
      if (!license.toString().includes('SIL OPEN FONT LICENSE Version 1.1')) reject('license', 'Full OFL notice missing');
      const detail = await details(input), face = detail.faces.find(f => f.faceIndex === input.faceIndex);
      if (!face) reject('selection', 'Select an actual faceIndex from details');
      const binary = await bytes(inside(x.root, face.relativeFile)); validateWoff2(binary);
      const css = `@font-face{font-family:'${face.family}';font-style:${face.style};font-weight:${face.weight};src:url('./font.woff2') format('woff2');${face.unicodeRange ? `unicode-range:${face.unicodeRange};` : ''}}`;
      artifacts.push(['font.woff2', binary], ['font.css', css]);
      Object.assign(provenance, { face, cssFile: detail.cssFile, cssSHA256: detail.cssSHA256, metadataVersionLabel: detail.metadataVersionLabel, binaryRevision: null, binaryRevisionNote: 'Not independently decoded; exact bytes are pinned below. No font sanitation claim.' });
    } else {
      if (!word(input.name)) reject('selection', 'Select a bounded icon name');
      const declared = x.meta.license;
      if (!declared?.spdx || declared.spdx !== x.pkg.license || !x.source.license?.path || !/^[a-f0-9]{64}$/.test(x.source.license.sha256 ?? '') || x.source.license.declaredURL !== declared.url) reject('license', 'Matching asset-specific license declaration and separately retained full notice required');
      license = await bytes(x.source.license.path, 65536);
      if (sha256(license) !== x.source.license.sha256 || license.length < 100) reject('license', 'Full notice hash/length mismatch');
      if (typeof iconUtilsDir !== 'string' || !iconUtilsDir.trim()) reject('not-run', 'Explicit existing @iconify/utils package directory required');
      const utils = resolve(iconUtilsDir), upkg = await json(inside(utils, 'package.json'));
      if (upkg.name !== '@iconify/utils' || upkg.version !== '3.1.7') reject('not-run', 'Only explicitly qualified @iconify/utils3.1.7 pure helpers supported');
      // Import only pure helpers; never import the barrel, loaders or install-pkg modules.
      const [{ getIconData }, { iconToSVG }, { iconToHTML }] = await Promise.all(['icon-set/get-icon', 'svg/build', 'svg/html'].map(async n => {
        const file = inside(utils, `lib/${n}.js`); await bytes(file); return import(pathToFileURL(file).href);
      }));
      const raw = await bytes(inside(x.root, 'icons.json'), 5_000_000), icons = JSON.parse(raw);
      if (icons.prefix !== x.meta.prefix || Object.keys(icons.icons ?? {}).length > 20000 || Object.keys(icons.aliases ?? {}).length > 20000) reject('package-metadata', 'Unsupported icon set identity/size');
      let target = input.name; const seen = new Set();
      while (!own(icons.icons ?? {}, target)) {
        if (seen.has(target) || seen.size >= 32 || !own(icons.aliases ?? {}, target) || !word(icons.aliases[target]?.parent)) reject('selection', 'Missing, cyclic or overly deep icon alias');
        seen.add(target); target = icons.aliases[target].parent;
      }
      const icon = getIconData(icons, input.name);
      if (!icon || typeof icon.body !== 'string' || icon.body.length > 524288) reject('selection', 'Icon missing or oversized');
      const built = iconToSVG(icon, { width: 24, height: 24 }), original = iconToHTML(built.body, built.attributes);
      const validated = validateIconSvg(Buffer.from(original), { parserDir });
      artifacts.push(['resolved.svg', original], ['safe.svg', validated.safe]);
      if (input.customize !== undefined) {
        const modified = customizeSymbol(validated.safe, input.customize, { parserDir });
        artifacts.push(['derived.svg', modified.svg]);
        provenance.derivation = { sourceSHA256: modified.sourceSHA256, sha256: modified.sha256, controls: modified.controls };
      }
      const { path: localLicensePath, ...licenseSource } = x.source.license;
      Object.assign(provenance, { name: input.name, prefix: icons.prefix, collectionJSONSHA256: sha256(raw), upstreamVersion: null, collectionLastModified: icons.lastModified ?? null, converter: { name: upkg.name, version: upkg.version, pipeline: 'getIconData -> iconToSVG -> iconToHTML' }, validationPolicy: validated.policy, licenseSource, note: 'Package version and collection timestamp are not an upstream icon-release version. Unsupported resolved SVG refuses.' });
    }
    artifacts.push(['LICENSE.txt', license]);
    provenance.files = artifacts.map(([file, data]) => ({ file, bytes: Buffer.byteLength(data), sha256: sha256(data) }));
    const output = resolve(input.outputDir);
    if (await realpath(dirname(output)) !== dirname(output)) reject('output', 'Output parent must exist without symlink ancestors');
    await mkdir(output);
    for (const [file, data] of artifacts) await writeFile(join(output, file), data, { flag: 'wx' });
    await writeFile(join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' });
    return { ...provenance, outputDir: output };
  }
  return { capabilities: available, search, details, acquire };
}
