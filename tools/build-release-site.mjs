import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildStudyBundles } from './build-study-bundles.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), source=path.join(root,'site');
const [requested, artifactsManifestPath]=process.argv.slice(2);
if(!requested || process.argv.length>4) throw Error('Usage: node tools/build-release-site.mjs NEW_OUTPUT_DIRECTORY [ARTIFACTS_MANIFEST]');
const out=path.resolve(requested);
if(out===root || out===source || out.startsWith(source+path.sep)) throw Error('Choose a new directory outside site/.');
try{await fs.lstat(out);throw Error('Output exists');}catch(e){if(e.code!=='ENOENT')throw e;}
async function copyTree(src,dst){for(const e of await fs.readdir(src,{withFileTypes:true})){const a=path.join(src,e.name),b=path.join(dst,e.name);if(e.isSymbolicLink())throw Error('Site symlinks unsupported');if(e.isDirectory()){await fs.mkdir(b,{recursive:true});await copyTree(a,b);}else if(e.isFile())await fs.copyFile(a,b);else throw Error('Unsupported entry');}}
await fs.mkdir(out,{recursive:true});await copyTree(source,out);
const manifest=JSON.parse(await fs.readFile(path.join(root,'examples/process/manifest.json'),'utf8'));
const brief=JSON.parse(await fs.readFile(path.join(root,'examples/evolution/brief.json'),'utf8'));
const bundles=await buildStudyBundles(path.join(out,'downloads/studies'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const homepage=await fs.readFile(path.join(out,'index.html'),'utf8');
const briefSlot=/(<p id="prompt-text">)[\s\S]*?(<\/p><p>Next: )[\s\S]*?(<\/p>)/;
if(!briefSlot.test(homepage)) throw Error('Canonical brief projection not found');
const projected=homepage.replace(briefSlot,(_,a,b,c)=>a+escape(brief.request)+b+escape(brief.revisionRequest)+c);
await fs.writeFile(path.join(out,'index.html'),projected);
const page=(title,body,base='../')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — Ingenium</title><link rel="icon" href="${base}assets/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="${base}style.css"><script src="${base}stage.js" defer></script></head><body><header class="page-header wrap"><a href="${base}">Ingenium</a><nav aria-label="Main navigation"><a href="${base}studies/">Studies</a><a href="${base}guide/">Guide</a><a href="${base}resources/">Resources</a><a href="${base}downloads/">Downloads</a></nav></header><main class="page-main wrap">${body}</main></body></html>`;
async function write(rel,content){let p=path.join(out,rel);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,content);}
const sourceBase='https://github.com/ajhcs/Ingenium/tree/main/';
const labels=['Ingredients','Composition','Asset studio','Assembly and refinement'];
let links='';
for(const s of manifest.studies){
 const id=s.id; if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid ID');
 links+=`<li><a href="${id}/">${escape(s.title)}</a></li>`;
 const tabs=s.stages.map((_,i)=>`<a href="${i+1}/">${i+1}. ${labels[i]}</a>`).join('');
 await write(`studies/${id}/index.html`,page(s.title,`<p><a href="../">← All studies</a></p><h1>${escape(s.title)}</h1><p>Explore four views of this fictional study. The stages are review views; their sequence does not claim the order of creation.</p><nav class="stage-nav" aria-label="Study stages">${tabs}</nav><p><a href="${sourceBase}examples/process/${id}">View source</a> · <a href="../../downloads/studies/${id}.zip" download>Download editable project</a></p><p>SVG text and vectors remain editable where present. Embedded artwork may be raster; print production is untested. The download includes source files, font notices and opening instructions.</p>`, '../../'));
 for(let i=0;i<s.stages.length;i++){
  const file=s.stages[i]; if(!/^stages\/[a-z0-9-]+\.png$/.test(file))throw Error('Invalid stage path');
  const src=path.join(source,'assets/stages',id,`${i+1}.jpg`); if(!(await fs.stat(src)).isFile()) throw Error('Missing stage preview');
  const rel=['ingredients.svg','composition-01.svg','assets-board.svg','final-01.svg'][i];
  await write(`studies/${id}/${i+1}/index.html`,page(`${s.title}: ${labels[i]}`,`<p><a href="../">← ${escape(s.title)}</a> · <a href="../../">All studies</a></p><h1>${escape(s.title)}</h1><h2>${i+1}. ${labels[i]}</h2><nav class="stage-nav" aria-label="Study stages">${s.stages.map((_,j)=>`<a ${i===j?'aria-current="page" ':''}href="../../${id}/${j+1}/">${j+1}. ${labels[j]}</a>`).join('')}</nav><p id="image-status" role="status" aria-live="polite"></p><figure class="stage-figure"><img src="../../../assets/stages/${id}/${i+1}.jpg" alt="${escape(s.title)}: ${labels[i]}" loading="eager"><figcaption>${labels[i]} · <a href="${sourceBase}examples/process/${id}/${file}">Open original image</a> · <a href="${sourceBase}examples/process/${id}/source/${rel}">View stage source</a></figcaption></figure><p><a href="../../../downloads/studies/${id}.zip" download>Download editable project</a></p>`, '../../../'));
 }
}
links+='<li><a href="fieldwork/">Fieldwork — interactive website</a> · <a href="../downloads/studies/fieldwork.zip" download>Download project</a></li>';
await write('fixtures/brief.json',JSON.stringify(brief,null,2)+'\n');
for(const [folder,entry] of [['engineering-graphic','generated/revised.svg'],['document','revised.html'],['website','index.html']]) {
 const dir=path.join(root,'examples/evolution',folder);
 if(await fs.stat(path.join(dir,entry)).then(x=>x.isFile()).catch(()=>false)) {
  const target=path.join(out,'fixtures',folder); await fs.mkdir(target,{recursive:true}); await copyTree(dir,target);
  links+=`<li><a href="../fixtures/${folder}/${entry}">Field Station — ${folder.replace('-', ' ')}</a> · <a href="../downloads/studies/field-station-${folder}.zip" download>Download editable project</a> · <a href="../fixtures/${folder}/README.md">Opening instructions</a></li>`;
 }
}
await write('studies/index.html',page('Studies',`<h1>Studies</h1><p>Explore the individual stages, sources and editable projects. These fictional studies are retained examples, not claims of engineering adequacy or artistic acceptance.</p><ul class="study-list">${links}</ul>`));
await write('guide/index.html',page('Guide',`<h1>Start, revise, return</h1><p>Begin with a question. Make an editable study, review the result, and preserve the decisions that matter.</p><h2>First brief</h2><blockquote>${escape(brief.request)}</blockquote><h2>Revise</h2><blockquote>${escape(brief.revisionRequest)}</blockquote><p>${escape(brief.limits[0])}</p><p><a href="https://github.com/ajhcs/Ingenium/blob/main/docs/user-guide.md">Read the full guide</a></p>`));
await write('resources/index.html',page('Resources',`<h1>Resources</h1><p>Find selected type, color, shapes and other materials through the local resource tools. Availability, source rights and editability vary by selection.</p><p><a href="https://github.com/ajhcs/Ingenium/blob/main/docs/resource-library-status.md">Resource library status</a> · <a href="https://github.com/ajhcs/Ingenium/blob/main/skills/ingenium/references/resource-libraries.md">Resource guide</a></p>`));
let artifacts='';
if(artifactsManifestPath){
 const stagedNames=new Set();
 const mpath=path.resolve(artifactsManifestPath), m=JSON.parse(await fs.readFile(mpath,'utf8')), base=path.dirname(mpath);
 if(m.schema!=='ingenium-release-artifacts/1'||m.prepared!==true||m.published!==false||!Array.isArray(m.artifacts))throw Error('Invalid artifact manifest');
 for(const a of m.artifacts){if(typeof a.path!=='string'||path.isAbsolute(a.path)||a.path.split(/[\\/]/).includes('..'))throw Error('Invalid artifact path');const p=path.resolve(base,a.path); const real=await fs.realpath(p), realBase=await fs.realpath(base); if(!real.startsWith(realBase+path.sep))throw Error('Artifact escapes manifest directory');const data=await fs.readFile(real);if(data.length!==a.bytes||createHash('sha256').update(data).digest('hex')!==a.sha256)throw Error('Artifact integrity mismatch');const name=path.basename(a.path);if(!/^[\w.-]+$/.test(name)||stagedNames.has(name))throw Error('Invalid or duplicate artifact name');stagedNames.add(name);await write(`downloads/release/${name}`,data);artifacts+=`<li><a href="release/${name}" download>${escape(a.id)}</a> (${escape(a.flavor)})</li>`;}
}
await write('downloads/index.html',page('Downloads',`<h1>Downloads</h1><h2>Current editable studies</h2><p>Each project includes sources, dependencies, notices and opening instructions.</p><ul>${bundles.map(b=>`<li><a href="studies/${b.path}" download>${escape(b.id)}</a></li>`).join('')}</ul><h2>Guidance source snapshot</h2><p><a href="../assets/downloads/ingenium-skill.zip" download>Download guidance ZIP</a> (development snapshot; no optional tools).</p><h2>Prepared release artifacts</h2>${artifacts?`<ul>${artifacts}</ul>`:'<p>No release artifacts have been supplied to this staging build.</p>'}<h2>Historical archives</h2><p><a href="../assets/demos/editable-studies.zip" download>Earlier editable studies</a> · <a href="https://github.com/ajhcs/Ingenium/releases/tag/v0.1.0">Version 0.1.0 release</a></p>`));
await write('.nojekyll','');
// Verify staged local HTML and CSS references without making network requests.
async function verify(directory) {
 for(const e of await fs.readdir(directory,{withFileTypes:true})) {
  const file=path.join(directory,e.name); if(e.isDirectory()) { await verify(file); continue; }
  if(!/\.(?:html|css)$/.test(file)) continue;
  const content=await fs.readFile(file,'utf8');
  for(const match of content.matchAll(/(?:src|href|poster)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
   const value=match[1]??match[2]; if(/^(?:https?:|data:|mailto:|#)/i.test(value)) continue;
   if(value.startsWith('/')) throw Error('Root-relative URL is unsupported: '+value);
   const clean=decodeURIComponent(value.split(/[?#]/)[0]); if(!clean)continue;
   let target=path.resolve(path.dirname(file),clean); if(target!==out&&!target.startsWith(out+path.sep)) throw Error('Reference escapes site: '+value);
   let stat=await fs.stat(target).catch(()=>null); if(stat?.isDirectory()) {target=path.join(target,'index.html');stat=await fs.stat(target).catch(()=>null);}
   if(!stat?.isFile()) throw Error('Missing site reference: '+path.relative(out,file)+' -> '+value);
  }
 }
}
await verify(out);
console.log(JSON.stringify({status:'staged',studies:bundles.length,releaseArtifacts:!!artifacts,deployed:false,output:out}));
