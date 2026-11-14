import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { stageCompanion, companionFiles } from './package-companion.mjs';
import { stageCore, coreFiles } from './package-core.mjs';
import { digest, relativeFile, sourceBytes, stageFiles, inventory } from './release-files.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function git(sourceRoot,...args) { return execFileSync('git',['-C',sourceRoot,...args],{encoding:'utf8',maxBuffer:32*1024*1024}).trim(); }
async function sourceInventory(sourceRoot) {
  const names=execFileSync('git',['-C',sourceRoot,'ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',maxBuffer:32*1024*1024}).split('\0').filter(Boolean);
  const files=[];
  for(const path of [...new Set(names)].sort()) { let bytes; try { bytes=await sourceBytes(sourceRoot,path); } catch(error) { if(error.code==='ENOENT')continue; throw error; } files.push({path,bytes:bytes.length,sha256:digest(bytes)}); }
  return files;
}
function archive(sourceRoot,stage,output,kind) { execFileSync('python3',[join(sourceRoot,'tools/release-archive.py'),stage,output,kind],{stdio:'pipe'}); }
function inspectArchive(sourceRoot,path,kind) { return JSON.parse(execFileSync('python3',[join(sourceRoot,'tools/release-archive.py'),'--inspect',path,kind],{encoding:'utf8',maxBuffer:32*1024*1024})); }
function checkBudget(bytes,max,label) { if(bytes>max)throw Error(`${label} budget exceeded (${bytes} > ${max}); request a reviewed adjustment or explicitly selected separate packs`); }
export async function prepareRelease({outputDir,development=false,sourceRoot=root,resourcePacks=[],studies=[]}={}) {
  if(typeof outputDir!=='string'||!outputDir.trim()||typeof development!=='boolean'||!Array.isArray(resourcePacks)||!Array.isArray(studies))throw Error('Choose a new outputDir, explicit boolean development and selection arrays');
  sourceRoot=await realpath(sourceRoot); const output=resolve(outputDir);
  const under=relative(sourceRoot,output); if(!under || (!under.startsWith('..') && !under.startsWith('work/')))throw Error('Use an output outside the source tree or under ignored work/');
  const packages=await Promise.all(['package.json','plugin.json','companion/package.json'].map(async path=>JSON.parse((await sourceBytes(sourceRoot,path)).toString())));
  const version=packages[0].version;
  if(!version||packages.some(p=>p.version!==version))throw Error('Missing or mismatched package/plugin/companion version identity');
  if(packages.some(p=>p.scripts && p.name==='@ajhcs/ingenium-tools')||packages[1].hooks||packages[1].mcpServers)throw Error('Unexpected companion lifecycle scripts or plugin runtime');
  const dirty=git(sourceRoot,'status','--porcelain','--untracked-files=normal');
  if(dirty&&!development)throw Error('Dirty source refused for distributable release; use explicit nonrelease development mode');
  const files=await sourceInventory(sourceRoot);
  const visible=new Set(files.map(f=>f.path));
  for(const path of [...coreFiles,...companionFiles,'companion/package.json','docs/tools.md'])if(!visible.has(path))throw Error(`Runtime source is not Git-visible: ${path}`);
  const selected=await Promise.all(resourcePacks.concat(studies).map(async value=>{const path=relativeFile(value),bytes=await sourceBytes(sourceRoot,path);return {path,bytes:bytes.length,sha256:digest(bytes)};}));
  const sourceRevision=git(sourceRoot,'rev-parse','HEAD'),sourceTree=git(sourceRoot,'rev-parse','HEAD^{tree}');
  const buildId=digest(JSON.stringify({version,sourceRevision,sourceTree,development,files,selected}));
  const base={schema:'ingenium-release/1',version,sourceRevision,sourceTree,buildId,...(development?{development:true,sourceContentSHA256:digest(JSON.stringify({files,selected}))}:{})};
  await mkdir(output); await mkdir(join(output,'stages'));
  const artifactVersion=version+(development?`-development-${buildId.slice(0,12)}`:'');
  const artifacts=[],archiveContents=[];
  async function pack(id,flavor,stage,extension,max,openingFile) {
    const members=await inventory(stage),name=`${id}-${artifactVersion}.${extension}`,path=join(output,name);
    archive(sourceRoot,stage,path,extension); const bytes=await readFile(path); checkBudget(bytes.length,max,id);
    const actual=inspectArchive(sourceRoot,path,extension),expected=members.map(m=>({...m,path:(extension==='tgz'?'package/':'')+m.path}));
    if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Archived member closure differs from staged files');
    archiveContents.push({artifact:id,files:actual});
    artifacts.push({id,flavor,path:name,bytes:bytes.length,sha256:digest(bytes),...(openingFile?{openingFile}:{})});
    return members;
  }
  const guidanceIdentity={...base,artifactFlavor:'guidance'};
  await writeFile(join(output,'stages/guidance-identity.json'),JSON.stringify(guidanceIdentity,null,2)+'\n',{flag:'wx'});
  const guidanceName=`ingenium-guidance-${artifactVersion}.zip`;
  execFileSync('python3',[join(sourceRoot,'tools/build-skill-zip.py'),join(output,guidanceName),sourceRoot,join(output,'stages/guidance-identity.json')],{stdio:'pipe'});
  const guidance=await readFile(join(output,guidanceName));
  archiveContents.push({artifact:'guidance',files:inspectArchive(sourceRoot,join(output,guidanceName),'zip')});
  checkBudget(guidance.length,512*1024,'Guidance');
  artifacts.push({id:'guidance',flavor:'guidance',path:guidanceName,bytes:guidance.length,sha256:digest(guidance),openingFile:'ingenium/SKILL.md'});
  const companion=await stageCompanion(join(output,'stages/companion'),{sourceRoot,identity:{...base,artifactFlavor:'inspection-tools'}});
  checkBudget(companion.sourceBytes,384*1024,'Companion source');
  await pack('inspection-tools','inspection-tools',companion.outputDir,'tgz',96*1024,'package/README.md');
  const core=await stageCore(join(output,'stages/core'),{sourceRoot,identity:{...base,artifactFlavor:'core-tools'}});
  await pack('core-tools','core-tools',core.outputDir,'tgz',2*1024*1024,'package/README.md');
  for(const [flavor,manifests] of [['resource-pack',resourcePacks],['editable-study',studies]])for(const manifestPath of manifests) {
    const manifestBytes=await sourceBytes(sourceRoot,relativeFile(manifestPath));
    if(digest(manifestBytes)!==selected.find(s=>s.path===manifestPath).sha256)throw Error('Selected manifest changed during staging');
    const manifest=JSON.parse(manifestBytes.toString());
    if(manifest.schema!=='ingenium-release-selection/1'||!/^[-a-z0-9]+$/.test(manifest.id)||!Array.isArray(manifest.files)||!manifest.files.length||!Array.isArray(manifest.notices)||!manifest.notices.length)throw Error('Expected explicit release selection manifest with id, files and full notices');
    if(artifacts.some(a=>a.id===manifest.id))throw Error('Duplicate artifact ID');
    const names=new Set();
    for(const item of manifest.files) { relativeFile(item.path); if(item.path.split('/').some(p=>['work','node_modules','.git','.env'].includes(p)))throw Error('Private or working-data selection refused'); if(names.has(item.path))throw Error('Duplicate selected member'); names.add(item.path); const bytes=await sourceBytes(sourceRoot,item.path); if(item.bytes!==bytes.length||item.sha256!==digest(bytes))throw Error(`Selected member identity changed: ${item.path}`); }
    const generated=Object.create(null),sourceNames=new Set(names);
    if(manifest.generatedFiles!==undefined&&(!Array.isArray(manifest.generatedFiles)||manifest.generatedFiles.length>64))throw Error('Expected at most64 generated text files');
    for(const item of manifest.generatedFiles??[]) {
      relativeFile(item.path);
      if(item.path.split('/').some(p=>['work','node_modules','.git','.env'].includes(p)))throw Error('Private or working-data generated path refused');
      if(names.has(item.path)||typeof item.text!=='string')throw Error('Duplicate generated member or missing UTF-8 text');
      const bytes=Buffer.from(item.text,'utf8');
      if(bytes.length>1024*1024||bytes.length!==item.bytes||digest(bytes)!==item.sha256)throw Error('Generated member byte identity or1MiB bound mismatch');
      names.add(item.path);generated[item.path]=item.text;
    }
    for(const notice of manifest.notices)if(!sourceNames.has(relativeFile(notice))||(await sourceBytes(sourceRoot,notice)).length===0)throw Error('Full selected source notice is missing or empty');
    if(!names.has(relativeFile(manifest.openingFile)))throw Error('Selected openingFile missing');
    if(flavor==='editable-study'&&(!manifest.instructions||!names.has(relativeFile(manifest.instructions))))throw Error('Editable study requires included opening/editing instructions');
    const maxCompressed=manifest.maxCompressedBytes??10*1024*1024,maxSource=manifest.maxSourceBytes??50*1024*1024;
    if(!Number.isSafeInteger(maxCompressed)||maxCompressed<1||!Number.isSafeInteger(maxSource)||maxSource<1)throw Error('Invalid selected budgets');
    const staged=await stageFiles({sourceRoot,outputDir:join(output,'stages',manifest.id),files:manifest.files.map(f=>f.path),identity:{...base,artifactFlavor:flavor},generated:{...generated,'release/selection.json':manifest}});
    checkBudget(staged.sourceBytes,maxSource,manifest.id+' source');
    await pack(manifest.id,flavor,staged.outputDir,'zip',maxCompressed,manifest.openingFile);
  }
  // Detect a concurrently edited tree before declaring a complete preparation.
  for(const selection of selected)if(digest(await sourceBytes(sourceRoot,selection.path))!==selection.sha256)throw Error('Selected manifest changed during staging');
  if(JSON.stringify(files)!==JSON.stringify(await sourceInventory(sourceRoot))||sourceRevision!==git(sourceRoot,'rev-parse','HEAD'))throw Error('Source changed during staging; retain incomplete output and prepare again');
  const stagedContent=[];
  for(const name of ['companion','core',...artifacts.filter(a=>['resource-pack','editable-study'].includes(a.flavor)).map(a=>a.id)])stagedContent.push({stage:name,files:await inventory(join(output,'stages',name))});
  await writeFile(join(output,'source-content.json'),JSON.stringify({schema:'ingenium-release-content/1',development,files,selected,stagedContent,archiveContents},null,2)+'\n',{flag:'wx'});
  const manifest={schema:'ingenium-release-artifacts/1',version,sourceRevision,sourceTree,buildId,prepared:true,published:false,artifacts};
  await writeFile(join(output,'artifacts.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  return {...manifest,outputDir:output,development,installed:false,deployed:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);if(args.length<1||args.some((x,i)=>i>0&&x!=='--development'))throw Error('Usage: node tools/prepare-release.mjs NEW_OUTPUT_DIRECTORY [--development]');
  console.log(JSON.stringify(await prepareRelease({outputDir:args[0],development:args.includes('--development')}),null,2));
}
