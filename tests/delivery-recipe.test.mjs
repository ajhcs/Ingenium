import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { inspectRecipe, acquireRecipe } from '../src/resources/recipe-task.mjs';
import { extractDeliveryDependencies } from '../src/delivery/dependencies.mjs';
import { writeDelivery } from '../src/delivery/index.mjs';
import { createContinuation, createProjectStore } from '../src/project-state/index.mjs';

const parent = new URL('../work/implementation/', import.meta.url).pathname;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('explicit real Node built-ins are runtime prerequisites; relative closure and dynamic-loader refusals remain intact', () => {
  const scan = text => extractDeliveryDependencies({ path: 'generator.mjs', role: 'source' }, Buffer.from(text));
  assert.deepEqual(scan('import {readFile} from "node:fs/promises"; import path from "node:path"; export {x} from "./helper.mjs";'), ['helper.mjs']);
  assert.deepEqual(scan('import "node:crypto"; import "node:url";'), []);
  for (const specifier of ['fs', 'node:unknown-ingenium-module', 'some-package', 'https://example.invalid/module.mjs']) assert.throws(() => scan(`import x from ${JSON.stringify(specifier)};`), { code: 'UNSUPPORTED_SOURCE' });
  for (const source of ['await import("node:fs");', 'require("node:path");', 'await import("./helper.mjs");']) assert.throws(() => scan(source), { code: 'UNSUPPORTED_SOURCE' });
});

test('selected portable recipe delivers, saves, reopens and regenerates from retained sources with explicit Node requirement', async t => {
  await mkdir(parent, { recursive: true });
  const base = await mkdtemp(join(parent, 'delivery-recipe-')); t.after(() => rm(base, { recursive: true, force: true }));
  const selected = await inspectRecipe('doc-title'), root = join(base, 'selected');
  await acquireRecipe({ id: selected.id, originalSHA256: selected.sha256, outputDir: root });
  async function names(directory, prefix = '') {
    const paths = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) paths.push(...await names(join(directory, entry.name), path)); else paths.push(path);
    }
    return paths.sort();
  }
  const paths = await names(root);
  const artifacts = [];
  for (const [i, path] of paths.entries()) artifacts.push({
    id: `member-${i}`, path, sha256: hash(await readFile(join(root, path))),
    mediaType: path.endsWith('.mjs') ? 'text/javascript' : path.endsWith('.json') ? 'application/json' : path.endsWith('.svg') ? 'image/svg+xml' : path.endsWith('.md') ? 'text/markdown' : 'text/plain',
    role: path === 'README.md' ? 'instructions' : path.includes('LICENSE') ? 'notice' : 'source', dependsOnIds: [],
  });
  const generator = artifacts.find(a => a.path === 'recipes.mjs');
  generator.dependsOnIds = artifacts.filter(a => ['catalog.json', 'examples/doc-title.json', 'LICENSE', 'CSE-LICENSE.txt'].includes(a.path)).map(a => a.id);
  const delivery = { schema: 'ingenium-delivery/1', projectId: 'selected-recipe', versionId: 'doc-title', openingFile: 'README.md', artifacts,
    tools: [{ id: 'node-runtime', purpose: 'Run recipes.mjs doc-title NEW_OUTPUT_DIRECTORY from this retained source folder', required: true, version: process.version, tested: 'yes', limitations: ['Node runtime is an external prerequisite, not a bundled file.'] }],
    checks: [], limitations: ['Selected data only; generator cannot load data for unselected recipes.', 'Graphics remain fictional; no engineering acceptance.'] };
  const result = await writeDelivery({ root, delivery, outputDir: join(base, 'delivered') });
  assert.equal(result.status, 'complete');
  await rm(root, { recursive: true });
  const retained = join(base, 'delivered'), expected = await readFile(join(retained, 'revised.svg'));
  const state = createContinuation({ projectId: 'selected-recipe', brief: 'Retain the exact selected editable doc-title generator and declared data/notice closure.', sources: artifacts.filter(artifact => artifact.role === 'source').map(({ id, path, sha256, mediaType }) => ({ id, path, sha256, mediaType })), delivery });
  const store = createProjectStore({ root: retained });
  const saved = await store.commit({ expectedHeadHash: null, requestId: 'save-selected-recipe', state, change: { kind: 'create', summary: 'Save selected generator with explicit Node runtime and data closure.' } });
  assert.equal(saved.status, 'saved');
  const reopened = join(base, 'reopened');
  await store.materializeVersion({ versionId: `commit:${saved.headHash}`, outputDir: reopened });
  await rm(retained, { recursive: true });
  await promisify(execFile)(process.execPath, ['recipes.mjs', 'doc-title', 'regenerated'], { cwd: reopened });
  assert.deepEqual(await readFile(join(reopened, 'regenerated/revised.svg')), expected);
  assert.match(await readFile(join(reopened, 'README.md'), 'utf8'), /node recipes\.mjs doc-title/);
  assert.match(await readFile(join(reopened, 'LICENSE'), 'utf8'), /MIT License/);
  // A newly introduced relative module remains a required actual source file.
  const changed = 'import "node:fs"; import "./missing-helper.mjs";';
  await writeFile(join(reopened, 'recipes.mjs'), changed);
  assert.deepEqual(extractDeliveryDependencies({ path: 'recipes.mjs', role: 'source' }, await readFile(join(reopened, 'recipes.mjs'))), ['missing-helper.mjs']);
  const incomplete = structuredClone(delivery); incomplete.artifacts.find(a => a.path === 'recipes.mjs').sha256 = hash(changed);
  await assert.rejects(writeDelivery({ root: reopened, delivery: incomplete, outputDir: join(base, 'missing-relative') }), { code: 'MISSING_DEPENDENCY' });
  assert.ok(!(await readdir(base)).includes('missing-relative'));
});
