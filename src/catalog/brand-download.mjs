/** Explicit selected user-local originals; catalog discovery never downloads artwork. */
import {createHash} from 'node:crypto';
import {readFile, writeFile, lstat, realpath, mkdir, readdir} from 'node:fs/promises';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parserCapability} from '../assets/svg.mjs';

const ROOT = fileURLToPath(new URL('../resources/packs/simple-icons/', import.meta.url));
const COMMIT = '4d29a35c954699b389a834aacc97dd6e7e74143c';
const BASE = `https://raw.githubusercontent.com/simple-icons/simple-icons/${COMMIT}/`;
const MAX_SVG = 1_000_000, MAX_INDEX = 2_000_000, MAX_RECEIPT = 65536;
const NOTICES = [
  {file:'LICENSE.md', bytes:6569, sha256:'9046848b63a5c92bff14e4accca80bd987e0623b74adf9226ce5198d312b79d5'},
  {file:'DISCLAIMER.md', bytes:4607, sha256:'f921095158b73e61e675ff99b327930fa95ad6f4cf667d414ffe8ae585205724'}
];
const FILES = ['original.svg', 'LICENSE.md', 'DISCLAIMER.md', 'declaration.json', 'acquisition.json'];
const hash = b => createHash('sha256').update(b).digest('hex');
const clone = x => structuredClone(x);
const plain = x => x && Object.getPrototypeOf(x) === Object.prototype;
const fail = (code, message) => {const error = new Error(message); error.code = code; throw error;};
const json = x => Buffer.from(JSON.stringify(x, null, 2) + '\n');
const scope = 'Selected user-local source acquisition. Project CC0 notice and disclaimer accompany the exact per-icon declaration. A declared per-icon license or linked guideline is metadata, not proof that its complete separate notice was acquired. Source artwork, software licenses and trademark permissions have distinct scopes; the operator decides their use.';
let indexPromise;
async function local(path, max) {
  const full = resolve(path), info = await lstat(full);
  if (!info.isFile() || info.isSymbolicLink() || info.size > max || await realpath(full) !== full) fail('local-file', 'Expected bounded canonical regular file');
  const raw = await readFile(full);
  if (raw.length > max) fail('bounds', 'Local file byte bound exceeded');
  return raw;
}
function exact(raw, expected) {
  if (raw.length !== expected.bytes || hash(raw) !== expected.sha256) fail('integrity', 'Selected source size or SHA256 mismatch');
  return raw;
}
async function index() {
  if (!indexPromise) indexPromise = (async () => {
    const value = JSON.parse((await local(join(ROOT, 'download-index.json'), MAX_INDEX)).toString('utf8'));
    if (value.schema !== 'ingenium-selected-brand-download/1' || value.repository !== 'simple-icons/simple-icons' || value.commit !== COMMIT || value.version !== '16.35.0' || !Array.isArray(value.entries) || value.entries.length !== 3466) fail('index', 'Expected pinned Simple Icons 16.35.0 selected-download index');
    const ids = new Set();
    for (const e of value.entries) {
      if (!plain(e) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.id) || ids.has(e.id) || !/^icons\/[a-z0-9_]+\.svg$/.test(e.path) || !Number.isSafeInteger(e.bytes) || e.bytes < 1 || e.bytes > MAX_SVG || !/^[a-f0-9]{64}$/.test(e.sha256) || !plain(e.declaration)) fail('index', 'Invalid selected-download descriptor');
      ids.add(e.id);
    }
    return value;
  })();
  return indexPromise;
}
function metadata(e) {
  return {...clone(e), provider:'simple-icons', repository:'simple-icons/simple-icons', version:'16.35.0', commit:COMMIT, sourceURL:BASE + e.path,
    availability:'selected-user-local-download', originalBundled:e.id === 'activitypub', staticAdmission:'not-run', rights:{scope, perIconDeclaration:clone(e.declaration.license ?? null), fullPerIconNoticeAcquired:false, projectNoticeMatchesExplicitCC0:e.declaration.license?.type === 'CC0-1.0', projectNotices:clone(NOTICES)}};
}

