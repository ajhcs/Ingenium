import { readFile } from 'node:fs/promises';
export async function version({ product = 'ingenium' } = {}) {
  const packageData = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  let release;
  try { release = JSON.parse(await readFile(new URL('../../release/identity.json', import.meta.url), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (release && (release.schema !== 'ingenium-release/1' || typeof release.version !== 'string' || !/^[a-f0-9]{40}$/.test(release.sourceRevision) || !/^[a-f0-9]{40}$/.test(release.sourceTree) || typeof release.buildId !== 'string' || !release.buildId || !['guidance', 'core-tools', 'inspection-tools', 'editable-study'].includes(release.artifactFlavor))) throw new Error('Invalid package-relative release identity; rebuild the selected artifact.');
  return { schema: 'ingenium-version/1', product, version: release?.version ?? packageData.version, prepared: !!release, release: release ?? null };
}
