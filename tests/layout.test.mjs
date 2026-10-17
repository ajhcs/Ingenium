import test from 'node:test';
import assert from 'node:assert/strict';
import { insetBox, columns, spanColumns, stack, alignBox, baselineGrid, ratioSplit, resolveLayout } from '../src/layout/index.mjs';

const frame = { x: 10, y: 20, width: 600, height: 400 };
const record = () => ({
  version: 1, canvas: { width: 1000, height: 1200 }, tokens: { margin: 80, gutter: 24, unit: 8 },
  nodes: [
    { id: 'content', op: 'inset', from: '$canvas', insets: '$margin' },
    { id: 'grid', op: 'columns', from: 'content', count: 6, gutter: '$gutter' },
    { id: 'title', op: 'span', from: 'grid', start: 0, span: 4 },
    { id: 'rhythm', op: 'baselines', from: 'content', step: '$unit' },
    { id: 'lines', op: 'stack', from: 'title', items: [98, 98], gap: 8 },
    { id: 'badge', op: 'box', x: 0, y: 0, width: 60, height: 24 },
    { id: 'aligned', op: 'align', from: 'badge', to: 'content', x: 'end', y: 'start' },
    { id: 'proportions', op: 'split', from: 'content', ratio: 'equal', gap: 24 }
  ], exceptions: []
});

test('construction helpers support margins, columns, zero-based spans and exact shared edges', () => {
  const content = insetBox(frame, { top: 8, left: 16, right: 16, bottom: 24 });
  assert.deepEqual(content, { x: 26, y: 28, width: 568, height: 368 });
  const grid = columns(content, { count: 4, gutter: 8 });
  assert.equal(grid[0].width, 136);
  assert.deepEqual(spanColumns(grid, 1, 2), { x: 170, y: 28, width: 280, height: 368 });
  assert.equal(grid.at(-1).x + grid.at(-1).width, content.x + content.width);
  assert.deepEqual(frame, { x: 10, y: 20, width: 600, height: 400 });
});

test('stacks align cross axis, and alignBox preserves size and unspecified coordinates', () => {
  assert.deepEqual(stack(frame, [{ width: 120, height: 24 }, { width: 80, height: 32 }], { gap: 8, align: 'end' }), [
    { x: 490, y: 20, width: 120, height: 24 }, { x: 530, y: 52, width: 80, height: 32 }
  ]);
  assert.deepEqual(stack(frame, [10, 20], { axis: 'x', gap: 4 }), [
    { x: 10, y: 20, width: 10, height: 400 }, { x: 24, y: 20, width: 20, height: 400 }
  ]);
  assert.deepEqual(alignBox({ x: 2, y: 3, width: 20, height: 40 }, frame, { x: 'center' }), { x: 300, y: 3, width: 20, height: 40 });
});

test('baseline and ratio constructions retain authored geometry without ratio rounding', () => {
  assert.deepEqual(baselineGrid({ x: 0, y: 3, width: 20, height: 18 }, { step: 8, offset: 2 }), [
    { axis: 'y', value: 5, start: 0, end: 20 }, { axis: 'y', value: 13, start: 0, end: 20 }, { axis: 'y', value: 21, start: 0, end: 20 }
  ]);
  const split = ratioSplit(frame, { ratio: 'golden', gap: 10 });
  assert.ok(Math.abs(split[0].width / split[1].width - (1 + Math.sqrt(5)) / 2) < 1e-14);
  assert.equal(split[1].x + split[1].width, 610);
  assert.deepEqual(ratioSplit(frame, { ratio: 'equal', axis: 'y' }).map(b => b.height), [200, 200]);
});

test('record resolves forward references, shared tokens and guide coordinates without mutation', () => {
  const input = record(); input.nodes.reverse();
  const before = structuredClone(input), result = resolveLayout(input);
  assert.equal(result.status, 'pass', JSON.stringify(result.issues));
  assert.deepEqual(input, before);
  assert.deepEqual(result.boxes.content, { x: 80, y: 80, width: 840, height: 1040 });
  assert.equal(result.boxes.grid[0].width, 120);
  assert.equal(result.boxes.title.width, 552);
  assert.equal(result.boxes.aligned.x, 860);
  assert.equal(result.guides.find(g => g.id === 'title:right').value, result.boxes.title.x + result.boxes.title.width);
  assert.equal(result.guides.find(g => g.id === 'rhythm:baseline:1').value, 88);
  assert.equal(new Set(result.guides.map(g => g.id)).size, result.guides.length);
  input.tokens.margin = 88;
  assert.equal(resolveLayout(input).boxes.content.x, 88);
  assert.equal(result.tokens.margin, 80);
});

