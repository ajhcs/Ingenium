import { mkdir, writeFile, realpath } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { createRequester, limitsFor, reject, sha256 } from './transport.mjs';
import { createCache } from './cache.mjs';
import { parserCapability, validateIconSvg, validateWoff2 } from './svg.mjs';
export { AssetError } from './transport.mjs';
export { validateIconSvg, validateWoff2 } from './svg.mjs';

const word = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = (v, max = 256) => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
function selection(provider, id) {
  if (!['iconify', 'fontsource'].includes(provider)) reject('provider', 'Supported providers: iconify, fontsource');
  if (!text(id, 160) || !(provider === 'iconify' ? id.split(':').length === 2 && id.split(':').every(p => word.test(p)) : word.test(id))) reject('input', 'Invalid provider asset ID');
}
function licenseFor(info) {
  const l = info?.license;
  if (!l || !text(l.title) || !text(l.spdx, 80) || !text(l.url, 2048)) return { status: 'unknown', reason: 'Collection/font-specific title, SPDX identifier and source URL required; tool license does not license assets' };
  let url;
  try { url = new URL(l.url); } catch { return { status: 'unknown', reason: 'Malformed license source URL' }; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return { status: 'unknown', reason: 'Unsafe license source URL' };
  return { status: 'provider-declared', title: l.title, spdx: l.spdx, url: url.href, author: text(info.author?.name) ? info.author.name : null, notice: 'Review the actual source license and retain required attribution/notices. SPDX is an upstream declaration, not legal approval.' };
}
const safeJSON = data => {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data.bytes)); }
  catch { reject('metadata', 'Provider returned malformed JSON/UTF-8'); }
};
const capabilities = (provider, parser, license) => ({ search: true, details: true, preview: provider === 'iconify' ? parser.status === 'available' && license.status !== 'unknown' : false, fetch: provider === 'iconify' ? parser.status === 'available' && license.status !== 'unknown' : false });

