import test from 'node:test';
import assert from 'node:assert/strict';
import { STATUSES, hashIdentity, fingerprintIssue, createIssue, createReport, diffReports, relativeLuminance, contrastRatio, checkTextContrast } from '../src/checks/index.mjs';

const scope = { profile: 'desktop', state: 'default' };
const issue = (overrides = {}) => ({ rule: 'layout-overflow', target: '#card', scope, status: 'fail', assessment: 'exact', measurement: { excess: 3 }, ...overrides });
const contrast = (overrides = {}) => checkTextContrast({ foreground: '#000', background: '#fff', target: '#body', scope, fontSizePx: 16, fontWeight: 400, ...overrides });
const grayForBlackRatio = ratio => {
  const linear = (ratio - 1) * 0.05;
  const channel = 255 * (linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055);
  return [channel, channel, channel];
};

test('opaque sRGB uses exact formula, symmetry and no threshold rounding', () => {
  assert.equal(relativeLuminance('#000'), 0);
  assert.equal(relativeLuminance('#fff'), 1);
  assert.equal(contrastRatio('#000', '#fff'), 21);
  assert.equal(contrastRatio('#123456', '#fff'), contrastRatio('#fff', '#123456'));
  const below = contrast({ background: grayForBlackRatio(4.4999999) });
  assert.equal(below.status, 'fail');
  assert.equal(below.measurement.ratio.toFixed(1), '4.5');
  assert.ok(below.residual < 0);
  // Construct a real solid pair whose IEEE-754 result equals the threshold.
  const exact = contrast({ background: [116.10931399248771, 116.1093139924879, 116.10931399248771] });
  assert.equal(exact.measurement.ratio, 4.5);
  assert.equal(exact.status, 'pass');
  assert.equal(exact.residual, 0);
  assert.equal(contrast({ background: grayForBlackRatio(4.5000001) }).status, 'pass');
});

test('large text threshold is authored final CSS-pixel size and weight', () => {
  const gray = grayForBlackRatio(3.1);
  assert.equal(contrast({ background: gray, fontSizePx: 24 }).status, 'pass');
  assert.equal(contrast({ background: gray, fontSizePx: 23.999 }).status, 'fail');
  assert.equal(contrast({ background: gray, fontSizePx: 14 * 96 / 72, fontWeight: 700 }).status, 'pass');
  assert.equal(contrast({ background: gray, fontSizePx: 14 * 96 / 72, fontWeight: 699 }).status, 'fail');
  assert.equal(contrast({ fontSizePx: undefined }).status, 'error');
  assert.equal(contrast({ fontWeight: 'bold' }).status, 'error');
});

test('uncertain colors never silently pass and invalid known channels report error', () => {
  for (const composition of ['gradient', 'image', 'composite', 'unknown']) assert.equal(contrast({ composition }).status, 'review-needed');
  for (const foreground of ['rgba(0,0,0,.4)', 'transparent', 'var(--ink)', 'linear-gradient(black,white)']) assert.equal(contrast({ foreground }).status, 'review-needed');
  for (const foreground of [[NaN, 0, 0], [-1, 0, 0], [0, 0], null]) assert.equal(contrast({ foreground }).status, 'error');
  assert.throws(() => contrastRatio('#ffgg00', '#fff'), /opaque sRGB/);
});

test('criterion exceptions require explicit rationale and exact scope', () => {
  const exception = { kind: 'decoration', reason: 'Authored noninformative flourish', scope };
  const result = contrast({ foreground: '#fff', exception });
  assert.equal(result.status, 'not-applicable');
  assert.deepEqual(result.exception, exception);
  assert.equal(contrast({ exception: { ...exception, scope: { profile: 'mobile', state: 'default' } } }).status, 'error');
  assert.equal(contrast({ exception: { ...exception, reason: '' } }).status, 'error');
  assert.equal(contrast({ exception: { ...exception, kind: 'brand-colors' } }).status, 'error');
});

test('fingerprints preserve authored identity, omit measurement/prose/revision, distinguish state/profile', () => {
  const before = issue();
  assert.equal(fingerprintIssue(before), fingerprintIssue({ ...before, measurement: { excess: 10 }, message: 'Changed', revision: 2 }));
  assert.notEqual(fingerprintIssue(before), fingerprintIssue({ ...before, scope: { profile: 'mobile', state: 'default' } }));
  assert.notEqual(fingerprintIssue(before), fingerprintIssue({ ...before, scope: { profile: 'desktop', state: 'dialog' } }));
  assert.equal(hashIdentity({ b: 2, a: 1 }), hashIdentity({ a: 1, b: 2 }));
  assert.notEqual(hashIdentity('source A'), hashIdentity('source B'));
});

test('reports retain evidence identities, stable ordering, all statuses and accepted exceptions without changing failure', () => {
  const inputs = STATUSES.map((status, i) => issue({ target: `#${i}`, status }));
  const exception = { id: 'optical-01', rule: inputs[1].rule, target: inputs[1].target, scope, reason: 'Retained author choice' };
  const report = createReport({ issues: inputs, sources: { svg: 'source bytes' }, environment: { browser: 'test-version' }, scope, exceptions: [exception] });
  assert.deepEqual(report.issues, createReport({ issues: [...inputs].reverse(), exceptions: [exception] }).issues);
  assert.deepEqual(Object.values(report.counts), STATUSES.map(() => 1));
  const failed = report.issues.find(i => i.status === 'fail');
  assert.equal(failed.acceptedException, 'optical-01');
  assert.equal(report.sourceHash, hashIdentity({ svg: 'source bytes' }));
  assert.equal(report.environmentHash, hashIdentity({ browser: 'test-version' }));
  assert.notEqual(report.environmentHash, createReport({ environment: { browser: 'other' } }).environmentHash);
  inputs[0].scope.profile = 'mutated';
  assert.equal(report.scope.profile, 'desktop');
  scope.profile = 'desktop';
});