test('box edges detect conflicting redundant constraints with exact residuals', () => {
  const valid = { version: 1, canvas: { width: 100, height: 100 }, nodes: [{ id: 'a', op: 'box', x: 10, y: 12, right: 90, bottom: 80 }] };
  assert.deepEqual(resolveLayout(valid).boxes.a, { x: 10, y: 12, width: 80, height: 68 });
  valid.nodes[0].width = 70;
  const failed = resolveLayout(valid);
  assert.equal(failed.status, 'fail');
  assert.equal(failed.issues[0].rule, 'layout.conflict');
  assert.equal(failed.issues[0].residual, -10);
});

test('cycles and unresolved dependencies fail explicitly while independent nodes resolve', () => {
  const input = { version: 1, canvas: { width: 100, height: 100 }, nodes: [
    { id: 'a', op: 'inset', from: 'b', insets: 1 }, { id: 'b', op: 'inset', from: 'a', insets: 1 },
    { id: 'missing', op: 'inset', from: 'absent', insets: 1 }, { id: 'safe', op: 'box', x: 0, y: 0, width: 20, height: 20 }
  ] };
  const result = resolveLayout(input);
  assert.equal(result.status, 'fail');
  assert.ok(result.issues.some(i => i.rule === 'layout.cycle'));
  assert.ok(result.issues.some(i => i.rule === 'layout.reference' && i.target === 'missing'));
  assert.equal(result.boxes.safe.width, 20);
});

test('optical exceptions preserve measured overflow as review-needed and cannot waive conflicts', () => {
  const input = { version: 1, canvas: { width: 100, height: 100 }, nodes: [{ id: 'title', op: 'box', x: -2, y: 10, width: 40, height: 20 }], exceptions: [{ target: 'title', rule: 'layout.bounds', kind: 'optical', reason: 'Authored optical alignment of left serif' }] };
  const before = structuredClone(input), result = resolveLayout(input);
  assert.equal(result.status, 'review-needed');
  assert.equal(result.issues[0].residual, 2);
  assert.deepEqual(result.exceptions, input.exceptions);
  result.exceptions[0].reason = 'Changed output';
  assert.deepEqual(input, before);
  input.exceptions = [];
  assert.equal(resolveLayout(input).status, 'fail');
  input.exceptions = before.exceptions;
  input.nodes[0].right = 99;
  assert.ok(resolveLayout(input).issues.some(i => i.rule === 'layout.conflict'));
});

test('stack overflow is measured against its container even when inside the canvas', () => {
  const result = resolveLayout({ version: 1, canvas: { width: 500, height: 500 }, nodes: [
    { id: 'small', op: 'box', x: 100, y: 100, width: 100, height: 100 },
    { id: 'flow', op: 'stack', from: 'small', items: [70, 70], gap: 10 }
  ] });
  assert.equal(result.status, 'fail');
  assert.equal(result.issues.find(i => i.target === 'flow[1]').residual, 50);
});

test('negative ranges, unsupported transforms and invalid numeric tokens do not silently pass', () => {
  for (const run of [
    () => insetBox(frame, 400), () => columns(frame, { count: 2, gutter: 601 }),
    () => columns(frame, { count: 1.5 }), () => spanColumns(columns(frame, { count: 2 }), 1, 2),
    () => spanColumns([{ x: 1, y: 1, width: 20, height: 20 }, { x: 10, y: 1, width: 20, height: 20 }], 0, 2),
    () => baselineGrid(frame, { step: 0 }), () => ratioSplit(frame, { ratio: 0 }),
    () => stack(frame, [NaN]), () => alignBox(frame, frame, { x: 'middle' })
  ]) assert.throws(run);
  const input = record(); input.nodes[0].transform = 'rotate(12)';
  assert.equal(resolveLayout(input).status, 'fail');
  assert.match(resolveLayout(input).issues.find(i => i.target === 'content').message, /transform/);
  const tokenInput = record(); tokenInput.tokens.margin = Infinity;
  assert.equal(resolveLayout(tokenInput).status, 'fail');
  const missingToken = record(); missingToken.nodes[0].insets = '$absent';
  assert.equal(resolveLayout(missingToken).status, 'fail');
});