/** Construct an inert client. No I/O until an explicit operation; no installation ever. */
export function createAssetClient({ allowNetwork = false, transport, cacheDir, parserDir, limits: inputLimits } = {}) {
  const limits = limitsFor(inputLimits), request = createRequester({ allowNetwork, transport, limits }), cache = createCache(cacheDir, limits);
  const probe = () => { const { SaxesParser, ...info } = parserCapability(parserDir); return info; };
  async function read(url, kind = 'metadata') {
    const max = kind === 'metadata' ? limits.metadataBytes : limits.assetBytes;
    const media = kind === 'metadata' ? 'application/json' : kind === 'svg' ? 'image/svg+xml' : 'font/woff2,application/octet-stream';
    const found = await cache.get(url, max);
    if (found) { if (!media.split(',').includes(found.source.contentType)) reject('cache-corrupt', 'Cached media type does not match operation'); return found; }
    const data = await request.read(url, max, media);
    // Validate before cache admission. Malformed/unsafe external bytes never become a reusable asset.
    if (kind === 'metadata') safeJSON(data);
    else if (kind === 'svg') validateIconSvg(data.bytes, { parserDir, maxBytes: max });
    else validateWoff2(data.bytes);
    await cache.put(url, data, max);
    return data;
  }
  async function details({ provider, id }) {
    selection(provider, id);
    const url = provider === 'iconify' ? `https://api.iconify.design/collection?prefix=${id.split(':')[0]}&info=true` : `https://api.fontsource.org/v1/fonts/${id}`;
    const data = await read(url), raw = safeJSON(data), info = provider === 'iconify' ? raw.info : raw;
    if (!info || typeof info !== 'object' || !text(provider === 'iconify' ? info.name : info.family) || (provider === 'fontsource' && raw.id !== id)) reject('metadata', 'Provider detail identity/shape missing');
    if (provider === 'iconify' && raw.prefix !== id.split(':')[0]) reject('metadata', 'Collection prefix does not match selection');
    const license = licenseFor(info), parser = probe();
    return { provider, id, label: provider === 'iconify' ? info.name : info.family, version: text(info.version, 128) ? info.version : null,
      source: data.source, evidenceMode: data.source.acquisitionMode, cacheHit: Boolean(data.cached), license, capabilities: capabilities(provider, parser, license),
      ...(provider === 'fontsource' ? { variants: { weights: raw.weights, styles: raw.styles, subsets: raw.subsets }, refusal: 'Font file resolution is not qualified: documented metadata does not establish a verified file license/version binding. Fetch/preview remain not-run in this slice.' } : {}) };
  }
  async function search({ provider, query, limit = 8, prefix } = {}) {
    if (!['iconify', 'fontsource'].includes(provider) || !text(query, 128) || !Number.isSafeInteger(limit) || limit < 1 || limit > 32 || (prefix !== undefined && (provider !== 'iconify' || !word.test(prefix)))) reject('input', 'Expected supported provider, public query and limit 1..32; optional Iconify prefix');
    const url = provider === 'iconify' ? new URL('https://api.iconify.design/search') : new URL('https://api.fontsource.org/v1/fonts');
    url.searchParams.set(provider === 'iconify' ? 'query' : 'family', query);
    if (provider === 'iconify') { url.searchParams.set('limit', '32'); if (prefix) url.searchParams.set('prefix', prefix); }
    const data = await read(url.href), raw = safeJSON(data), list = provider === 'iconify' ? raw.icons : raw;
    if (!Array.isArray(list) || list.length > 1024) reject('metadata', 'Expected bounded search results array');
    const items = list.slice(0, limit).map(value => {
      const id = provider === 'iconify' ? value : value?.id; selection(provider, id);
      if (provider === 'fontsource' && !text(value.family)) reject('metadata', 'Font result missing family');
      const info = provider === 'iconify' ? raw.collections?.[id.split(':')[0]] : value;
      return { provider, id, label: provider === 'iconify' ? id : value.family, version: text(info?.version, 128) ? info.version : null, license: licenseFor(info), capabilities: { details: true, selectedFetchRequiresDetails: true } };
    });
    return { provider, query, items, source: data.source, evidenceMode: data.source.acquisitionMode, cacheHit: Boolean(data.cached), truncated: list.length > items.length, privacy: 'Search strings leave the local environment when network is explicitly enabled; use public queries only.' };
  }
  async function selected(input) {
    if (!input || input.selected !== true) reject('selection', 'Explicit selected:true required; search never fetches assets');
    const detail = await details(input);
    if (detail.license.status === 'unknown') reject('license', detail.license.reason);
    if (input.provider !== 'iconify') reject('not-run', detail.refusal);
    const parser = probe(); if (parser.status !== 'available') reject(parser.status, `SVG parser unavailable: ${parser.reason}`);
    const [prefix, name] = input.id.split(':'), data = await read(`https://api.iconify.design/${prefix}/${name}.svg?width=24&height=24`, 'svg');
    const validation = validateIconSvg(data.bytes, { parserDir, maxBytes: limits.assetBytes });
    const modes = [...new Set([detail.evidenceMode, data.source.acquisitionMode])];
    return { detail, data, validation, evidenceMode: modes.length === 1 ? modes[0] : 'mixed' };
  }
  return {
    capabilities() { return { interfaceVersion: 1, transport: request.mode, parser: probe(), limits, providers: { iconify: { search: true, details: true, preview: 'selected + license + parser', fetch: 'selected + license + parser', liveQualification: 'not-run' }, fontsource: { search: true, details: true, preview: 'not-run', fetch: 'not-run', reason: 'License/file-version binding not qualified', liveQualification: 'not-run' } } }; },
    search, details,
    async preview(input) {
      const { detail, data, validation, evidenceMode } = await selected(input);
      return { provider: detail.provider, id: detail.id, evidenceMode, cacheHit: Boolean(data.cached), mimeType: 'image/svg+xml', bytes: validation.safe, sha256: validation.safeSha256, originalSha256: validation.originalSha256, license: detail.license, source: data.source, metadataSource: detail.source, note: 'Selected safe derived SVG bytes; no automatic rendering or artistic-quality judgment.' };
    },
    async fetch(input) {
      if (!text(input?.outputDir, 4096)) reject('input', 'fetch requires a new owned outputDir');
      const destination = resolve(input.outputDir);
      if (await realpath(dirname(destination)) !== dirname(destination)) reject('output', 'Output parent must exist without symlink ancestors');
      const { detail, data, validation, evidenceMode } = await selected(input);
      await mkdir(destination); // exclusive: never overwrite an existing output
      if (await realpath(destination) !== destination) reject('output', 'Output path ancestors must not be symlinks');
      const receipt = { version: 1, provider: detail.provider, id: detail.id, evidenceMode, cacheHit: Boolean(data.cached), versionLabel: detail.version, metadataSource: detail.source, source: data.source, license: detail.license,
        original: { file: 'original.svg', sha256: sha256(data.bytes), byteSize: data.bytes.length, handling: 'Untrusted source preserved; render safe.svg only' },
        derived: { file: 'safe.svg', sha256: validation.safeSha256, byteSize: validation.safe.length, policy: validation.policy, parser: validation.parser },
        qualification: 'Mechanical static-subset validation only; collection license applicability and visual quality require review.' };
      await writeFile(join(destination, 'original.svg'), data.bytes, { flag: 'wx' });
      await writeFile(join(destination, 'safe.svg'), validation.safe, { flag: 'wx' });
      await writeFile(join(destination, 'provenance.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
      return { ...receipt, outputDir: destination };
    }
  };
}
