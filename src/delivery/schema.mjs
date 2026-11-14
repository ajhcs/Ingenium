const ID = /^[A-Za-z][A-Za-z0-9._:-]*$/;
const HASH = /^[a-f0-9]{64}$/;
const roles = ['source', 'export', 'preview', 'notice', 'instructions'];
const editable = ['live-text', 'outlined-lettering', 'vector-geometry', 'linked-image', 'raster-layer', 'code', 'structured-data'];
const statuses = ['pass', 'fail', 'review-needed', 'not-run', 'error', 'not-applicable'];

export function safeDeliveryPath(value) {
  return typeof value === 'string' && value.length <= 1024 && value.length > 0 &&
    !/[\\\x00-\x1f\x7f:%?#]/.test(value) && !value.startsWith('/') &&
    value.split('/').every(part => part && part !== '.' && part !== '..');
}

// Pure JSON admission precedes property reads, including protection against getters.
export function deliveryJsonErrors(value) {
  const errors = [], ancestors = new Set(); let nodes = 0;
  const walk = (item, path, depth) => {
    if (++nodes > 30000 || depth > 10) throw new Error('JSON exceeds depth/node bounds');
    if (item === null || ['string', 'boolean'].includes(typeof item) || (typeof item === 'number' && Number.isFinite(item))) return;
    if (!item || typeof item !== 'object' || ancestors.has(item)) throw new Error('Expected finite acyclic plain JSON data');
    if (!Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item))) throw new Error('Expected plain JSON object');
    ancestors.add(item);
    const keys = Reflect.ownKeys(item).filter(key => !(Array.isArray(item) && key === 'length'));
    if (Array.isArray(item) && (keys.length !== item.length || keys.some((key, i) => key !== String(i)))) throw new Error('Expected dense JSON array');
    for (const key of keys) {
      const d = Object.getOwnPropertyDescriptor(item, key);
      if (typeof key !== 'string' || !d.enumerable || !Object.hasOwn(d, 'value')) throw new Error('Expected enumerable JSON data properties');
      walk(d.value, `${path}.${key}`, depth + 1);
    }
    ancestors.delete(item);
  };
  try { walk(value, '$', 0); if (new TextEncoder().encode(JSON.stringify(value)).length > 1048576) throw new Error('Manifest exceeds 1 MiB'); }
  catch (error) { errors.push({ code: 'INVALID_JSON', path: '$', message: error.message, nextStep: 'Supply bounded plain JSON data.' }); }
  return errors;
}

