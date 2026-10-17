import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { checkTextContrast, contrastRatio } from '../checks/index.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const hex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const entries = [
  { id: 'radix-blue-light', family: 'blue', mode: 'light', file: 'blue.css' },
  { id: 'radix-blue-dark', family: 'blue', mode: 'dark', file: 'blue-dark.css' },
  { id: 'radix-gray-light', family: 'gray', mode: 'light', file: 'gray.css' },
  { id: 'radix-gray-dark', family: 'gray', mode: 'dark', file: 'gray-dark.css' },
];
function sourceFile(name) { return readFileSync(new URL(`./source/${name}`, import.meta.url)); }
function validate(palette) {
  if (!palette || palette.schemaVersion !== 1 || !identifier(palette.id) || palette.colorSpace !== 'srgb' || !['source', 'derived', 'generated'].includes(palette.kind)) throw new TypeError('Expected version 1 opaque sRGB palette and safe id');
  if (!palette.tokens || Object.getPrototypeOf(palette.tokens) !== Object.prototype) throw new TypeError('Palette tokens must be an object');
  const tokens = Object.entries(palette.tokens);
  if (!tokens.length || tokens.length > 64 || tokens.some(([key, color]) => !identifier(key) || !hex(color))) throw new TypeError('Require 1..64 safe token names and opaque #RRGGBB values');
  if (!palette.license || typeof palette.license.spdx !== 'string' || typeof palette.license.text !== 'string' || !palette.license.text.trim()) throw new TypeError('Palette license text is required');
  if (!palette.provenance || typeof palette.provenance !== 'object' || Array.isArray(palette.provenance)) throw new TypeError('Palette provenance required');
  return palette;
}
/** Local selected catalog only; never downloads or installs on discovery. */
export function discoverPalettes({ query = '', mode } = {}) {
  if (typeof query !== 'string' || (mode !== undefined && !['light', 'dark'].includes(mode))) throw new TypeError('Query must be text; mode is light or dark');
  return entries.filter(entry => (!mode || entry.mode === mode) && `${entry.id} ${entry.family}`.includes(query.toLowerCase())).map(entry => ({ ...entry, source: '@radix-ui/colors', version: '3.0.0', availability: 'local', tokenCount: 12, colorSpace: 'srgb' }));
}
/** Exact sRGB values, retaining original selected CSS separately including P3. */
export function inspectPalette(id) {
  const entry = entries.find(entry => entry.id === id);
  if (!entry) throw new RangeError('Unknown local palette; discoverPalettes() lists the bounded catalog. Additional scales require separate acquisition.');
  const provenance = JSON.parse(sourceFile('provenance.json'));
  const original = sourceFile(entry.file), license = sourceFile('LICENSE');
  for (const [file, bytes] of [[entry.file, original], ['LICENSE', license]]) {
    if (provenance.files.find(item => item.path === `package/${file}`)?.sha256 !== sha256(bytes)) throw new Error(`Selected source integrity mismatch: ${file}`);
  }
  const pairs = [...original.toString('utf8').matchAll(/--([a-z]+-\d+): (#[0-9a-f]{6});/g)].map(match => [match[1], match[2]]);
  if (pairs.length !== 12 || new Set(pairs.map(([name]) => name)).size !== 12) throw new Error('Selected source must contain exactly twelve opaque sRGB tokens');
  return { schemaVersion: 1, id, kind: 'source', colorSpace: 'srgb', tokens: Object.fromEntries(pairs), license: { spdx: 'MIT', text: license.toString('utf8') }, provenance: { ...provenance, selectedFile: `package/${entry.file}`, selectedFileSha256: sha256(original), extraction: 'Exact opaque sRGB hex declarations; P3 overrides omitted from token API' } };
}
/** Returns a fresh editable record; selection expresses scope, never acceptance. */
export function selectPalette(id, { tokens } = {}) {
  const palette = inspectPalette(id);
  if (tokens === undefined) return palette;
  if (!Array.isArray(tokens) || !tokens.length || new Set(tokens).size !== tokens.length || tokens.some(token => !Object.hasOwn(palette.tokens, token))) throw new TypeError('Select a nonempty unique list of existing token names');
  return { ...palette, tokens: Object.fromEntries(tokens.map(token => [token, palette.tokens[token]])), selection: { tokens: [...tokens] } };
}
/** A derivative always gets a distinct id and keeps source license/provenance. */
export function customizePalette(palette, { id, replacements } = {}) {
  validate(palette);
  if (!identifier(id) || id === palette.id) throw new TypeError('Derivative requires a distinct safe id');
  if (!replacements || Object.getPrototypeOf(replacements) !== Object.prototype || !Object.keys(replacements).length) throw new TypeError('Nonempty replacements object required');
  if (Object.entries(replacements).some(([name, color]) => !Object.hasOwn(palette.tokens, name) || !hex(color))) throw new TypeError('Replace existing tokens with opaque #RRGGBB values');
  const parent = clone(palette);
  return { ...parent, id, kind: 'derived', tokens: { ...parent.tokens, ...replacements }, derivation: { parentId: parent.id, parentTokenSha256: sha256(JSON.stringify(parent.tokens)), replacements: clone(replacements), previous: parent.derivation ?? null } };
}
/** Simple two-anchor linear sRGB interpolation, explicitly no perceptual guarantee. */
export function generatePalette({ id, from, to, steps = 12 } = {}) {
  if (!identifier(id) || !hex(from) || !hex(to) || !Number.isInteger(steps) || steps < 2 || steps > 64) throw new TypeError('Require safe id, opaque #RRGGBB anchors and 2..64 integer steps');
  const channels = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  const a = channels(from), b = channels(to);
  const tokens = Object.fromEntries(Array.from({ length: steps }, (_, i) => [`step-${i + 1}`, `#${a.map((v, c) => Math.round(v + (b[c] - v) * i / (steps - 1)).toString(16).padStart(2, '0')).join('')}`]));
  return { schemaVersion: 1, id, kind: 'generated', colorSpace: 'srgb', tokens, license: { spdx: 'NOASSERTION', text: 'Generated numeric sRGB values from supplied anchors. No third-party source palette copied; rights in supplied anchors are not assessed.' }, provenance: { method: 'Linear interpolation of encoded sRGB channels, rounded to 8-bit channels', from, to, steps, limits: 'No perceptual uniformity, contrast, aesthetics or suitability guarantee' } };
}
function token(palette, name) {
  validate(palette);
  if (!Object.hasOwn(palette.tokens, name)) throw new RangeError(`Unknown palette token: ${name}`);
  return palette.tokens[name];
}
export function paletteContrast(palette, { foreground, background, fontSizePx, fontWeight, target = `${palette?.id}:text`, scope = {} } = {}) {
  return checkTextContrast({ foreground: token(palette, foreground), background: token(palette, background), fontSizePx, fontWeight, target, scope });
}
/** Exact ratio sorting helps choose a foreground; no token is auto-selected. */
export function contrastCandidates(palette, { background, minimum = 4.5 } = {}) {
  const backdrop = token(palette, background);
  if (!Number.isFinite(minimum) || minimum < 1 || minimum > 21) throw new TypeError('Minimum contrast must be between 1 and 21');
  return Object.entries(palette.tokens).map(([name, color]) => ({ token: name, color, ratio: contrastRatio(color, backdrop) })).filter(item => item.ratio >= minimum).sort((a, b) => b.ratio - a.ratio || a.token.localeCompare(b.token));
}
const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
/** Pure serialization; caller writes output files. Every export retains license. */
export function exportPalette(palette, { format = 'json', prefix = 'palette' } = {}) {
  validate(palette);
  if (!identifier(prefix)) throw new TypeError('Prefix must be a safe CSS identifier');
  if (format === 'json') return `${JSON.stringify(clone(palette), null, 2)}\n`;
  if (format === 'css') {
    const notice = JSON.stringify({ id: palette.id, kind: palette.kind, provenance: palette.provenance, derivation: palette.derivation ?? null, license: palette.license }).replaceAll('*/', '*\\/').replaceAll('<', '\\u003c');
    return `/* ${notice} */\n:root {\n${Object.entries(palette.tokens).map(([name, color]) => `  --${prefix}-${name}: ${color};`).join('\n')}\n}\n`;
  }
  if (format === 'svg') {
    const rows = Object.entries(palette.tokens), height = rows.length * 48 + 64;
    const metadata = escapeXml(JSON.stringify({ ...palette, tokens: undefined }));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}" viewBox="0 0 640 ${height}" role="img" aria-labelledby="title"><title id="title">${escapeXml(palette.id)}</title><metadata>${metadata}</metadata><rect width="640" height="${height}" fill="#ffffff"/><text x="20" y="30" font-family="sans-serif" font-size="18" fill="#111111">${escapeXml(palette.id)}</text>${rows.map(([name, color], i) => `<g transform="translate(20 ${48 + i * 48})"><rect width="112" height="36" rx="3" fill="${color}" stroke="#888888"/><text x="132" y="24" font-family="sans-serif" font-size="16" fill="#111111">${escapeXml(name)} · ${color}</text></g>`).join('')}</svg>\n`;
  }
  throw new TypeError('Export format must be json, css or svg');
}
