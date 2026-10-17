import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, readdir, rm, symlink} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {createFontDownloadClient} from '../src/catalog/font-download.mjs';
import {createFontPackLibrary} from '../src/catalog/font-packs.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const tempRoot = resolve(process.env.INGENIUM_TEST_TMPDIR ?? 'work/font-local-flow-20261017/tests');
async function fixture(t) {
  await mkdir(tempRoot, {recursive:true});
  const root = await mkdtemp(join(tempRoot, 'selected-')); t.after(() => rm(root, {recursive:true, force:true}));
  const font = Buffer.alloc(96); font.writeUInt32BE(0x10000); font.writeUInt16BE(1, 4); font.write('head', 12); font.writeUInt32BE(28, 20); font.writeUInt32BE(68, 24);
  const notice = Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from('Original synthetic font notice, not an upstream source license.\n'), 0xff]);
  const extra = Buffer.from('Original second synthetic notice.\n');
  const selection = {id:'synthetic-selected-font', provider:'google/fonts', commit:'a'.repeat(40), version:'original-test-fixture',
    font:{path:'original/Synthetic.ttf', bytes:font.length, sha256:hash(font), gitBlobSha1:blob(font), format:'truetype', family:'Original synthetic', style:'normal', weight:400},
    notices:[{id:'full-notice', path:'original/NOTICE.txt', bytes:notice.length, gitBlobSha1:blob(notice), license:'Original synthetic fixture notice'}, {id:'second-notice', path:'original/EXTRA.txt', bytes:extra.length, sha256:hash(extra), license:'Original synthetic extra notice'}]};
  const bodies = [font, notice, extra], calls = [];
  const transport = async (url, options) => {calls.push({url, options}); const b = bodies[calls.length - 1]; return new Response(b, {status:200, headers:{'content-length':String(b.length)}});};
  return {root, font, notice, extra, selection, bodies, calls, transport, out:join(root, 'acquired')};
}
test('construction and bounded selected discovery are inert and defensive', () => {
  let count = 0; const client = createFontDownloadClient({transport:() => count++});
  assert.equal(client.capabilities().mode, 'fixture-transport');
  assert.equal(createFontDownloadClient().capabilities().mode, 'network-disabled');
  const page = client.search({limit:1}); assert.equal(page.total, 3); assert.equal(page.nextOffset, 1);
  assert.equal(client.search({provider:'ryanoasis/nerd-fonts'}).entries[0].font.bytes, 2798160);
  page.entries[0].font.bytes = 0; assert.equal(client.details({id:page.entries[0].id}).font.bytes, 35220);
  assert.equal(count, 0); assert.throws(() => client.search({limit:33}), {code:'query'});
  assert.throws(() => client.details({id:'absent'}), {code:'selection'});
});
test('explicit fixture acquisition preserves exact bytes/notices, records original mode, supports offline customization/export', async t => {
  const f = await fixture(t), client = createFontDownloadClient({transport:f.transport});
  const result = await client.acquire({selection:f.selection, selected:true, outputDir:f.out});
  assert.equal(result.mode, 'fixture-transport'); assert.equal(f.calls.length, 3);
  assert(f.calls.every(c => c.options.redirect === 'manual' && c.options.signal));
  assert.deepEqual(await readFile(join(f.out, 'font.ttf')), f.font);
  assert.deepEqual(await readFile(join(f.out, 'notice-1-full-notice.txt')), f.notice);
  assert.deepEqual(await readFile(join(f.out, 'notice-2-second-notice.txt')), f.extra);
  const m = JSON.parse(await readFile(result.manifestPath, 'utf8')); assert.equal(m.acquisition.mode, 'fixture-transport');
  const offline = createFontPackLibrary({manifestPath:result.manifestPath});
  assert.equal((await offline.inspect({id:f.selection.id})).verified.fontSHA256, hash(f.font));
  const exported = await offline.acquire({id:f.selection.id, selected:true, outputDir:join(f.root, 'preview'), controls:{fontSizePx:48, letterSpacingEm:.03}});
  assert.match(await readFile(join(exported.outputDir, 'font.css'), 'utf8'), /font-size:48px/);
  assert.equal(JSON.parse(await readFile(join(exported.outputDir, 'manifest.json'), 'utf8')).acquisition.mode, 'fixture-transport');
  assert.equal(f.calls.length, 3);
});
test('network remains disabled without explicit enablement and refusals leave an exclusive error directory', async t => {
  const f = await fixture(t);
  await assert.rejects(createFontDownloadClient().acquire({selection:f.selection, selected:true, outputDir:f.out}), {code:'network-disabled'});
  assert.deepEqual(await readdir(f.out), []);
});
test('existing output and unselected operations never request transport', async t => {
  const f = await fixture(t), client = createFontDownloadClient({transport:f.transport}); await mkdir(f.out);
  await assert.rejects(client.acquire({selection:f.selection, selected:true, outputDir:f.out}), {code:'EEXIST'});
  for (const options of [{selection:f.selection, outputDir:f.out}, {id:'google-abel-regular', selection:f.selection, selected:true, outputDir:f.out}, {selection:f.selection, selected:true, outputDir:f.out, controls:{fontSizePx:12}}]) await assert.rejects(client.acquire(options), {code:'selection'});
  assert.equal(f.calls.length, 0);
});
test('mutable pins, traversal, missing rights, huge bounds and unsupported OTF/TTC refuse before network', async t => {
  const f = await fixture(t), client = createFontDownloadClient({transport:f.transport});
  const changes = [s => s.commit = 'main', s => s.font.path = '../x.ttf', s => s.font.path = 'x%2fy.ttf', s => s.font.bytes = 8388609, s => delete s.font.sha256, s => s.notices = [], s => s.notices[1].id = s.notices[0].id, s => s.notices[0].bytes = 65537, s => s.notices[0].repository = 'other/repo', s => s.font.format = 'opentype', s => s.font.format = 'collection'];
  changes.splice(4, 1, s => {delete s.font.sha256; delete s.font.gitBlobSha1;});
  for (const change of changes) {const s = structuredClone(f.selection); change(s); await assert.rejects(client.acquire({selection:s, selected:true, outputDir:f.out}));}
  assert.equal(f.calls.length, 0);
});
test('redirects, status errors, encoded bodies, false lengths and corrupt hashes never produce manifests', async t => {
  const f = await fixture(t);
  const responses = [() => new Response(null, {status:302, headers:{location:'https://example.invalid'}}), () => new Response(null, {status:403}), () => new Response(f.font, {headers:{'content-encoding':'gzip'}}), () => new Response(f.font, {headers:{'content-length':'97'}}), () => new Response(Buffer.alloc(96)), () => new Response(f.font.subarray(0, 95)), () => new Response(Buffer.alloc(97))];
  for (const [i, response] of responses.entries()) {const outputDir = join(f.root, `refused-${i}`); await assert.rejects(createFontDownloadClient({transport:response}).acquire({selection:f.selection, selected:true, outputDir})); assert.deepEqual(await readdir(outputDir), []);}
});
test('body streaming is bounded even without Content-Length', async t => {
  const f = await fixture(t); let cancelled = false;
  const transport = () => new Response(new ReadableStream({start(c) {c.enqueue(new Uint8Array(97));}, cancel() {cancelled = true;}}));
  await assert.rejects(createFontDownloadClient({transport}).acquire({selection:f.selection, selected:true, outputDir:f.out}), {code:'bounds'}); assert(cancelled);
});
test('Git blob hash includes the Git prefix and both declared digests must match', async t => {
  const f = await fixture(t);
  for (const field of ['gitBlobSha1', 'sha256']) {
    const selection = structuredClone(f.selection);
    selection.font[field] = '0'.repeat(field === 'sha256' ? 64 : 40);
    await assert.rejects(createFontDownloadClient({transport:() => new Response(f.font)}).acquire({selection, selected:true, outputDir:join(f.root, field)}), {code:'integrity'});
  }
  assert.notEqual(blob(f.font), createHash('sha1').update(f.font).digest('hex'));
});
test('headers and stalled body both obey timeout with an aborted signal', async t => {
  for (const stalledBody of [false, true]) {
    const f = await fixture(t); let signal;
    const transport = (url, o) => {signal = o.signal; return stalledBody ? new Response(new ReadableStream({start() {}})) : new Promise(() => {});};
    await assert.rejects(createFontDownloadClient({transport, timeoutMs:20}).acquire({selection:f.selection, selected:true, outputDir:f.out}), {code:'timeout'}); assert(signal.aborted);
  }
});
test('failed second notice is not silently replaced and cannot report a reusable pack', async t => {
  const f = await fixture(t); f.bodies[2] = Buffer.alloc(f.extra.length);
  await assert.rejects(createFontDownloadClient({transport:f.transport}).acquire({selection:f.selection, selected:true, outputDir:f.out}), {code:'integrity'});
  assert.equal(f.calls.length, 3); assert.deepEqual(await readdir(f.out), []);
});
test('symlinked output parents refuse before transport', async t => {
  const f = await fixture(t); await mkdir(join(f.root, 'real')); await symlink(join(f.root, 'real'), join(f.root, 'linked'));
  await assert.rejects(createFontDownloadClient({transport:f.transport}).acquire({selection:f.selection, selected:true, outputDir:join(f.root, 'linked', 'output')}), {code:'path'}); assert.equal(f.calls.length, 0);
});
test('container refusal cannot become successful provenance merely because source hashes match', async t => {
  const f = await fixture(t); f.font.writeUInt32BE(0x4f54544f); f.selection.font.sha256 = hash(f.font); f.selection.font.gitBlobSha1 = blob(f.font);
  await assert.rejects(createFontDownloadClient({transport:f.transport}).acquire({selection:f.selection, selected:true, outputDir:f.out}), {code:'container'});
  assert(!(await readdir(f.out)).includes('acquisition.json'));
});
