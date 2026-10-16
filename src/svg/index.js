import { createRequire } from 'node:module';
import { constants } from 'node:fs';
import { open, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SIDE = 8192;
const MAX_PIXELS = 16 * 1024 * 1024;
const ELEMENTS = new Set('svg g defs clipPath path rect circle ellipse line polyline polygon text tspan title desc linearGradient radialGradient stop'.split(' '));
const ATTRIBUTES = new Set('id xmlns version width height viewBox preserveAspectRatio x y x1 x2 y1 y2 cx cy r rx ry d points transform clip-path clip-rule fill fill-rule fill-opacity stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity font-family font-size font-weight text-anchor dominant-baseline dx dy gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity'.split(' '));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };

// A deliberately narrow XML recognizer, not a general SVG/XML security validator.
function staticSubset(bytes) {
  if (bytes.length > MAX_BYTES) fail('SVG exceeds the 2 MiB input limit');
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(xml)) fail('DTD, entities and CDATA are unsupported');
  const clean = xml.replace(/^\uFEFF/, '').replace(/^\s*<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?\s*\?>/i, '');
  const stack = [];
  const ids = new Set();
  const references = [];
  let position = 0;
  let roots = 0;
  let nodes = 0;
  const validText = text => {
    if (text.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, '').includes('&')) fail('Unsupported or malformed XML entity');
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) fail('Invalid XML control character');
  };
  while (position < clean.length) {
    if (clean.startsWith('<!--', position)) {
      const end = clean.indexOf('-->', position + 4);
      if (end < 0 || clean.slice(position + 4, end).includes('--')) fail('Malformed XML comment');
      position = end + 3;
      continue;
    }
    if (clean[position] !== '<') {
      const next = clean.indexOf('<', position);
      const text = clean.slice(position, next < 0 ? clean.length : next);
      validText(text);
      if (text.trim() && !stack.length) fail('Text outside SVG root');
      position += text.length;
      continue;
    }
    const token = /^<\s*(\/?)\s*([A-Za-z][\w-]*)([^<>]*?)>/.exec(clean.slice(position));
    if (!token) fail('Unsupported or malformed XML markup');
    const [, closing, name] = token;
    let rest = token[3];
    position += token[0].length;
    if (closing) {
      if (rest.trim() || stack.pop() !== name) fail('Mismatched XML closing element');
      continue;
    }
    if (!ELEMENTS.has(name)) fail(`Unsupported SVG element: ${name}`);
    if (++nodes > 20000 || stack.length > 64) fail('SVG structure exceeds bounded limits');
    if (!stack.length && (name !== 'svg' || ++roots !== 1)) fail('Expected one SVG root');
    if (stack.length && name === 'svg') fail('Nested SVG roots are unsupported');
    const selfClosing = /\/\s*$/.test(rest);
    if (selfClosing) rest = rest.replace(/\/\s*$/, '');
    const seen = new Set();
    while (rest.length) {
      if (!rest.trim()) break;
      const attr = /^\s+([A-Za-z][\w-]*)\s*=\s*(["'])(.*?)\2/s.exec(rest);
      if (!attr) fail('Malformed or unsupported SVG attribute');
      const [, key, , value] = attr;
      if (!ATTRIBUTES.has(key) || seen.has(key)) fail(`Unsupported or duplicate SVG attribute: ${key}`);
      seen.add(key);
      validText(value);
      // Encoded attribute values are refused to avoid alternate URL spellings.
      if (value.includes('&') || value.includes('<') || /[\u0000-\u001f]/.test(value)) fail('Encoded or invalid SVG attribute value');
      if (key === 'xmlns' && (name !== 'svg' || value !== 'http://www.w3.org/2000/svg')) fail('Unsupported SVG namespace');
      if (key === 'id') {
        if (!/^[A-Za-z_][\w.-]*$/.test(value) || ids.has(value)) fail('Invalid or duplicate SVG ID');
        ids.add(value);
      }
      if (/url\s*\(/i.test(value)) {
        const ref = /^url\(#([A-Za-z_][\w.-]*)\)$/.exec(value);
        if (!ref || !['fill', 'stroke', 'clip-path'].includes(key)) fail('Only local fragment paint/clip references are supported');
        references.push(ref[1]);
      }
      if (key === 'clip-path' && value !== 'none' && !/^url\(#[A-Za-z_][\w.-]*\)$/.test(value)) fail('Unsupported clip reference');
      if (/[\\{};]/.test(value)) fail('CSS syntax is unsupported');
      rest = rest.slice(attr[0].length);
    }
    if (!selfClosing) stack.push(name);
  }
  if (roots !== 1 || stack.length) fail('Incomplete SVG document');
  if (references.some(id => !ids.has(id))) fail('Unresolved local SVG reference');
}

async function loadSharp(locator) {
  if (locator !== undefined && (typeof locator !== 'string' || !locator.trim())) fail('sharpModule must be a module locator string');
  let resolved;
  try { resolved = require.resolve(locator ?? 'sharp'); }
  catch (error) { error.ingeniumMissingLocator = error.code === 'MODULE_NOT_FOUND'; throw error; }
  const module = require(resolved);
  if (typeof module !== 'function' || !module.versions?.sharp) fail('Sharp module does not expose the supported API');
  return module;
}

export async function discoverCapabilities(options = {}) {
  let sharp;
  try { sharp = await loadSharp(options.sharpModule); }
  catch (error) {
    return { sharp: { status: error.ingeniumMissingLocator ? 'absent' : 'errored', reason: error.ingeniumMissingLocator ? 'Sharp module could not be resolved' : 'Sharp module could not be loaded' } };
  }
  try {
    const probe = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"><rect width="2" height="3" fill="red"/></svg>'), { limitInputPixels: MAX_PIXELS }).png().toBuffer({ resolveWithObject: true });
    if (probe.info.width !== 2 || probe.info.height !== 3 || probe.info.format !== 'png') fail('Unexpected Sharp probe result');
    return { sharp: { status: 'present', version: sharp.versions.sharp, versions: { ...sharp.versions }, probe: { format: 'png', width: 2, height: 3 } } };
  } catch { return { sharp: { status: 'errored', version: sharp.versions.sharp, reason: 'Sharp SVG-to-PNG probe failed' } }; }
}

export async function exportSvg({ sourcePath, outputPath, sharpModule } = {}) {
  if (typeof sourcePath !== 'string' || typeof outputPath !== 'string') fail('sourcePath and outputPath are required');
  const source = resolve(sourcePath);
  const output = resolve(outputPath);
  if (source === output) fail('PNG output must be separate from SVG source');
  if (extname(output).toLowerCase() !== '.png') fail('Output must have a .png extension');
  if (!(await lstat(source)).isFile()) fail('SVG source must be a regular file, not a symlink');
  // Parent canonicalization detects aliases; final path is exclusively created below.
  const canonicalOutput = resolve(await realpath(dirname(output)), basename(output));
  if (canonicalOutput === await realpath(source)) fail('Output aliases SVG source');
  try {
    await lstat(output);
    fail('PNG output already exists; refusing to clobber files or symlinks');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const sourceHandle = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes;
  try {
    const stat = await sourceHandle.stat();
    if (!stat.isFile() || stat.size > MAX_BYTES) fail('SVG source is not a bounded regular file');
    bytes = await sourceHandle.readFile();
  } finally { await sourceHandle.close(); }
  staticSubset(bytes);
  const sharp = await loadSharp(sharpModule);
  const renderer = { name: 'sharp', version: sharp.versions.sharp, versions: { ...sharp.versions } };
  const pipeline = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: 'warning' });
  const metadata = await pipeline.metadata();
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height) || metadata.width < 1 || metadata.height < 1 || metadata.width > MAX_SIDE || metadata.height > MAX_SIDE || metadata.width * metadata.height > MAX_PIXELS) fail('SVG dimensions exceed bounded raster limits');
  const { data, info } = await pipeline.png().toBuffer({ resolveWithObject: true });
  const outputHandle = await open(output, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { await outputHandle.writeFile(data); } finally { await outputHandle.close(); }
  return { sourceHash: hash(bytes), outputHash: hash(data), width: info.width, height: info.height, format: info.format, renderer };
}
