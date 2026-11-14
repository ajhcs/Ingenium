import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stageFiles, sourceBytes } from './release-files.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Explicit closure: additions require package-consumer verification, never a broad src/ copy.
export const companionFiles = Object.freeze([
  'bin/ingenium-tools.mjs',
  'src/browser/index.mjs', 'src/browser/local-url.mjs', 'src/browser/inventory.mjs', 'src/browser/network-observations.mjs',
  'src/checks/index.mjs', 'src/project/index.mjs', 'src/project/preservation.mjs',
  'src/project/plan.mjs', 'src/project/inspect-set.mjs', 'src/project/report.mjs',
  'src/cli/commands.mjs', 'src/cli/errors.mjs', 'src/cli/health.mjs', 'src/cli/help.mjs',
  'src/cli/parse.mjs', 'src/cli/runtime.mjs', 'src/cli/version.mjs', 'src/cli/dispatch.mjs',
]);
export async function stageCompanion(outputDir, {sourceRoot=root, identity}={}) {
  if (typeof outputDir !== 'string' || !outputDir.trim()) throw new TypeError('Choose a new staging directory');
  const packageData=JSON.parse((await sourceBytes(sourceRoot,'companion/package.json')).toString());
  packageData.files=['bin/','src/','README.md','LICENSE',...(identity?['release/']:[])];
  const result = await stageFiles({sourceRoot,outputDir,identity,files:[...companionFiles,
    {from:'docs/tools.md',to:'README.md'}, 'LICENSE'],generated:{'package.json':packageData}});
  if (result.sourceBytes > 384*1024) throw Error(`Companion source budget exceeded: ${result.sourceBytes}; request a reviewed budget adjustment`);
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node tools/package-companion.mjs NEW_OUTPUT_DIRECTORY');
  console.log(JSON.stringify(await stageCompanion(process.argv[2])));
}