/** Presentation adapter only for exact pinned originals, never arbitrary imported SVGs. */
function presentation(raw, controls, parserDir) {
  if (!plain(controls) || Object.keys(controls).some(k => !['width', 'height', 'fill'].includes(k))) fail('controls', 'Only width, height and six-digit hex fill controls are supported');
  const width = controls.width ?? 64, height = controls.height ?? 64, fill = controls.fill ?? '#000000';
  if (![width, height].every(n => Number.isSafeInteger(n) && n >= 1 && n <= 2048) || typeof fill !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(fill)) fail('controls', 'Use integer dimensions 1..2048 and six-digit hex fill');
  const capability = parserCapability(parserDir);
  if (capability.status !== 'available') fail(capability.status, 'Selected presentation requires optional saxes 6.0.0 parser');
  const source = new TextDecoder('utf-8', {fatal:true}).decode(raw);
  const parser = new capability.SaxesParser({xmlns:true, defaultXMLVersion:'1.0', forceXMLVersion:true});
  const stack = []; let count = 0, title = '', path, titles = 0, paths = 0;
  const bad = () => fail('unsupported-source-format', 'Expected pinned Simple Icons svg/role=img/viewBox=0 0 24 24, one title and one d-only path; no other semantics');
  for (const event of ['error', 'doctype', 'processinginstruction', 'cdata', 'xmldecl', 'comment']) parser.on(event, bad);
  parser.on('opentag', tag => {
    if (++count > 3 || tag.uri !== 'http://www.w3.org/2000/svg' || tag.prefix) bad();
    const attributes = Object.values(tag.attributes);
    if (!stack.length) {
      if (count !== 1 || tag.local !== 'svg' || attributes.length !== 3 || tag.attributes.xmlns?.value !== 'http://www.w3.org/2000/svg' || tag.attributes.viewBox?.value !== '0 0 24 24' || tag.attributes.role?.value !== 'img') bad();
    } else {
      if (stack.length !== 1 || stack[0] !== 'svg') bad();
      if (tag.local === 'title') {if (++titles !== 1 || attributes.length || paths) bad();}
      else if (tag.local === 'path') {
        if (++paths !== 1 || titles !== 1 || attributes.length !== 1 || attributes[0].name !== 'd' || attributes[0].uri || attributes[0].prefix) bad();
        path = attributes[0].value;
        // The path is opaque geometry preserved verbatim, including compact arc flags.
        if (!path || !/^[MmZzLlHhVvCcSsQqTtAa0-9eE+.,\s-]+$/.test(path) || !/^[Mm]/.test(path)) bad();
      } else bad();
    }
    stack.push(tag.local);
  });
  parser.on('text', text => {if (stack.at(-1) === 'title') title += text; else if (text.trim()) bad();});
  parser.on('closetag', () => {stack.pop();});
  parser.write(source).close();
  const rawPath = /<path d="([^"]+)"\s*\/>/.exec(source)?.[1];
  if (stack.length || count !== 3 || titles !== 1 || paths !== 1 || !title || title.length > 1024 || rawPath !== path) bad();
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const derived = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${width}" height="${height}" fill="${fill}"><title>${escape(title)}</title><path d="${path}"/></svg>\n`);
  return {derived, policy:'simple-icons-pinned-source-presentation/1', parser:{name:'saxes', version:capability.version}, controls:{width, height, fill}, changes:['Removed presentation role=img', 'Added explicit dimensions and root fill; implicit source black is now the chosen fill'], pathDataSHA256:hash(Buffer.from(path)), pathDataPreserved:true, geometryValidation:'not-run; exact path data retained without rewriting compact arc syntax', rendering:'not-run'};
}

