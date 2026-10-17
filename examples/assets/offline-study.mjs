import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAssetClient } from '../../src/assets/index.mjs';

// Original synthetic fixture: these are NOT upstream provider responses or assets.
export const fixtureIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><title>Open window</title><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10H21M10 10V21" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
export const fixtureInfo = { name: 'Ingenium original offline fixture', version: 'fixture-1', author: { name: 'ajhcs and contributors' }, license: { title: 'MIT License', spdx: 'MIT', url: 'https://github.com/ajhcs/Ingenium/blob/codex/ingenium-slice1/LICENSE' } };
export function fixtureTransport(log = []) {
  return async (url, options) => {
    log.push({ url, redirect: options.redirect });
    const u = new URL(url);
    let data;
    if (u.pathname === '/search') data = { icons: ['ingenium-fixture:window'], collections: { 'ingenium-fixture': fixtureInfo } };
    else if (u.pathname === '/collection') data = { prefix: 'ingenium-fixture', info: fixtureInfo };
    else if (u.pathname === '/ingenium-fixture/window.svg') return new Response(fixtureIcon, { headers: { 'content-type': 'image/svg+xml' } });
    else if (u.pathname === '/v1/fonts') data = [{ id: 'synthetic-family', family: 'Synthetic Family', version: 'fixture-1' }];
    else if (u.pathname === '/v1/fonts/synthetic-family') data = { id: 'synthetic-family', family: 'Synthetic Family', version: 'fixture-1', weights: [400], subsets: ['latin'], styles: ['normal'] };
    else throw new Error(`No offline fixture route: ${u.pathname}`);
    return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
  };
}
export async function buildOfflineStudy(outputDir, parserDir) {
  const root = resolve(outputDir); await mkdir(root);
  const requests = [];
  const client = createAssetClient({ transport: fixtureTransport(requests), parserDir, cacheDir: join(root, 'cache') });
  const search = await client.search({ provider: 'iconify', query: 'window', prefix: 'ingenium-fixture' });
  const id = search.items[0].id;
  const selection = { provider: 'iconify', id, selected: true };
  const detail = await client.details(selection), preview = await client.preview(selection);
  const fetched = await client.fetch({ ...selection, outputDir: join(root, 'selected') });
  const icon = await readFile(join(root, 'selected/safe.svg'), 'utf8');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Offline asset admission fixture</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f2eb;color:#182c32;font:18px/1.6 system-ui}main{max-width:840px;margin:64px auto;padding:32px;border:1px solid #b7c3bf;border-radius:20px;background:#fffdf8}svg{width:96px;height:96px;color:#28645b}h1{font-size:36px;line-height:1.2}small{display:block;color:#455b60}code{overflow-wrap:anywhere}@media(max-width:600px){main{margin:24px 16px;padding:24px}h1{font-size:28px}}</style><main>${icon}<h1>One selected asset</h1><p>A small editable icon passes through explicit selection, structural validation and a bounded local cache.</p><p>The original source and the safe derived SVG have separate hashes and provenance.</p><small>Internal technical fixture. Original synthetic icon by ajhcs and contributors, MIT. No provider was contacted. No font file was fetched; system text is used.</small></main></html>`;
  await writeFile(join(root, 'study.html'), html, { flag: 'wx' });
  const receipt = { qualification: 'OFFLINE synthetic fixture only; not live provider acceptance or a design-quality example', requests, search, detail, preview: { sha256: preview.sha256, byteSize: preview.bytes.length }, fetched };
  await writeFile(join(root, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return receipt;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await buildOfflineStudy(process.argv[2], process.argv[3]); console.log('Offline fixture written; live provider qualification remains not-run.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