test('exception approval does not leak across profiles', () => {
  const report = createReport({ issues: [issue()], exceptions: [{ id: 'mobile-only', rule: 'layout-overflow', target: '#card', scope: { profile: 'mobile' }, reason: 'Intentional in mobile illustration' }] });
  assert.equal(report.issues[0].acceptedException, undefined);
});

test('deltas expose status/measurement changes, introduced/resolved issues, hide prose churn', () => {
  const previous = createReport({ issues: [issue(), issue({ target: '#removed' }), issue({ target: '#stable', message: 'old' })] });
  const next = createReport({ issues: [issue({ status: 'pass', measurement: { excess: 0 } }), issue({ target: '#new', status: 'review-needed' }), issue({ target: '#stable', message: 'new', revision: 7 })] });
  const delta = diffReports(previous, next);
  assert.equal(delta.introduced[0].target, '#new');
  assert.equal(delta.resolved[0].target, '#removed');
  assert.deepEqual(delta.changed[0].changedFields, ['status', 'measurement']);
  assert.equal(delta.changed[0].before.status, 'fail');
  assert.equal(delta.changed[0].after.status, 'pass');
  assert.equal(delta.unchanged.length, 1);
  assert.deepEqual(diffReports(next, next), { introduced: [], resolved: [], changed: [], unchanged: next.issues.map(i => i.fingerprint).sort(), contextChanged: { sources: false, environment: false, scope: false, exceptions: false } });
});

test('invalid evidence, issues and duplicate identities fail explicitly', () => {
  for (const value of [undefined, NaN, Infinity, new Date(), { x: undefined }]) assert.throws(() => hashIdentity(value), /finite JSON/);
  assert.throws(() => createIssue(issue({ status: 'skip' })), /status/);
  assert.throws(() => createIssue(issue({ assessment: 'certified' })), /assessment/);
  assert.throws(() => createIssue(issue({ target: '' })), /target/);
  assert.throws(() => createIssue(issue({ scope: [] })), /Scope/);
  assert.throws(() => createReport({ issues: [issue(), issue()] }), /Duplicate/);
  assert.throws(() => createReport({ exceptions: [{ id: 'x', rule: 'a', target: 'b', reason: '' }] }), /reason/);
});


test('report deltas expose changed evidence context even when issue measurements are unchanged', () => {
  const before = createReport({ issues: [issue()], sources: { content: 'one' }, environment: { engine: 'one' } });
  const after = createReport({ issues: [issue()], sources: { content: 'two' }, environment: { engine: 'two' } });
  const delta = diffReports(before, after);
  assert.deepEqual(delta.contextChanged, { sources: true, environment: true, scope: false, exceptions: false });
  assert.equal(delta.unchanged.length, 1);
  const forged = createReport({ issues: [issue({ acceptedException: 'unscoped-approval' })] });
  assert.equal(forged.issues[0].acceptedException, undefined);
  assert.throws(() => hashIdentity(Array(2)), /dense JSON/);
});


test('accessors are rejected without invocation and snapshots retain consistent identity', () => {
  let reads = 0;
  const scope = { get profile() { reads++; return 'p' + reads; } };
  for (const call of [() => hashIdentity(scope), () => createIssue(issue({ scope })), () => fingerprintIssue(issue({ scope })), () => createReport({ environment: scope })]) assert.throws(call, /accessors/);
  assert.equal(reads, 0);
  assert.throws(() => checkTextContrast({ get foreground() { reads++; return '#000'; } }), /accessors/);
  assert.equal(reads, 0);
  const result = createIssue(issue());
  assert.equal(result.fingerprint, hashIdentity({ rule: result.rule, target: result.target, scope: result.scope }));
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => hashIdentity(cycle), /Cyclic evidence/);
  const shared = { profile: 'same' };
  assert.doesNotThrow(() => hashIdentity({ a: shared, b: shared }));
});

test('arrays reject holes disguised by extra keys, accessors and non-JSON properties', () => {
  const disguised = [, 0, 0]; disguised.extra = 0;
  assert.throws(() => hashIdentity(disguised), /dense JSON/);
  const nonenumerable = {}; Object.defineProperty(nonenumerable, 'hidden', { value: 1 });
  assert.throws(() => hashIdentity(nonenumerable), /enumerable data/);
  assert.throws(() => hashIdentity({ [Symbol('hidden')]: 1 }), /Symbol/);
  assert.throws(() => relativeLuminance(Array(3)), /dense JSON/);
  assert.throws(() => contrastRatio(Array(3), '#fff'), /dense JSON/);
  assert.equal(contrast({ foreground: Array(3) }).status, 'error');
  let reads = 0; const channels = [0,0,0]; Object.defineProperty(channels, '0', { get() { reads++; return 0; }, enumerable:true });
  assert.throws(() => contrastRatio(channels, '#fff'), /accessors/);
  assert.equal(reads, 0);
});

test('exception conditions changing retain compact delta visibility', () => {
  const exception = { id: 'approved', rule: 'layout-overflow', target: '#card', scope, reason: 'Original condition' };
  const before = createReport({ issues: [issue()], exceptions: [exception] });
  const after = createReport({ issues: [issue()], exceptions: [{ ...exception, reason: 'Changed condition' }] });
  const delta = diffReports(before, after);
  assert.equal(delta.contextChanged.exceptions, true);
  assert.equal(delta.unchanged.length, 1);
});
