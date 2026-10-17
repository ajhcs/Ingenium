/** Optional atomic CSS data adapter. Upstream JS/Tailwind are never imported. */
import catalog from './atomic-catalog.json' with { type: 'json' };
import { readFile, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const copy = value => structuredClone(value);
const fail = message => { throw new Error(message); };
const plain = value => value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const text = (value, max, empty = false) => typeof value === 'string' && value.length <= max && (empty || value.trim()) && !/[\x00-\x1f]/.test(value);
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const component = id => catalog.components.find(item => item.id === id) ?? fail('Unknown supported atomic component; discover() lists the selected recipes');
const check = selection => {
  if (!plain(selection) || selection.schemaVersion !== 1 || selection.sourceName !== catalog.source.name || selection.sourceVersion !== catalog.source.version || selection.selected !== true) fail('Expected explicit selected exact DaisyUI atomic source record');
  return component(selection.componentId);
};
function select({ id } = {}) { component(id); return { schemaVersion:1, componentId:id, sourceName:catalog.source.name, sourceVersion:catalog.source.version, selected:true }; }
function customize(selection, controls = {}) {
  const item = check(selection);
  for (const value of [controls, selection.controls ?? {}]) if (!plain(value) || Object.keys(value).some(key => !item.controls.includes(key))) fail('Unsupported atomic control; arbitrary markup/CSS/URLs are not accepted');
  const c = { label:item.title, description:'Editable atomic component.', theme:'light', size:'medium', tone:'primary', ...(item.controls.includes('disabled') ? { disabled:false } : {}), ...(item.controls.includes('items') ? { items:['Draft','Review','Ready'], activeIndex:0 } : {}), ...(item.controls.includes('checked') ? { checked:false } : {}), ...(item.controls.includes('value') ? { value:40 } : {}), ...selection.controls, ...controls };
  if (!text(c.label,100) || !text(c.description,240,true) || !['light','dark'].includes(c.theme) || !['small','medium','large'].includes(c.size) || !['neutral','primary','success','warning','error'].includes(c.tone)) fail('Use bounded plain label/description, supported theme/size/tone');
  if (item.controls.includes('disabled') && typeof c.disabled !== 'boolean') fail('disabled must be boolean');
  if (item.controls.includes('checked') && typeof c.checked !== 'boolean') fail('checked must be boolean');
  if (item.controls.includes('items') && (!Array.isArray(c.items) || c.items.length < 2 || c.items.length > 8 || c.items.some(value => !text(value,60)) || new Set(c.items).size !== c.items.length || !Number.isInteger(c.activeIndex) || c.activeIndex < 0 || c.activeIndex >= c.items.length)) fail('Use2..8 unique plain items and an existing activeIndex');
  if (item.controls.includes('value') && (!Number.isFinite(c.value) || c.value < 0 || c.value > 100 || (item.id==='range'&&!Number.isInteger(c.value)))) fail('value must be finite0..100; range requires an integer step');
  return { ...copy(selection), controls:copy(Object.fromEntries(Object.entries(c).filter(([key])=>item.controls.includes(key)))) };
}
function renderRecipe(selection) {
  const source=customize(selection,selection.controls??{}), c={size:'medium',tone:'primary',description:'',...source.controls}, id=source.componentId;
  const label=esc(c.label), description=esc(c.description), size={small:'sm',medium:'md',large:'lg'}[c.size], disabled=c.disabled?' disabled':'', desc=`<p id="atomic-description" class="atomic-description">${description}</p>`;
  const classes=name=>`${name} ${name}-${c.tone} ${name}-${size}`;
  const status='<p id="atomic-result" role="status" class="atomic-result">Ready</p>';
  let fragment='',script='';
  if(id==='button'){fragment=`<button id="atomic-control" type="button" class="${classes('btn')}"${disabled}>${label}</button>`;script="let count=0;document.getElementById('atomic-control').addEventListener('click',()=>{document.getElementById('atomic-result').textContent='Activated '+(++count);});";}
  if(['input','textarea','select'].includes(id)){
    const field=id==='input'?`<input id="atomic-control" class="${classes('input')}" type="text" required maxlength="100" aria-describedby="atomic-description"${disabled}>`:id==='textarea'?`<textarea id="atomic-control" class="${classes('textarea')}" required maxlength="240" aria-describedby="atomic-description"${disabled}></textarea>`:`<select id="atomic-control" class="${classes('select')}" aria-describedby="atomic-description"${disabled}>${c.items.map((value,i)=>`<option value="${i}"${i===c.activeIndex?' selected':''}>${esc(value)}</option>`).join('')}</select>`;
    fragment=`<form id="atomic-form"><label for="atomic-control" class="atomic-label">${label}</label>${field}${desc}<button class="${classes('btn')}" type="submit"${disabled}>Use value</button></form>`;
    script=`document.getElementById('atomic-form').addEventListener('submit',event=>{event.preventDefault();const field=document.getElementById('atomic-control');document.getElementById('atomic-result').textContent='Selected: '+${id==='select'?'field.selectedOptions[0].textContent':'field.value'};});`;
  }
  if(['checkbox','toggle'].includes(id)){fragment=`<label class="atomic-inline"><input id="atomic-control" type="checkbox"${id==='toggle'?' role="switch"':''} class="${classes(id)}"${c.checked?' checked':''}${disabled}><span>${label}</span></label>${desc}`;script="document.getElementById('atomic-control').addEventListener('change',event=>{document.getElementById('atomic-result').textContent='Checked: '+event.target.checked;});";}
  if(['radio','fieldset'].includes(id)){fragment=`<fieldset${id==='fieldset'?' class="fieldset"':''}${disabled}><legend class="atomic-label">${label}</legend>${c.items.map((value,i)=>`<label class="atomic-inline"><input type="${id==='radio'?'radio':'checkbox'}" name="atomic-choice" value="${i}" class="${classes(id==='radio'?'radio':'checkbox')}"${i===c.activeIndex?' checked':''}${disabled}><span>${esc(value)}</span></label>`).join('')}${desc}</fieldset>`;script="document.querySelectorAll('input[name=atomic-choice]').forEach(input=>input.addEventListener('change',()=>{document.getElementById('atomic-result').textContent=[...document.querySelectorAll('input[name=atomic-choice]:checked')].map(el=>el.parentElement.textContent.trim()).join(', ')||'No choices';}));";}
  if(id==='range'){fragment=`<label class="atomic-label" for="atomic-control">${label}</label><input id="atomic-control" type="range" min="0" max="100" value="${c.value}" class="${classes('range')}" aria-describedby="atomic-description"${disabled}>${desc}`;script="document.getElementById('atomic-control').addEventListener('input',event=>{document.getElementById('atomic-result').textContent='Value: '+event.target.value;});";}
  if(id==='file-input'){fragment=`<label class="atomic-label" for="atomic-control">${label}</label><input id="atomic-control" type="file" class="${classes('file-input')}" aria-describedby="atomic-description"${disabled}>${desc}`;script="document.getElementById('atomic-control').addEventListener('change',event=>{document.getElementById('atomic-result').textContent=event.target.files[0]?'Selected local filename: '+event.target.files[0].name:'No file';});";}
  if(id==='disclosure'){fragment=`<details class="collapse"><summary class="collapse-title">${label}</summary><div class="collapse-content">${desc}</div></details>`;}
  if(id==='dropdown'){fragment=`<details id="atomic-dropdown" class="dropdown"${c.disabled?' inert':''}><summary class="${classes('btn')}${c.disabled?' atomic-disabled':''}"${c.disabled?' tabindex="-1" aria-disabled="true"':''}>${label}</summary><ul class="dropdown-content menu atomic-surface">${c.items.map((value,i)=>`<li><button type="button" data-choice="${i}"${disabled}>${esc(value)}</button></li>`).join('')}</ul></details>`;script="const detail=document.getElementById('atomic-dropdown');document.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>{document.getElementById('atomic-result').textContent='Selected: '+button.textContent;detail.open=false;detail.querySelector('summary').focus();}));detail.addEventListener('keydown',event=>{if(event.key==='Escape'){detail.open=false;detail.querySelector('summary').focus();}});";}
  if(id==='alert')fragment=`<div role="status" class="${classes('alert')}"><span>${label}: ${description}</span></div>`;
  if(id==='badge')fragment=`<span class="${classes('badge')}">${label}</span>`;
  if(id==='progress')fragment=`<label for="atomic-control" class="atomic-label">${label}</label><progress id="atomic-control" class="${classes('progress')}" value="${c.value}" max="100">${c.value}%</progress><p>${c.value}%</p>`;
  if(id==='loading')fragment=`<p role="status"><span class="loading loading-spinner loading-${size}" aria-hidden="true"></span> ${label}</p>`;
  if(id==='skeleton')fragment=`<div aria-hidden="true" class="skeleton atomic-placeholder"></div><p role="status">${label}</p>`;
  if(id==='status')fragment=`<p role="status"><span class="status status-${c.tone} status-${size}" aria-hidden="true"></span> ${label}</p>`;
  if(id==='avatar')fragment=`<figure class="avatar avatar-placeholder"><div class="atomic-avatar"><span aria-hidden="true">${esc(c.label.slice(0,2).toUpperCase())}</span></div><figcaption>${label}</figcaption></figure>`;
  if(id==='table')fragment=`<table class="table table-${size}"><caption>${label}</caption><thead><tr><th scope="col">Item</th><th scope="col">State</th></tr></thead><tbody>${c.items.map((value,i)=>`<tr><th scope="row">${esc(value)}</th><td>${i===c.activeIndex?'Selected':'Draft'}</td></tr>`).join('')}</tbody></table>`;
  if(id==='kbd')fragment=`<p><kbd class="kbd kbd-${size}">${label}</kbd></p>${desc}`;
  if(id==='stat')fragment=`<section class="stat" aria-label="${label}"><h2 class="stat-title">${label}</h2><p class="stat-value atomic-value">${c.value}</p><p class="stat-desc">${description}</p></section>`;
  if(id==='breadcrumbs')fragment=`<nav class="breadcrumbs" aria-label="${label}"><ul>${c.items.map((value,i)=>`<li>${i===c.activeIndex?`<span aria-current="page">${esc(value)}</span>`:`<a class="link" href="#atomic-target">${esc(value)}</a>`}</li>`).join('')}</ul></nav><p id="atomic-target" tabindex="-1">${description}</p>`;
  if(id==='menu'){fragment=`<nav aria-label="${label}"><ul class="menu">${c.items.map((value,i)=>`<li><button type="button" data-choice="${i}" aria-pressed="${i===c.activeIndex}"${disabled}>${esc(value)}</button></li>`).join('')}</ul></nav>`;script="document.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-choice]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));document.getElementById('atomic-result').textContent='Selected: '+button.textContent;}));";}
  if(id==='pagination'){fragment=`<nav aria-label="${label}" class="join">${c.items.map((value,i)=>`<button type="button" class="join-item ${classes('btn')}" data-page="${i}"${i===c.activeIndex?' aria-current="page"':''}${disabled}>${i+1}<span class="atomic-visually-hidden">: ${esc(value)}</span></button>`).join('')}</nav>`;script="document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-page]').forEach(other=>other.removeAttribute('aria-current'));button.setAttribute('aria-current','page');document.getElementById('atomic-result').textContent='Page '+(Number(button.dataset.page)+1);}));";}
  if(id==='divider')fragment=`<div class="divider" role="separator" aria-label="${label}">${label}</div>`;
  if(!fragment)fail('Supported atomic recipe is missing');
  return { source, fragment:fragment+status, script };
}
async function exact(packageDir,name) {
  const pin=catalog.files[name];if(!pin)fail('Unpinned atomic source file refused');
  const path=resolve(packageDir,name),stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536||await realpath(path)!==path)fail('Expected canonical regular atomic source file up to65536 bytes');
  const bytes=await readFile(path);if(bytes.length!==pin.bytes||hash(bytes)!==pin.sha256)fail(`Pinned atomic source mismatch: ${name}`);
  if(name.endsWith('.css')){
    const css=bytes.toString('utf8');if(/@import\b|expression\s*\(/i.test(css))fail('Unsupported resource or CSS semantics in pinned atomic source');
    for(const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi))if(!match[2].startsWith('data:image/svg+xml,'))fail('External CSS resource refused');
  }
  return bytes;
}
export function createAtomicUiLibrary({packageDir}={}) {
  if(packageDir!==undefined&&(typeof packageDir!=='string'||!packageDir.trim()))fail('Supply an explicit existing DaisyUI packageDir');
  function discover({query='',category,tags=[],offset=0,limit=12}={}){
    const categories=[...new Set(catalog.components.map(item=>item.category))];
    if(typeof query!=='string'||query.length>128||(category!==undefined&&!categories.includes(category))||!Array.isArray(tags)||tags.length>4||tags.some(tag=>!text(tag,40))||!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>32)fail('Use bounded query/category/tags and offset>=0,limit1..32');
    const results=catalog.components.filter(item=>(!category||item.category===category)&&`${item.id} ${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())&&tags.every(tag=>item.tags.includes(tag.toLowerCase())));
    return {source:copy(catalog.source),coverage:copy(catalog.coverage),categories,tagOrigin:'Ingenium-authored categories/semantic tags and recipes; source CSS paths/version/rights come from the exact distribution',total:results.length,offset,limit,components:copy(results.slice(offset,offset+limit)),nextOffset:offset+limit<results.length?offset+limit:null,availability:'not-probed; capabilities/inspect explicitly read local source'};
  }
  function navigate({id}={}){const item=component(id),index=catalog.components.findIndex(other=>other.id===id);return {id,previous:catalog.components[index-1]?.id??null,next:catalog.components[index+1]?.id??null,related:catalog.components.filter(other=>other.id!==id&&(other.category===item.category||other.tags.some(tag=>item.tags.includes(tag)))).slice(0,6).map(other=>other.id),documentation:item.documentation,meaning:'Catalog neighbors/related entries; not application routing or preference ranking'};}
  async function load(item,theme='light'){
    if(!packageDir)fail('Acquisition required: explicit existing daisyui5.7.50 packageDir');
    const names=['package.json','LICENSE','base/reset.css','base/rootcolor.css','base/properties.css',`theme/${theme}.css`,...item.styles];
    const identity=[];for(const name of names.slice(0,2))identity.push({name,bytes:await exact(packageDir,name)});
    return [...identity,...await Promise.all(names.slice(2).map(async name=>({name,bytes:await exact(packageDir,name)})))];
  }
  async function capabilities(){if(!packageDir)return {status:'acquisition-required',source:copy(catalog.source),coverage:copy(catalog.coverage)};try{for(const name of Object.keys(catalog.files))await exact(packageDir,name);return {status:'local',source:copy(catalog.source),coverage:copy(catalog.coverage),meaning:'Pinned selected source bytes available; rendering/behavior is a separate check'};}catch(error){return {status:error.code==='ENOENT'?'acquisition-required':'error',reason:error.message,source:copy(catalog.source)};}}
  async function inspect({id,theme='light'}={}){const item=component(id);if(!['light','dark'].includes(theme))fail('Theme must be light or dark');const files=await load(item,theme);return {...copy(item),source:copy(catalog.source),coverage:copy(catalog.coverage),selectedFiles:files.map(file=>({file:file.name,bytes:file.bytes.length,sha256:hash(file.bytes)})),license:{spdx:'MIT',text:files.find(file=>file.name==='LICENSE').bytes.toString('utf8')},semantics:'Native markup and behavior are authored by Ingenium, not supplied upstream snippets. No general accessibility claim.',features:item.id==='loading'?'Exact upstream CSS inline SVG animated mask; renderer feature outside static-icon SVG admission. Reduced-motion preview hides animation while retaining status text.':'Selected pinned component CSS with native/authored recipe; no upstream JS/Tailwind execution'};}
  async function preview({selection}={}){
    const rendered=renderRecipe(selection),c={tone:'primary',...rendered.source.controls},item=component(rendered.source.componentId),files=await load(item,c.theme),sourceCss=files.filter(file=>file.name.endsWith('.css'));
    const styles=Object.fromEntries(sourceCss.map((file,index)=>[`original-${index}.css`,file.bytes]));
    const upstream=Object.keys(styles).map(name=>`@import url('./${name}');`).join('\n')+'\n';
    const css=`body{margin:0;padding:24px;font:16px/1.5 system-ui,sans-serif}main{max-width:560px;margin:24px auto;overflow-wrap:anywhere}.atomic-root{--atomic-tone:var(--color-${c.tone})}.atomic-label{display:block;font-weight:600;margin-bottom:8px}.atomic-inline{display:flex;align-items:center;gap:12px;margin:12px 0}.atomic-description,.atomic-result{margin:12px 0}.atomic-root input:not([type=checkbox]):not([type=radio]):not([type=range]),.atomic-root textarea,.atomic-root select{max-width:100%}.atomic-root .menu{max-width:100%}.atomic-surface{padding:8px;background:var(--color-base-100);border:1px solid var(--color-base-300);border-radius:var(--radius-box);z-index:2}.atomic-avatar{width:80px;height:80px;border-radius:50%;display:grid;place-items:center;background:var(--atomic-tone);color:var(--color-${c.tone}-content)}.atomic-avatar span{font-size:28px}.atomic-placeholder{width:240px;max-width:100%;height:80px}.atomic-value{color:var(--atomic-tone)}.atomic-disabled{pointer-events:none;opacity:.5}.atomic-visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}[hidden]{display:none!important}:focus-visible{outline:3px solid currentColor;outline-offset:3px}caption{text-align:left;font-weight:600}.atomic-root table{width:100%}.atomic-root .join{flex-wrap:wrap}@media(prefers-reduced-motion:reduce){.loading{display:none}.skeleton{animation:none!important}}\n`;
    const html=`<!doctype html><html lang="en" data-theme="${c.theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; img-src data:; base-uri 'none'; form-action 'none'"><title>${esc(c.label)}</title><link rel="stylesheet" href="upstream.css"><link rel="stylesheet" href="custom.css"><script defer src="behavior.js"></script></head><body><main class="atomic-root">${rendered.fragment}</main></body></html>\n`;
    return { ...rendered,html,css,upstream,styles,license:files.find(file=>file.name==='LICENSE').bytes,sourceFiles:files.map(file=>({file:file.name,bytes:file.bytes.length,sha256:hash(file.bytes)})),styleMeaning:'Each original-N.css is exact source bytes. upstream.css contains authored local imports only. No complete source bundle.' };
  }
  async function acquire({selection,outputDir}={}){
    if(typeof outputDir!=='string'||!outputDir.trim())fail('Supply a new explicit outputDir');const rendered=await preview({selection});
    const artifacts={...rendered.styles,'upstream.css':rendered.upstream,'custom.css':rendered.css,'behavior.js':rendered.script,'component.html':rendered.fragment,'preview.html':rendered.html,'source.json':JSON.stringify(rendered.source,null,2)+'\n','LICENSE.daisyui.txt':rendered.license};
    const provenance={schemaVersion:1,source:copy(catalog.source),coverage:copy(catalog.coverage),componentId:rendered.source.componentId,sourceFiles:rendered.sourceFiles,styleMeaning:rendered.styleMeaning,tagOrigin:'Ingenium-authored tags/categories/native recipes; source CSS and exact license retained separately',registryMeaning:'Exact local source hashes; retain separate registry SHA512 acquisition receipt. No signature verification inferred.',artifacts:Object.fromEntries(Object.entries(artifacts).map(([name,bytes])=>[name,hash(bytes)]))};
    const out=resolve(outputDir);if(await realpath(dirname(out))!==dirname(out))fail('Output parent must exist and be canonical');await mkdir(out);
    for(const [name,bytes]of Object.entries(artifacts))await writeFile(join(out,name),bytes,{flag:'wx'});await writeFile(join(out,'provenance.json'),JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});
    return {status:'acquired',outputDir:out,previewPath:join(out,'preview.html'),...provenance};
  }
  return Object.freeze({capabilities,discover,search:discover,navigate,inspect,select,customize,preview,acquire});
}
