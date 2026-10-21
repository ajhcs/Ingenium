import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
if (!process.argv[2]) throw new Error('Usage: node build-inventory.mjs MATERIAL_UI_SOURCE_DIR');
const source = path.resolve(process.argv[2]);
const output = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const pin = '2a8f217d7919d80d8760a7b63d6d97a70530deaf';
const observedPin=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(observedPin!==pin) throw new Error('Selected source does not match the reviewed commit');
const files = execFileSync('git',['-C',source,'ls-files','-s'],{encoding:'utf8',maxBuffer:30_000_000}).trim().split('\n').map(line=>{const [meta,p]=line.split('\t');return {path:p,gitBlob:meta.split(' ')[1],gitMode:meta.split(' ')[0]};});
const readBytes=x=>x.gitMode==='120000'?execFileSync('git',['-C',source,'show',`${pin}:${x.path}`]):fs.readFileSync(path.join(source,x.path));
const skills=files.filter(x=>/(^|\/)SKILL\.md$/.test(x.path));
const skillSupport=files.filter(x=>x.path.startsWith('skills/')||x.path.startsWith('.agents/skills/')||x.path.startsWith('.claude/skills/'));
const selectedDocs = new Set([
'docs/data/material/guides/composition/composition.md','docs/data/material/guides/testing/testing.md','docs/data/material/guides/responsive-ui/responsive-ui.md',
'docs/data/material/customization/focus-visible/focus-visible.md','docs/data/material/customization/density/density.md','docs/data/material/customization/right-to-left/right-to-left.md','docs/data/material/customization/overriding-component-structure/overriding-component-structure.md',
'docs/data/material/components/autocomplete/autocomplete.md','docs/data/material/components/tabs/tabs.md']);
const operational = new Set(['AGENTS.md','CLAUDE.md','scripts/README.md','LICENSE','packages/mui-icons-material/lib/LICENSE']);
const docs=files.filter(x=>/^docs\/data\/(material|system)\//.test(x.path)&&/\.md$/.test(x.path));
const included = new Map([...skillSupport,...docs,...files.filter(x=>operational.has(x.path))].map(x=>[x.path,x]));
const records=[...included.values()].sort((a,b)=>a.path.localeCompare(b.path)).map(x=>{
 const bytes=readBytes(x); const content=bytes.toString('utf8');
 const full=skillSupport.some(s=>s.path===x.path)||operational.has(x.path)||selectedDocs.has(x.path);
 return {...x,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),kind:/SKILL\.md$/.test(x.path)?'skill-entrypoint':skillSupport.some(s=>s.path===x.path)?'skill-support':operational.has(x.path)?'operational-or-license':'domain-documentation',readStatus:full?'full-content-reviewed':'indexed-bytes-and-headings-only',headings:content.split(/\r?\n/).filter(l=>/^#{1,4} /.test(l)),scope:full?'semantic review conducted':'not claimed as full semantic reading'};
});
const byPath=new Map(records.map(x=>[x.path,x]));
const edges=[];
for (const f of skillSupport){
 const content=readBytes(f).toString('utf8').replace(/```[\s\S]*?```/g,'');
 for(const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  let link=match[1]; let local=null;
  if(link.startsWith('#'))continue;
  if(!/^[a-z]+:/i.test(link)&&!link.startsWith('/'))local=path.posix.normalize(path.posix.join(path.posix.dirname(f.path),link.split('#')[0]));
  else if(link.startsWith('https://mui.com/')){
   const route=link.replace('https://mui.com/','').split('#')[0].replace(/\.md$/,'').replace(/\/$/,'');
   const parts=route.split('/'); const product=parts.shift()==='material-ui'?'material':'system';
   if(parts[0]?.startsWith('react-')){parts[0]='components';parts.push(route.split('/').at(-1).replace('react-',''));}
   const base=`docs/data/${product}/${parts.join('/')}`; const candidate=`${base}/${parts.at(-1)}.md`;
   if(files.some(x=>x.path===candidate))local=candidate;
  }
  if(local?.endsWith('/')&&files.some(x=>x.path===`${local}AGENTS.md`))local+='AGENTS.md';
  const present=local&&files.some(x=>x.path===local);
  edges.push({from:f.path,link,target:local,status:local?(present?'local-present':'local-missing'):'external-or-route-unresolved',targetReadStatus:byPath.get(local)?.readStatus??'not-read-in-this-checkpoint'});
 }
}
const summary={source:'https://github.com/mui/material-ui',pin,defaultBranch:'master',commitTime:'2026-10-21T21:37:40Z',classification:'React component monorepo with seven actual skill entrypoints; four integration skills, canonical review skill plus Claude shim, and release skill',trackedFiles:files.length,skillEntrypoints:skills.length,skillSupportFiles:skillSupport.length,relevantDomainDocuments:docs.length,inventoryRecords:records.length,fullContentReviewed:records.filter(x=>x.readStatus==='full-content-reviewed').length,indexedOnly:records.filter(x=>x.readStatus!=='full-content-reviewed').length,selectedDomainDocsReviewed:selectedDocs.size,linkEdges:edges.length,localLinksPresent:edges.filter(x=>x.status==='local-present').length,localLinksMissing:edges.filter(x=>x.status==='local-missing').length,externalOrUnresolved:edges.filter(x=>x.status==='external-or-route-unresolved').length,sha256Basis:'exact working-tree bytes; gitBlob separately identifies immutable committed blob (checkout line endings can differ)',limits:'Checkpoint requested by team lead to free synthesis slot. All seven skills and all their colocated support files reviewed; material/system Markdown docs systematically indexed, only nine selected domain docs fully reviewed. No demos, UI behavior, implementation, browser, or accessibility conformance executed.'};
fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify({summary,records},null,2)+'\n');
fs.writeFileSync(path.join(output,'local-reference-links.json'),JSON.stringify(edges,null,2)+'\n');
const cols=['path','gitBlob','bytes','sha256','kind','readStatus'];
fs.writeFileSync(path.join(output,'inventory.csv'),cols.join(',')+'\n'+records.map(x=>cols.map(k=>'"'+String(x[k]).replaceAll('"','""')+'"').join(',')).join('\n')+'\n');
fs.copyFileSync(path.join(source,'LICENSE'),path.join(output,'LICENSE-MUI.txt'));
fs.writeFileSync(path.join(output,'coverage.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
