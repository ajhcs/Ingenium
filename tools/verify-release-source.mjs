/** Read-only gate before staging published release downloads. */
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function verifyReleaseSource({ manifestPath, releaseTag, releaseInfoPath, sourceRoot = root }) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const info = JSON.parse(await readFile(releaseInfoPath, 'utf8'));
  const pkg = JSON.parse(await readFile(resolve(sourceRoot, 'package.json'), 'utf8'));
  const git = (...args) => execFileSync('git', ['-C', sourceRoot, ...args], { encoding: 'utf8' }).trim();
  if (git('status', '--porcelain', '--untracked-files=normal')) throw Error('Working source is not clean');
  if (typeof releaseTag !== 'string' || releaseTag !== `v${pkg.version}`) throw Error('Release tag does not match the checked-out package version');
  if (info.tagName !== releaseTag || info.isDraft !== false) throw Error('Expected the selected published release, not a draft');
  if (manifest.schema !== 'ingenium-release-artifacts/1' || manifest.prepared !== true || manifest.development === true) throw Error('Expected a prepared distributable artifact manifest');
  if (manifest.version !== pkg.version || manifest.sourceRevision !== git('rev-parse', 'HEAD') || manifest.sourceTree !== git('rev-parse', 'HEAD^{tree}')) throw Error('Release manifest does not match the checked-out source');
  if (!/^[a-f0-9]{64}$/.test(manifest.buildId ?? '') || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length) throw Error('Missing release build identity or artifacts');
  // Development preparation retains the source version but adds a development
  // suffix to archive names. Older top-level manifests may omit that flag.
  if (manifest.artifacts.some(a => typeof a?.path !== 'string' || !['zip', 'tgz'].some(ext => a.path.endsWith(`-${pkg.version}.${ext}`)))) throw Error('Expected distributable archive names without a development suffix');
  return { sourceRevision: manifest.sourceRevision, sourceTree: manifest.sourceTree, buildId: manifest.buildId, version: manifest.version, artifacts: manifest.artifacts.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 5) throw Error('Usage: node tools/verify-release-source.mjs ARTIFACTS_JSON RELEASE_TAG RELEASE_INFO_JSON');
  console.log(JSON.stringify(await verifyReleaseSource({ manifestPath: process.argv[2], releaseTag: process.argv[3], releaseInfoPath: process.argv[4] })));
}