export function validateDelivery(delivery) {
  const errors = deliveryJsonErrors(delivery);
  if (errors.length) return { valid: false, errors };
  const add = (path, message, code = 'INVALID_DELIVERY') => errors.push({ code, path, message, nextStep: 'Correct the named delivery field and validate again.' });
  const object = (value, path, required, optional = []) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { add(path, 'Expected object'); return false; }
    for (const key of required) if (!Object.hasOwn(value, key)) add(`${path}.${key}`, 'Required field');
    for (const key of Object.keys(value)) if (![...required, ...optional].includes(key)) add(`${path}.${key}`, 'Unsupported field');
    return true;
  };
  const string = (value, path, max = 8192) => { if (typeof value !== 'string' || !value.trim() || value.length > max) add(path, `Expected nonempty string of at most ${max} characters`); };
  const array = (value, path, callback) => {
    if (!Array.isArray(value) || value.length > 256) { add(path, 'Expected array of at most 256 entries'); return; }
    value.forEach((item, i) => callback(item, `${path}[${i}]`));
  };
  const ids = new Map(), refs = [];
  const id = (value, path, kind) => {
    if (typeof value !== 'string' || value.length > 128 || !ID.test(value)) add(path, 'Expected safe ID of at most 128 characters');
    else if (ids.has(value)) add(path, `Duplicate ID ${value}`);
    else ids.set(value, kind);
  };
  const references = (value, path) => {
    const seen = new Set();
    array(value, path, (ref, p) => { if (typeof ref !== 'string' || !ID.test(ref)) add(p, 'Expected artifact ID'); else { if (seen.has(ref)) add(p, 'Duplicate reference'); seen.add(ref); refs.push([ref, p]); } });
  };
  if (!object(delivery, '$', ['schema', 'projectId', 'versionId', 'openingFile', 'artifacts', 'tools', 'checks', 'limitations'])) return { valid: false, errors };
  if (delivery.schema !== 'ingenium-delivery/1') add('$.schema', 'Supported schema is ingenium-delivery/1', 'UNSUPPORTED_SCHEMA');
  for (const key of ['projectId', 'versionId']) if (typeof delivery[key] !== 'string' || !ID.test(delivery[key]) || delivery[key].length > 128) add(`$.${key}`, 'Expected safe ID');
  if (!safeDeliveryPath(delivery.openingFile)) add('$.openingFile', 'Expected normalized contained relative POSIX path');
  const paths = new Set();
  array(delivery.artifacts, '$.artifacts', (a, p) => {
    if (!object(a, p, ['id', 'path', 'sha256', 'mediaType', 'role', 'dependsOnIds'], ['editableKind', 'editingNote'])) return;
    const artifactPath = typeof a.path === 'string' ? a.path : '';
    id(a.id, `${p}.id`, 'artifact');
    if (!safeDeliveryPath(a.path)) add(`${p}.path`, 'Expected normalized contained relative POSIX path');
    if (paths.has(a.path)) add(`${p}.path`, 'Duplicate artifact path'); paths.add(a.path);
    if (['delivery.json', 'DELIVERY.md', 'INCOMPLETE.json', '.delivery-manifest.pending'].includes(artifactPath.split('/')[0])) add(`${p}.path`, 'Reserved generated output path');
    if (typeof a.sha256 !== 'string' || !HASH.test(a.sha256)) add(`${p}.sha256`, 'Expected lowercase SHA-256');
    string(a.mediaType, `${p}.mediaType`, 128);
    if (!roles.includes(a.role)) add(`${p}.role`, 'Unsupported artifact role');
    if (Object.hasOwn(a, 'editableKind') && !editable.includes(a.editableKind)) add(`${p}.editableKind`, 'Unsupported editableKind');
    if (Object.hasOwn(a, 'editingNote')) string(a.editingNote, `${p}.editingNote`);
    references(a.dependsOnIds, `${p}.dependsOnIds`);
    const ext = artifactPath.split('.').at(-1).toLowerCase();
    const types = { svg: ['image/svg+xml'], png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], webp: ['image/webp'], pdf: ['application/pdf'], html: ['text/html'], css: ['text/css'], json: ['application/json'], js: ['text/javascript', 'application/javascript'], mjs: ['text/javascript', 'application/javascript'], md: ['text/markdown', 'text/plain'], txt: ['text/plain'], woff: ['font/woff'], woff2: ['font/woff2'], ttf: ['font/ttf'], otf: ['font/otf'] };
    if (types[ext] && !types[ext].includes(a.mediaType)) add(`${p}.mediaType`, 'Media type conflicts with extension');
    if (a.role === 'instructions' && !['md', 'txt', 'html'].includes(ext)) add(`${p}.path`, 'Instructions must be Markdown, plain text or HTML');
    if (a.role === 'notice' && !['md', 'txt', 'html', 'license'].includes(ext) && !/(?:^|\/)(?:LICENSE|NOTICE|COPYING)(?:\.[^/]*)?$/i.test(artifactPath)) add(`${p}.path`, 'Notice must retain a readable text file');
  });
  array(delivery.tools, '$.tools', (t, p) => {
    if (!object(t, p, ['id', 'purpose', 'required', 'tested', 'limitations'], ['version'])) return;
    id(t.id, `${p}.id`, 'tool'); string(t.purpose, `${p}.purpose`);
    if (typeof t.required !== 'boolean') add(`${p}.required`, 'Expected boolean');
    if (!['yes', 'no'].includes(t.tested)) add(`${p}.tested`, 'Expected yes or no');
    if (Object.hasOwn(t, 'version')) string(t.version, `${p}.version`);
    array(t.limitations, `${p}.limitations`, string);
  });
  array(delivery.checks, '$.checks', (c, p) => {
    if (!object(c, p, ['id', 'status', 'scope', 'evidenceIds'])) return;
    id(c.id, `${p}.id`, 'check'); string(c.scope, `${p}.scope`);
    if (!statuses.includes(c.status)) add(`${p}.status`, 'Unsupported check status');
    references(c.evidenceIds, `${p}.evidenceIds`);
  });
  array(delivery.limitations, '$.limitations', string);
  for (const [ref, path] of refs) if (ids.get(ref) !== 'artifact') add(path, `Unresolved artifact ID ${ref}`);
  if (Array.isArray(delivery.artifacts)) {
    if (!delivery.artifacts.some(a => a?.role === 'source')) add('$.artifacts', 'At least one editable source is required');
    if (!delivery.artifacts.some(a => a?.role === 'instructions')) add('$.artifacts', 'An instructions/continuation note is required');
    if (!delivery.artifacts.some(a => a?.path === delivery.openingFile && ['source', 'instructions'].includes(a.role))) add('$.openingFile', 'Opening file must be an included source or instructions artifact');
    const byId = new Map(delivery.artifacts.filter(a => a && typeof a === 'object').map(a => [a.id, a]));
    // File references may legitimately cycle (for example website navigation).
    for (const [key, artifact] of byId) {
      if (typeof artifact.path === 'string' && /\.(?:woff2?|ttf|otf)$/i.test(artifact.path) && (!Array.isArray(artifact.dependsOnIds) || !artifact.dependsOnIds.some(ref => byId.get(ref)?.role === 'notice'))) add('$.artifacts', 'Bundled font requires a retained notice dependency');
    }
  }
  return { valid: errors.length === 0, errors };
}
