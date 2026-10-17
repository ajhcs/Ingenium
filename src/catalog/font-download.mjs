/** Explicit selected font acquisition. No networking or filesystem work on import/construction. */
import {createHash} from 'node:crypto';
import {mkdir, realpath, writeFile} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {createFontPackLibrary} from './font-packs.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const blobHash = b => createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const plain = x => x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype;
const text = (x, max = 256) => typeof x === 'string' && x.length > 0 && x.length <= max && !/[\u0000-\u001f\u007f]/u.test(x);
const identifier = x => text(x, 128) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x);
const sha = (x, length) => typeof x === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(x);
const providers = ['google/fonts', 'ryanoasis/nerd-fonts', 'jaywcjlove/free-font'];
const fail = (code, message) => {const e = new Error(message); e.code = code; throw e;};
const clone = x => structuredClone(x);
const googleCommit = '47d54ca1ebb14fd864695f1d39dc734f39017c33';
const nerdCommit = '92a27e07169ff364c058699760c08c47baa67eb7';
const freeCommit = '8602c6e4603516ca531e93bf98b64f0382883343';
const upstreamCommit = '0443bb7c87de9659eceba3c394d3dbcf235084aa';
const pinned = [
  {id:'google-abel-regular', provider:'google/fonts', commit:googleCommit, version:googleCommit,
    font:{path:'ofl/abel/Abel-Regular.ttf', bytes:35220, gitBlobSha1:'f621a1273d78878b129ac93be7b93c2837ed5810', family:'Abel', style:'normal', weight:400, format:'truetype'},
    notices:[
      {id:'abel-ofl', path:'ofl/abel/OFL.txt', bytes:4418, gitBlobSha1:'d67c839261b0dfff0452c6290b03b29d13ce854d', license:'SIL Open Font License 1.1; full Abel-specific source notice'},
      {id:'abel-fontlog', path:'ofl/abel/FONTLOG.txt', bytes:1009, gitBlobSha1:'f1f45ef6b07a719899b93fba4af1e8025e2d0f79', license:'Full source FONTLOG'}]},
  {id:'nerd-hack-regular', provider:'ryanoasis/nerd-fonts', commit:nerdCommit, version:nerdCommit,
    font:{path:'patched-fonts/Hack/HackNerdFont-Regular.ttf', bytes:2798160, gitBlobSha1:'dc3c4604c0a8d576d72d2ee5b6d23382c5f4b08a', family:'Hack Nerd Font', style:'normal', weight:400, format:'truetype'},
    notices:[
      {id:'hack-license', path:'patched-fonts/Hack/LICENSE.md', bytes:3744, gitBlobSha1:'08927e504fce744f928c584c6e4a07328f2e94ed', license:'Full Hack-specific license including MIT and Bitstream Vera terms'},
      {id:'nerd-license', path:'LICENSE', bytes:6200, gitBlobSha1:'d163912b383cac468b3052e60ad4998e80046cc7', license:'Full Nerd Fonts mixed source/patched-font license; independent Hack notice retained'}]},
  {id:'free-font-negatape', provider:'jaywcjlove/free-font', commit:freeCommit, version:freeCommit,
    font:{path:'docs/fonts/english/other/NegaTape.ttf', bytes:44788, gitBlobSha1:'5538789a719ee341944aeeffb39624c5f2794766', family:'x5y8pxNegaTape', style:'normal', weight:400, format:'truetype'},
    noticeBinding:'Upstream fonts/ttf/x5y8pxNegaTape.ttf at the notice commit has the identical Git blob SHA1 and byte length as this selected mirror binary.',
    notices:[
      {id:'negatape-ofl', repository:'hicchicc/x5y8pxNegaTape', commit:upstreamCommit, path:'OFL.txt', bytes:4397, gitBlobSha1:'ff586bab73e59980848f856622fe5c3382b2a53b', license:'SIL Open Font License 1.1; full font-specific upstream notice'},
      {id:'negatape-authors', repository:'hicchicc/x5y8pxNegaTape', commit:upstreamCommit, path:'AUTHORS.txt', bytes:271, gitBlobSha1:'9f54fc3532f5fa146a9dd32e83ef56df841bbe9d', license:'Full upstream font AUTHORS notice'}]}
];

