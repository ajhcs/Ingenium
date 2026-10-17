import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { buildFixture } from '../examples/foundation/build-study.mjs';
import { reviewFixture } from '../src/review/index.mjs';
import { main } from '../bin/ingenium.mjs';

async function fixtureIn(root, name, broken = false) {
  const directory = join(root, name); await mkdir(directory);
  const f = buildFixture({ broken });
  await writeFile(join(directory, 'study.html'), f.html);
  await writeFile(join(directory, 'layout.json'), JSON.stringify(f.layout));
  await writeFile(join(directory, 'fixture.json'), JSON.stringify(f.manifest));
  return join(directory, 'fixture.json');
}
test('file review retains explicit missing capability and refuses to overwrite existing evidence', async () => {
  const root = await mkdtemp(resolve('work/foundation-unit-'));
  const fixturePath = await fixtureIn(root, 'fixture'); const outputDir = join(root, 'evidence');
  const empty = join(root, 'empty'); await mkdir(empty);
  const result = await reviewFixture({ fixturePath, outputDir, adapterDir: empty });
  assert.equal(result.status, 'not-run');
  const bytes = await readFile(result.files.report);
  const report = JSON.parse(bytes); assert.ok(report.counts['not-run'] > 0);
  assert.equal(report.issues.find(i => i.rule === 'browser-capability').status, 'not-run');
  await assert.rejects(reviewFixture({ fixturePath, outputDir, adapterDir: empty }), /EEXIST/);
  assert.deepEqual(await readFile(result.files.report), bytes);
  const output = [];
  assert.equal(await main(['review', fixturePath, join(root, 'cli-evidence'), '--adapter-dir', empty], x => output.push(x)), 2);
  assert.equal(output[0].status, 'not-run');
  assert.equal(await main(['review', fixturePath, join(root, 'invalid'), '--unknown', 'x'], () => {}), 1);
  await assert.rejects(stat(join(root, 'invalid')), /ENOENT/);
  await assert.rejects(reviewFixture({ fixturePath, outputDir: join(root, 'empty-renderer'), rendererDir: '' }), /rendererDir/);
});

test('duplicate profile identities refuse before creating an output directory', async () => {
  const root = await mkdtemp(resolve('work/foundation-unit-'));
  const fixturePath = await fixtureIn(root, 'fixture'); const f = JSON.parse(await readFile(fixturePath, 'utf8'));
  f.profiles.push(f.profiles[0]); await writeFile(fixturePath, JSON.stringify(f));
  await assert.rejects(reviewFixture({ fixturePath, outputDir: join(root, 'invalid') }), /unique/);
  await assert.rejects(stat(join(root, 'invalid')), /ENOENT/);
});

test('real shared-session review detects broken delivery and preserves improvement deltas', { skip: !process.env.INGENIUM_BROWSER_ADAPTER_DIR || !process.env.INGENIUM_BROWSER_EXECUTABLE ? 'Explicit real browser adapter/executable not provided; fixture integration not run' : false }, async () => {
  const root = await mkdtemp(resolve('work/foundation-live-'));
  const fixturePath = await fixtureIn(root, 'fixture', true);
  const options = { fixturePath, adapterDir: process.env.INGENIUM_BROWSER_ADAPTER_DIR, executablePath: process.env.INGENIUM_BROWSER_EXECUTABLE };
  const broken = await reviewFixture({ ...options, outputDir: join(root, 'broken') });
  const before = JSON.parse(await readFile(broken.files.report, 'utf8'));
  assert.ok(before.issues.some(i => i.rule === 'axe:button-name' && i.status === 'fail'));
  assert.ok(before.issues.some(i => i.rule === 'font-readiness' && i.status === 'fail'));
  assert.ok(before.issues.some(i => i.rule === 'viewport-horizontal-overflow' && i.status === 'review-needed' && i.scope.profile === 'narrow'));
  assert.ok(before.issues.some(i => i.rule === 'content-clipping' && i.scope.profile === 'text-spacing'));
  await writeFile(join(root, 'fixture', 'study.html'), buildFixture().html);
  const fixed = await reviewFixture({ ...options, outputDir: join(root, 'fixed'), previousReportPath: broken.files.report });
  const report = JSON.parse(await readFile(fixed.files.report, 'utf8'));
  assert.equal(report.counts.error, 0, JSON.stringify(fixed));
  assert.equal(report.counts.fail, 0, JSON.stringify(report.issues.filter(i => i.status === 'fail')));
  assert.ok(report.issues.some(i => i.rule === 'keyboard-focus-journey' && i.status === 'pass'));
  assert.ok(fixed.delta.changed > 0 || fixed.delta.resolved > 0);
  assert.equal(fixed.delta.contextChanged.sources, true);
  assert.ok(fixed.delta.resolvedIssues.some(i => i.rule === 'axe:button-name') || fixed.delta.updatedIssues.some(i => i.before.rule === 'axe:button-name' && i.after.status === 'pass'));
  const raw = JSON.parse(await readFile(join(root, 'fixed/raw/narrow.default.json'), 'utf8'));
  const transformed = raw.raw.geometry.boxes.find(b => b.target === '#transformed-mark');
  assert.ok(transformed.nativeBBox && transformed.nativeBBox.width !== transformed.rect.width);
  assert.equal(raw.raw.geometry.viewport.width, 320);
  assert.equal(raw.raw.screenshotState.phase, 'after-state-before-journeys');
  const cropFailurePath = await fixtureIn(root, 'crop-failure', true);
  const cropManifest = JSON.parse(await readFile(cropFailurePath, 'utf8'));
  cropManifest.profiles = [cropManifest.profiles[0]];
  await writeFile(cropFailurePath, JSON.stringify(cropManifest));
  const badRenderer = join(root, 'bad-renderer');
  await mkdir(join(badRenderer, 'node_modules/sharp'), { recursive: true });
  await writeFile(join(badRenderer, 'node_modules/sharp/package.json'), '{"main":"index.cjs"}');
  await writeFile(join(badRenderer, 'node_modules/sharp/index.cjs'), 'module.exports = {}');
  const failedCrop = await reviewFixture({ ...options, fixturePath: cropFailurePath, rendererDir: badRenderer, outputDir: join(root, 'crop-evidence') });
  assert.equal(failedCrop.status, 'error');
  assert.equal(failedCrop.crops.status, 'error');
  assert.ok(JSON.parse(await readFile(failedCrop.files.report, 'utf8')).issues.some(i => i.rule === 'axe:button-name'));
  const thrownRenderer = join(root, 'throwing-renderer');
  await mkdir(join(thrownRenderer, 'node_modules/sharp'), { recursive: true });
  await writeFile(join(thrownRenderer, 'node_modules/sharp/package.json'), '{"main":"index.cjs"}');
  await writeFile(join(thrownRenderer, 'node_modules/sharp/index.cjs'), 'throw new Error("Synthetic crop initialization failure")');
  const thrownCrop = await reviewFixture({ ...options, fixturePath: cropFailurePath, rendererDir: thrownRenderer, outputDir: join(root, 'throwing-crop-evidence') });
  assert.equal(thrownCrop.crops.status, 'error');
  assert.match(thrownCrop.crops.reason, /initialization failure/);
  assert.ok(JSON.parse(await readFile(thrownCrop.files.report, 'utf8')).issues.length);
});
