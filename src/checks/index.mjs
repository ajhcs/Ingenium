import { createHash } from 'node:crypto';

export const STATUSES = Object.freeze(['pass', 'fail', 'review-needed', 'not-run', 'error', 'not-applicable']);

// Canonical JSON identities deliberately exclude object insertion order. Reject values
// JSON would silently discard or coerce so evidence hashes do not hide missing data.
function canonical(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== 'object' || value === null) throw new TypeError('Evidence must contain only finite JSON values');
  if (ancestors.has(value)) throw new TypeError('Cyclic evidence is unsupported');
  const array = Array.isArray(value);
  if (!array && Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError('Evidence must contain only finite JSON values');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some(key => typeof key !== 'string')) throw new TypeError('Symbol evidence properties are unsupported');
  const dataKeys = keys.filter(key => !(array && key === 'length'));
  for (const key of dataKeys) {
    if (!Object.hasOwn(descriptors[key], 'value') || !descriptors[key].enumerable) throw new TypeError('Evidence properties must be enumerable data properties; accessors are unsupported');
  }
  if (array && (dataKeys.length !== value.length || Array.from({ length: value.length }, (_, i) => String(i)).some(key => !Object.hasOwn(descriptors, key)))) throw new TypeError('Evidence arrays must be dense JSON arrays without extra keys');
  ancestors.add(value);
  try {
    if (array) return `[${dataKeys.sort((a, b) => Number(a) - Number(b)).map(key => canonical(descriptors[key].value, ancestors)).join(',')}]`;
    return `{${dataKeys.sort().map(key => `${JSON.stringify(key)}:${canonical(descriptors[key].value, ancestors)}`).join(',')}}`;
  } finally { ancestors.delete(value); }
}
const snapshot = value => JSON.parse(canonical(value));
export function hashIdentity(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
function identity(input) {
  if (!input || typeof input.rule !== 'string' || !input.rule.trim() || typeof input.target !== 'string' || !input.target.trim()) {
    throw new TypeError('Issue requires nonempty rule and stable target strings');
  }
  const scope = input.scope ?? {};
  if (!scope || Array.isArray(scope) || typeof scope !== 'object') throw new TypeError('Scope must be a JSON object');
  canonical(scope);
  return { rule: input.rule, target: input.target, scope };
}
export function fingerprintIssue(input) { return hashIdentity(identity(snapshot(input))); }
export function createIssue(input) {
  input = snapshot(input);
  identity(input);
  if (!STATUSES.includes(input.status)) throw new TypeError('Unknown issue status');
  if (input.assessment !== undefined && !['exact', 'heuristic', 'visual-judgment'].includes(input.assessment)) throw new TypeError('Unknown assessment kind');
  canonical(input);
  return structuredClone({ ...input, scope: input.scope ?? {}, fingerprint: fingerprintIssue(input) });
}

// rgb values are sRGB channels on a 0..255 scale, including continuous values.
// Alpha, gradients, images and unknown CSS color syntax need a compositing review.
function rgb(color) {
  if (typeof color === 'string' && /^#[0-9a-f]{3}$/i.test(color)) color = `#${[...color.slice(1)].map(c => c + c).join('')}`;
  if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) color = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  if (Array.isArray(color)) color = snapshot(color);
  if (!Array.isArray(color) || color.length !== 3 || color.some(v => !Number.isFinite(v) || v < 0 || v > 255)) throw new TypeError('Expected opaque sRGB #RGB/#RRGGBB or three channels in 0..255');
  return color;
}
export function relativeLuminance(color) {
  const linear = rgb(color).map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground), b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const contrastExceptions = new Set(['inactive', 'decoration', 'incidental-picture', 'logotype']);
export function checkTextContrast(input) {
  if (!input || Object.values(Object.getOwnPropertyDescriptors(input)).some(descriptor => !Object.hasOwn(descriptor, 'value'))) throw new TypeError('Contrast input accessors are unsupported');
  const { foreground, background, fontSizePx, fontWeight, target, scope = {}, composition = 'solid', exception } = input;
  const base = { rule: 'text-contrast-aa', target, scope, assessment: 'exact' };
  const result = (status, details) => createIssue({ ...base, status, ...details });
  if (exception !== undefined) {
    canonical(exception);
    if (!exception || !contrastExceptions.has(exception.kind) || typeof exception.reason !== 'string' || !exception.reason.trim() || hashIdentity(exception.scope ?? null) !== hashIdentity(scope)) {
      return result('error', { message: 'Contrast exception needs a recognized kind, reason and exact authored scope' });
    }
    return result('not-applicable', { exception, message: 'Authored criterion exception; applicability requires human verification' });
  }
  if (composition !== 'solid') return result('review-needed', { assessment: 'heuristic', message: 'Composite, gradient, image or unknown background needs effective-color evidence', composition });
  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0 || !Number.isFinite(fontWeight) || fontWeight < 1 || fontWeight > 1000) {
    return result('error', { message: 'Authored final CSS-pixel fontSizePx and numeric fontWeight are required' });
  }
  try {
    const ratio = contrastRatio(foreground, background);
    const largeText = fontSizePx >= 24 || (fontSizePx >= 14 * 96 / 72 && fontWeight >= 700);
    const threshold = largeText ? 3 : 4.5;
    return result(ratio >= threshold ? 'pass' : 'fail', {
      measurement: { ratio, threshold, fontSizePx, fontWeight, largeText, foreground, background },
      residual: ratio - threshold,
      message: 'Unrounded opaque solid-pair comparison only; not accessibility certification',
    });
  } catch (error) {
    // Unsupported color syntax is uncertainty; malformed numeric channels are errors.
    const unsupported = [foreground, background].some(c => typeof c === 'string' && !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(c));
    return result(unsupported ? 'review-needed' : 'error', { message: error.message });
  }
}

