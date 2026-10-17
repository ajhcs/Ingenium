import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { discoverShapes, createShape, customizeShape, exportShape } from '../src/shapes/index.mjs';
test('standard shape discovery and deterministic editable geometry', () => {
  assert.equal(discoverShapes().length, 6);
  for (const { id } of discoverShapes()) {
    const shape = createShape({ id, width: 200, height: 120 });
    assert.equal(shape.sha256, createShape(shape.parameters).sha256);
    assert.match(shape.svg, /viewBox="0 0 200 120"/);
  }
});
test('shape customization preserves predecessor and identifies the changed result', () => {
  const first = createShape({ id: 'star' }), snapshot = structuredClone(first);
  const next = customizeShape(first, { fill: '#efdd78', starPoints: 7 });
  assert.deepEqual(first, snapshot); assert.notEqual(first.sha256, next.sha256); assert.equal(next.derivedFrom, first.sha256);
  assert.throws(() => customizeShape({ ...first, svg: '<svg/>' }, {}), /intact/);
});
test('shape generation rejects code-like paint, excessive geometry and unknown parameters', () => {
  for (const changes of [{ fill: 'url(http://example.invalid)' }, { width: Infinity }, { strokeWidth: -1 }, { starPoints: 1000 }, { event: 'x' }]) assert.throws(() => createShape({ id: 'star', ...changes }));
  assert.throws(() => createShape(Object.create({ id: 'circle' })), /supported shape/);
  assert.throws(() => createShape({ id: 'rectangle', width: 60, height: 60, strokeWidth: 4, cornerRadius: 30 }), /Corner radius/);
});
test('shape export preserves exact source and refuses overwrite', async () => {
  await mkdir(resolve('work'), { recursive: true });
  const root = await mkdtemp(resolve('work/shape-test-')), outputDir = join(root, 'output'), shape = createShape({ id: 'hexagon' });
  await exportShape({ shape, outputDir }); assert.equal(await readFile(join(outputDir, 'shape.svg'), 'utf8'), shape.svg);
  await assert.rejects(exportShape({ shape, outputDir }), /exist/i);
});
