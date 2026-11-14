/** Prepare explicit, reviewable local resource-pack input manifests; no acquisition. */
import { mkdir, readdir, lstat, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceBytes, digest } from './release-files.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const selected=Object.freeze([
  {id:'resource-hack',directory:'src/resources/packs/hack',opening:'manifest.json',notices:['LICENSE.md']},
  {id:'resource-cse-fonts',directory:'src/resources/packs/cse-fonts',opening:'manifest.json',notices:['inter-OFL.txt','space-OFL.txt']},
  {id:'resource-liberation-sans',directory:'src/resources/packs/liberation-sans',opening:'manifest.json',notices:['LICENSE']},
  {id:'resource-cse-selected',directory:'src/resources/packs/cse-selected',opening:'manifest.json',notices:['LICENSE','LICENSE-font-liberation.txt','LICENSE-font-dejavu.txt']},
  {id:'resource-atomic-ui',directory:'src/resources/packs/daisyui',opening:'package.json',notices:['LICENSE']},
  {id:'resource-materials',directory:'src/resources/packs/open-props',opening:'package.json',notices:['LICENSE']},
  {id:'resource-recipes',directory:'examples/evolution/resource-recipes',opening:'README.md',notices:['LICENSE','CSE-LICENSE.txt']},
]);
export async function resourceSelections({sourceRoot=root}={}) {
  async function members(name) {
    const stat=await lstat(join(sourceRoot,name));
    if(stat.isSymbolicLink())throw Error('Symlink resource selection refused');
    if(stat.isDirectory()) { const result=[];for(const item of (await readdir(join(sourceRoot,name))).sort())result.push(...await members(name+'/'+item));return result; }
    const bytes=await sourceBytes(sourceRoot,name);return [{path:name,bytes:bytes.length,sha256:digest(bytes)}];
  }
  return Promise.all(selected.map(async entry=>({schema:'ingenium-release-selection/1',id:entry.id,
    files:await members(entry.directory),notices:entry.notices.map(n=>entry.directory+'/'+n),openingFile:entry.directory+'/'+entry.opening,
    maxCompressedBytes:10*1024*1024,maxSourceBytes:50*1024*1024})));
}
export async function writeResourceSelections(outputDir,options={}) {
  const selections=await resourceSelections(options);await mkdir(outputDir);const paths=[];
  for(const selection of selections) { const file=join(outputDir,selection.id+'.json');await writeFile(file,JSON.stringify(selection,null,2)+'\n',{flag:'wx'});paths.push(file); }
  return paths;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==3)throw Error('Usage: node tools/prepare-resource-selections.mjs NEW_MANIFEST_DIRECTORY');
  console.log(JSON.stringify(await writeResourceSelections(resolve(process.argv[2])),null,2));
}
