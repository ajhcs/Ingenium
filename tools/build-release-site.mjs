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

const page=(title,body,base='../')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — Ingenium</title><link rel="icon" href="${base}assets/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="${base}style.css"><script src="${base}stage.js" defer></script></head><body><header class="page-header wrap"><a href="${base}">Ingenium</a><nav aria-label="Main navigation"><a href="${base}studies/">Studies</a><a href="${base}guide/">Guide</a><a href="${base}resources/">Resources</a><a href="${base}downloads/">Downloads</a></nav></header><main class="page-main wrap">${body}</main></body></html>`;
async function write(rel,content){let p=path.join(out,rel);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,content);}
await write('play/common-measure.html', await fs.readFile(path.join(root, 'skills/ingenium/assets/common-measure.html')));
let artifacts='', artifactVersion='', guidanceName='', artifactDevelopment=false;
const studyArtifacts=new Map();
if(artifactsManifestPath){
 const stagedNames=new Set();
 const mpath=path.resolve(artifactsManifestPath), m=JSON.parse(await fs.readFile(mpath,'utf8')), base=path.dirname(mpath);
 if(m.schema!=='ingenium-release-artifacts/1'||m.prepared!==true||m.published!==false||!Array.isArray(m.artifacts))throw Error('Invalid artifact manifest');
 const markers=m.artifacts.map(a=>typeof a.path==='string' && /-development-[a-f0-9]+\.(?:zip|tgz)$/.test(a.path));
 if(markers.some(Boolean)&&!markers.every(Boolean))throw Error('Mixed development and release artifact identities');
 artifactDevelopment=m.development===true||markers.some(Boolean);
 artifactVersion=m.version+(artifactDevelopment?' development build':'');
 const descriptions={guidance:'Portable skill instructions and references', 'core-tools':'Optional Node CLI and core modules', 'inspection-tools':'Optional browser inspection companion', 'resource-pack':'Selected local resources and notices', 'editable-study':'Editable study sources, notices and opening instructions'};
 for(const a of m.artifacts){if(typeof a.path!=='string'||path.isAbsolute(a.path)||a.path.split(/[\\/]/).includes('..'))throw Error('Invalid artifact path');const p=path.resolve(base,a.path); const real=await fs.realpath(p), realBase=await fs.realpath(base); if(!real.startsWith(realBase+path.sep))throw Error('Artifact escapes manifest directory');const data=await fs.readFile(real);if(data.length!==a.bytes||createHash('sha256').update(data).digest('hex')!==a.sha256)throw Error('Artifact integrity mismatch');const name=path.basename(a.path);if(!/^[\w.-]+$/.test(name)||stagedNames.has(name))throw Error('Invalid or duplicate artifact name');stagedNames.add(name);if(a.flavor==='guidance'){if(guidanceName)throw Error('Duplicate guidance artifact');guidanceName=name;}if(a.flavor==='editable-study'){if(studyArtifacts.has(a.id))throw Error('Duplicate editable study ID');studyArtifacts.set(a.id,name);}await write(`downloads/release/${name}`,data);artifacts+=`<li><a href="release/${name}" download>${escape(a.id.replaceAll('-',' '))}</a> — ${escape(descriptions[a.flavor]||a.flavor)}; ${escape(artifactVersion)}; ${(a.bytes/1048576).toFixed(2)} MiB. ${a.openingFile?`Open <code>${escape(a.openingFile)}</code> after extraction.`:''}</li>`;}
}
let finalHomepage=projected;
if(artifactsManifestPath){
 const status=`Experimental ${escape(artifactVersion)} · <a href="downloads/">${artifactDevelopment?'Development downloads':'Release downloads and details'}</a>.<br>Verify discovery in your client. Desktop discovery remains unverified.`;
 finalHomepage=finalHomepage.replace(/(<p class="install-note">)[\s\S]*?(<\/p>)/,(_,a,b)=>a+status+b);
 if(guidanceName)finalHomepage=finalHomepage.replace(/<a id="guidance-download"[^>]*>[\s\S]*?<\/a>/,`<a id="guidance-download" href="downloads/release/${guidanceName}" download>Download guidance ZIP (${escape(artifactVersion)})</a>`);
 else finalHomepage=finalHomepage.replace(/<a id="guidance-download"[^>]*>[\s\S]*?<\/a>/,`<a id="guidance-download" href="downloads/">See available downloads</a>`);
}
await fs.writeFile(path.join(out,'index.html'),finalHomepage);
function studyLink(id,base){const name=studyArtifacts.get(id);return name?`<a href="${base}downloads/release/${name}" download>Download editable study (${escape(artifactVersion)})</a>`:`<a href="${base}downloads/studies/${id}.zip" download>Download source bundle (development snapshot)</a>`;}
// Render the maintained installation document into the hosted guide, keeping its
// client instructions and compatibility statements tied to the release source.
function installHtml(md){
 const inline=line=>{let out='',last=0;const re=/\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;for(const m of line.matchAll(re)){out+=escape(line.slice(last,m.index));if(m[3])out+=`<code>${escape(m[3])}</code>`;else{let href=m[2];if(!/^(https?:|#)/.test(href))href='https://github.com/ajhcs/Ingenium/blob/main/docs/'+href;out+=`<a href="${escape(href)}">${escape(m[1])}</a>`;}last=m.index+m[0].length;}return out+escape(line.slice(last));};
 let html='',para=[],code=[],inCode=false,list=false;const flush=()=>{if(para.length){html+=`<p>${inline(para.join(' '))}</p>`;para=[];}if(list){html+='</ol>';list=false;}};
 for(const line of md.split('\n')){if(line.startsWith('```')){if(inCode){html+=`<pre><code>${escape(code.join('\n'))}</code></pre>`;code=[];inCode=false;}else{flush();inCode=true;}continue;}if(inCode){code.push(line);continue;}const heading=line.match(/^(#{1,3}) (.+)$/);if(heading){flush();if(heading[1].length===1)continue;let level=Math.min(4,heading[1].length+1);html+=`<h${level}>${inline(heading[2])}</h${level}>`;continue;}const item=line.match(/^\d+\. (.+)$/);if(item){if(para.length)flush();if(!list){html+='<ol>';list=true;}html+=`<li>${inline(item[1])}</li>`;continue;}if(!line.trim()){flush();continue;}para.push(line.trim());}flush();return html;
}
const installation=installHtml(await fs.readFile(path.join(root,'docs/install.md'),'utf8'));
const sourceBase='https://github.com/ajhcs/Ingenium/tree/main/';
const labels=['Ingredients','Composition','Asset studio','Assembly and refinement'];
let links='';
for(const s of manifest.studies){
 const id=s.id; if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid ID');
 links+=`<li><a href="${id}/">${escape(s.title)}</a></li>`;
 const caseText=await fs.readFile(path.join(root,'examples/process',s.case),'utf8');
 const intro=caseText.split('\n').find(line=>line.startsWith('A ')||line.startsWith('An ')) || '';
 const prompts=[...caseText.matchAll(/^\| (Ingredients|Composition|Asset studio|Assembly and refinement) \| (.*?) \|$/gm)];
 const narrative=prompts.map(m=>`<li><strong>${escape(m[1])}:</strong> ${escape(m[2])}</li>`).join('');
 const provenance=caseText.includes('no image-generation prompt was recorded')?'The selected artwork is native vector; no image-generation prompt was recorded.':'The source case includes a recorded image-generation prompt for an artwork asset.';
 const tabs=s.stages.map((_,i)=>`<a href="${i+1}/">${i+1}. ${labels[i]}</a>`).join('');
 await write(`studies/${id}/index.html`,page(s.title,`<p><a href="../">← All studies</a></p><h1>${escape(s.title)}</h1><p>${escape(intro)}</p><p>These four views organize the fictional study for review; their sequence does not claim the order of creation.</p><h2>Study approach</h2><p>The following reusable prompts were reconstructed from the study sources, not recorded as original transcripts.</p><ul>${narrative}</ul><p>${escape(provenance)} Visual precedent: ${escape(s.visual_precedent)}. Reference artwork and source PDFs are not redistributed.</p><h2>Explore the views</h2><nav class="stage-nav" aria-label="Study stages">${tabs}</nav><p><a href="${sourceBase}examples/process/${id}">View source</a> · ${studyLink(id,"../../")}</p><p>SVG text and vectors remain editable where present. Embedded artwork may be raster; print production is untested. The download includes source files, font notices and opening instructions.</p>`, '../../'));
 for(let i=0;i<s.stages.length;i++){
  const file=s.stages[i]; if(!/^stages\/[a-z0-9-]+\.png$/.test(file))throw Error('Invalid stage path');
  const src=path.join(source,'assets/stages',id,`${i+1}.jpg`); if(!(await fs.stat(src)).isFile()) throw Error('Missing stage preview');
  const rel=['ingredients.svg','composition-01.svg','assets-board.svg','final-01.svg'][i];
  await write(`studies/${id}/${i+1}/index.html`,page(`${s.title}: ${labels[i]}`,`<p><a href="../">← ${escape(s.title)}</a> · <a href="../../">All studies</a></p><h1>${escape(s.title)}</h1><h2>${i+1}. ${labels[i]}</h2><nav class="stage-nav" aria-label="Study stages">${s.stages.map((_,j)=>`<a ${i===j?'aria-current="page" ':''}href="../../${id}/${j+1}/">${j+1}. ${labels[j]}</a>`).join('')}</nav><p id="image-status" role="status" aria-live="polite"></p><p class="stage-hint">On a narrow screen, scroll the image area horizontally to inspect the artwork at a larger size. Use the original image link for further zoom.</p><figure class="stage-figure"><div class="stage-scroll" tabindex="0" role="region" aria-label="Enlarged stage image; scroll horizontally"><img src="../../../assets/stages/${id}/${i+1}.jpg" alt="${escape(s.title)}: ${labels[i]}" loading="eager"></div><figcaption>${labels[i]} · <a href="${sourceBase}examples/process/${id}/${file}">Open original image</a> · <a href="${sourceBase}examples/process/${id}/source/${rel}">View stage source</a></figcaption></figure><p>${studyLink(id,"../../../")}</p>`, '../../../'));
 }
}
links+=`<li><a href="fieldwork/">Fieldwork — interactive website</a> · ${studyLink('fieldwork','../')}</li>`;
const fieldworkPath=path.join(out,'studies/fieldwork/index.html');
const fieldwork=await fs.readFile(fieldworkPath,'utf8');
const fieldworkDownload='<a href="../../downloads/studies/fieldwork.zip" download>Download project</a>';
if(!fieldwork.includes(fieldworkDownload))throw Error('Fieldwork download link missing');
await fs.writeFile(fieldworkPath,fieldwork.replace(fieldworkDownload,studyLink('fieldwork','../../')));
await write('fixtures/brief.json',JSON.stringify(brief,null,2)+'\n');
for(const [folder,entry] of [['engineering-graphic','generated/revised.svg'],['document','revised.html'],['website','index.html']]) {
 const dir=path.join(root,'examples/evolution',folder);
 if(await fs.stat(path.join(dir,entry)).then(x=>x.isFile()).catch(()=>false)) {
  const target=path.join(out,'fixtures',folder); await fs.mkdir(target,{recursive:true}); await copyTree(dir,target);
  links+=`<li><a href="../fixtures/${folder}/${entry}">Field Station — ${folder.replace('-', ' ')}</a> · ${studyLink(`field-station-${folder}`,"../")} · <a href="../fixtures/${folder}/README.md">Opening instructions</a></li>`;
 }
}
await write('studies/index.html',page('Studies',`<h1>Studies</h1><p>Explore the individual stages, sources and editable projects. These fictional studies are retained examples, not claims of engineering adequacy or artistic acceptance.</p><ul class="study-list">${links}</ul>`));
await write('guide/index.html',page('Guide',`<h1>Start, revise, return</h1><p>Describe what you want to make, who it is for, and what must stay true. Request editable source and a separate export when your client can create them.</p><h2>Start a study</h2><p>Try this fictional brief in a conversation with the guidance loaded:</p><blockquote>${escape(brief.request)}</blockquote><p>Open the result and inspect the wording, labels and connections. The <a href="../fixtures/document/revised.html">Field Station document</a> and <a href="../studies/">other studies</a> show editable examples.</p><h2>Revise and reopen</h2><blockquote>${escape(brief.revisionRequest)}</blockquote><p>Name what to keep and the scope of that choice. To change a retained decision later, explicitly say which decision you are reopening; keep earlier sources for comparison.</p><h2>Export and return</h2><p>Ask for the editable original and a separate export, open both in the intended application, and retain notices and unresolved questions. An unavailable export or unchecked interaction remains unverified.</p><h2 id="setup">Choose your setup</h2>${installation}<p><a href="https://github.com/ajhcs/Ingenium/blob/main/docs/install.md">Detailed installation and troubleshooting</a> · <a href="https://github.com/ajhcs/Ingenium/blob/main/docs/user-guide.md">Full user guide</a></p>`));
await write('resources/index.html',page('Resources',`<h1>Resources</h1><p>Find selected type, color, shapes and other materials through the local resource tools. Availability, source rights and editability vary by selection.</p><p><a href="https://github.com/ajhcs/Ingenium/blob/main/docs/resource-library-status.md">Resource library status</a> · <a href="https://github.com/ajhcs/Ingenium/blob/main/skills/ingenium/references/resource-libraries.md">Resource guide</a></p>`));
await write('downloads/index.html',page('Downloads',`<h1>Downloads</h1>${artifacts?`<h2>${artifactDevelopment?'Development build':'Current release'}: ${escape(artifactVersion)}</h2><p>Choose guidance to start a conversation, an editable study to explore its source, or optional helpers and resource packs for local work. Sizes are compressed download sizes.</p><ul>${artifacts}</ul><p>Find each study and its download from the <a href="../studies/">studies page</a>.</p>`:`<h2>Development preview</h2><p>No prepared release manifest was supplied. These source bundles are development snapshots, not versioned release artifacts.</p><ul>${bundles.map(b=>`<li><a href="studies/${b.path}" download>${escape(b.id)}</a> — editable source bundle</li>`).join('')}</ul><p><a href="../assets/downloads/ingenium-skill.zip" download>Guidance ZIP</a> — development snapshot; no optional tools.</p>`}<h2>Historical archives</h2><p><a href="../assets/demos/editable-studies.zip" download>Earlier editable studies</a> · <a href="https://github.com/ajhcs/Ingenium/releases/tag/v0.1.0">Version 0.1.0 release</a></p>`));
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
