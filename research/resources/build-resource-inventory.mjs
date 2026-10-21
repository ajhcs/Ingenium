// Original study helper: inventories metadata and hashes selected source bytes.
// Does not execute upstream code or retrieve network data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {execFileSync} from 'node:child_process';
if(!process.argv[2])throw Error('Usage: node build-resource-inventory.mjs SOURCE_DIRECTORY');
const root=path.resolve(process.argv[2]);
const out=import.meta.dirname;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const candidate=p=>/\.md$/i.test(p)||/(^|\/)(license|licence|copying|ofl|notice)(\.(md|txt))?$/i.test(p)||/(^|\/)[^/]*license[^/]*\.txt$/i.test(p);
const summary=[];
const inventory=[];
for(const name of ['nerd-fonts','design-resources-for-developers','material-design-icons']){
 const dir=path.join(root,name),pin=JSON.parse(fs.readFileSync(path.join(dir,'pin.json')));
 const paths=[],counts={},skills=[];
 let total=0;
 function inspect(p,sha,size){
  total++; const top=p.includes('/')?p.split('/')[0]:'[root]'; counts[top]=(counts[top]??0)+1;
  if(/(^|\/)skill\.md$/i.test(p))skills.push({path:p,gitBlobSHA1:sha});
  if(candidate(p))paths.push({path:p,gitBlobSHA1:sha,...(size===undefined?{}:{sourceBytes:size})});
 }
 if(name==='material-design-icons'){
  const stream=fs.createReadStream(path.join(dir,'complete-tree.tsv'));
  for await(const line of readline.createInterface({input:stream,crlfDelay:Infinity})){
   const m=/^\d+ blob ([0-9a-f]{40})\t(.+)$/.exec(line);if(m)inspect(m[2],m[1]);
  }
 }else{
  const tree=JSON.parse(fs.readFileSync(path.join(dir,'tree.json')));
  if(tree.truncated)throw Error(`Incomplete tree ${name}`);
  for(const x of tree.tree)if(x.type==='blob')inspect(x.path,x.sha,x.size);
 }
 for(const p of paths){
  const local=path.join(dir,'docs',p.path);
  const row={repository:pin.repository,commit:pin.commit,...p,readStatus:'inventoried-not-read',reason:'Family-specific notice/README or contributor/implementation guidance outside selected source scope'};
  if(fs.existsSync(local)){
   const bytes=fs.readFileSync(local); if(blob(bytes)!==p.gitBlobSHA1)throw Error(`Blob mismatch ${name}/${p.path}`);
   Object.assign(row,{bytes:bytes.length,sha256:hash(bytes),readStatus:'read',reason:'Pinned source documentation or exact selected license inspected'});
   if(name==='design-resources-for-developers'&&p.path==='readme.md')Object.assign(row,{readStatus:'structured-complete-scan-and-selected-close-read',reason:'All headings and catalog rows parsed; resource categories relevant to Ingenium close-read; external links not expanded'});
   if(name==='nerd-fonts'&&p.path==='changelog.md')Object.assign(row,{readStatus:'selected-sections-read',reason:'Current through v3.3 read for migration/cell-width evidence; older history inventoried only'});
   if(name==='nerd-fonts'&&['contributing.md','src/glyphs/font-awesome/LICENSE.txt','src/glyphs/codicons/LICENSE.txt'].includes(p.path))Object.assign(row,{readStatus:'selected-sections-read',reason:'Operational/licensing conditions inspected; not all contributor lists or boilerplate semantically reviewed'});
  }
  inventory.push(row);
 }
 summary.push({...pin,treeComplete:true,blobPathsEnumerated:total,actualSkillFiles:skills,documentNoticeCandidates:paths.length,topLevelBlobCounts:counts});
}
fs.writeFileSync(path.join(out,'resource-source-inventory.json'),JSON.stringify({schema:'ingenium-study-source-inventory/1',scope:'All blob paths checked for actual SKILL.md; all markdown and notice candidates enumerated; selected content read. Asset glyphs named license are not notices.',sources:summary,files:inventory},null,2)+'\n');
console.log(JSON.stringify(summary.map(s=>({repository:s.repository,blobPaths:s.blobPathsEnumerated,skills:s.actualSkillFiles.length,docNoticeCandidates:s.documentNoticeCandidates,top:s.topLevelBlobCounts})),null,2));
const readme=fs.readFileSync(path.join(root,'design-resources-for-developers/docs/readme.md'),'utf8');
const sections=[];
for(const match of readme.matchAll(/^## (.+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)){
 const text=match[0], closeRead=['UI Graphics','Fonts','Colors','Icons','Logos','Favicons','Icon Fonts'].includes(match[1]); sections.push({heading:match[1],sha256:hash(Buffer.from(text)),lines:text.split('\n').length,catalogRows:text.split('\n').filter(l=>/^\|/.test(l)&&!/^\|[ -]*\|/.test(l)).length,status:closeRead?'close-read-directory-rows':'heading-and-row-structured-scan',reason:'Directory leads are source metadata, not adopted resources'});
}
fs.writeFileSync(path.join(out,'directory-section-coverage.json'),JSON.stringify({repository:'bradtraversy/design-resources-for-developers',commit:summary.find(s=>s.repository.startsWith('bradtraversy/')).commit,sections},null,2)+'\n');
const repo=path.resolve(out,'../..');
const leaves=['skills/ingenium/SKILL.md','docs/resource-library-status.md',...['resource-libraries','bundled-resources','font-download','font-packs','fonts-catalog','fonts','package-sources','catalog','svg-packs','brand-download','checks','methods/fontplate'].map(x=>`skills/ingenium/references/${x}.md`),'src/resources/index.mjs','src/resources/providers.json','src/catalog/font-download.mjs'];
const baseline='f70db6171196c2c4452bc53eb24e82ba7cad5d9c';
fs.writeFileSync(path.join(out,'resource-ingenium-comparison.json'),JSON.stringify({baseline,hashScope:'gitBlobSHA1 identifies exact baseline object; workingCopySHA256 identifies inspected checkout bytes (may use CRLF)',files:leaves.map(p=>{const bytes=fs.readFileSync(path.join(repo,p));const gitBlobSHA1=execFileSync('git',['-C',repo,'rev-parse',`${baseline}:${p}`],{encoding:'utf8'}).trim();return {path:p,bytes:bytes.length,gitBlobSHA1,workingCopySHA256:hash(bytes),readStatus:['skills/ingenium/references/checks.md','src/catalog/font-download.mjs'].includes(p)?'selected-sections-read':'read-full'};})},null,2)+'\n');