test('exact boundary, duplicate IDs and malformed exception targets are explicit', () => {
  assert.equal(resolveLayout({ version: 1, canvas: { width: 10, height: 10 }, nodes: [{ id: 'edge', op: 'box', x: 0, y: 0, width: 10, height: 10 }] }).status, 'pass');
  const duplicate = record(); duplicate.nodes.push(duplicate.nodes[0]);
  assert.equal(resolveLayout(duplicate).issues[0].rule, 'layout.conflict');
  const orphan = record(); orphan.exceptions.push({ target: 'absent', rule: 'layout.bounds', kind: 'optical', reason: 'Explicit authored exception' });
  assert.ok(resolveLayout(orphan).issues.some(i => i.rule === 'layout.exception'));
  assert.equal(resolveLayout({ version: 1, canvas: { width: 10, height: 10 }, nodes: [], transform: 'scale(2)' }).status, 'fail');
});

test('array identity and malformed token/exception records cannot collide with guide IDs', () => {
  const input = record(); input.nodes.push({ id: 'grid[0]', op: 'box', x: 0, y: 0, width: 10, height: 10 });
  assert.equal(resolveLayout(input).status, 'fail');
  const badTokens = record(); badTokens.tokens = [];
  assert.equal(resolveLayout(badTokens).status, 'fail');
  const badExceptions = record(); badExceptions.exceptions = 'not an array';
  const failed = resolveLayout(badExceptions);
  assert.equal(failed.status, 'fail');
  assert.ok(Array.isArray(failed.exceptions));
});

test('failed resource-limited node leaves no partial guides while resolved dependencies survive', () => {
  const nodes = Array.from({ length: 4 }, (_, i) => ({ id: `grid${i}`, op: 'columns', from: '$canvas', count: 1000 }));
  nodes.push({ id: 'baselines', op: 'baselines', from: '$canvas', step: .2 });
  nodes.push({ id: 'partial', op: 'columns', from: '$canvas', count: 1000 });
  const result = resolveLayout({ version: 1, canvas: { width: 100, height: 100 }, nodes });
  assert.equal(result.status, 'fail');
  assert.equal(result.boxes.partial, undefined);
  assert.ok(result.issues.some(i => i.target === 'partial' && i.rule === 'layout.range'));
  assert.ok(!result.guides.some(g => g.target.startsWith('partial')));
  assert.ok(result.guides.some(g => g.target === 'grid0[0]'));
  assert.ok(result.guides.some(g => g.target === 'baselines'));
});

test('sparse stacks and token value arrays fail instead of producing unfilled slots', () => {
  assert.throws(() => stack(frame, Array(2)), /dense array/);
  const sparse = [, 20]; sparse.extra = 1;
  assert.throws(() => stack(frame, sparse), /dense array/);
  for (const items of [Array(2), sparse]) {
    const result = resolveLayout({ version: 1, canvas: { width: 100, height: 100 }, nodes: [{ id: 'flow', op: 'stack', from: '$canvas', items }] });
    assert.equal(result.status, 'fail');
    assert.equal(result.boxes.flow, undefined);
    assert.equal(result.guides.length, 0);
  }
});

test('optical exceptions reject unimplemented scope and duplicate targets', () => {
  const input = { version: 1, canvas: { width: 100, height: 100 }, nodes: [{ id: 'title', op: 'box', x: -2, y: 0, width: 20, height: 20 }], exceptions: [{ target: 'title', rule: 'layout.bounds', kind: 'optical', reason: 'Mobile only', scope: { profile: 'mobile' } }] };
  assert.equal(resolveLayout(input).status, 'fail');
  delete input.exceptions[0].scope;
  assert.equal(resolveLayout(input).status, 'review-needed');
  input.exceptions.push({ ...input.exceptions[0], reason: 'Other condition' });
  assert.equal(resolveLayout(input).status, 'fail');
  assert.match(resolveLayout(input).issues[0].message, /Duplicate/);
});

test('explicit null dimensions fail even when a redundant edge supplies a fallback', () => {
  for (const dimensions of [{ width: null, right: 20, height: 20 }, { width: 20, height: null, bottom: 20 }]) {
    const result = resolveLayout({ version: 1, canvas: { width: 100, height: 100 }, nodes: [{ id: 'a', op: 'box', x: 0, y: 0, ...dimensions }] });
    assert.equal(result.status, 'fail');
    assert.equal(result.boxes.a, undefined);
  }
});
