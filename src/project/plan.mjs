import { hashIdentity } from '../checks/index.mjs';
import { localProjectUrl } from '../browser/local-url.mjs';

const idPattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function normalizedRoute(path, origin) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.length > 8192 || /[\\\u0000-\u0020\u007f]/.test(path)) throw new TypeError('Use a bounded absolute path on the selected origin');
  const pathname = path.split(/[?#]/, 1)[0];
  if (/%(?:2e|2f|5c|00|25)/i.test(pathname) || pathname.split('/').some(part => part === '.' || part === '..')) throw new TypeError('Ambiguous encoding or traversal in route path');
  try { decodeURIComponent(path); } catch { throw new TypeError('Malformed route percent encoding'); }
  const url = localProjectUrl(new URL(path, origin).href, origin);
  if (url.pathname !== pathname) throw new TypeError('Route path must already be canonical');
  return url.href;
}

/** Pure complete preflight. Bounds are implementation limits, not acceptance criteria. */
export function validateInspectionPlan(plan) {
  const errors = [];
  const error = (path, message, code = 'INVALID_INSPECTION_PLAN') => errors.push({ code, path, message, nextStep: 'Correct the named plan field before inspection.' });
  try { hashIdentity(plan); if (Buffer.byteLength(JSON.stringify(plan)) > 1024 * 1024) error('$', 'Plan exceeds 1 MiB'); }
  catch { error('$', 'Plan must contain finite plain JSON only'); return { valid: false, errors }; }
  const exact = (value, fields, path) => {
    if (!object(value)) { error(path, 'Expected an object'); return false; }
    for (const key of Object.keys(value)) if (!fields.includes(key)) error(`${path}.${key}`, 'Unsupported field');
    return true;
  };
  const text = (value, path, max = 8192, empty = false) => { if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > max) error(path, `Expected ${empty ? 'a' : 'a nonempty'} string of at most ${max} characters`); };
  const id = (value, path) => { if (typeof value !== 'string' || !idPattern.test(value)) error(path, 'Expected a stable ID (letter, then letters, digits, underscore or hyphen; at most64 characters)'); };
  const array = (value, path, min, max) => { if (!Array.isArray(value) || value.length < min || value.length > max) { error(path, `Expected ${min}..${max} entries`); return []; } return value; };
  const unique = (items, path, key = 'id') => { const seen = new Set(); items.forEach((item, i) => { const value = key ? item?.[key] : item; if (seen.has(value)) error(`${path}[${i}]${key ? '.' + key : ''}`, 'Duplicate identity'); seen.add(value); }); };
  const steps = (value, path) => array(value, path, 0, 32).forEach((step, i) => {
    const at = `${path}[${i}]`;
    const fields = { click: ['action', 'selector'], focus: ['action', 'selector'], press: ['action', 'selector', 'key'], fill: ['action', 'selector', 'value'], waitFor: ['action', 'selector'], expectFocus: ['action', 'selector'], expectText: ['action', 'selector', 'value'], expectValue: ['action', 'selector', 'value'] }[typeof step?.action === 'string' ? step.action : ''];
    if (!Array.isArray(fields)) { error(at + '.action', `Unsupported action at ordinal ${i + 1}`); return; }
    if (!exact(step, fields, at)) return;
    if (step.action !== 'press' || step.selector !== undefined) text(step.selector, at + '.selector', 512);
    if (step.action === 'press') text(step.key, at + '.key', 128);
    if (fields.includes('value')) text(step.value, at + '.value', 8192, true);
  });
  if (!exact(plan, ['schema', 'origin', 'routes', 'profiles', 'budgets'], '$')) return { valid: false, errors };
  if (plan.schema !== 'ingenium-inspection-plan/1') error('$.schema', 'Unsupported inspection plan schema');
  let origin;
  try { const url = localProjectUrl(plan.origin); if (plan.origin !== url.origin) throw new Error(); origin = url.origin; }
  catch { error('$.origin', 'Expected an exact HTTP loopback origin without path, credentials, query or fragment'); }
  const profiles = array(plan.profiles, '$.profiles', 1, 4); unique(profiles, '$.profiles');
  profiles.forEach((p, i) => {
    const at = `$.profiles[${i}]`;
    if (!exact(p, ['id', 'viewport', 'textSpacing', 'expectedFonts', 'exceptions', 'delivery', 'reducedMotion'], at)) return;
    id(p.id, at + '.id');
    if (exact(p.viewport, ['width', 'height'], at + '.viewport')) for (const dimension of ['width', 'height']) if (!Number.isInteger(p.viewport[dimension]) || p.viewport[dimension] < 1 || p.viewport[dimension] > 4096) error(at + '.viewport.' + dimension, 'Expected an integer in1..4096');
    for (const key of ['textSpacing', 'reducedMotion']) if (p[key] !== undefined && typeof p[key] !== 'boolean') error(at + '.' + key, 'Expected boolean');
    if (p.delivery !== undefined) text(p.delivery, at + '.delivery');
    if (p.expectedFonts !== undefined) { const fonts = array(p.expectedFonts, at + '.expectedFonts', 0, 64); unique(fonts, at + '.expectedFonts', null); fonts.forEach((font, j) => text(font, `${at}.expectedFonts[${j}]`, 512)); }
    if (p.exceptions !== undefined) {
      const exceptions = array(p.exceptions, at + '.exceptions', 0, 64); const seen = new Set();
      exceptions.forEach((e, j) => { const where = `${at}.exceptions[${j}]`; if (!exact(e, ['rule', 'target', 'reason'], where)) return; for (const key of ['rule', 'target', 'reason']) text(e[key], where + '.' + key); if (typeof e.rule === 'string' && typeof e.target === 'string') { const k = `${e.rule}\0${e.target}`; if (seen.has(k)) error(where, 'Duplicate exception rule/target'); seen.add(k); } });
    }
  });
  const routes = array(plan.routes, '$.routes', 1, 8); unique(routes, '$.routes'); const urls = new Set();
  routes.forEach((r, i) => {
    const at = `$.routes[${i}]`; if (!exact(r, ['id', 'path', 'profiles', 'states', 'journeys'], at)) return;
    id(r.id, at + '.id');
    try { const url = normalizedRoute(r.path, origin); if (urls.has(url)) error(at + '.path', 'Duplicate canonical route'); urls.add(url); } catch (e) { error(at + '.path', e.message); }
    const selected = array(r.profiles, at + '.profiles', 1, 4); unique(selected, at + '.profiles', null);
    selected.forEach((p, j) => { id(p, `${at}.profiles[${j}]`); if (!profiles.some(candidate => candidate?.id === p)) error(`${at}.profiles[${j}]`, 'Unknown profile ID'); });
    const states = array(r.states, at + '.states', 1, 4); unique(states, at + '.states');
    states.forEach((s, j) => { const where = `${at}.states[${j}]`; if (!exact(s, ['id', 'steps'], where)) return; id(s.id, where + '.id'); steps(s.steps, where + '.steps'); });
    const journeys = r.journeys === undefined ? [] : array(r.journeys, at + '.journeys', 0, 16); unique(journeys, at + '.journeys');
    const successors = new Set();
    journeys.forEach((j, n) => {
      const where = `${at}.journeys[${n}]`; if (!exact(j, ['id', 'mode', 'steps', 'fromStateId', 'afterJourneyId'], where)) return;
      id(j.id, where + '.id'); steps(j.steps, where + '.steps');
      if (j.mode === 'fresh') { if (j.afterJourneyId !== undefined) error(where + '.afterJourneyId', 'Fresh journeys cannot inherit another journey'); if ((states.length > 1 || j.fromStateId !== undefined) && !states.some(s => s?.id === j.fromStateId)) error(where + '.fromStateId', 'Select an existing state'); }
      else if (j.mode === 'connected') {
        if (j.fromStateId !== undefined) error(where + '.fromStateId', 'Connected journeys inherit the root state');
        if (!journeys.some(candidate => candidate?.id === j.afterJourneyId)) error(where + '.afterJourneyId', 'Select an existing journey predecessor');
        if (successors.has(j.afterJourneyId)) error(where + '.afterJourneyId', 'Journey forks are unsupported; each predecessor has at most one successor'); successors.add(j.afterJourneyId);
        const seen = new Set([j.id]); let cursor = j;
        while (cursor?.mode === 'connected') { if (seen.has(cursor.afterJourneyId)) { error(where + '.afterJourneyId', 'Cyclic journey chain'); break; } seen.add(cursor.afterJourneyId); cursor = journeys.find(candidate => candidate?.id === cursor.afterJourneyId); }
        if (cursor && cursor.mode !== 'fresh') error(where + '.afterJourneyId', 'Chain must have one fresh root');
      } else error(where + '.mode', 'Expected fresh or connected');
    });
  });
  if (exact(plan.budgets, ['maxCaptures', 'deadlineMs'], '$.budgets')) {
    if (!Number.isInteger(plan.budgets.maxCaptures) || plan.budgets.maxCaptures < 1 || plan.budgets.maxCaptures > 64) error('$.budgets.maxCaptures', 'Expected an integer in1..64');
    if (!Number.isInteger(plan.budgets.deadlineMs) || plan.budgets.deadlineMs < 1 || plan.budgets.deadlineMs > 120000) error('$.budgets.deadlineMs', 'Expected an integer in1..120000');
  }
  if (!errors.length) {
    const expanded = expandInspectionPlan(plan);
    if (expanded.cells.length > plan.budgets.maxCaptures) error('$.budgets.maxCaptures', `Expanded work requires ${expanded.cells.length} captures; budget is ${plan.budgets.maxCaptures}`, 'CAPTURE_BUDGET');
    if (expanded.actions > 2048) error('$.routes', `Expanded work requires ${expanded.actions} action executions; hard cap is2048`, 'ACTION_BUDGET');
  }
  return { valid: errors.length === 0, errors };
}

