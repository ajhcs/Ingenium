import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInspectionPlan } from '../src/project/index.mjs';
import { expandInspectionPlan } from '../src/project/plan.mjs';

export const simplePlan = (origin = 'http://127.0.0.1:3000') => ({ schema: 'ingenium-inspection-plan/1', origin, routes: [{ id: 'overview', path: '/overview', profiles: ['desktop'], states: [{ id: 'default', steps: [] }], journeys: [] }], profiles: [{ id: 'desktop', viewport: { width: 960, height: 640 } }], budgets: { maxCaptures: 16, deadlineMs: 120000 } });

test('strict nested plan preflight catches late actions, selectors, fields, paths and references', () => {
  assert.deepEqual(validateInspectionPlan(simplePlan()), { valid: true, errors: [] });
  const mutations = [p => p.schema = 'future', p => p.routes[0].states[0].steps = [{ action: { toString: null } }], p => p.profiles[0].exceptions = [{ rule: { toString: null }, target: 'body', reason: 'Synthetic' }], p => p.routes[0].states[0].steps = [{ action: '__proto__' }], p => p.routes[0].states[0].steps = [{ action: 'constructor' }], p => p.origin += '/', p => p.routes[0].path = '//example.test', p => p.routes[0].path = '/%252e/escape', p => p.routes[0].path = '/a/../overview', p => p.routes[0].path = '/bad%zz', p => p.routes[0].profiles.push('desktop'), p => p.routes[0].profiles[0] = 'missing', p => p.profiles[0].viewport.width = 9999, p => p.profiles[0].expectedFonts = [''], p => p.profiles[0].exceptions = [{ rule: 'a', target: 'a', reason: 'a', accepted: true }], p => p.routes[0].states[0].steps = [{ action: 'click' }], p => p.routes[0].states[0].steps = [{ action: 'press', key: 42 }], p => p.routes[0].states[0].steps = [{ action: 'waitFor', selector: '#a', state: 'hidden' }], p => p.routes[0].states[0].steps = [{ action: 'fill', selector: '#a', value: null }], p => p.routes[0].journeys = [{ id: 'late', mode: 'fresh', steps: [{ action: 'hover', selector: '#a' }] }]];
  for (const mutate of mutations) { const p = simplePlan(); mutate(p); const result = validateInspectionPlan(p); assert.equal(result.valid, false, JSON.stringify(p)); assert.ok(result.errors.every(e => e.path && e.code && e.nextStep)); }
  const p = simplePlan(); p.routes[0].states[0].steps = [{ action: 'focus', selector: '#a' }, { action: 'fill', selector: '#a', value: '' }, { action: 'press', key: 'Tab' }, { action: 'expectText', selector: '#b', value: 'Done' }]; assert.equal(validateInspectionPlan(p).valid, true);
  p.routes[0].states[0].steps.push({ action: 'bad' }); assert.match(validateInspectionPlan(p).errors[0].path, /steps\[4\]\.action/);
});

test('connected journeys must be linear acyclic chains with one fresh root', () => {
  const p = simplePlan(), j = p.routes[0].journeys;
  j.push({ id: 'root', mode: 'fresh', steps: [] }, { id: 'second', mode: 'connected', afterJourneyId: 'root', steps: [] }, { id: 'third', mode: 'connected', afterJourneyId: 'second', steps: [] });
  assert.equal(validateInspectionPlan(p).valid, true); assert.deepEqual(expandInspectionPlan(p).chains[0].map(c => c.journey.id), ['root', 'second', 'third']);
  j[2].afterJourneyId = 'root'; assert.match(validateInspectionPlan(p).errors.find(e => /fork/.test(e.message)).path, /journeys\[2\]\.afterJourneyId/);
  j[1].afterJourneyId = 'third'; j[2].afterJourneyId = 'second'; assert.equal(validateInspectionPlan(p).valid, false);
  j.pop(); j[1].afterJourneyId = 'absent'; assert.equal(validateInspectionPlan(p).valid, false);
});

test('expanded capture/setup budgets include every fresh journey and refuse rather than truncate', () => {
  const p = simplePlan(); p.routes[0].states[0].steps = [{ action: 'focus', selector: '#a' }]; p.routes[0].journeys = [{ id: 'a', mode: 'fresh', steps: [] }, { id: 'b', mode: 'fresh', steps: [] }, { id: 'c', mode: 'connected', afterJourneyId: 'b', steps: [{ action: 'click', selector: '#a' }] }];
  assert.equal(expandInspectionPlan(p).actions, 4); assert.equal(expandInspectionPlan(p).cells.length, 4);
  p.budgets.maxCaptures = 3; assert.match(validateInspectionPlan(p).errors[0].message, /4 captures/);
  p.budgets.maxCaptures = 64; p.profiles = Array.from({ length: 4 }, (_, i) => ({ id: 'p' + i, viewport: { width: 320, height: 640 } })); p.routes[0].profiles = p.profiles.map(p => p.id); p.routes[0].states[0].steps = Array.from({ length: 32 }, () => ({ action: 'focus', selector: '#a' })); p.routes[0].journeys = Array.from({ length: 14 }, (_, i) => ({ id: 'j' + i, mode: 'fresh', steps: Array.from({ length: 32 }, () => ({ action: 'click', selector: '#a' })) })); assert.ok(validateInspectionPlan(p).errors.some(e => e.code === 'ACTION_BUDGET'));
});
