import { constants } from 'node:fs';
import { mkdir, realpath, lstat, readdir, open, unlink } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { reject, sha256, allowedUrl } from './transport.mjs';

async function readRegular(path, max) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { const stat = await file.stat(); if (!stat.isFile() || stat.size > max || stat.nlink !== 1) reject('cache', 'Cache file is not an owned bounded regular file'); const bytes = await file.readFile(); if (bytes.length > max) reject('cache', 'Cache read exceeds bound'); return bytes; }
  finally { await file.close(); }
}
/** Optional exclusive flat cache. Full/corrupt/unknown contents fail closed; no eviction. */
export function createCache(directory, limits) {
  if (directory === undefined) return { async get() {}, async put() {} };
  if (typeof directory !== 'string' || !directory.trim()) reject('input', 'cacheDir must be an owned directory');
  const root = resolve(directory);
  async function locked(action) {
    if (await realpath(dirname(root)) !== dirname(root)) reject('cache', 'Cache parent must exist without symlink ancestors');
    try { await mkdir(root); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    if (await realpath(root) !== root || !(await lstat(root)).isDirectory()) reject('cache', 'Cache path/ancestors must not be symlinks');
    let lock;
    try { lock = await open(join(root, '.lock'), 'wx', 0o600); }
    catch { reject('cache-busy', 'Cache lock unavailable; use one owner and no competing writers'); }
    try {
      let size = 0, entries = 0;
      for (const name of await readdir(root)) {
        if (name === '.lock') continue;
        if (!/^[a-f0-9]{64}\.(?:bin|json)$/.test(name)) reject('cache', 'Unexpected cache content; use a dedicated directory');
        const stat = await lstat(join(root, name));
        if (!stat.isFile() || stat.nlink !== 1) reject('cache', 'Unsafe cache entry');
        size += stat.size;
        if (name.endsWith('.json')) entries++;
      }
      if (size > limits.cacheBytes || entries > limits.cacheEntries) reject('cache-full', 'Cache exceeds configured bounds');
      return await action({ size, entries });
    } finally { await lock.close(); await unlink(join(root, '.lock')); }
  }
  async function existing(url, maxBytes) {
    const key = sha256(url), metadata = join(root, `${key}.json`), binary = join(root, `${key}.bin`);
    let record, bytes;
    try {
      record = JSON.parse((await readRegular(metadata, 16384)).toString('utf8'));
      bytes = await readRegular(binary, maxBytes);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const present = await readdir(root);
        if (!present.includes(`${key}.json`) && !present.includes(`${key}.bin`)) return;
      }
      reject('cache-corrupt', `Cache entry unreadable: ${error.message}`);
    }
    const s = record.source;
    if (record.version !== 1 || s?.url !== url || !['network', 'injected-fixture'].includes(s.acquisitionMode) || allowedUrl(s.finalUrl) !== s.finalUrl || !Array.isArray(s.chain) || s.chain.length > limits.redirects + 1 || s.chain[0]?.url !== url || s.chain.at(-1)?.url !== s.finalUrl || s.chain.at(-1)?.status !== 200 || s.sha256 !== sha256(bytes) || s.byteSize !== bytes.length) reject('cache-corrupt', 'Cache identity/size/hash does not match');
    for (const hop of s.chain) { allowedUrl(hop.url); if (new URL(hop.url).origin !== new URL(url).origin) reject('cache-corrupt', 'Invalid cached redirect chain'); }
    return { bytes, source: s, cached: true };
  }
  return {
    get(url, maxBytes) { return locked(() => existing(url, maxBytes)); },
    put(url, data, maxBytes) { return locked(async ({ size, entries }) => {
      const found = await existing(url, maxBytes);
      if (found) { if (found.source.sha256 !== data.source.sha256) reject('cache', 'Concurrent cache identity conflict'); return; }
      const metadata = Buffer.from(JSON.stringify({ version: 1, source: data.source }));
      if (metadata.length > 16384 || entries >= limits.cacheEntries || size + data.bytes.length + metadata.length > limits.cacheBytes) reject('cache-full', 'Cache capacity reached; select a new dedicated bounded cache or explicitly manage owned entries');
      const created = [];
      try {
        for (const [suffix, bytes] of [['bin', data.bytes], ['json', metadata]]) {
          const path = join(root, `${sha256(url)}.${suffix}`), file = await open(path, 'wx', 0o600); created.push(path);
          try { await file.writeFile(bytes); } finally { await file.close(); }
        }
      } catch (error) { for (const path of created) await unlink(path); throw error; }
    }); }
  };
}