export function expandInspectionPlan(plan) {
  const cells = [], chains = []; let actions = 0;
  for (const route of plan.routes) for (const profileId of route.profiles) {
    const authored = plan.profiles.find(p => p.id === profileId), { id, ...rest } = authored;
    const profile = { name: id, ...rest }, url = normalizedRoute(route.path, plan.origin);
    const cell = (state, journey, chain = []) => {
      const scope = { route: route.id, profile: id, state: state.id, ...(journey ? { journey: journey.id } : {}), phase: journey ? 'after-journey' : 'after-state-before-journeys' };
      const identityPlan = { routeId: route.id, normalizedURL: url, profile, state, ...(journey ? { chain } : {}) };
      const value = { routeId: route.id, normalizedURL: url, profile, state, ...(journey ? { journey, chain } : {}), scope, planHash: hashIdentity(identityPlan) };
      cells.push(value); return value;
    };
    for (const state of route.states) { cell(state); actions += state.steps.length; }
    for (const root of (route.journeys ?? []).filter(j => j.mode === 'fresh')) {
      const state = route.states.find(s => s.id === root.fromStateId) ?? route.states[0];
      let cursor = root; const ordered = [], chain = []; actions += state.steps.length;
      while (cursor) { chain.push(cursor); ordered.push(cell(state, cursor, [...chain])); actions += cursor.steps.length; cursor = route.journeys.find(j => j.mode === 'connected' && j.afterJourneyId === cursor.id); }
      chains.push(ordered);
    }
  }
  return { cells, chains, actions };
}
