/** Explicit local SVG packs: metadata paging does not admit or render every listed asset. */
import {readFile,lstat,realpath,mkdir,writeFile,open} from 'node:fs/promises';
import {resolve,dirname,join,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {validateIconSvg} from '../assets/svg.mjs';
import {customizeSymbol} from '../assets/packages.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const word=s=>typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&s.length<=128;
const plain=x=>x&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const fail=m=>{throw new Error(m);};
const text=(s,n=256)=>typeof s==='string'&&s.length>0&&s.length<=n;
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function utf8(b){let s;try{s=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);}catch{fail('Source/notice must be lossless UTF-8');}if(!Buffer.from(s,'utf8').equals(b))fail('Source/notice UTF-8 roundtrip mismatch');return s;}
function inside(root,name){if(!text(name,512)||isAbsolute(name)||/[\\\0]/.test(name)||name.split('/').some(x=>!x||x==='.'||x==='..'))fail('Expected pack-relative file');const p=resolve(root,name);if(!p.startsWith(root+sep))fail('Pack path escaped root');return p;}
async function bytes(file,max){const p=resolve(file),s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.size>max||await realpath(p)!==p)fail('Expected bounded canonical regular pack file');const b=await readFile(p);if(b.length>max)fail('Pack byte bound exceeded');return b;}
function labels(v){return Array.isArray(v)&&v.length<=32&&new Set(v).size===v.length&&v.every(s=>text(s,100));}
async function rangeBytes(root,blob){
 const p=inside(root,blob.file),stat=await lstat(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16000000||await realpath(p)!==p||blob.offset+blob.length>stat.size)fail('Expected bounded canonical source blob and in-range selection');
 const handle=await open(p,'r'),out=Buffer.alloc(blob.length);try{let n=0;while(n<out.length){const r=await handle.read(out,n,out.length-n,blob.offset+n);if(!r.bytesRead)fail('Truncated source blob');n+=r.bytesRead;}}finally{await handle.close();}return out;
}
function selectPage(entries,{query='',category,tag,offset=0,limit=12}={}){
 if(typeof query!=='string'||query.length>128||!Number.isSafeInteger(offset)||offset<0||offset>50000||!Number.isSafeInteger(limit)||limit<1||limit>32||[category,tag].some(s=>s!==undefined&&!text(s,100)))fail('Expected bounded query, filters and page offset/limit1..32');
 const q=query.toLowerCase(),filtered=entries.filter(e=>(!q||[e.id,e.title,...e.tags,...e.inferredTags].some(t=>t.toLowerCase().includes(q)))&&(!category||e.categories.includes(category))&&(!tag||e.tags.includes(tag)||e.inferredTags.includes(tag)));
 return{total:filtered.length,offset,limit,nextOffset:offset+limit<filtered.length?offset+limit:null,entries:structuredClone(filtered.slice(offset,offset+limit))};
}
export function createSvgPackLibrary({manifestPath,parserDir}={}){
 if(typeof manifestPath!=='string'||!manifestPath.trim())fail('Explicit manifestPath required');
 const file=resolve(manifestPath),root=dirname(file);let snapshot;
 async function load(){
  if(snapshot)return snapshot;
  const raw=await bytes(file,8*1024*1024),m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  if(!plain(m)||m.schema!=='ingenium-svg-pack/1'||!word(m.id)||!text(m.title)||!text(m.version,128)||!/^https:\/\//.test(m.sourceURL??'')||!plain(m.license)||!text(m.license.spdx,100)||!/^[a-f0-9]{64}$/.test(m.license.sha256??'')||!text(m.license.scope,2048)||!Array.isArray(m.entries)||m.entries.length<1||m.entries.length>50000)fail('Unsupported bounded SVG pack manifest');
  inside(root,m.license.file);const ids=new Set();
  for(const e of m.entries){
   if(!plain(e)||!word(e.id)||ids.has(e.id)||!text(e.title)||!labels(e.categories??[])||!labels(e.tags??[])||!labels(e.inferredTags??[])||![undefined,'available','metadata-only','redistribution-prohibited'].includes(e.availability))fail('Invalid, duplicate or unbounded pack entry');
   ids.add(e.id);if(e.availability===undefined||e.availability==='available'){
    if(!/^[a-f0-9]{64}$/.test(e.sha256??''))fail('Available source requires exact SHA256');
    if(e.blob){if(!plain(e.blob)||e.file!==undefined||!Number.isSafeInteger(e.blob.offset)||e.blob.offset<0||!Number.isSafeInteger(e.blob.length)||e.blob.length<1||e.blob.length>524288)fail('Expected exact bounded SVG blob range');inside(root,e.blob.file);}else inside(root,e.file);
   }
   if(e.license){if(!plain(e.license)||!text(e.license.spdx,100)||!/^[a-f0-9]{64}$/.test(e.license.sha256??'')||!text(e.license.scope,2048))fail('Entry license requires exact notice and scope');inside(root,e.license.file);}
   for(const key of ['upstreamOriginal','normalization'])if(e[key]){if(!plain(e[key])||!/^[a-f0-9]{64}$/.test(e[key].sha256??''))fail('Original/normalization records require exact file hashes');inside(root,e[key].file);}
   e.categories??=[];e.tags??=[];e.inferredTags??=[];
  }
  m.entries.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);snapshot={manifest:m,manifestSHA256:hash(raw)};return snapshot;
 }
 async function search(options){const {manifest:m,manifestSHA256}=await load();return{pack:{id:m.id,title:m.title,version:m.version,sourceURL:m.sourceURL,manifestSHA256},...selectPage(m.entries,options),taxonomy:structuredClone(m.taxonomy??{meaning:'Pack-authored taxonomy; no upstream semantic-tag claim'}),tagMeaning:'tags/categories are pack-supplied; taxonomy records source versus authored provenance. inferredTags are name tokens, not reliable semantic annotation',admission:'Metadata only; availability and entry-specific rights may differ. Selected SVG admission and rights-byte verification happen on inspect/acquire'};}
 async function categories(){const {manifest:m}=await load(),groups=new Map();for(const e of m.entries)for(const c of e.categories)groups.set(c,(groups.get(c)??0)+1);return{id:m.id,version:m.version,total:m.entries.length,categories:[...groups].sort(([a],[b])=>a<b?-1:1).map(([id,count])=>({id,count})),tagsAvailable:m.entries.some(e=>e.tags.length),inferredTagsAvailable:m.entries.some(e=>e.inferredTags.length)};}
 async function inspect({id}={}){
  if(!word(id))fail('Expected selected entry id');const {manifest:m,manifestSHA256}=await load(),e=m.entries.find(e=>e.id===id);if(!e)fail('Unknown selected entry');
  if(e.availability&&e.availability!=='available')fail('Entry is metadata-only or redistribution-prohibited; catalog listing does not authorize acquisition');
  const license=e.license??m.license,raw=e.blob?await rangeBytes(root,e.blob):await bytes(inside(root,e.file),524288),notice=await bytes(inside(root,license.file),65536);
  if(hash(raw)!==e.sha256||hash(notice)!==license.sha256||notice.length<100)fail('Selected source/notice hash or length mismatch');
  const extra={};for(const key of ['upstreamOriginal','normalization'])if(e[key]){const b=await bytes(inside(root,e[key].file),key==='normalization'?65536:524288);if(hash(b)!==e[key].sha256)fail('Upstream original/normalization hash mismatch');extra[key]=utf8(b);}
  const admitted=validateIconSvg(raw,{parserDir});return{pack:{id:m.id,title:m.title,version:m.version,sourceURL:m.sourceURL,manifestSHA256},entry:structuredClone(e),originalSVG:extra.upstreamOriginal??utf8(raw),preparedSVG:utf8(raw),normalization:extra.normalization??null,previewSVG:admitted.safe,license:{...structuredClone(license),text:utf8(notice)},policy:admitted.policy,limits:'Selected static SVG only; no glyph rewriting, universal source compatibility or trademark/legal acceptance'};
 }
 async function acquire({id,selected,customize,outputDir}={}){
  if(selected!==true||typeof outputDir!=='string'||!outputDir.trim())fail('Explicit selected:true and new outputDir required');
  const d=await inspect({id});if(customize!==undefined&&d.entry.editingAllowed===false)fail('Selected entry does not permit this editing route');
  const derived=customize===undefined?d.previewSVG:customizeSymbol(d.previewSVG,customize,{parserDir}).svg;
  const artifacts={'original.svg':d.originalSVG,'safe.svg':d.previewSVG,'derived.svg':derived,'LICENSE.txt':d.license.text,'selection.json':JSON.stringify({pack:d.pack,id,selected:true,customize:customize??null},null,2)+'\n'};
  if(d.entry.upstreamOriginal)artifacts['prepared.svg']=d.preparedSVG;if(d.normalization!==null)artifacts['normalization.json']=d.normalization;
  const provenance={schema:'ingenium-svg-selection/1',pack:d.pack,entry:d.entry,license:{...d.license,text:undefined},controls:customize??null,admissionPolicy:d.policy,files:Object.fromEntries(Object.entries(artifacts).map(([n,b])=>[n,{bytes:Buffer.byteLength(b),sha256:hash(b)}])),limits:d.limits};
  const out=resolve(outputDir);if(await realpath(dirname(out))!==dirname(out))fail('Output parent must exist and be canonical');await mkdir(out);
  for(const[n,b]of Object.entries(artifacts))await writeFile(join(out,n),b,{flag:'wx'});await writeFile(join(out,'provenance.json'),JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});
  return{status:'acquired',outputDir:out,...provenance};
 }
 async function preview({ids,outputDir}={}){
  if(!Array.isArray(ids)||!ids.length||ids.length>12||new Set(ids).size!==ids.length||ids.some(id=>!word(id))||typeof outputDir!=='string'||!outputDir.trim())fail('Select1..12 unique ids and new preview outputDir');
  const out=resolve(outputDir);if(await realpath(dirname(out))!==dirname(out))fail('Preview parent must exist and be canonical');
  // Admission/rights checks precede output creation. Existing files are never replaced.
  const details=[];for(const id of ids)details.push(await inspect({id}));await mkdir(out);
  const cells=[];for(let i=0;i<ids.length;i++){await acquire({id:ids[i],selected:true,outputDir:join(out,'entry-'+i)});cells.push(`<figure><img width="96" height="96" src="entry-${i}/derived.svg" alt="${esc(details[i].entry.title)}"><figcaption>${esc(ids[i])}</figcaption></figure>`);}
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'"><title>Selected SVG pack previews</title><style>body{font:16px/1.4 sans-serif;padding:24px}main{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0;padding:16px;border:1px solid #bbb}figcaption{max-width:160px;overflow-wrap:anywhere}</style><h1>${esc(details[0].pack.title)}</h1><p>Selected technical previews. Notices and provenance accompany each selection; trademark or user acceptance is not inferred.</p><main>${cells.join('')}</main></html>`;
  await writeFile(join(out,'index.html'),html,{flag:'wx'});return{outputDir:out,previewPath:join(out,'index.html'),selected:ids};
 }
 return Object.freeze({search,categories,inspect,acquire,preview,refresh(){snapshot=undefined;}});
}
