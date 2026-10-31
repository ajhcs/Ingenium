/** Explicit local project boundary; do not broaden this into a remote URL scanner. */
export function localProjectUrl(value, origin) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('An explicit loopback HTTP URL is required');
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password) {
    throw new TypeError('Use an HTTP loopback URL without credentials (localhost, 127.0.0.1 or [::1])');
  }
  if (origin && url.origin !== origin) throw new TypeError('Project navigation must stay on the selected origin');
  return url;
}

export function isProjectRequest(value, origin, websocket = false) {
  try {
    const url = new URL(value);
    if (websocket && url.protocol === 'ws:') url.protocol = 'http:';
    return localProjectUrl(url.href, origin).origin === origin;
  } catch { return false; }
}
