import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
/** Original synthetic plain-HTML routes, deliberately separate from any framework. */
export async function startInspectionFixture() {
  const localFont = await readFile(new URL('../../../src/resources/packs/cse-fonts/inter-400.woff2', import.meta.url));
  const hits = [], sockets = new Set(); let changed = false, delay = false;
  const server = createServer((req, res) => {
    hits.push(req.url);
    if (req.url === '/local.woff2') { res.setHeader('Content-Type', 'font/woff2'); res.end(localFont); return; }
    if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end('body{font:18px Arial,sans-serif;margin:1rem}button{font:inherit}'); return; }
    if (req.url === '/redirect') { res.writeHead(302, { Location: '/details' }); res.end(); return; }
    if (req.url.startsWith('/never')) { res.end('Unlisted route must not be requested'); return; }
    if (req.url === '/slow') { setTimeout(() => { if (!res.destroyed) res.end('<!doctype html><title>Slow</title><h1>Slow</h1>'); }, 1200).unref(); return; }
    res.setHeader('Content-Type', 'text/html');
    const route = req.url === '/details' ? 'Detail observations' : 'Field station overview';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${route}</title><link rel="stylesheet" href="/style.css"><style>@font-face{font-family:LocalProof;src:url(/local.woff2)}.local{font-family:LocalProof,sans-serif}@font-face{font-family:Blocked;src:url(http://external.invalid/blocked.woff2)}.blocked{font-family:Blocked,serif}</style></head><body><main><h1>${route}</h1><p id="state"></p><p class="blocked">Dependency uncertainty</p><p class="local">Local font proof</p><p id="kept">${changed ? 'Changed original text' : 'Original synthetic field observations'}</p><button id="increment" onclick="localStorage.setItem('counter',String(Number(localStorage.getItem('counter')||0)+1));document.cookie='touched=yes;path=/';document.getElementById('state').textContent=localStorage.getItem('counter')">Increment</button><a id="detail" href="/details">Details</a><a id="unknown" href="/never">Unlisted</a><script>document.getElementById('state').textContent=(localStorage.getItem('counter')||'0')+':'+(document.cookie.includes('touched=yes')?'dirty':'clean');</script></main></body></html>`;
    if (delay) setTimeout(() => { if (!res.destroyed) res.end(html); }, 500).unref(); else res.end(html);
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, hits, change() { changed = true; }, delay() { delay = true; }, async close() { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); } };
}
