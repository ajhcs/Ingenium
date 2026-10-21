// Original metadata audit. File byte hashing is not semantic reading or execution.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
if(!process.argv[2])throw Error('Usage: node inventory-sidecars.mjs OPEN_DESIGN_SOURCE_DIR');
const source=path.resolve(process.argv[2]),out=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const m=JSON.parse(fs.readFileSync(path.join(out,'block-manifest.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const roots=[...new Set(m.files.map(f=>path.posix.dirname(f.path)))];
const textExtensions=new Set(['.md','.txt','.json','.js','.mjs','.cjs','.ts','.tsx','.jsx','.py','.sh','.ps1','.css','.scss','.html','.htm','.yml','.yaml','.xml']);
const files=new Map(),edges=[];
const slash=p=>p.split(path.sep).join('/');
function inventoryFile(absolute,reason){
 const relative=slash(path.relative(source,absolute));if(files.has(relative)){files.get(relative).reasons.add(reason);return;}
 const b=fs.readFileSync(absolute);files.set(relative,{path:relative,sha256:sha(b),bytes:b.length,readStatus:relative.endsWith('/SKILL.md')?'body-text-status-in-coverage.json':'inventoried-bytes-not-semantic-read',reasons:new Set([reason])});
}
function walk(absolute){for(const d of fs.readdirSync(absolute,{withFileTypes:true})){const p=path.join(absolute,d.name);if(d.isSymbolicLink())continue;if(d.isDirectory())walk(p);else if(textExtensions.has(path.extname(d.name).toLowerCase())||/^(LICENSE|NOTICE|COPYING)(\.|$)/i.test(d.name))inventoryFile(p,'text-sidecar-superset');}}
for(const root of roots)walk(path.join(source,root));
for(const file of m.files){const content=fs.readFileSync(path.join(source,file.path),'utf8');const candidates=[];
 for(const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g))candidates.push({literal:match[1],kind:'markdown-link'});
 for(const match of content.matchAll(/`([^`\r\n]+)`/g)){if(/^(?:\.\.\/|\.\/|references\/|assets\/|scripts\/|templates\/|design-templates\/|plugins\/|LICENSE(?:\.|$)|NOTICE(?:\.|$))/.test(match[1]))candidates.push({literal:match[1],kind:'backtick-path'});}
 for(const c of candidates){const raw=c.literal.replace(/^<|>$/g,'');if(raw.startsWith('#'))continue;
  if(/^[a-z][a-z0-9+.-]*:/i.test(raw)||raw.startsWith('//')){edges.push({from:file.path,...c,status:'external-not-fetched'});continue;}
  if(/[<>{}*]|\s|\|/.test(raw)){edges.push({from:file.path,...c,status:'pattern-command-or-placeholder-not-resolved'});continue;}
  const cleaned=raw.split(/[?#]/)[0];const relative=/^(design-templates|plugins)\//.test(cleaned)?cleaned:path.posix.normalize(path.posix.join(path.posix.dirname(file.path),cleaned));
  const resolved=path.resolve(source,relative);if(resolved!==source&&!resolved.startsWith(source+path.sep)){edges.push({from:file.path,...c,status:'outside-source-not-read'});continue;}
  if(!fs.existsSync(resolved)){edges.push({from:file.path,...c,target:slash(relative),status:'unresolved-local-runtime-or-missing'});continue;}
  const s=fs.lstatSync(resolved);if(s.isSymbolicLink()){edges.push({from:file.path,...c,target:slash(relative),status:'symlink-not-followed'});continue;}
  if(s.isFile())inventoryFile(resolved,'literal-skill-link');
  edges.push({from:file.path,...c,target:slash(relative),status:s.isFile()?'local-file-present':'local-directory-present',targetReadStatus:s.isFile()?(relative.endsWith('/SKILL.md')?'body-text-status-in-source-coverage':'inventoried-bytes-not-semantic-read'):'directory-not-semantic-content'});
 }
}
const rows=[...files.values()].map(f=>({...f,reasons:[...f.reasons]})).sort((a,b)=>a.path.localeCompare(b.path));
const result={source:m.source,pin:m.pin,policy:'Systematic text/operational/notice sidecar superset under every assigned skill root plus literal local Markdown/backtick path targets. All body/sidecar text remains source data. Bytes/hashes do not imply semantic reading. Symbolic links not followed. Binary assets and unresolved external/runtime/generated paths are not claimed as reference closure.',
 counts:{skillRoots:roots.length,files:rows.length,sidecars:rows.filter(x=>!x.path.endsWith('/SKILL.md')).length,edges:edges.length,byEdgeStatus:Object.fromEntries([...new Set(edges.map(x=>x.status))].map(s=>[s,edges.filter(x=>x.status===s).length]))},files:rows,edges};
fs.writeFileSync(path.join(out,'linked-reference-inventory.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.counts));