/** transport(url, Fetch init) is trusted injected fixture code and always labelled fixture. */
export function createBrandDownloadClient({allowNetwork = false, transport, timeoutMs = 15000} = {}) {
  if (typeof allowNetwork !== 'boolean' || (transport !== undefined && typeof transport !== 'function') || !Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 30000) fail('options', 'Use boolean allowNetwork, optional transport function and timeoutMs 10..30000');
  const mode = transport ? 'fixture-transport' : allowNetwork ? 'live-network' : 'network-disabled';
  function capabilities() {return {provider:'simple-icons', mode, indexed:3466, selectedOriginalDownload:true, existingBundledOriginalSelections:1, importNetworking:false, selectedPresentation:'explicit prepare; pinned source format only', limits:{svgBytes:MAX_SVG, timeoutMs}, scope};}
  async function search({query = '', offset = 0, limit = 12} = {}) {
    if (typeof query !== 'string' || query.length > 128 || /[\u0000-\u001f\u007f]/u.test(query) || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 32) fail('query', 'Expected bounded query, offset 0..10000 and limit 1..32');
    const q = query.toLowerCase();
    const entries = (await index()).entries.filter(e => `${e.id} ${e.title} ${JSON.stringify(e.declaration.aliases ?? {})}`.toLowerCase().includes(q));
    return {provider:'simple-icons', total:entries.length, offset, limit, nextOffset:offset + limit < entries.length ? offset + limit : null, entries:entries.slice(offset, offset + limit).map(metadata), networkRequests:0};
  }
  async function details({id} = {}) {
    const e = (await index()).entries.find(e => e.id === id);
    if (!e) fail('selection', 'Select an indexed Simple Icons id');
    return metadata(e);
  }
  async function download(selected) {
    if (!transport && !allowNetwork) fail('network-disabled', 'Selected acquisition requires allowNetwork:true or a declared fixture transport');
    const controller = new AbortController(); let timer;
    const work = async () => {
      const response = await (transport ?? globalThis.fetch)(selected.sourceURL, {method:'GET', redirect:'manual', signal:controller.signal, headers:{Accept:'image/svg+xml', 'Accept-Encoding':'identity'}});
      if (!response || response.status !== 200 || response.redirected || (response.url && response.url !== selected.sourceURL)) {await response?.body?.cancel?.().catch(() => {}); fail('response', 'Exact HTTP 200 source response required without redirects');}
      const encoding = response.headers?.get('content-encoding'), size = response.headers?.get('content-length');
      if (encoding && encoding !== 'identity') {await response.body?.cancel?.().catch(() => {}); fail('response', 'Encoded source responses are unsupported');}
      if (size !== null && size !== undefined && (!/^\d+$/.test(size) || Number(size) !== selected.bytes)) {await response.body?.cancel?.().catch(() => {}); fail('integrity', 'Response Content-Length differs from exact source bytes');}
      if (!response.body || typeof response.body.getReader !== 'function') fail('response', 'Bounded readable source response required');
      const reader = response.body.getReader(), chunks = []; let count = 0;
      const cancel = () => {reader.cancel().catch(() => {});};
      controller.signal.addEventListener('abort', cancel, {once:true});
      try {
        for (;;) {const {done, value} = await reader.read(); if (done) break; count += value.byteLength; if (count > selected.bytes) fail('bounds', 'Source response exceeded exact byte bound'); chunks.push(Buffer.from(value));}
        return exact(Buffer.concat(chunks, count), selected);
      } catch (error) {await reader.cancel().catch(() => {}); throw error;}
      finally {controller.signal.removeEventListener('abort', cancel); reader.releaseLock();}
    };
    try {return await Promise.race([work(), new Promise((_, reject) => {timer = setTimeout(() => {controller.abort(); const error = new Error('Selected source request/body deadline exceeded'); error.code = 'timeout'; reject(error);}, timeoutMs);})]);}
    finally {clearTimeout(timer); controller.abort();}
  }
  async function reuse(directory, selected, notices) {
    const dir = resolve(directory), info = await lstat(dir);
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(dir) !== dir) fail('reuse', 'Expected canonical retained selection directory');
    if (JSON.stringify((await readdir(dir)).sort()) !== JSON.stringify([...FILES].sort())) fail('reuse', 'Retained output must contain exactly the acquisition artifact set');
    const receipt = JSON.parse((await local(join(dir, 'acquisition.json'), MAX_RECEIPT)).toString('utf8'));
    if (receipt.schema !== 'ingenium-brand-acquisition/1' || receipt.selected?.id !== selected.id || receipt.selected?.sha256 !== selected.sha256 || receipt.selected?.sourceURL !== selected.sourceURL || !['fixture-transport', 'live-network', 'offline-reuse'].includes(receipt.mode) || !Array.isArray(receipt.artifacts) || receipt.artifacts.length !== 4 || (receipt.originReceiptClaim !== undefined && !['fixture-transport', 'live-network'].includes(receipt.originReceiptClaim))) fail('reuse', 'Retained receipt identity mismatch');
    const raws = new Map();
    for (const name of FILES.filter(n => n !== 'acquisition.json')) {
      const pin = receipt.artifacts.find(x => x.path === name);
      if (!pin || !Number.isSafeInteger(pin.bytes) || pin.bytes < 1 || !/^[a-f0-9]{64}$/.test(pin.sha256)) fail('reuse', 'Missing bounded retained artifact pin');
      raws.set(name, exact(await local(join(dir, name), name === 'original.svg' ? MAX_SVG : MAX_RECEIPT), pin));
    }
    exact(raws.get('original.svg'), selected);
    for (const n of notices) exact(raws.get(n.file), n);
    if (!raws.get('declaration.json').equals(json(selected.declaration))) fail('reuse', 'Retained per-icon declaration differs from pinned metadata');
    return {raw:raws.get('original.svg'), originReceiptClaim:receipt.originReceiptClaim ?? receipt.mode};
  }
  async function acquire(options = {}) {
    if (!plain(options) || Object.keys(options).some(k => !['id', 'selected', 'outputDir', 'reuseDir'].includes(k)) || options.selected !== true || typeof options.outputDir !== 'string' || !options.outputDir.trim() || (options.reuseDir !== undefined && (typeof options.reuseDir !== 'string' || !options.reuseDir.trim()))) fail('selection', 'Use id, selected:true, new outputDir and optional retained reuseDir');
    const selected = await details({id:options.id}), out = resolve(options.outputDir);
    if (await realpath(dirname(out)) !== dirname(out)) fail('path', 'Output parent must exist and be canonical');
    try {await lstat(out); fail('output-exists', 'Output already exists');} catch (error) {if (error.code !== 'ENOENT') throw error;}
    if (!options.reuseDir && !transport && !allowNetwork) fail('network-disabled', 'Selected acquisition requires allowNetwork:true or retained reuseDir');
    const notices = await Promise.all(NOTICES.map(async n => ({...n, raw:exact(await local(join(ROOT, n.file), 65536), n)})));
    const retained = options.reuseDir ? await reuse(options.reuseDir, selected, notices) : null;
    // Exclusive reservation prevents collisions from triggering network acquisition.
    await mkdir(out);
    const raw = retained?.raw ?? await download(selected);
    const artifacts = [['original.svg', raw], ...notices.map(n => [n.file, n.raw]), ['declaration.json', json(selected.declaration)]];
    const receipt = {schema:'ingenium-brand-acquisition/1', mode:retained ? 'offline-reuse' : mode, ...(retained ? {originReceiptClaim:retained.originReceiptClaim} : {}), selected,
      rights:{scope, fullProjectNoticesAcquired:true, fullPerIconNoticeAcquired:false, projectNoticeMatchesExplicitCC0:selected.declaration.license?.type === 'CC0-1.0', perIconLicenseDeclaration:clone(selected.declaration.license ?? null)},
      sourceValidation:'Exact pinned SVG bytes/SHA256; no XML/static policy/rendering admission claimed', staticAdmission:'not-run', rendering:'not-run',
      artifacts:artifacts.map(([path, bytes]) => ({path, bytes:bytes.length, sha256:hash(bytes)}))};
    for (const [name, bytes] of artifacts) await writeFile(join(out, name), bytes, {flag:'wx'});
    await writeFile(join(out, 'acquisition.json'), json(receipt), {flag:'wx'});
    return {outputDir:out, originalPath:join(out, 'original.svg'), receiptPath:join(out, 'acquisition.json'), ...clone(receipt)};
  }
  async function prepare(options = {}) {
    if (!plain(options) || Object.keys(options).some(k => !['id', 'selected', 'sourceDir', 'outputDir', 'controls', 'parserDir'].includes(k)) || options.selected !== true || typeof options.sourceDir !== 'string' || !options.sourceDir.trim() || typeof options.outputDir !== 'string' || !options.outputDir.trim()) fail('selection', 'Use id, selected:true, retained sourceDir, new outputDir, optional controls/parserDir');
    const selected = await details({id:options.id}), out = resolve(options.outputDir);
    if (await realpath(dirname(out)) !== dirname(out)) fail('path', 'Output parent must exist and be canonical');
    try {await lstat(out); fail('output-exists', 'Output already exists');} catch (error) {if (error.code !== 'ENOENT') throw error;}
    const retained = await reuse(options.sourceDir, selected, NOTICES);
    const prepared = presentation(retained.raw, options.controls ?? {}, options.parserDir);
    const {derived, ...admission} = prepared;
    const sourceReceipt = await local(join(resolve(options.sourceDir), 'acquisition.json'), MAX_RECEIPT);
    const receipt = {schema:'ingenium-brand-presentation/1', selected, sourceAcquisitionReceiptSHA256:hash(sourceReceipt), sourceOriginReceiptClaim:retained.originReceiptClaim, ...admission,
      original:{path:'original.svg', bytes:retained.raw.length, sha256:hash(retained.raw)}, derivative:{path:'derived.svg', bytes:derived.length, sha256:hash(derived)}, scope:'Selected source presentation only; source path unchanged, finite size/fill edits; no strict static-icon-v1 claim, universal SVG admission, geometry adequacy, rendering or rights acceptance'};
    await mkdir(out);
    for (const name of FILES) await writeFile(join(out, name), name === 'original.svg' ? retained.raw : await local(join(resolve(options.sourceDir), name), MAX_RECEIPT), {flag:'wx'});
    await writeFile(join(out, 'derived.svg'), derived, {flag:'wx'});
    await writeFile(join(out, 'preparation.json'), json(receipt), {flag:'wx'});
    return {outputDir:out, originalPath:join(out, 'original.svg'), derivativePath:join(out, 'derived.svg'), receiptPath:join(out, 'preparation.json'), ...clone(receipt)};
  }
  return Object.freeze({capabilities, search, discover:search, details, acquire, prepare});
}
