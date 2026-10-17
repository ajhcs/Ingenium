import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, mkdir, symlink, readdir, rm} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBrandDownloadClient} from '../src/catalog/brand-download.mjs';
const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const original = await readFile(join(repo, 'src/resources/packs/simple-icons/selected/activitypub-original.svg'));
async function scratch(t) {const dir = await mkdtemp(join(repo, 'work/brand-download-test-')); t.after(() => rm(dir, {recursive:true, force:true})); return dir;}
function fixture(extra = {}) {let requests = 0; const client = createBrandDownloadClient({transport:async (url, init) => {requests++; assert.match(url, /^https:\/\/raw\.githubusercontent\.com\/simple-icons\/simple-icons\/4d29a35c954699b389a834aacc97dd6e7e74143c\/icons\/activitypub\.svg$/); assert.equal(init.redirect, 'manual'); return new Response(original, {headers:{'content-length':String(original.length)}});}, ...extra}); return {client, requests:() => requests};}

test('inert construction and paged discovery retain exact declarations and aliases', async () => {
  let calls = 0; const client = createBrandDownloadClient({transport:() => {calls++; throw Error('unexpected');}});
  assert.equal(client.capabilities().indexed, 3466);
  const first = await client.search({limit:32}); assert.equal(first.total, 3466); assert.equal(first.nextOffset, 32); assert.equal(first.entries.length, 32);
  const second = await client.search({offset:32, limit:32}); assert.notEqual(first.entries[0].id, second.entries[0].id);
  const js = await client.details({id:'javascript'}); assert.equal(js.declaration.license.type, 'MIT'); assert.match(js.declaration.source, /logo\.js/); assert.equal(js.rights.fullPerIconNoticeAcquired, false);
  js.declaration.license.type = 'changed'; assert.equal((await client.details({id:'javascript'})).declaration.license.type, 'MIT');
  const alias = await client.search({query:'Dotenv'}); assert.ok(alias.entries.some(e => e.declaration.aliases.aka.includes('Dotenv')));
  assert.equal(calls, 0); await assert.rejects(client.search({limit:33}), {code:'query'}); await assert.rejects(client.details({id:'unknown'}), {code:'selection'});
});

test('selected-only/default-offline refusal creates no output', async t => {
  const dir = await scratch(t), out = join(dir, 'new'); const client = createBrandDownloadClient();
  await assert.rejects(client.acquire({id:'activitypub', outputDir:out}), {code:'selection'});
  await assert.rejects(client.acquire({id:'activitypub', selected:true, outputDir:out}), {code:'network-disabled'});
  assert.deepEqual(await readdir(dir), []);
  assert.throws(() => createBrandDownloadClient({timeoutMs:30001}), {code:'options'});
});

test('selected fixture preserves original, full notices, declarations and scoped receipt', async t => {
  const dir = await scratch(t), {client, requests} = fixture();
  const selected = await client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'selected')});
  assert.equal(requests(), 1); assert.equal(selected.mode, 'fixture-transport'); assert.equal(selected.staticAdmission, 'not-run');
  assert.deepEqual(await readFile(selected.originalPath), original); assert.equal(selected.rights.fullPerIconNoticeAcquired, false);
  assert.deepEqual((await readdir(selected.outputDir)).sort(), ['DISCLAIMER.md','LICENSE.md','acquisition.json','declaration.json','original.svg']);
  for (const file of ['LICENSE.md', 'DISCLAIMER.md']) assert.deepEqual(await readFile(join(selected.outputDir, file)), await readFile(join(repo, 'src/resources/packs/simple-icons', file)));
});

test('verified offline reuse never transports and retains fixture origin as a claim', async t => {
  const dir = await scratch(t), {client, requests} = fixture();
  const first = await client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'first')});
  const second = await createBrandDownloadClient().acquire({id:'activitypub', selected:true, outputDir:join(dir, 'second'), reuseDir:first.outputDir});
  assert.equal(requests(), 1); assert.equal(second.mode, 'offline-reuse'); assert.equal(second.originReceiptClaim, 'fixture-transport');
  assert.deepEqual(second.artifacts, first.artifacts);
});

test('existing output and symlink parent refuse before transport', async t => {
  const dir = await scratch(t), {client, requests} = fixture(); await mkdir(join(dir, 'existing'));
  await assert.rejects(client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'existing')}), {code:'output-exists'});
  await symlink(dir, join(dir, 'link'));
  await assert.rejects(client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'link/new')}), {code:'path'});
  assert.equal(requests(), 0);
});

test('corrupt, extra or symlinked reuse refuses without refetch', async t => {
  const dir = await scratch(t), {client, requests} = fixture();
  const first = await client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'first')});
  await writeFile(first.originalPath, 'wrong');
  await assert.rejects(client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'corrupt'), reuseDir:first.outputDir}), {code:'integrity'});
  await writeFile(first.originalPath, original); await writeFile(join(first.outputDir, 'extra.svg'), 'extra');
  await assert.rejects(client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'extra'), reuseDir:first.outputDir}), {code:'reuse'});
  await rm(join(first.outputDir, 'extra.svg')); await rm(first.originalPath); await symlink(join(repo, 'src/resources/packs/simple-icons/selected/activitypub-original.svg'), first.originalPath);
  await assert.rejects(client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'symlink'), reuseDir:first.outputDir}), {code:'local-file'});
  assert.equal(requests(), 1);
});

