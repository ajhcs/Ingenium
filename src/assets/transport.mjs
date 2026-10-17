import { createHash } from 'node:crypto';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export class AssetError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'AssetError'; this.code = code; this.details = details; }
}
export const reject = (code, message, details) => { throw new AssetError(code, message, details); };
export const DEFAULT_LIMITS = Object.freeze({ timeoutMs: 10000, metadataBytes: 262144, assetBytes: 524288, redirects: 2, cacheBytes: 8388608, cacheEntries: 32 });
export function limitsFor(input = {}) {
  const out = { ...DEFAULT_LIMITS };
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(DEFAULT_LIMITS, key) || !Number.isSafeInteger(value) || value < (key === 'redirects' ? 0 : 1) || value > DEFAULT_LIMITS[key]) reject('input', `Invalid limit ${key}; configurable bounds can only be reduced`);
    out[key] = value;
  }
  return Object.freeze(out);
}
// Exact provider hosts and bounded paths only. No caller-controlled alternate base URL.
export function allowedUrl(input) {
  if (typeof input !== 'string' || input.length > 4096 || /[\u0000-\u0020\u007f\\]/.test(input) || input.split('?')[0].includes('%') || /\/(?:\.|\.\.)(?:\/|$)/.test(input)) reject('unsafe-url', 'Unsupported URL text or traversal');
  let url;
  try { url = new URL(input); } catch { reject('unsafe-url', 'Expected an absolute provider HTTPS URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || /%|\\/.test(url.pathname)) reject('unsafe-url', 'Unsupported URL protocol, authority, encoding or fragment');
  const id = '[a-z0-9]+(?:-[a-z0-9]+)*';
  const valid = (url.hostname === 'api.iconify.design' && (['/search', '/collection'].includes(url.pathname) || new RegExp(`^/${id}/${id}\\.svg$`).test(url.pathname))) ||
    (url.hostname === 'api.fontsource.org' && new RegExp(`^/v1/fonts(?:/${id})?$`).test(url.pathname)) ||
    (url.hostname === 'cdn.jsdelivr.net' && new RegExp(`^/fontsource/fonts/${id}@[a-zA-Z0-9.\\-]+/${id}\\.woff2$`).test(url.pathname));
  if (!valid) reject('unsafe-url', 'URL is outside the supported provider paths');
  if (url.hostname === 'cdn.jsdelivr.net' && url.search) reject('unsafe-url', 'Font file query strings are unsupported');
  return url.href;
}
export function createRequester({ transport, allowNetwork = false, limits }) {
  if (typeof allowNetwork !== 'boolean' || (transport !== undefined && typeof transport !== 'function')) reject('input', 'Invalid network/transport selection');
  const mode = transport ? 'injected-fixture' : allowNetwork ? 'network' : 'disabled';
  const send = transport ?? (allowNetwork ? globalThis.fetch : undefined);
  return { mode, async read(input, maxBytes, media) {
    if (!send) reject('not-run', 'Network disabled; explicitly enable only when authorized, or inject an owned offline fixture transport');
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, fail) => { timer = setTimeout(() => { controller.abort(); fail(new AssetError('timeout', 'Asset request timed out')); }, limits.timeoutMs); });
    const run = async () => {
      let url = allowedUrl(input);
      const chain = [];
      for (let hop = 0; ; hop++) {
        const response = await send(url, { redirect: 'manual', signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers: { accept: media } });
        // A custom transport is trusted code, but its response cannot bypass redirect checks.
        if (response.redirected || (response.url && response.url !== url)) reject('unsafe-redirect', 'Transport followed an unvalidated redirect');
        chain.push({ url, status: response.status });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          await response.body?.cancel();
          if (hop >= limits.redirects) reject('redirect-limit', 'Too many asset redirects', { chain });
          const location = response.headers.get('location');
          if (!location) reject('unsafe-redirect', 'Redirect omitted location');
          if (/[\u0000-\u0020\u007f\\]/.test(location) || location.split('?')[0].includes('%') || /(?:^|\/)(?:\.|\.\.)(?:\/|$)/.test(location)) reject('unsafe-redirect', 'Unsupported raw redirect traversal/encoding');
          const next = allowedUrl(new URL(location, url).href);
          if (new URL(next).origin !== new URL(url).origin) reject('unsafe-redirect', 'Cross-origin redirects are unsupported', { chain });
          url = next;
          continue;
        }
        if (!response.ok) { await response.body?.cancel(); reject('http', `Provider returned HTTP ${response.status}; no automatic retry`, { status: response.status, retryAfter: response.headers.get('retry-after'), chain }); }
        const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        if (!media.split(',').includes(type)) { await response.body?.cancel(); reject('media', `Unexpected response type ${type || '(missing)'}`); }
        const declared = response.headers.get('content-length');
        if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) { await response.body?.cancel(); reject('oversize', 'Response content-length exceeds the byte bound'); }
        if (!response.body) reject('response', 'Response body unavailable');
        const reader = response.body.getReader(), chunks = [];
        let size = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maxBytes) reject('oversize', 'Stream exceeds the byte bound');
            chunks.push(Buffer.from(value));
          }
        } finally { await reader.cancel().catch(() => {}); }
        const bytes = Buffer.concat(chunks);
        return { bytes, source: { url: input, finalUrl: url, chain, sha256: sha256(bytes), byteSize: bytes.length, contentType: type, acquisitionMode: mode } };
      }
    };
    try { return await Promise.race([run(), deadline]); }
    finally { clearTimeout(timer); controller.abort(); }
  } };
}