function source(file, selection, max) {
  if (!plain(file) || !text(file.path, 512) || file.path.split('/').some(p => !p || p === '.' || p === '..') || /[\\?#%]/.test(file.path)) fail('source', 'Expected plain repository-relative source path');
  const repository = file.repository ?? selection.provider, commit = file.commit ?? selection.commit;
  if (!text(repository, 160) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || repository.split('/').some(p => p === '.' || p === '..') || !sha(commit, 40)) fail('source', 'Exact GitHub repository and immutable 40-hex commit required');
  if (!Number.isSafeInteger(file.bytes) || file.bytes < 1 || file.bytes > max || (!sha(file.gitBlobSha1, 40) && !sha(file.sha256, 64)) || (file.gitBlobSha1 !== undefined && !sha(file.gitBlobSha1, 40)) || (file.sha256 !== undefined && !sha(file.sha256, 64))) fail('source', 'Exact bounded byte count and Git blob SHA1 or SHA256 required');
  return {...file, repository, commit, sourceURL:`https://raw.githubusercontent.com/${repository}/${commit}/${file.path.split('/').map(encodeURIComponent).join('/')}`};
}

function validate(input) {
  if (!plain(input) || !identifier(input.id) || !providers.includes(input.provider) || !sha(input.commit, 40) || !text(input.version, 128) || !plain(input.font)) fail('selection', 'Expected exact selected provider/commit/font descriptor');
  const f = input.font;
  if (!['truetype', 'woff2'].includes(f.format)) fail('format', 'Only standalone TrueType and WOFF2 selected acquisition supported; OTF/TTC remain metadata only');
  if (!text(f.family, 160) || !['normal', 'italic', 'oblique'].includes(f.style) || !Number.isSafeInteger(f.weight) || f.weight < 1 || f.weight > 1000 || (f.postScriptName !== undefined && !text(f.postScriptName, 256))) fail('selection', 'Declared family/style/weight metadata required');
  const font = source(f, input, f.format === 'woff2' ? 524288 : 8388608);
  if (font.repository !== input.provider || font.commit !== input.commit || !(f.format === 'woff2' ? /\.woff2$/i : /\.ttf$/i).test(font.path)) fail('source', 'Selected binary must match the provider commit and supported extension');
  if (!Array.isArray(input.notices) || input.notices.length < 1 || input.notices.length > 32) fail('rights', 'Explicit full font-specific source notices required; collection software license alone is insufficient');
  const ids = new Set();
  const notices = input.notices.map(n => {
    if (!plain(n) || !identifier(n.id) || ids.has(n.id) || !text(n.license, 2048)) fail('rights', 'Distinct notice IDs and factual font-specific license labels required');
    ids.add(n.id); return source(n, input, 65536);
  });
  if (notices.some(n => n.repository !== input.provider || n.commit !== input.commit) && !text(input.noticeBinding, 2048)) fail('rights', 'Cross-repository notice requires explicit font-byte binding evidence');
  return {...clone(input), font, notices};
}

/** transport is an explicit fixture adapter returning a Fetch Response; it never establishes live evidence. */
export function createFontDownloadClient({allowNetwork = false, transport, timeoutMs = 30000} = {}) {
  if (typeof allowNetwork !== 'boolean' || (transport !== undefined && typeof transport !== 'function') || !Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60000) fail('options', 'Invalid explicit network/fixture/timeout options');
  const mode = transport ? 'fixture-transport' : allowNetwork ? 'live-network' : 'network-disabled';
  function capabilities() {return {mode, providers:[...providers], pinnedSelections:pinned.length, importNetworking:false, selectedFormats:['truetype', 'woff2'], limits:{fontBytes:8388608, woff2Bytes:524288, noticeBytes:65536, noticesPerSelection:32, timeoutMs}, qualification:'Three pinned selected examples; discovery metadata does not qualify whole provider collections or legal sufficiency'};}
  function search({query = '', provider, offset = 0, limit = 12} = {}) {
    if (typeof query !== 'string' || query.length > 128 || /[\u0000-\u001f\u007f]/.test(query) || (provider !== undefined && !providers.includes(provider)) || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 32) fail('query', 'Invalid bounded font search');
    const entries = pinned.filter(s => (!provider || s.provider === provider) && `${s.id} ${s.font.family}`.toLowerCase().includes(query.toLowerCase()));
    return {total:entries.length, offset, limit, nextOffset:offset + limit < entries.length ? offset + limit : null, entries:clone(entries.slice(offset, offset + limit)), qualification:'Pinned metadata only; font bytes and notices fetched only on explicit acquisition'};
  }
  function details({id} = {}) {const selected = pinned.find(s => s.id === id); if (!selected) fail('selection', 'Unknown pinned font selection'); return validate(selected);}
  async function get(file) {
    if (!transport && !allowNetwork) fail('network-disabled', 'Selected acquisition requires explicit allowNetwork:true or a declared fixture transport');
    const controller = new AbortController(); let timer;
    const work = async () => {
      const response = await (transport ?? globalThis.fetch)(file.sourceURL, {method:'GET', redirect:'manual', signal:controller.signal, headers:{Accept:'application/octet-stream', 'Accept-Encoding':'identity'}});
      if (!response || response.status !== 200 || response.redirected || (response.url && response.url !== file.sourceURL)) fail('response', 'Selected source requires exact HTTP 200 without redirects');
      const encoding = response.headers?.get('content-encoding');
      if (encoding && encoding !== 'identity') fail('response', 'Encoded source responses are unsupported');
      const size = response.headers?.get('content-length');
      if (size !== null && size !== undefined && (!/^\d+$/.test(size) || Number(size) !== file.bytes)) fail('integrity', 'Selected response Content-Length differs from exact source bytes');
      if (!response.body || typeof response.body.getReader !== 'function') fail('response', 'Bounded readable response required');
      const reader = response.body.getReader(), chunks = []; let length = 0;
      const cancel = () => {reader.cancel().catch(() => {});};
      controller.signal.addEventListener('abort', cancel, {once:true});
      try {
        while (true) {const {done, value} = await reader.read(); if (done) break; length += value.byteLength; if (length > file.bytes) fail('bounds', 'Selected response exceeded exact byte bound'); chunks.push(Buffer.from(value));}
      } catch (e) {await reader.cancel().catch(() => {}); throw e;}
      finally {controller.signal.removeEventListener('abort', cancel); reader.releaseLock();}
      const raw = Buffer.concat(chunks, length);
      if (raw.length !== file.bytes || (file.sha256 && hash(raw) !== file.sha256) || (file.gitBlobSha1 && blobHash(raw) !== file.gitBlobSha1)) fail('integrity', 'Selected source bytes/hash differ from immutable descriptor');
      return raw;
    };
    try {return await Promise.race([work(), new Promise((_, reject) => {timer = setTimeout(() => {controller.abort(); const e = new Error('Selected source request/body timeout'); e.code = 'timeout'; reject(e);}, timeoutMs);})]);}
    finally {clearTimeout(timer); controller.abort();}
  }
  async function acquire(options = {}) {
    if (!plain(options) || Object.keys(options).some(k => !['id', 'selection', 'selected', 'outputDir'].includes(k)) || options.selected !== true || !text(options.outputDir, 4096) || (options.id !== undefined) === (options.selection !== undefined)) fail('selection', 'Explicit selected:true, one id or selection descriptor, and new outputDir required');
    const selected = options.id !== undefined ? details({id:options.id}) : validate(options.selection);
    const out = resolve(options.outputDir);
    if (await realpath(dirname(out)) !== dirname(out)) fail('path', 'Expected existing canonical output parent');
    // Reserve the output before transport: an existing directory must never trigger downloads.
    await mkdir(out);
    const font = await get(selected.font), notices = [];
    for (const n of selected.notices) notices.push({metadata:n, raw:await get(n)});
    const fontFile = selected.font.format === 'woff2' ? 'font.woff2' : 'font.ttf';
    const manifest = {schemaVersion:1, id:selected.id, provider:selected.provider, commit:selected.commit, version:selected.version, acquisition:{mode, sourcePins:clone(selected)},
      fonts:[{id:selected.id, path:fontFile, bytes:font.length, sha256:hash(font), family:selected.font.family, style:selected.font.style, weight:selected.font.weight, format:selected.font.format, ...(selected.font.postScriptName ? {postScriptName:selected.font.postScriptName} : {}), sourceURL:selected.font.sourceURL, noticeIds:selected.notices.map(n => n.id)}],
      notices:notices.map(({metadata:n, raw}, i) => ({id:n.id, path:`notice-${i + 1}-${n.id}.txt`, bytes:raw.length, sha256:hash(raw), sourceURL:n.sourceURL, license:n.license}))};
    const artifacts = [[fontFile, font], ...notices.map((n, i) => [manifest.notices[i].path, n.raw]), ['manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n')]];
    for (const [name, raw] of artifacts) await writeFile(join(out, name), raw, {flag:'wx'});
    const inspection = await createFontPackLibrary({manifestPath:join(out, 'manifest.json')}).inspect({id:selected.id});
    const receipt = {schemaVersion:1, mode, selected, artifacts:artifacts.map(([path, raw]) => ({path, bytes:raw.length, sha256:hash(raw)})), inspection, qualification:'Exact source bytes and bounded container verified; unchanged font/notices; no font sanitation, inferred rights sufficiency, global registration or acceptance'};
    await writeFile(join(out, 'acquisition.json'), JSON.stringify(receipt, null, 2) + '\n', {flag:'wx'});
    return {outputDir:out, manifestPath:join(out, 'manifest.json'), ...receipt};
  }
  return Object.freeze({capabilities, search, details, acquire});
}