test('redirects, wrong final URL and HTTP errors refuse', async t => {
  const dir = await scratch(t);
  for (const [i, response] of [new Response(null, {status:302, headers:{Location:'https://other.example'}}), new Response(null, {status:403}), {status:200, url:'https://other.example', body:null}].entries()) {
    const client = createBrandDownloadClient({transport:async () => response});
    await assert.rejects(client.acquire({id:'activitypub', selected:true, outputDir:join(dir, `case-${i}`)}), {code:'response'});
  }
});

test('exact byte, SHA256, stream and encoding bounds refuse', async t => {
  const dir = await scratch(t);
  const wrong = Buffer.from(original); wrong[wrong.length - 1] ^= 1;
  const cases = [
    [() => new Response(wrong), 'integrity'],
    [() => new Response(original.subarray(1)), 'integrity'],
    [() => new Response(Buffer.concat([original, Buffer.from('x')])), 'bounds'],
    [() => new Response(original, {headers:{'content-length':'9999999'}}), 'integrity'],
    [() => new Response(original, {headers:{'content-encoding':'gzip'}}), 'response']
  ];
  for (const [i, [response, code]] of cases.entries()) await assert.rejects(createBrandDownloadClient({transport:async () => response()}).acquire({id:'activitypub', selected:true, outputDir:join(dir, `case-${i}`)}), {code});
});

test('deadline covers an unresponsive transport and stalled response stream', async t => {
  const dir = await scratch(t);
  const sources = [() => new Promise(() => {}), () => new Response(new ReadableStream({pull() {return new Promise(() => {});}}))];
  for (const [i, transport] of sources.entries()) await assert.rejects(createBrandDownloadClient({transport, timeoutMs:15}).acquire({id:'activitypub', selected:true, outputDir:join(dir, `case-${i}`)}), {code:'timeout'});
});

test('selected presentation preserves exact original/path and records finite controls', async t => {
  const dir = await scratch(t), {client} = fixture();
  const acquired = await client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'acquired')});
  const parserDir = process.env.INGENIUM_TEST_PARSER_DIR;
  const {parserCapability} = await import('../src/assets/svg.mjs');
  if (parserCapability(parserDir).status !== 'available') return t.skip('Optional saxes6 parser unavailable; selector INGENIUM_TEST_PARSER_DIR');
  const prepared = await client.prepare({id:'activitypub', selected:true, sourceDir:acquired.outputDir, outputDir:join(dir, 'prepared'), parserDir, controls:{width:160, height:96, fill:'#2468AC'}});
  const derived = await readFile(prepared.derivativePath, 'utf8');
  assert.equal(prepared.policy, 'simple-icons-pinned-source-presentation/1'); assert.equal(prepared.pathDataPreserved, true);
  assert.match(derived, /width="160" height="96" fill="#2468AC"/); assert.doesNotMatch(derived, /role=/);
  assert.equal(/<path d="([^"]+)"/.exec(derived)[1], /<path d="([^"]+)"/.exec(original.toString())[1]);
  assert.deepEqual(await readFile(prepared.originalPath), original);
  for (const file of ['LICENSE.md', 'DISCLAIMER.md', 'declaration.json', 'acquisition.json']) assert.deepEqual(await readFile(join(prepared.outputDir, file)), await readFile(join(acquired.outputDir, file)));
  const repeat = await createBrandDownloadClient().prepare({id:'activitypub', selected:true, sourceDir:acquired.outputDir, outputDir:join(dir, 'repeat'), parserDir, controls:{width:160, height:96, fill:'#2468AC'}});
  assert.deepEqual(await readFile(repeat.derivativePath), await readFile(prepared.derivativePath));
  assert.equal(repeat.derivative.sha256, prepared.derivative.sha256);
});

test('presentation refuses unsupported controls, missing parser and source substitutions', async t => {
  const dir = await scratch(t), {client, requests} = fixture();
  const acquired = await client.acquire({id:'activitypub', selected:true, outputDir:join(dir, 'acquired')});
  const input = {id:'activitypub', selected:true, sourceDir:acquired.outputDir};
  for (const [i, controls] of [{width:0}, {height:2049}, {fill:'url(https://example.test)'}, {fill:'currentColor'}, {transform:'rotate(2)'}, {width:Infinity}].entries()) {
    await assert.rejects(client.prepare({...input, outputDir:join(dir, `bad-${i}`), controls}), {code:'controls'});
  }
  await assert.rejects(client.prepare({...input, outputDir:join(dir, 'no-parser'), parserDir:join(dir, 'missing-parser')}), {code:'not-run'});
  for (const addition of ['<script>alert(1)</script>', '<!--hidden-->', '<image href="https://example.test/a"/>', '<!DOCTYPE svg>']) {
    await writeFile(acquired.originalPath, original.toString().replace('</svg>', addition + '</svg>'));
    await assert.rejects(client.prepare({...input, outputDir:join(dir, 'injected')}), {code:'integrity'});
  }
  assert.equal(requests(), 1);
});
