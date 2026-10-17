/** Finite pinned CSS materials; no runtime network, installation or package code import. */
import { readFile, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
const sha = value => createHash('sha256').update(value).digest('hex');
const PIN = Object.freeze({ name: 'open-props', version: '1.7.23', license: 'MIT', source: 'https://github.com/argyleink/open-props', documentation: 'https://open-props.style/', registry: 'https://registry.npmjs.org/open-props/-/open-props-1.7.23.tgz', integrity: 'sha512-+xyrJmxV9QUBFbSwPROYhOg/FLXry+uuPr4R+B5EaE4556Oc18/8ZC/fL5A+/lbRSwNvA0Alh+C0KpyFWLmLZg==' });
const FILES = Object.freeze({ 'package.json': 'dab7d3f760983e601d00572a720ecb80957978eb950f2a288ffcc0e3d2cf320a', LICENSE: 'fed3aa342094f6bb33701d09133c159a4c124e509ede255a889dd2c28ec3ab6e', 'gradients.min.css': '739bd0fd3cb9ec2a8406e3e87335c90223780563a2f19014e1aa8e00c8c38733' });
const CATALOG = [
  ...Array.from({ length: 30 }, (_, index) => { const n = index + 1; return { id: `gradient-${n}`, title: ({4:'Cool linear material',8:'Graphite conic material'})[n] ?? `Open Props gradient ${n}`, kind: 'gradient', controls: ['recolor', 'background', 'tileSize', 'opacity'] }; }),
  ...Array.from({ length: 5 }, (_, index) => { const n = index + 1; return { id: `noise-${n}`, title: n === 1 ? 'Fine fractal noise material' : `Open Props noise ${n}`, kind: 'noise', controls: ['background', 'tileSize', 'opacity'] }; }),
];
const fail = message => { throw new Error(message); };
const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const hex = value => typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value);
const plain = value => value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const entry = id => CATALOG.find(item => item.id === id) ?? fail('Unknown selected material; discover() lists the finite supported subset');
async function bounded(file) {
  const absolute = resolve(file), stat = await lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536 || await realpath(absolute) !== absolute) fail('Expected canonical regular material source up to65536 bytes');
  const bytes = await readFile(absolute); if (bytes.length > 65536) fail('Material source exceeds byte bound'); return bytes;
}
// Selected declaration extraction only after the entire known CSS file matches its pin.
// Quoted data-URL semicolons are values, not declaration separators.
function declaration(css, id) {
  const start = css.indexOf(`--${id}:`); if (start < 0) fail('Pinned material declaration missing');
  let quote = null, depth = 0;
  for (let i = start; i < css.length; i++) {
    const c = css[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) return css.slice(start, i + 1);
  }
  fail('Pinned material declaration incomplete');
}
function checkSelection(selection) {
  if (!plain(selection) || selection.schemaVersion !== 1 || selection.sourceName !== PIN.name || selection.sourceVersion !== PIN.version || selection.selected !== true) fail('Expected explicit selected pinned material record');
  return entry(selection.materialId);
}
function select({ id } = {}) { entry(id); return { schemaVersion: 1, materialId: id, sourceName: PIN.name, sourceVersion: PIN.version, selected: true }; }
function customize(selection, controls = {}) {
  const item = checkSelection(selection);
  if (!plain(controls) || Object.keys(controls).some(key => !item.controls.includes(key))) fail('Unsupported material control; arbitrary CSS and external resources refuse');
  if (selection.controls && (!plain(selection.controls) || Object.keys(selection.controls).some(key => !item.controls.includes(key)))) fail('Unsupported saved material control');
  const current = { background: '#ffffff', tileSize: 200, opacity: 1, ...(item.kind === 'gradient' ? { recolor: {} } : {}), ...selection.controls, ...controls };
  if (!hex(current.background) || !Number.isInteger(current.tileSize) || current.tileSize < 32 || current.tileSize > 512 || !Number.isFinite(current.opacity) || current.opacity <= 0 || current.opacity > 1) fail('Use opaque hex background, integer tileSize32..512 and opacity greater than0 up to1');
  if (item.kind === 'gradient' && (!plain(current.recolor) || Object.keys(current.recolor).length > 8 || Object.entries(current.recolor).some(([from, to]) => !/^#[a-f0-9]{3}(?:[a-f0-9]{3})?$/i.test(from) || !hex(to)))) fail('Recolor maps up to8 existing exact hex stops to opaque six-digit colors');
  return { ...structuredClone(selection), controls: structuredClone(current) };
}
export function createMaterialLibrary({ packageDir } = {}) {
  if (packageDir !== undefined && (typeof packageDir !== 'string' || !packageDir.trim())) fail('Supply explicit local Open Props packageDir');
  async function load() {
    if (!packageDir) fail('Acquisition required: supply exact local open-props1.7.23 packageDir');
    const files = {};
    for (const [name, hash] of Object.entries(FILES)) { const bytes = await bounded(join(packageDir, name)); if (sha(bytes) !== hash) fail(`Pinned material source hash mismatch: ${name}`); files[name] = bytes; }
    return files;
  }
  function discover({ query = '' } = {}) {
    if (typeof query !== 'string' || query.length > 100) fail('Query must be text up to100 characters');
    return { source: { ...PIN }, mode: 'explicit-local-data-package', materials: CATALOG.filter(item => `${item.id} ${item.title} ${item.kind}`.toLowerCase().includes(query.toLowerCase())).map(item => structuredClone(item)), coverage: { selectedMaterials: CATALOG.length, sourceGradientDeclarations: 30, sourceNoiseDeclarations: 5, meaning: 'All30 numbered gradients and5 numbered noise declarations are exposed from the exact pinned stylesheet; other package tokens and noise-filter declarations are outside this interface. Browser qualification is separate evidence.' }, limits: ['Finite pinned CSS only, no arbitrary CSS parser', 'Noise uses exact upstream data-URL SVG feTurbulence via the browser renderer, outside static-icon SVG admission', 'No runtime network/install or full-page templates'] };
  }
  async function capabilities() { try { await load(); return { status: 'local', source: { ...PIN }, selectedMaterials: CATALOG.map(item => item.id) }; } catch (error) { return { status: !packageDir || error.code === 'ENOENT' ? 'acquisition-required' : 'error', reason: error.message, source: { ...PIN } }; } }
  async function inspect({ id } = {}) {
    const item = entry(id), files = await load(), originalDeclaration = declaration(files['gradients.min.css'].toString('utf8'), id);
    const value = originalDeclaration.slice(id.length + 3, -1);
    if (/url\(/i.test(value) && (item.kind !== 'noise' || !value.startsWith('url("data:image/svg+xml;charset=utf-8,') || !value.endsWith('")'))) fail('External or unsupported CSS resource refused');
    const palette = [...new Set(value.match(/#[a-f0-9]{3}(?:[a-f0-9]{3})?\b/gi) ?? [])];
    return { ...structuredClone(item), upstream: { ...PIN }, sourceFiles: { ...FILES }, originalDeclaration, declarationSHA256: sha(originalDeclaration), palette, recolorScope: 'Exact listed hex stop spellings only; named colors and rgba() stops are retained and cannot be targeted. No arbitrary CSS.', license: { spdx: 'MIT', text: files.LICENSE.toString('utf8') }, sourceFeatures: item.kind === 'noise' ? 'Exact pinned inline SVG fractal-noise filter rendered as CSS image; not admitted by static-icon policy' : 'Exact pinned CSS gradient with empty upstream --gradient-space dependency', registryMeaning: 'Local exact-file identity; retain separate acquisition receipt for registry SHA512 consistency' };
  }
  async function render({ selection } = {}) {
    checkSelection(selection);
    const source = customize(selection, selection.controls ?? {}), detail = await inspect({ id: source.materialId }), c = source.controls;
    let value = detail.originalDeclaration.slice(source.materialId.length + 3, -1);
    const replacements = Object.fromEntries(Object.entries(c.recolor ?? {}).map(([from, to]) => [from.toLowerCase(), to.toLowerCase()]));
    if (Object.keys(replacements).length !== Object.keys(c.recolor ?? {}).length || Object.keys(replacements).some(from => !detail.palette.some(color => color.toLowerCase() === from))) fail('Recolor requires distinct existing source hex stop spellings');
    value = value.replace(/#[a-f0-9]{3}(?:[a-f0-9]{3})?\b/gi, color => replacements[color.toLowerCase()] ?? color);
    const originalCSS = `:root{--gradient-space: ;${detail.originalDeclaration}}\n`;
    const css = `:root{--gradient-space: ;--ingenium-material:${value};}\n.material-stage{background-color:${c.background};width:320px;height:240px;overflow:hidden}.material{width:100%;height:100%;background-image:var(--ingenium-material);background-size:${c.tileSize}px ${c.tileSize}px;background-repeat:repeat;opacity:${c.opacity}}\n`;
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src data:; base-uri 'none'"><title>${esc(detail.title)}</title><link rel="stylesheet" href="material.css"><h1>${esc(detail.title)}</h1><div class="material-stage"><div class="material" role="img" aria-label="${esc(detail.title)}"></div></div><p>Open Props1.7.23 / MIT. Selected editable material proof.</p></html>\n`;
    return { source, detail, originalCSS, css, html };
  }
  async function acquire({ selection, outputDir } = {}) {
    if (typeof outputDir !== 'string' || !outputDir.trim()) fail('Supply a new explicit outputDir');
    const rendered = await render({ selection });
    const artifacts = { 'original.css': rendered.originalCSS, 'material.css': rendered.css, 'source.json': JSON.stringify(rendered.source, null, 2) + '\n', 'preview.html': rendered.html, 'LICENSE.open-props.txt': rendered.detail.license.text };
    const provenance = { schemaVersion: 1, upstream: { ...PIN }, selectedSourceFiles: { ...FILES }, selectedDeclarationSHA256: rendered.detail.declarationSHA256, selectedMaterial: rendered.source.materialId, controls: rendered.source.controls, originalMeaning: 'Exact selected declaration plus explicit empty gradient-space dependency, not the complete upstream CSS file', derivativeMeaning: 'Original retained separately; explicit stop substitutions and presentation controls', registryMeaning: rendered.detail.registryMeaning, sourceFeatures: rendered.detail.sourceFeatures, artifacts: Object.fromEntries(Object.entries(artifacts).map(([name, bytes]) => [name, sha(bytes)])) };
    const out = resolve(outputDir); if (await realpath(dirname(out)) !== dirname(out)) fail('Output parent must exist and be canonical');
    await mkdir(out);
    for (const [name, bytes] of Object.entries(artifacts)) await writeFile(join(out, name), bytes, { flag: 'wx' });
    await writeFile(join(out, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' });
    return { status: 'acquired', outputDir: out, previewPath: join(out, 'preview.html'), ...provenance };
  }
  return Object.freeze({ capabilities, discover, inspect, select, customize, render, acquire });
}
