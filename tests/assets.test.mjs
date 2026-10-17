import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, readdir, symlink, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createAssetClient, validateIconSvg, validateWoff2 } from '../src/assets/index.mjs';
import { allowedUrl, createRequester, limitsFor } from '../src/assets/transport.mjs';
import { fixtureTransport, fixtureIcon, fixtureInfo } from '../examples/assets/offline-study.mjs';
const parserDir = process.env.INGENIUM_ASSET_PARSER_DIR;
const selected = { provider: 'iconify', id: 'ingenium-fixture:window', selected: true };
const root = () => mkdtemp(resolve('work/assets-unit-'));
const json = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
const requester = (transport, limits = {}) => createRequester({ transport, limits: limitsFor(limits) });
const api = (extra = {}) => createAssetClient({ transport: fixtureTransport(), parserDir, ...extra });

test('construction is inert and network is opt-in; provider capability limits explicit', async () => {
  let calls = 0;
  const client = createAssetClient({ transport: async () => { calls++; throw Error('unexpected'); } });
  assert.equal(calls, 0);
  assert.equal(client.capabilities().providers.fontsource.fetch, 'not-run');
  assert.equal(calls, 0);
  await assert.rejects(createAssetClient().search({ provider: 'iconify', query: 'window' }), e => e.code === 'not-run');
});
test('strict configurable bounds, provider IDs, queries and selection', async () => {
  assert.throws(() => createAssetClient({ limits: { assetBytes: 9999999 } }), /Invalid limit/);
  assert.throws(() => createAssetClient({ limits: { unknown: 2 } }), /Invalid limit/);
  await assert.rejects(api().search({ provider: 'other', query: 'x' }), /Expected supported/);
  await assert.rejects(api().search({ provider: 'fontsource', query: '' }), /Expected supported/);
  await assert.rejects(api().details({ provider: 'iconify', id: '../bad:x' }), /Invalid provider/);
  await assert.rejects(api().preview({ ...selected, selected: false }), /selected:true/);
});
test('all supported URLs are fixed HTTPS hosts/paths; credentials, local URLs and traversal refused', () => {
  for (const url of ['http://api.iconify.design/search', 'https://api.iconify.design.evil/search', 'https://127.0.0.1/search', 'https://api.iconify.design:444/search', 'https://a@api.iconify.design/search', 'https://api.iconify.design/a/../search', 'https://api.iconify.design/%73earch', 'https://cdn.jsdelivr.net/npm/evil/index.js', 'file:///tmp/a', 'data:image/svg+xml,x']) assert.throws(() => allowedUrl(url));
  assert.equal(allowedUrl('https://api.iconify.design/search?query=window'), 'https://api.iconify.design/search?query=window');
});
test('every redirect hop is checked and automatic following is rejected', async () => {
  for (const location of ['https://127.0.0.1/search', 'https://api.fontsource.org/v1/fonts', 'file:///tmp/a', '/a/%2e%2e/search', '/a/../search']) {
    let calls = 0;
    await assert.rejects(requester(async () => { calls++; return new Response(null, { status: 302, headers: { location } }); }).read('https://api.iconify.design/search', 1000, 'application/json'));
    assert.equal(calls, 1);
  }
  await assert.rejects(requester(async () => new Response(null, { status: 302, headers: { location: '/search' } }), { redirects: 0 }).read('https://api.iconify.design/search', 1000, 'application/json'), e => e.code === 'redirect-limit');
  const response = json({}); Object.defineProperty(response, 'redirected', { value: true });
  await assert.rejects(requester(async () => response).read('https://api.iconify.design/search', 1000, 'application/json'), e => e.code === 'unsafe-redirect');
});
test('safe manual redirect records the complete chain', async () => {
  let calls = 0;
  const data = await requester(async () => ++calls === 1 ? new Response(null, { status: 302, headers: { location: '/search?query=window' } }) : json({ icons: [] })).read('https://api.iconify.design/search', 1000, 'application/json');
  assert.equal(data.source.chain.length, 2); assert.equal(calls, 2);
});
test('timeouts and 429/403 failures have explicit status and never retry', async () => {
  await assert.rejects(requester(() => new Promise(() => {}), { timeoutMs: 5 }).read('https://api.iconify.design/search', 1000, 'application/json'), e => e.code === 'timeout');
  for (const status of [429, 403]) {
    let calls = 0;
    await assert.rejects(requester(async () => { calls++; return new Response(null, { status, headers: { 'retry-after': '60' } }); }).read('https://api.iconify.design/search', 1000, 'application/json'), e => e.code === 'http' && e.details.status === status && e.details.retryAfter === '60');
    assert.equal(calls, 1);
  }
});
test('both declared and streamed oversize responses and unexpected MIME fail closed', async () => {
  for (const headers of [{ 'content-type': 'application/json', 'content-length': '10000' }, { 'content-type': 'application/json' }]) await assert.rejects(requester(async () => new Response('x'.repeat(200), { headers })).read('https://api.iconify.design/search', 100, 'application/json'), e => e.code === 'oversize');
  await assert.rejects(requester(async () => new Response('<html/>', { headers: { 'content-type': 'text/html' } })).read('https://api.iconify.design/search', 1000, 'application/json'), e => e.code === 'media');
});
test('malformed metadata and mismatched details are rejected', async () => {
  for (const body of ['{', '[]', '{"icons":"invalid"}']) await assert.rejects(api({ transport: async () => new Response(body, { headers: { 'content-type': 'application/json' } }) }).search({ provider: 'iconify', query: 'window' }));
  await assert.rejects(api({ transport: async () => json({ prefix: 'wrong', info: fixtureInfo }) }).details(selected), /prefix/);
});
test('metadata search does not fetch asset bytes; font metadata does not imply licensed fetch', async () => {
  const calls = [], client = api({ transport: fixtureTransport(calls) });
  const found = await client.search({ provider: 'iconify', query: 'window', limit: 1 });
  assert.equal(found.items[0].license.spdx, 'MIT'); assert.equal(calls.length, 1); assert.match(calls[0].url, /\/search\?/);
  assert.equal(found.evidenceMode, 'injected-fixture');
  const font = await client.details({ provider: 'fontsource', id: 'synthetic-family' });
  assert.equal(font.license.status, 'unknown'); assert.equal(font.capabilities.fetch, false);
  await assert.rejects(client.preview({ provider: 'fontsource', id: 'synthetic-family', selected: true }), e => e.code === 'license');
});
test('missing or unsafe license evidence refuses before selected asset bytes', async () => {
  for (const license of [undefined, { title: 'MIT' }, { title: 'MIT', spdx: 'MIT', url: 'javascript:bad' }]) {
    let calls = 0;
    await assert.rejects(api({ transport: async () => { calls++; return json({ prefix: 'ingenium-fixture', info: { ...fixtureInfo, license } }); } }).preview(selected), e => e.code === 'license');
    assert.equal(calls, 1);
  }
});
test('parser absence is an actionable capability refusal, never a regex fallback', async () => {
  const dir = await root();
  const client = api({ parserDir: dir });
  assert.equal(client.capabilities().parser.status, 'not-run');
  await assert.rejects(client.preview(selected), e => e.code === 'not-run');
});
test('font bytes reject unsupported/oversize/truncated containers; no glyph pipeline', () => {
  for (const bytes of [Buffer.from('<svg/>'), Buffer.alloc(47), Buffer.alloc(524289), Buffer.alloc(48)]) assert.throws(() => validateWoff2(bytes));
});
test('strict parser validates original synthetic icon and preserves a separately hashed derivative', { skip: !parserDir }, () => {
  const result = validateIconSvg(Buffer.from(fixtureIcon), { parserDir });
  assert.equal(result.parser.version, '6.0.0'); assert.equal(result.nodes, 4);
  assert.match(result.safe.toString(), /<title>Open window<\/title>/);
  assert.notEqual(result.safeSha256, result.originalSha256);
});
test('strict XML structure rejects scripts, events, external references, entities and hostile shapes', { skip: !parserDir }, () => {
  const svg = content => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${content}</svg>`);
  const bodies = ['<script/>', '<foreignObject/>', '<image href="https://example.com/x"/>', '<use href="#x"/>', '<path onclick="x()" d="M0 0"/>', '<path fill="url(https://example.com)" d="M0 0"/>', '<path style="fill:red"/>', '<path xmlns="http://www.w3.org/1999/xhtml"/>', '<path xlink:href="x" xmlns:xlink="http://www.w3.org/1999/xlink"/>', '<path fill="&#106;avascript:evil"/>', '<path/><svg/>', '<g>'.repeat(25) + '</g>'.repeat(25), '<path/>'.repeat(2048), '<path d="M0 0"></g>', '<![CDATA[hello]]>', '<?xml-stylesheet href="https://example.com"?>', '<path d="M0 0" d="M1 1"/>'];
  for (const body of bodies) assert.throws(() => validateIconSvg(svg(body), { parserDir }), body.slice(0, 70));
  for (const source of ['<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">&x;</svg>', '<svg/>', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"/><svg/>']) assert.throws(() => validateIconSvg(Buffer.from(source), { parserDir }));
});
test('selected preview/fetch retain exact sources and refuse output overwrite', { skip: !parserDir }, async () => {
  const dir = await root(), client = api(), outputDir = join(dir, 'selected');
  const preview = await client.preview(selected), receipt = await client.fetch({ ...selected, outputDir });
  assert.deepEqual(preview.bytes, await readFile(join(outputDir, 'safe.svg')));
  assert.equal(await readFile(join(outputDir, 'original.svg'), 'utf8'), fixtureIcon);
  assert.equal(receipt.source.sha256, receipt.original.sha256);
  assert.equal(receipt.license.author, 'ajhcs and contributors');
  assert.equal(receipt.evidenceMode, 'injected-fixture');
  await assert.rejects(client.fetch({ ...selected, outputDir }), e => e.code === 'EEXIST');
});
test('bounded cache reuses intact bytes and refuses corruption without refetch', { skip: !parserDir }, async () => {
  const dir = await root(), calls = [], cacheDir = join(dir, 'cache'), client = api({ transport: fixtureTransport(calls), cacheDir });
  await client.preview(selected); assert.equal(calls.length, 2);
  await client.preview(selected); assert.equal(calls.length, 2);
  const files = await readdir(cacheDir), binary = files.find(n => n.endsWith('.bin'));
  await writeFile(join(cacheDir, binary), 'corrupt');
  await assert.rejects(client.preview(selected), e => e.code === 'cache-corrupt');
  assert.equal(calls.length, 2);
});
test('cache capacity is bounded without eviction or silent network fallback', async () => {
  const dir = await root(), cacheDir = join(dir, 'cache');
  const client = api({ cacheDir, limits: { cacheEntries: 1 } });
  await client.search({ provider: 'iconify', query: 'window' });
  await assert.rejects(client.details(selected), e => e.code === 'cache-full');
  assert.equal((await readdir(cacheDir)).length, 2);
  const byteClient = api({ cacheDir: join(dir, 'small'), limits: { cacheBytes: 2 } });
  await assert.rejects(byteClient.search({ provider: 'iconify', query: 'window' }), e => e.code === 'cache-full');
});
test('cache symlinks, unknown files and locked cache refuse', async () => {
  const dir = await root(), target = join(dir, 'target'); await mkdir(target);
  const link = join(dir, 'link'); await symlink(target, link);
  await assert.rejects(api({ cacheDir: join(link, 'cache') }).search({ provider: 'iconify', query: 'window' }), e => e.code === 'cache');
  await assert.rejects(stat(join(target, 'cache')), e => e.code === 'ENOENT');
  const cacheDir = join(dir, 'cache'); await mkdir(cacheDir); await writeFile(join(cacheDir, 'unrelated'), 'keep');
  await assert.rejects(api({ cacheDir }).search({ provider: 'iconify', query: 'window' }), e => e.code === 'cache');
  const locked = join(dir, 'locked'); await mkdir(locked); await writeFile(join(locked, '.lock'), '');
  await assert.rejects(api({ cacheDir: locked }).search({ provider: 'iconify', query: 'window' }), e => e.code === 'cache-busy');
});
test('output symlink ancestors refuse before fetching or writing', async () => {
  const dir = await root(), target = join(dir, 'target'); await mkdir(target); await symlink(target, join(dir, 'link'));
  let calls = 0;
  await assert.rejects(api({ transport: async () => { calls++; throw Error('unexpected'); } }).fetch({ ...selected, outputDir: join(dir, 'link', 'escaped') }), e => e.code === 'output');
  assert.equal(calls, 0); assert.deepEqual(await readdir(target), []);
});

test('regression: inherited limit names and encoded traversal reject before transport', () => {
  assert.throws(() => limitsFor({ toString: 1 }), /Invalid limit/);
  assert.throws(() => allowedUrl('https://api.iconify.design/x/%2e%2e/search'));
  assert.throws(() => allowedUrl('https://api.iconify.design/x/.%2e/search'));
});
test('regression: malformed exported SVG size bounds and path/point numbers refuse', { skip: !parserDir }, () => {
  for (const maxBytes of [NaN, Infinity, '999999', null, 0, 524289]) assert.throws(() => validateIconSvg(Buffer.from(fixtureIcon), { parserDir, maxBytes }), /bounded bytes/);
  for (const element of ['<path d="M e . +"/>', '<path d="M0 0 L1e9999 1"/>', '<path d="M0 0 A1 1 0 3 0 2 2"/>', '<path d="M,0 0"/>', '<polygon points="0 0 1e9999 2"/>']) assert.throws(() => validateIconSvg(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${element}</svg>`), { parserDir }));
});
test('regression: cached fixtures retain acquisition identity; preview pins actual SVG source', { skip: !parserDir }, async () => {
  const dir = await root(), cacheDir = join(dir, 'cache');
  await api({ cacheDir }).preview(selected);
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw Error('Network forbidden in regression'); };
  try {
    const client = createAssetClient({ allowNetwork: true, parserDir, cacheDir });
    const detail = await client.details(selected), preview = await client.preview(selected);
    assert.equal(detail.evidenceMode, 'injected-fixture'); assert.equal(detail.cacheHit, true);
    assert.equal(preview.evidenceMode, 'injected-fixture'); assert.equal(preview.cacheHit, true);
    assert.equal(preview.source.acquisitionMode, 'injected-fixture');
    assert.equal(preview.source.contentType, 'image/svg+xml');
    assert.match(preview.source.url, /\/window\.svg\?/);
    assert.equal(preview.originalSha256, preview.source.sha256);
    assert.equal(preview.metadataSource.contentType, 'application/json');
    assert.equal(networkCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});
