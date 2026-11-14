import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { verifyReleaseSource } from '../tools/verify-release-source.mjs';

async function fixture(t) {
  const dir = await mkdtemp(resolve('work/published-source-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const sourceRoot = join(dir, 'source'); await mkdir(sourceRoot);
  await writeFile(join(sourceRoot, 'package.json'), JSON.stringify({ version: '1.2.3-alpha.1' }));
  const git = (...args) => execFileSync('git', ['-C', sourceRoot, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q'); git('add', 'package.json');
  git('-c', 'user.name=Synthetic release', '-c', 'user.email=release@example.invalid', 'commit', '-qm', 'Original synthetic fixture');
  const manifestPath = join(dir, 'artifacts.json'), releaseInfoPath = join(dir, 'release-info.json'), releaseTag = 'v1.2.3-alpha.1';
  const manifest = { schema: 'ingenium-release-artifacts/1', version: '1.2.3-alpha.1', sourceRevision: git('rev-parse', 'HEAD'), sourceTree: git('rev-parse', 'HEAD^{tree}'), buildId: 'a'.repeat(64), prepared: true, published: false, artifacts: [{ id: 'guidance', path: 'ingenium-guidance-1.2.3-alpha.1.zip' }] };
  await writeFile(manifestPath, JSON.stringify(manifest));
  await writeFile(releaseInfoPath, JSON.stringify({ tagName: releaseTag, isDraft: false }));
  return { args: { manifestPath, releaseInfoPath, releaseTag, sourceRoot }, manifest, git };
}

test('published release gate binds its tag, version, commit and tree before staging', async t => {
  const { args, manifest } = await fixture(t);
  const result = await verifyReleaseSource(args);
  assert.equal(result.sourceRevision, manifest.sourceRevision);
  assert.equal(result.artifacts, 1);
  assert.equal(JSON.parse(await readFile(args.manifestPath)).published, false);
});

test('same version on a different committed tree cannot deploy older release downloads', async t => {
  const { args, git } = await fixture(t);
  await writeFile(join(args.sourceRoot, 'changed.txt'), 'Changed source, same version');
  await assert.rejects(verifyReleaseSource(args), /Working source is not clean/);
  git('add', 'changed.txt'); git('-c', 'user.name=Synthetic release', '-c', 'user.email=release@example.invalid', 'commit', '-qm', 'Different source');
  await assert.rejects(verifyReleaseSource(args), /does not match the checked-out source/);
});

test('draft, wrong-tag and development artifacts refuse publication', async t => {
  const { args, manifest } = await fixture(t);
  for (const info of [{ tagName: args.releaseTag, isDraft: true }, { tagName: 'v9.0.0', isDraft: false }]) {
    await writeFile(args.releaseInfoPath, JSON.stringify(info));
    await assert.rejects(verifyReleaseSource(args), /selected published release/);
  }
  await writeFile(args.releaseInfoPath, JSON.stringify({ tagName: args.releaseTag, isDraft: false }));
  await assert.rejects(verifyReleaseSource({ ...args, releaseTag: 'main' }), /package version/);
  await writeFile(args.manifestPath, JSON.stringify({ ...manifest, development: true }));
  await assert.rejects(verifyReleaseSource(args), /prepared distributable/);
  await writeFile(args.manifestPath, JSON.stringify({ ...manifest, artifacts: [{ id: 'guidance', path: 'ingenium-guidance-1.2.3-alpha.1-development-aaaaaaaaaaaa.zip' }] }));
  await assert.rejects(verifyReleaseSource(args), /without a development suffix/);
});
