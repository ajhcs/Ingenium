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
const diagnosticEndpoint = input => {
  try {
    const u = new URL(allowedUrl(input));
    if (u.hostname === 'api.iconify.design') return u.pathname === '/search' ? 'iconify.search' : u.pathname === '/collection' ? 'iconify.collection' : 'iconify.svg';
    return u.hostname === 'api.fontsource.org' ? u.pathname === '/v1/fonts' ? 'fontsource.search' : 'fontsource.details' : 'fontsource.file';
  } catch { return 'unclassified'; }
};
export function createRequester({ transport, allowNetwork = false, captureDiagnostics = false, limits }) {
  if (typeof allowNetwork !== 'boolean' || typeof captureDiagnostics !== 'boolean' || (transport !== undefined && typeof transport !== 'function')) reject('input', 'Invalid network/transport/diagnostic selection');
  const mode = transport ? 'injected-fixture' : allowNetwork ? 'network' : 'disabled';
  const send = transport ?? (allowNetwork ? globalThis.fetch : undefined);
  const records = [];
  return { mode, diagnostics: () => structuredClone(records), async read(input, maxBytes, media) {
    const start = Date.now();
    const record = captureDiagnostics ? { version: 1, startedAt: new Date(start).toISOString(), transport: mode, method: 'GET', endpoint: diagnosticEndpoint(input), stage: 'validation', responses: [], outcome: 'error', issuingLayer: 'unknown' } : undefined;
    const stage = value => { if (record) record.stage = value; };
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, fail) => { timer = setTimeout(() => { controller.abort(); fail(new AssetError('timeout', 'Asset request timed out')); }, limits.timeoutMs); });
    const run = async () => {
      if (!send) reject('not-run', 'Network disabled; explicitly enable only when authorized, or inject an owned offline fixture transport');
      let url = allowedUrl(input);
      const chain = [];
      for (let hop = 0; ; hop++) {
        stage('request');
        const response = await send(url, { redirect: 'manual', signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers: { accept: media } });
        stage('response-headers');
        if (record) {
          const rawType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
          const type = ['application/json', 'image/svg+xml', 'font/woff2', 'application/octet-stream'].includes(rawType) ? rawType : rawType ? 'other' : 'missing';
          const signals = Object.fromEntries(['server', 'via', 'proxy-authenticate', 'x-request-id', 'cf-ray', 'x-cache'].map(name => [name, response.headers.has(name)]));
          const status = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : null;
          const observation = { hop, endpoint: diagnosticEndpoint(url), status, media: type, headerPresence: signals, redirect: [301, 302, 303, 307, 308].includes(status) ? 'observed-not-followed' : 'none' };
          if (record.responses.length < 3) record.responses.push(observation);
        }
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
          if (record) record.responses.at(-1).redirect = 'followed-after-validation';
          url = next;
          continue;
        }
        if (!response.ok) { await response.body?.cancel(); reject('http', `Received HTTP ${response.status}; issuing layer unknown; no automatic retry`, { status: response.status, retryAfter: response.headers.get('retry-after'), chain }); }
        const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        if (!media.split(',').includes(type)) { await response.body?.cancel(); reject('media', `Unexpected response type ${type || '(missing)'}`); }
        const declared = response.headers.get('content-length');
        if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) { await response.body?.cancel(); reject('oversize', 'Response content-length exceeds the byte bound'); }
        if (!response.body) reject('response', 'Response body unavailable');
        const reader = response.body.getReader(), chunks = [];
        stage('response-body');
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
    try {
      const result = await Promise.race([run(), deadline]);
      if (record) { record.outcome = 'pass'; record.stage = 'complete'; }
      return result;
    } catch (error) {
      if (record) record.outcome = error instanceof AssetError && ['not-run', 'timeout', 'http', 'unsafe-url', 'unsafe-redirect', 'redirect-limit', 'media', 'oversize', 'response'].includes(error.code) ? error.code : 'transport-error';
      throw error;
    } finally {
      clearTimeout(timer); controller.abort();
      if (record) {
        record.elapsedMs = Math.max(0, Date.now() - start);
        // Fingerprints cover redacted structure only, never raw URLs, headers or bodies.
        for (const response of record.responses) { delete response.fingerprint; response.fingerprint = sha256(JSON.stringify(response)); }
        records.push(structuredClone(record)); if (records.length > 8) records.shift();
      }
    }
  } };
}
