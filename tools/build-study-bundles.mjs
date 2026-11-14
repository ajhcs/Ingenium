import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const makeGenerated=(path,text)=>({path,text,bytes:Buffer.byteLength(text),sha256:hash(Buffer.from(text))});
async function enumerate(relative) {
 const full=path.join(root,relative), stat=await fs.lstat(full);
 if(stat.isSymbolicLink())throw Error('Symlink unsupported: '+relative);
 if(stat.isDirectory()) {
  const entries=[]; for(const name of (await fs.readdir(full)).sort())entries.push(...await enumerate(path.posix.join(relative,name)));return entries;
 }
 if(!stat.isFile())throw Error('Unsupported source: '+relative);
 const data=await fs.readFile(full);return [{path:relative,bytes:data.length,sha256:hash(data)}];
}
// The same inventory feeds site ZIPs and release selection manifests.
export async function studySelections() {
 const manifest=JSON.parse(await fs.readFile(path.join(root,'examples/process/manifest.json'),'utf8'));
 const cases=manifest.studies.map(s=>({id:s.id,kind:'process',roots:[`examples/process/${s.id}`,'examples/process/fonts','examples/process/README.md','README.md','LICENSE','tools/export-study-svg.mjs','docs/study-export.md'],opening:`examples/process/${s.id}/source/final-01.svg`}));
 cases.push({id:'fieldwork',kind:'fieldwork',roots:['site/studies/fieldwork','site/assets/mark.svg','LICENSE'],opening:'site/studies/fieldwork/standalone.html'});
 cases.push({id:'field-station-engineering-graphic',kind:'evolution',roots:['examples/evolution/engineering-graphic','examples/evolution/brief.json','examples/evolution/CSE-LICENSE.txt','LICENSE'],opening:'examples/evolution/engineering-graphic/generated/revised.svg'});
 cases.push({id:'field-station-document',kind:'evolution',roots:['examples/evolution/document','examples/evolution/brief.json','examples/evolution/CSE-LICENSE.txt','LICENSE'],opening:'examples/evolution/document/revised.html'});
 cases.push({id:'field-station-website',kind:'evolution',roots:['examples/evolution/website','examples/evolution/document','examples/evolution/brief.json','examples/evolution/CSE-LICENSE.txt','LICENSE'],opening:'examples/evolution/website/index.html'});
 const selections=[];
 for(const item of cases) {
  if(!/^[a-z0-9-]+$/.test(item.id))throw Error('Invalid ID');
  const files=(await Promise.all(item.roots.map(enumerate))).flat().sort((a,b)=>a.path.localeCompare(b.path));
  if(new Set(files.map(f=>f.path)).size!==files.length)throw Error('Duplicate source path');
  const editability=[];
  for(const file of files.filter(f=>f.path.endsWith('.svg'))) {
   const s=await fs.readFile(path.join(root,file.path),'utf8');
   editability.push({path:file.path,text:(s.match(/<text(?:\s|>)/g)||[]).length,paths:(s.match(/<path(?:\s|>)/g)||[]).length,images:(s.match(/<image(?:\s|>)/g)||[]).length,embeddedDataReferences:(s.match(/data:(?:image|font)\//g)||[]).length});
  }
  const generated=[];
  if(item.kind==='fieldwork') {
   const source=await fs.readFile(path.join(root,'site/studies/fieldwork/index.html'),'utf8');
   const paragraph='<p>Fictional Ingenium website study. <a href="../">Return to studies</a> · <a href="https://github.com/ajhcs/Ingenium/tree/main/site/studies/fieldwork">View source</a> · <a href="../../downloads/studies/fieldwork.zip" download>Download project</a></p>';
   if(!source.includes(paragraph))throw Error('Fieldwork navigation adaptation no longer matches source');
   generated.push(makeGenerated(item.opening,source.replace(paragraph,'<p>Fictional Ingenium website study. This standalone copy omits links to the parent site. The unmodified served source is index.html.</p>')));
  }
  const note=item.kind==='process'?`Open ${item.opening} in an SVG editor or browser. Other source SVGs and asset-kit files are separate editable elements. Text elements remain text where present; bespoke lettering may be vector paths. Embedded artwork can be raster and is not vector-editable. PNG stages are previews. Fonts and full notices are under examples/process/fonts. Native-editor and print behavior are not certified.`:item.kind==='fieldwork'?`Open ${item.opening} in a browser. This generated standalone adaptation removes parent-site navigation; site/studies/fieldwork/index.html retains the exact served source. HTML, CSS and JavaScript are editable and font notices accompany them. Wider browser and audience testing remain open.`:`Open ${item.opening}. The neighboring README describes editing and continuation. Sources and the CSE license are retained. Generic fonts depend on the local environment; native-editor and print behavior are not certified.`;
  const finals=item.kind==='process'?files.filter(f=>new RegExp(`^examples/process/${item.id}/source/final-\\d+\\.svg$`).test(f.path)):[];
  const exportNote=finals.length?'\n\n## Export an edited final\n\nThe standalone exporter and its [guide](docs/study-export.md) are included. Requires Node 22+, an explicitly selected existing Playwright module and Chromium executable. Save edits to a separate SVG and substitute that path below. Run from this extracted bundle root; each command needs a new output directory. No clone, staging, packing or installation is required.\n\n```sh\n'+finals.map((f,i)=>`node tools/export-study-svg.mjs --trusted-study --playwright-module /absolute/existing/node_modules/playwright --executable-path /absolute/existing/chromium --asset-root examples/process/${item.id}/source ${f.path} export-final-${String(i+1).padStart(2,'0')}`).join('\n')+'\n```\n\nInspect export-final-NN/export.png and its export.json receipt. Only status pass is a completed export; source hashes must remain unchanged. Embedded fonts/styles/filters/patterns use the selected Chromium. Native-editor, print and design acceptance remain separate.\n':'';
  generated.push(makeGenerated('OPENING.md','# Opening and editability\n\n'+note+exportNote+'\n'));
  generated.push(makeGenerated('inventory.json',JSON.stringify({schema:'ingenium-study-bundle/1',openingFile:item.opening,files,svgElementInventory:editability,interpretation:'Text and path counts identify elements, not whether every path is outlined lettering. Embedded images may be raster.'},null,2)+'\n'));
  const notices=files.filter(f=>f.path==='LICENSE'||f.path.endsWith('/LICENSE.txt')||f.path.endsWith('/CSE-LICENSE.txt')||/\/notice-\d-.*\.txt$/.test(f.path)).map(f=>f.path);
  selections.push({schema:'ingenium-release-selection/1',id:item.id,files,notices,openingFile:item.opening,instructions:'OPENING.md',generatedFiles:generated,maxCompressedBytes:30*1024*1024,maxSourceBytes:80*1024*1024});
 }
 return selections;
}
export async function writeStudySelections(destination,selections) {
 selections ??= await studySelections();
 await fs.mkdir(destination,{recursive:true});const paths=[];
 for(const selection of selections){const p=path.join(destination,selection.id+'.json');await fs.writeFile(p,JSON.stringify(selection,null,2)+'\n',{flag:'wx'});paths.push(p);}
 return paths;
}
export async function developmentStudyIdentity(selection) {
 const run=(...args)=>{const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});return result.status===0?result.stdout.trim():null;};
 const packageJson=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 const members=[...selection.files,...selection.generatedFiles].map(({path,bytes,sha256})=>({path,bytes,sha256})).sort((a,b)=>a.path.localeCompare(b.path));
 return {schema:'ingenium-development-study-identity/1',delivery:'development',scope:'source-snapshot',prepared:false,packageVersion:packageJson.version,studyId:selection.id,source:{commit:run('rev-parse','HEAD'),headTree:run('rev-parse','HEAD^{tree}'),worktreeDirty:(()=>{const value=run('status','--porcelain','--untracked-files=normal');return value===null?null:value.length>0;})(),scope:'Git identity describes HEAD and sampled worktree status; delivered selected bytes may differ from HEAD.'},selection:{sha256:hash(Buffer.from(JSON.stringify(members))),members:members.length,scope:'Sorted path/byte-length/SHA256 records of exact source and generated members, excluding STUDY-IDENTITY.json itself.'}};
}
export async function buildStudyBundles(destination) {
 const selections=await studySelections();await fs.mkdir(destination,{recursive:true});
 const python=String.raw`import sys,json,zipfile,os,hashlib
root,out=sys.argv[1:]; s=json.load(sys.stdin)
with zipfile.ZipFile(out,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in s['files']:
  data=open(os.path.join(root,f['path']),'rb').read()
  if len(data)!=f['bytes'] or hashlib.sha256(data).hexdigest()!=f['sha256']: raise ValueError('source changed: '+f['path'])
  z.writestr(f['path'],data)
 for f in s['generatedFiles']:
  data=f['text'].encode()
  if len(data)!=f['bytes'] or hashlib.sha256(data).hexdigest()!=f['sha256']: raise ValueError('generated identity mismatch')
  z.writestr(f['path'],data)
`;
 const matrix=[];
 for(const selection of selections){selection.generatedFiles.push(makeGenerated('STUDY-IDENTITY.json',JSON.stringify(await developmentStudyIdentity(selection),null,2)+'\n'));const output=path.join(destination,selection.id+'.zip');const run=spawnSync('python3',['-c',python,root,output],{input:JSON.stringify(selection),encoding:'utf8',maxBuffer:1024*1024});if(run.status!==0)throw Error(run.stderr||'Bundle failed');matrix.push({id:selection.id,path:selection.id+'.zip',bytes:(await fs.stat(output)).size});}
 await fs.writeFile(path.join(destination,'inventory.json'),JSON.stringify({schema:'ingenium-study-downloads/1',studies:matrix},null,2)+'\n');return matrix;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(process.argv.length!==3)throw Error('Usage: node tools/build-study-bundles.mjs NEW_OUTPUT_DIRECTORY');
 try{await fs.lstat(process.argv[2]);throw Error('Output exists');}catch(e){if(e.code!=='ENOENT')throw e;}
 console.log(JSON.stringify(await buildStudyBundles(path.resolve(process.argv[2]))));
}
