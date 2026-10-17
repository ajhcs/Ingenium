import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { reject, sha256 } from './transport.mjs';

const require = createRequire(import.meta.url);
const SVG = 'http://www.w3.org/2000/svg';
const ELEMENTS = new Set('svg g path rect circle ellipse line polyline polygon title desc'.split(' '));
const NUMBERS = new Set('width height x y x1 x2 y1 y2 cx cy r rx ry stroke-width stroke-miterlimit stroke-dashoffset opacity fill-opacity stroke-opacity'.split(' '));
const ENUMS = { 'fill-rule': ['nonzero', 'evenodd'], 'clip-rule': ['nonzero', 'evenodd'], 'stroke-linecap': ['butt', 'round', 'square'], 'stroke-linejoin': ['miter', 'round', 'bevel'] };
const num = '[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?';
const number = new RegExp(`^${num}$`), numbers = new RegExp(`^${num}(?:[ ,]+${num})*$`);
const xmlEscape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function pathData(value) {
  if (/^[\s]*,|[A-Za-z]\s*,|,\s*(?:[,A-Za-z]|$)/.test(value)) return false;
  const token = new RegExp(`[MmZzLlHhVvCcSsQqTtAa]|${num}`, 'gy'), tokens = [];
  let offset = 0;
  while (offset < value.length) {
    const separator = /^[\s,]+/.exec(value.slice(offset));
    if (separator) { offset += separator[0].length; continue; }
    token.lastIndex = offset; const next = token.exec(value);
    if (!next || tokens.length >= 8192) return false;
    tokens.push(next[0]); offset = token.lastIndex;
  }
  if (!/^[Mm]$/.test(tokens[0] ?? '')) return false;
  const arity = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };
  let i = 0;
  while (i < tokens.length) {
    const command = tokens[i++].toUpperCase();
    if (command === 'Z') continue;
    const size = arity[command]; if (!size) return false;
    const start = i;
    while (i < tokens.length && !/^[A-Za-z]$/.test(tokens[i])) i++;
    if (i === start || (i - start) % size) return false;
    for (let n = start; n < i; n++) {
      const number = Number(tokens[n]);
      if (!Number.isFinite(number) || Math.abs(number) > 16384) return false;
      if (command === 'A' && [3, 4].includes((n - start) % size) && !['0', '1'].includes(tokens[n])) return false;
      if (command === 'A' && [0, 1].includes((n - start) % size) && number < 0) return false;
    }
  }
  return true;
}
export function parserCapability(parserDir) {
  if (parserDir !== undefined && (typeof parserDir !== 'string' || !parserDir.trim())) reject('input', 'parserDir must name a nonempty existing npm directory');
  const locator = parserDir ? join(resolve(parserDir), 'node_modules/saxes') : 'saxes';
  let modulePath;
  try { modulePath = require.resolve(locator); }
  catch (error) { return { status: error.code === 'MODULE_NOT_FOUND' ? 'not-run' : 'error', reason: error.message }; }
  try {
    const { SaxesParser } = require(modulePath), pkg = require(parserDir ? join(resolve(parserDir), 'node_modules/saxes/package.json') : 'saxes/package.json');
    if (pkg.version !== '6.0.0' || typeof SaxesParser !== 'function') throw new Error('Requires tested saxes 6.0.0 API');
    return { status: 'available', version: pkg.version, license: pkg.license, SaxesParser };
  } catch (error) { return { status: 'error', reason: error.message }; }
}
/** Strict parsed allowlist for small static icons, not a general SVG sanitizer. */
export function validateIconSvg(bytes, { parserDir, maxBytes = 524288 } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 524288 || !(bytes instanceof Uint8Array) || bytes.byteLength > maxBytes) reject('svg-size', 'SVG requires bounded bytes and integer maxBytes 1..524288');
  const capability = parserCapability(parserDir);
  if (capability.status !== 'available') reject(capability.status, `SVG parser unavailable: ${capability.reason}`);
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { reject('svg', 'SVG must be valid UTF-8'); }
  const parser = new capability.SaxesParser({ xmlns: true, defaultXMLVersion: '1.0', forceXMLVersion: true });
  const output = [], stack = [];
  let count = 0, root = false, viewBox;
  const bad = message => reject('unsafe-svg', message);
  parser.on('error', error => bad(`Malformed XML: ${error.message}`));
  parser.on('doctype', () => bad('DOCTYPE/entities are unsupported'));
  parser.on('processinginstruction', () => bad('Processing instructions are unsupported'));
  parser.on('cdata', () => bad('CDATA is unsupported'));
  parser.on('xmldecl', decl => { if (decl.version !== '1.0' || (decl.encoding && decl.encoding.toLowerCase() !== 'utf-8')) bad('Unsupported XML declaration'); });
  parser.on('opentag', tag => {
    if (++count > 2048 || stack.length >= 24) bad('SVG node/depth limit exceeded');
    if (tag.uri !== SVG || tag.prefix || !ELEMENTS.has(tag.local)) bad(`Unsupported SVG element ${tag.name}`);
    if (!stack.length) { if (root || tag.local !== 'svg') bad('Expected one SVG root'); root = true; }
    else if (tag.local === 'svg' || ['title', 'desc'].includes(stack.at(-1))) bad('Unsupported nested structure');
    const attrs = [];
    if (Object.keys(tag.attributes).length > 32) bad('Too many attributes');
    for (const attr of Object.values(tag.attributes)) {
      const { name, value } = attr;
      if (name === 'xmlns' && stack.length === 0 && value === SVG) continue;
      if (attr.prefix || attr.uri || value.length > 65536) bad(`Unsupported namespaced/large attribute ${name}`);
      let valid = false;
      if (name === 'viewBox' && !stack.length) {
        const a = value.trim().split(/[ ,]+/).map(Number);
        valid = numbers.test(value.trim()) && a.length === 4 && a.every(n => Number.isFinite(n) && Math.abs(n) <= 16384) && a[2] > 0 && a[3] > 0;
        if (valid) viewBox = a;
      } else if (NUMBERS.has(name)) valid = number.test(value) && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 16384 && (!['width', 'height', 'r', 'rx', 'ry', 'stroke-width'].includes(name) || Number(value) >= 0);
      else if (['fill', 'stroke'].includes(name)) valid = /^(?:none|currentColor|transparent|#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?|black|white)$/.test(value);
      else if (name in ENUMS) valid = ENUMS[name].includes(value);
      else if (name === 'd' && tag.local === 'path') valid = pathData(value);
      else if (name === 'points' && ['polyline', 'polygon'].includes(tag.local)) {
        const points = value.trim().split(/[ ,]+/).map(Number);
        valid = numbers.test(value.trim()) && points.length >= 4 && points.length <= 8192 && points.length % 2 === 0 && points.every(n => Number.isFinite(n) && Math.abs(n) <= 16384);
      }
      if (!valid) bad(`Unsupported attribute/value ${name}`);
      attrs.push(`${name}="${xmlEscape(value)}"`);
    }
    if (!stack.length) attrs.unshift(`xmlns="${SVG}"`);
    output.push(`<${tag.local}${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
    stack.push(tag.local);
  });
  parser.on('text', text => {
    if (!text.trim()) return;
    if (!['title', 'desc'].includes(stack.at(-1))) bad('Visible text is outside the static icon subset');
    output.push(xmlEscape(text));
  });
  parser.on('closetag', () => output.push(`</${stack.pop()}>`));
  parser.write(source).close();
  if (!root || !viewBox || stack.length) bad('Expected complete SVG with bounded viewBox');
  const safe = Buffer.from(output.join(''));
  return { originalSha256: sha256(bytes), safeSha256: sha256(safe), safe, viewBox, nodes: count, parser: { name: 'saxes', version: capability.version }, policy: 'static-icon-v1' };
}

export function validateWoff2(bytes) {
  // Container admission only. Browser/font engines must still validate compressed tables.
  if (!(bytes instanceof Uint8Array) || bytes.length < 48 || bytes.length > 524288) reject('font', 'Expected bounded WOFF2 container');
  const b = Buffer.from(bytes), flavor = b.readUInt32BE(4), count = b.readUInt16BE(12);
  if (b.toString('ascii', 0, 4) !== 'wOF2' || ![0x00010000, 0x4f54544f].includes(flavor) || b.readUInt32BE(8) !== b.length || count < 1 || count > 128 || b.readUInt16BE(14) !== 0 || b.readUInt32BE(16) > 4194304 || b.readUInt32BE(20) > b.length - 48) reject('font', 'Invalid or unsupported WOFF2 container');
  for (const [offset, length] of [[28, 32], [40, 44]]) { const start = b.readUInt32BE(offset), size = b.readUInt32BE(length); if ((start === 0) !== (size === 0) || (start && (start < 48 || start + size > b.length))) reject('font', 'Invalid WOFF2 optional block bounds'); }
  return { format: 'woff2', tables: count, sha256: sha256(b), qualification: 'container-only; compressed table/glyph validation not performed' };
}
