import { readFile, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join, sep, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { validateIconSvg } from '../assets/svg.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const digest = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const id = s => typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
const color = s => typeof s === 'string' && /^#[a-f0-9]{6}$/i.test(s);
const https = s => { try { const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
function refuse(code, message) { const e = new Error(message); e.code = code; throw e; }
async function file(path, bound) {
  const absolute = resolve(path), stat = await lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > bound || await realpath(absolute) !== absolute) refuse('item-file', 'Expected bounded canonical regular file');
  const b = await readFile(absolute); if (b.length > bound) refuse('item-file', 'File exceeded bound'); return b;
}
function local(root, value) {
  if (typeof value !== 'string' || !value || isAbsolute(value) || /[\\\0]/.test(value) || value.split('/').some(x => !x || x === '.' || x === '..')) refuse('item-path', 'Expected local relative file');
  const path = resolve(root, value); if (!path.startsWith(root + sep)) refuse('item-path', 'File escaped source root'); return path;
}
function check(manifest) {
  if (manifest?.schema !== 'ingenium-items/1' || !id(manifest.id) || !['illustration', 'texture'].includes(manifest.kind) || typeof manifest.title !== 'string' || manifest.title.length > 128 || !https(manifest.sourceURL) || typeof manifest.version !== 'string' || !manifest.version || manifest.version.length > 128) refuse('item-manifest', 'Expected versioned, named source with HTTPS attribution URL');
  const r = manifest.rights;
  if (!r || !['MIT', 'CC-BY-4.0'].includes(r.license) || typeof r.author !== 'string' || !r.author || r.author.length > 256 || !https(r.licenseURL) || !https(r.evidenceURL) || !digest(r.evidenceSHA256) || typeof r.scope !== 'string' || !r.scope || r.scope.length > 1024) refuse('item-rights', 'Explicit author, license, URL, scope and hashed retained evidence required');
  if (!Array.isArray(manifest.assets) || !manifest.assets.length || manifest.assets.length > 64 || new Set(manifest.assets.map(a => a.id)).size !== manifest.assets.length) refuse('item-manifest', 'Expected1..64 unique curated assets');
  for (const a of manifest.assets) if (!id(a.id) || typeof a.title !== 'string' || a.title.length > 128 || !digest(a.sha256) || !https(a.sourceURL) || typeof a.sourceNote !== 'string' || !a.sourceNote || a.sourceNote.length > 2048) refuse('item-manifest', 'Asset requires ID, title, exact byte hash, source URL and extraction/version scope');
  return manifest;
}
/** Offline curated-source adapter. Caller explicitly supplies manifests; construction has no I/O. */
export function createItemLibrary({ sources, parserDir } = {}) {
  if (!Array.isArray(sources) || !sources.length || sources.length > 8 || sources.some(s => typeof s !== 'string' || !s.trim())) refuse('item-input', 'Supply1..8 local manifest paths');
  const paths = sources.map(s => resolve(s));
  async function load() {
    const all = await Promise.all(paths.map(async path => { const raw = await file(path, 131072); let m; try { m = JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(raw)); } catch { refuse('item-manifest', 'Invalid UTF8/JSON'); } return { m: check(m), root: dirname(path), manifestSHA256: hash(raw) }; }));
    if (new Set(all.map(x => x.m.id)).size !== all.length) refuse('item-manifest', 'Source IDs must be unique'); return all;
  }
  function identity(x) { const { assets, rights, ...m } = x.m; return { ...m, rights: structuredClone(rights), manifestSHA256: x.manifestSHA256, acquisition: 'offline-curated-source', evidenceMeaning: 'Caller-supplied local catalog and byte identity; network origin and engineering/taste acceptance are not inferred.' }; }
  async function discover({ kind, query = '', limit = 12 } = {}) {
    if ((kind !== undefined && !['texture', 'illustration'].includes(kind)) || typeof query !== 'string' || query.length > 128 || !Number.isSafeInteger(limit) || limit < 1 || limit > 32) refuse('item-input', 'Use bounded query, texture/illustration and limit1..32');
    const all = await load(), results = [];
    for (const x of all) if (!kind || kind === x.m.kind) for (const a of x.m.assets) if (`${a.id} ${a.title}`.toLowerCase().includes(query.toLowerCase())) results.push({ sourceId: x.m.id, kind: x.m.kind, id: a.id, title: a.title, sourceURL: a.sourceURL });
    return { mode: 'offline-curated-sources', sources: all.map(identity), results: results.slice(0, limit), limit, note: 'Explicitly prepared local source subset, not an online provider catalog. Inspect before selecting.' };
  }
  async function selected({ sourceId, assetId } = {}) {
    const x = (await load()).find(x => x.m.id === sourceId), a = x?.m.assets.find(a => a.id === assetId);
    if (!a) refuse('item-selection', 'Select an existing sourceId and assetId');
    const raw = await file(local(x.root, a.file), 524288), evidence = await file(local(x.root, x.m.rights.evidenceFile), 65536);
    if (hash(raw) !== a.sha256 || hash(evidence) !== x.m.rights.evidenceSHA256 || evidence.length < 100) refuse('item-integrity', 'Source or retained rights evidence hash/length mismatch');
    const validated = validateIconSvg(raw, { parserDir });
    return { x, a, raw, evidence, validated };
  }
  async function inspect(input) {
    const { x, a, raw, validated } = await selected(input);
    return { ...identity(x), asset: structuredClone(a), bytes: raw.length, sha256: hash(raw), viewBox: validated.viewBox, palette: [...new Set([...validated.safe.toString('utf8').matchAll(/(?:fill|stroke)="(#[a-f0-9]{3}(?:[a-f0-9]{3})?)"/gi)].map(m => m[1].toLowerCase()))], previewSVG: validated.safe.toString('utf8'), validationPolicy: validated.policy, usage: x.m.kind === 'texture' ? 'Editable repeatable tile; preview repeats with CSS background-repeat, not an SVG pattern element.' : 'Editable static illustration; explicit palette substitutions only.' };
  }
  async function acquire(input = {}) {
    if (input.selected !== true || typeof input.outputDir !== 'string' || !input.outputDir.trim()) refuse('item-selection', 'Explicit selected:true and new outputDir required');
    const { x, a, raw, evidence, validated } = await selected(input);
    const replacements = input.recolor ?? {};
    if (!replacements || typeof replacements !== 'object' || Array.isArray(replacements) || Object.keys(replacements).length > 16 || Object.entries(replacements).some(([from, to]) => !/^#[a-f0-9]{3}(?:[a-f0-9]{3})?$/i.test(from) || !color(to))) refuse('item-modification', 'Recolor uses up to16 exact existing hex colors mapped to six-digit hex colors');
    const normalized = Object.fromEntries(Object.entries(replacements).map(([k, v]) => [k.toLowerCase(), v.toLowerCase()]));
    if (Object.keys(normalized).length !== Object.keys(replacements).length) refuse('item-modification', 'Duplicate case-insensitive recolor key');
    const used = new Set();
    const derived = validated.safe.toString('utf8').replace(/(fill|stroke)="(#[a-f0-9]{3}(?:[a-f0-9]{3})?)"/gi, (whole, attr, value) => { const k = value.toLowerCase(); if (!Object.hasOwn(normalized, k)) return whole; used.add(k); return `${attr}="${normalized[k]}"`; });
    if (used.size !== Object.keys(normalized).length) refuse('item-modification', 'Recolor references an absent source color');
    validateIconSvg(Buffer.from(derived), { parserDir });
    const background = input.background ?? '#ffffff'; if (!color(background)) refuse('item-modification', 'Background must be six-digit hex');
    const attribution = `${a.title} — ${x.m.rights.author}. ${a.sourceURL}\nLicense: ${x.m.rights.license} ${x.m.rights.licenseURL}\nRights evidence: ${x.m.rights.evidenceURL}\nScope: ${x.m.rights.scope}\nChanges: ${used.size ? `palette substitutions ${JSON.stringify(normalized)}` : 'SVG serialization only; no palette changes'}. Preview background: ${background}.\nNo endorsement implied.\n`;
    const preview = `<!doctype html><meta charset="utf-8"><title>Selected ${x.m.kind} preview</title><style>html{background:${background}}body{margin:24px}main{width:512px;height:320px;${x.m.kind === 'texture' ? "background-image:url('./derived.svg');background-repeat:repeat" : 'display:grid;place-items:center'}}img{width:240px;height:240px}</style><main>${x.m.kind === 'illustration' ? '<img src="./derived.svg" alt="Selected illustration">' : ''}</main>`;
    const artifacts = [['original.svg', raw], ['derived.svg', derived], ['RIGHTS-EVIDENCE.txt', evidence], ['ATTRIBUTION.txt', attribution], ['preview.html', preview]];
    const provenance = { schema: 'ingenium-item-acquisition/1', ...identity(x), asset: structuredClone(a), selected: true, modification: { recolor: normalized, background }, sourceValidationPolicy: validated.policy, policyScope: 'Bounded static source SVG admission. Textures repeat in CSS. No general SVG pattern/gradient/filter support or sanitation guarantee.', files: artifacts.map(([name, b]) => ({ file: name, bytes: Buffer.byteLength(b), sha256: hash(b) })) };
    const output = resolve(input.outputDir); if (await realpath(dirname(output)) !== dirname(output)) refuse('item-output', 'Output parent must exist without symlink ancestors');
    await mkdir(output);
    for (const [name, data] of artifacts) await writeFile(join(output, name), data, { flag: 'wx' });
    await writeFile(join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' });
    return { ...provenance, outputDir: output };
  }
  return { discover, inspect, acquire };
}