export function createReport(options = {}) {
  const { issues = [], sources = {}, environment = {}, scope = {}, exceptions = [] } = snapshot(options);
  canonical({ sources, environment, scope, exceptions });
  const sorted = issues.map(input => {
    const { acceptedException: ignored, ...raw } = input;
    return createIssue(raw);
  }).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  if (new Set(sorted.map(i => i.fingerprint)).size !== sorted.length) throw new TypeError('Duplicate issue identity: use a distinct target or authored scope');
  const accepted = exceptions.map(exception => {
    if (!exception || typeof exception.reason !== 'string' || !exception.reason.trim() || typeof exception.id !== 'string' || !exception.id.trim()) throw new TypeError('Accepted exception requires id and reason');
    return { ...structuredClone(exception), fingerprint: fingerprintIssue(exception) };
  });
  if (new Set(accepted.map(e => e.fingerprint)).size !== accepted.length) throw new TypeError('Duplicate exception scope');
  const scopedIssues = sorted.map(issue => {
    const exception = accepted.find(e => e.fingerprint === issue.fingerprint);
    return exception ? { ...issue, acceptedException: exception.id } : issue;
  });
  return {
    version: 1, scope: structuredClone(scope),
    sources: structuredClone(sources), sourceHash: hashIdentity(sources),
    environment: structuredClone(environment), environmentHash: hashIdentity(environment),
    exceptions: accepted, issues: scopedIssues,
    counts: Object.fromEntries(STATUSES.map(status => [status, scopedIssues.filter(i => i.status === status).length])),
  };
}
export function diffReports(previous, next) {
  previous = snapshot(previous);
  next = snapshot(next);
  const before = new Map(previous.issues.map(issue => [fingerprintIssue(issue), issue]));
  const after = new Map(next.issues.map(issue => [fingerprintIssue(issue), issue]));
  if (before.size !== previous.issues.length || after.size !== next.issues.length) throw new TypeError('Duplicate issue identity in report');
  const introduced = [], resolved = [], changed = [], unchanged = [];
  for (const [id, issue] of after) {
    if (!before.has(id)) introduced.push(structuredClone(issue));
    else {
      const old = before.get(id);
      const fields = ['status', 'measurement', 'residual', 'acceptedException', 'assessment'];
      const changedFields = fields.filter(field => canonical(old[field] ?? null) !== canonical(issue[field] ?? null));
      if (changedFields.length) changed.push({ fingerprint: id, changedFields, before: structuredClone(old), after: structuredClone(issue) });
      else unchanged.push(id);
    }
  }
  for (const [id, issue] of before) if (!after.has(id)) resolved.push(structuredClone(issue));
  const sort = values => values.sort((a, b) => (a.fingerprint ?? a).localeCompare(b.fingerprint ?? b));
  return {
    introduced: sort(introduced), resolved: sort(resolved), changed: sort(changed), unchanged: sort(unchanged),
    contextChanged: {
      sources: hashIdentity(previous.sources ?? {}) !== hashIdentity(next.sources ?? {}),
      environment: hashIdentity(previous.environment ?? {}) !== hashIdentity(next.environment ?? {}),
      scope: hashIdentity(previous.scope ?? {}) !== hashIdentity(next.scope ?? {}),
      exceptions: hashIdentity(previous.exceptions ?? []) !== hashIdentity(next.exceptions ?? []),
    },
  };
}
