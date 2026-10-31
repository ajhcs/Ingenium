import { mkdir, copyFile, chmod, readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const companionFiles = Object.freeze([
  'bin/ingenium-tools.mjs', 'src/browser/index.mjs', 'src/browser/local-url.mjs', 'src/browser/inventory.mjs',
  'src/checks/index.mjs', 'src/project/index.mjs', 'src/project/preservation.mjs',
]);
/** Stage only the small dependency-free companion; npm pack/install remain explicit. */
export async function stageCompanion(outputDir) {
  if (typeof outputDir !== 'string' || !outputDir.trim()) throw new TypeError('Choose a new staging directory');
  const destination = resolve(outputDir);
  await mkdir(destination);
  for (const file of companionFiles) {
    const target = join(destination, file);
    await mkdir(dirname(target), { recursive: true }); await copyFile(join(root, file), target);
  }
  await copyFile(join(root, 'companion/package.json'), join(destination, 'package.json'));
  await copyFile(join(root, 'docs/tools.md'), join(destination, 'README.md'));
  await copyFile(join(root, 'LICENSE'), join(destination, 'LICENSE'));
  await chmod(join(destination, 'bin/ingenium-tools.mjs'), 0o755);
  return { outputDir: destination, files: companionFiles.length + 3, sourceBytes: (await Promise.all(companionFiles.map(async p => (await readFile(join(root, p))).length))).reduce((a, b) => a + b, 0), dependencies: 0, published: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node tools/package-companion.mjs NEW_OUTPUT_DIRECTORY');
  console.log(JSON.stringify(await stageCompanion(process.argv[2])));
}
