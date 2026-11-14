import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { health } from '../src/cli/health.mjs';
import { main } from '../bin/ingenium.mjs';
import { main as tools } from '../bin/ingenium-tools.mjs';

test('health explicit selectors do not fall back and missing optional tools diagnose without writes', async t => {
  await mkdir('work', { recursive: true }); const root = await mkdtemp(resolve('work/health-')); t.after(() => rm(root, { recursive: true, force: true }));
  const r = await health({ selectors: { rendererDir: root, adapterDir: root, python: join(root, 'missing-python') } });
  assert.equal(r.schema, 'ingenium-health/1'); assert.equal(r.capabilities.find(c => c.id === 'renderer').status, 'absent'); assert.equal(r.capabilities.find(c => c.id === 'browser').status, 'absent'); assert.equal(r.capabilities.find(c => c.id === 'font-vector').status, 'absent'); assert.equal(r.capabilities.find(c => c.id === 'resources').status, 'usable');
  assert.deepEqual(await readdir(root), []);
  for (const selectors of [{ rendererDir: '' }, { adapterDir: '' }, { python: '' }, { rendererDir: root, sharpModule: 'sharp' }, { unknown: root }]) await assert.rejects(health({ selectors }), /Selectors|Choose/);
});

test('health probes own one browser and close it; failures and close failures remain honest', async () => {
  let opened = 0, closed = 0;
  const browser = async options => { opened++; assert.equal(options.adapterDir, '/selected'); return { status: 'pass', capability: { environment: { browser: 'synthetic-1' } }, session: { close: async () => { closed++; } } }; };
  const r = await health({ selectors: { adapterDir: '/selected' }, probes: ['browser'] }, { adapters: { browser } });
  assert.equal(r.capabilities[0].status, 'usable'); assert.equal(r.capabilities[0].version, 'synthetic-1'); assert.equal(opened, 1); assert.equal(closed, 1);
  const closing = await health({ selectors: { adapterDir: '/selected' }, probes: ['browser'] }, { adapters: { browser: async () => ({ status: 'pass', session: { close: async () => { throw new Error('raw secret'); } } }) } });
  assert.equal(closing.capabilities[0].status, 'error'); assert.ok(!JSON.stringify(closing).includes('raw secret'));
  const failed = await health({ probes: ['renderer', 'resources'] }, { adapters: { renderer: async () => { throw new Error('private request body'); }, resources: async () => ({ providers: [] }) } });
  assert.equal(failed.capabilities[0].status, 'error'); assert.equal(failed.capabilities[1].status, 'usable'); assert.ok(!JSON.stringify(failed).includes('private request body'));
});

test('unselected optional browser and Python never probe; companion core probes never import missing core', async () => {
  const fail = () => { throw new Error('Must not probe'); };
  const r = await health({ probes: ['browser', 'font-vector'] }, { adapters: { browser: fail, fontVector: fail } });
  assert.ok(r.capabilities.every(c => c.status === 'not-selected'));
  const companion = await health({ probes: ['renderer', 'resources', 'font-vector'] }, { product: 'ingenium-tools', adapters: { renderer: fail, resources: fail, fontVector: fail } });
  assert.ok(companion.capabilities.every(c => c.status === 'not-selected'));
});

test('plain diagnosis completes0; required unavailable capability returns2 with stable object payload', async () => {
  let result;
  assert.equal(await main(['health', '--probes', 'browser'], value => { result = value; }), 0); assert.equal(result.capabilities[0].status, 'not-selected');
  assert.equal(await main(['health', '--probes', 'browser', '--require', 'browser'], () => {}), 2);
  assert.equal(await tools(['health', '--require', 'renderer'], value => { result = value; }), 2); assert.equal(result.product, 'ingenium-tools');
});
