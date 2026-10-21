// Original research helper: local hashes and source-link indexing only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
if (!process.argv[2]) throw new Error('Usage: node audit-evidence.mjs ANT_DESIGN_SOURCE_DIR (run from the Ingenium checkout root)');
const root=process.cwd();
const output=path.join(root,'research/components');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const baseline=['AGENTS.md','docs/contracts.md','skills/ingenium/SKILL.md',
 ...['design-methods','interaction-sketches','checks','ui','resource-libraries','composition','domains','record-contract'].map(x=>`skills/ingenium/references/${x}.md`),
 ...fs.readdirSync(path.join(root,'skills/ingenium/references/methods')).filter(x=>x.endsWith('.md')).map(x=>`skills/ingenium/references/methods/${x}`)];
fs.writeFileSync(path.join(output,'ingenium-baseline.json'),JSON.stringify({commit:'f70db6171196c2c4452bc53eb24e82ba7cad5d9c',
 status:'source-comparison baseline, not installed-client behavior',files:baseline.map(p=>{const b=fs.readFileSync(path.join(root,p));return{path:p,sha256:sha(b),bytes:b.length,readStatus:'read-full-source-text'};})},null,2)+'\n');
const source=path.resolve(process.argv[2]);
const inv=JSON.parse(fs.readFileSync(path.join(output,'ant-design/inventory.json'),'utf8'));
const paths=new Map(inv.files.map(x=>[x.path,x]));
const readFiles=inv.files.filter(x=>x.category==='actual-skill'||x.category==='skill-local-reference');
const edges=[];
for(const file of readFiles){
 const text=fs.readFileSync(path.join(source,file.path),'utf8');
 for(const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  const raw=m[1];if(raw.startsWith('#'))continue;
  const external=/^[a-z]+:/i.test(raw)||raw.startsWith('/');
  const target=external?null:path.posix.normalize(path.posix.join(path.posix.dirname(file.path),raw.split('#')[0]));
  edges.push({from:file.path,link:raw,target,status:external?'external-or-site-route-not-fetched':fs.existsSync(path.join(source,target))?'local-present':'local-missing',
   readStatus:paths.get(target)?.readStatus??'outside-selected-inventory'});
 }
 // Backtick operational reference leaves are not necessarily Markdown links.
 for(const m of text.matchAll(/`([^`\r\n]+)`/g)){
  const raw=m[1];if(!/^(?:references\/|AGENTS\.md$|\.github\/|scripts\/|package\.json$|CHANGELOG\.)/.test(raw))continue;
  const target=raw.startsWith('references/')?path.posix.join(path.posix.dirname(file.path),raw):raw;
  edges.push({from:file.path,link:raw,target,status:fs.existsSync(path.join(source,target))?'local-present':'placeholder-or-nonexistent',readStatus:paths.get(target)?.readStatus??'outside-selected-inventory',kind:'backtick-operational-reference'});
 }
}
const summary={files:readFiles.length,edges:edges.length,localPresent:edges.filter(x=>x.status==='local-present').length,
 externalOrSite:edges.filter(x=>x.status==='external-or-site-route-not-fetched').length,
 missing:edges.filter(x=>x.status==='local-missing').length,
 policy:'Markdown destinations plus literal local operational backtick references. Site URLs stay external even where local equivalents may exist. Generic source paths/commands, task corpora, generated outputs and dependency implementation are not falsely classified as skill reference leaves.'};
fs.writeFileSync(path.join(output,'ant-design/local-reference-links.json'),JSON.stringify({summary,edges},null,2)+'\n');
console.log(JSON.stringify({baselineFiles:baseline.length,antLinks:summary}));
