/** Small native components. No remote I/O, npm scripts, framework or full-page designs. */
import { readFile, lstat, realpath, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const hash = b => createHash('sha256').update(b).digest('hex');
const PIN = Object.freeze({ name: 'bulma', version: '1.0.4', license: 'MIT', source: 'https://github.com/jgthms/bulma', registry: 'https://registry.npmjs.org/bulma/-/bulma-1.0.4.tgz', integrity: 'sha512-Ffb6YGXDiZYX3cqvSbHWqQ8+LkX6tVoTcZuVB3lm93sbAVXlO0D6QlOTMnV6g18gILpAXqkG2z9hf9z4hCjz2g==' });
const FILES = Object.freeze({ 'package.json': '52c27323774aadd4aea010bc5d256115eda5bf2777ab183c596605bbd73135bb', LICENSE: 'fbe7d8ec18b72eded15d79ca73da5eef9e8e258f5f1aff83e4e993e69752279c', 'css/bulma.min.css': '67fa26df1ca9e95d8f2adc7c04fa1b15fa3d24257470ebc10cc68b9aab914bee' });
const CATALOG = [{ id: 'button', title: 'Action button', semantics: 'Native button with activation count in a live status' }, { id: 'input', title: 'Required text field', semantics: 'Labelled native form with required validation and result' }, { id: 'dialog', title: 'Confirmation dialog', semantics: 'Native modal dialog with Escape, focus confinement and return' }];
const fail = message => { throw new Error(message); };
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
async function bounded(path) {
 const p = resolve(path), s = await lstat(p);
 if (!s.isFile() || s.isSymbolicLink() || s.size > 800000 || await realpath(p) !== p) fail('Expected canonical bounded regular source file');
 const b = await readFile(p); if (b.length > 800000) fail('Source exceeds bound'); return b;
}
function component(id) { return CATALOG.find(c => c.id === id) ?? fail('Unknown small component; use discover()'); }
export function discover({ query = '' } = {}) {
 if (typeof query !== 'string' || query.length > 100) fail('Query must be text up to 100 characters');
 return { source: { ...PIN }, acquisition: 'explicit-local-package-required', components: CATALOG.filter(c => `${c.id} ${c.title}`.toLowerCase().includes(query.toLowerCase())).map(c => ({ ...c })), limits: ['Small component wrappers only; no fullsite/template library', 'Upstream CSS only; Ingenium authors markup and behavior', 'No networking or automatic package installation'] };
}
export function inspect({ id } = {}) {
 return { ...component(id), upstream: { ...PIN }, files: { ...FILES }, ownership: 'Bulma stylesheet imported verbatim; native HTML, preview shell and behavior authored by Ingenium', controls: { label: '1..100 plain characters', hue: '0..359', radius: '0..24 pixels', size: 'small|normal|large', theme: 'light|dark' } };
}
export function select({ id } = {}) { component(id); return { schemaVersion: 1, componentId: id, sourceName: PIN.name, sourceVersion: PIN.version }; }
function checkSelection(s) { if (!s || s.schemaVersion !== 1 || s.sourceName !== PIN.name || s.sourceVersion !== PIN.version) fail('Expected exact select() result'); component(s.componentId); }
export function customize(selection, controls = {}) {
 checkSelection(selection);
 if (!controls || Object.keys(controls).some(k => !['label','hue','radius','size','theme'].includes(k))) fail('Unknown customization control');
 const c = { label: selection.componentId === 'input' ? 'Project name' : selection.componentId === 'dialog' ? 'Review choice' : 'Save choice', hue: 171, radius: 6, size: 'normal', theme: 'light', ...controls };
 if (typeof c.label !== 'string' || !c.label.trim() || c.label.length > 100 || /[\x00-\x1f]/.test(c.label)) fail('Expected plain label 1..100 characters');
 if (!Number.isInteger(c.hue) || c.hue < 0 || c.hue > 359 || !Number.isInteger(c.radius) || c.radius < 0 || c.radius > 24 || !['small','normal','large'].includes(c.size) || !['light','dark'].includes(c.theme)) fail('Invalid bounded customization');
 return { ...structuredClone(selection), controls: c };
}
export function render(source) {
 checkSelection(source); const c = customize(source, source.controls).controls, label = esc(c.label), size = c.size === 'normal' ? '' : ` is-${c.size}`;
 let fragment, script;
 if (source.componentId === 'button') { fragment = `<button id="action" type="button" class="button is-primary${size}">${label}</button><p id="result" role="status" class="mt-4">Ready</p>`; script = `let count=0;document.getElementById('action').addEventListener('click',()=>{document.getElementById('result').textContent='Saved '+(++count)+' time(s)';});`; }
 if (source.componentId === 'input') { fragment = `<form id="entry"><div class="field"><label class="label" for="value">${label}</label><div class="control"><input class="input${size}" id="value" name="value" required maxlength="100" autocomplete="off" aria-describedby="hint"></div><p class="help" id="hint">Enter a name before saving.</p></div><button class="button is-primary${size}" type="submit">Save</button></form><p id="result" role="status" class="mt-4">Ready</p>`; script = `document.getElementById('entry').addEventListener('submit',event=>{event.preventDefault();document.getElementById('result').textContent='Saved: '+document.getElementById('value').value;});`; }
 if (source.componentId === 'dialog') { fragment = `<button id="action" type="button" class="button is-primary${size}">${label}</button><dialog id="choice" aria-labelledby="heading"><h2 id="heading" class="title is-4">${label}</h2><p class="mb-5">Apply this scoped choice?</p><form method="dialog" class="buttons"><button class="button${size}" value="cancel" autofocus>Cancel</button><button class="button is-primary${size}" value="confirm">Confirm</button></form></dialog><p id="result" role="status" class="mt-4">Ready</p>`; script = `const dialog=document.getElementById('choice');document.getElementById('action').addEventListener('click',()=>{dialog.returnValue='cancel';dialog.showModal();});dialog.addEventListener('close',()=>{document.getElementById('result').textContent=dialog.returnValue==='confirm'?'Choice confirmed':'Choice cancelled';});dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const buttons=[...dialog.querySelectorAll('button')];const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});`; }
 const css = `:root{--bulma-primary-h:${c.hue}deg;--bulma-radius:${c.radius}px;--bulma-control-radius:${c.radius}px}body{padding:32px}main{max-width:420px;margin:32px auto}dialog{border:1px solid currentColor;border-radius:${c.radius}px;padding:28px;max-width:calc(100vw - 32px);background:var(--bulma-scheme-main);color:var(--bulma-text)}dialog::backdrop{background:#0006}button:focus-visible,input:focus-visible{outline:3px solid currentColor;outline-offset:4px}`;
 const html = `<!doctype html><html lang="en" data-theme="${c.theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'"><title>${label}</title><link rel="stylesheet" href="upstream.css"><link rel="stylesheet" href="custom.css"><script defer src="behavior.js"></script></head><body><main>${fragment}</main></body></html>`;
 return { html, fragment, css, script, source: { ...structuredClone(source), controls: c } };
}
export function createUiLibrary({ packageDir } = {}) {
 if (packageDir !== undefined && (typeof packageDir !== 'string' || !packageDir.trim())) fail('Supply explicit local packageDir');
 async function load() {
  if (!packageDir) fail('Acquisition required: supply exact local Bulma 1.0.4 packageDir; no automatic download');
  const files = {};
  for (const [name, expected] of Object.entries(FILES)) { const b = await bounded(join(packageDir, name)); if (hash(b) !== expected) fail(`Pinned source hash mismatch: ${name}`); files[name] = b; }
  return files;
 }
 async function capabilities() { try { await load(); return { status: 'local', source: { ...PIN }, components: CATALOG.map(c=>c.id) }; } catch(e) { return { status: !packageDir || e.code === 'ENOENT' ? 'acquisition-required' : 'error', reason:e.message, source: { ...PIN } }; } }
 async function acquire({ selection, outputDir, controls } = {}) {
  checkSelection(selection); if (typeof outputDir !== 'string' || !outputDir.trim()) fail('Supply new explicit outputDir');
  const files = await load(), rendered = render(customize(selection, { ...selection.controls, ...controls }));
  const output = resolve(outputDir); if (await realpath(dirname(output)) !== dirname(output)) fail('Output parent must be canonical'); await mkdir(output); // exclusive new directory: never replace authored work
  try {
   const artifacts = { 'upstream.css': files['css/bulma.min.css'], 'LICENSE.bulma.txt': files.LICENSE, 'source.json': JSON.stringify(rendered.source,null,2)+'\n', 'component.html': rendered.fragment, 'preview.html': rendered.html, 'custom.css': rendered.css, 'behavior.js': rendered.script };
   const provenance = { schemaVersion:1, upstream:{...PIN}, selectedSourceFiles:{...FILES}, origin:'exact-pinned-local-package', registryVerification:'Not inferred here; retain separate acquisition receipt for tarball SHA512 verification', wrapperAuthor:'Ingenium', componentId:selection.componentId, artifacts:Object.fromEntries(Object.entries(artifacts).map(([k,v])=>[k,hash(v)])) };
   for(const [name,bytes]of Object.entries(artifacts)) await writeFile(join(output,name),bytes,{flag:'wx'});
   await writeFile(join(output,'provenance.json'),JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});
   return {status:'acquired',outputDir:output,previewPath:join(output,'preview.html'),...provenance};
  } catch(e) { await rm(output,{recursive:true,force:true}); throw e; }
 }
 return Object.freeze({ discover, inspect, select, customize, render, capabilities, acquire });
}
