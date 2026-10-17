/** Original finite digital texture constructors. No external fonts, images or filters. */
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import licenseText from './license.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const plain = value => value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const hex = value => typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value);
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const fail = message => { throw new Error(message); };
const catalog = [
  { id:'dot-screen', title:'Dot screen', category:'geometric-repetition', tags:['dot','regular','screen','grid'], construction:'Original circles arranged on a square lattice' },
  { id:'parallel-hatch', title:'Parallel hatch', category:'geometric-repetition', tags:['line','diagonal','hatch','repetition'], construction:'Original evenly spaced clipped diagonal line segments' },
  { id:'crosshatch', title:'Crosshatch', category:'geometric-repetition', tags:['line','crossing','hatch','grid'], construction:'Original diagonal segments crossing in two directions' },
  { id:'woven-grid', title:'Woven grid', category:'geometric-repetition', tags:['band','alternating','crossing','grid'], construction:'Original interleaved geometric bands; not photographed cloth' },
  { id:'repeated-authored-letterform', title:'Repeated authored letterform', category:'typographic-repetition', tags:['letterform','typographic','repetition','original-outline'], construction:'Original monoline N-shaped outline repeated on a grid; no font imported' },
  { id:'seeded-grain', title:'Seeded grain', category:'procedural-surface', tags:['grain','seeded','particle','digital-surface'], construction:'Original deterministic LCG circle distribution with periodic edge copies' },
];
const entry = id => catalog.find(item=>item.id===id) ?? fail('Unknown original texture; discoverTextures() lists six constructors');
function parameters(input) {
  if(!plain(input))fail('Expected finite texture parameters');
  const item=entry(input.id), allowed=['id','tileSize','density','ink','background',...(item.id==='seeded-grain'?['seed']:[])];
  if(Object.keys(input).some(key=>!allowed.includes(key)))fail('Unsupported texture parameter; arbitrary SVG/URLs/fonts/filters are refused');
  const p={id:item.id,tileSize:96,density:6,ink:'#163c3c',background:'#f4f0e8',...(item.id==='seeded-grain'?{seed:1}:{}),...input};
  if(!Number.isInteger(p.tileSize)||p.tileSize<32||p.tileSize>256||!Number.isInteger(p.density)||p.density<2||p.density>16||!hex(p.ink)||!hex(p.background))fail('Use integer tileSize32..256,density2..16 and opaque six-digit ink/background');
  if(item.id==='seeded-grain'&&(!Number.isInteger(p.seed)||p.seed<0||p.seed>0xffffffff))fail('Seed must be an unsigned32-bit integer');
  return p;
}
function marks(p) {
  const t=p.tileSize,n=p.density,step=t/n,round=value=>Number(value.toFixed(6));
  const circle=(x,y,r)=>`<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}"/>`;
  if(p.id==='dot-screen')return Array.from({length:n*n},(_,i)=>circle((i%n+.5)*step,(Math.floor(i/n)+.5)*step,step*.14)).join('');
  if(p.id==='parallel-hatch'||p.id==='crosshatch') {
    const lines=[];
    for(let i=-n+1;i<n;i++){
      const c=i*step,x1=Math.max(c,0),y1=Math.max(-c,0),x2=c>=0?t:t+c,y2=c>=0?t-c:t;
      lines.push(`<path d="M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}"/>`);
      if(p.id==='crosshatch')lines.push(`<path d="M${round(t-x1)} ${round(y1)}L${round(t-x2)} ${round(y2)}"/>`);
    }
    return `<g fill="none" stroke="${p.ink}" stroke-width="${round(step*.1)}" stroke-linecap="butt">${lines.join('')}</g>`;
  }
  if(p.id==='woven-grid') {
    return Array.from({length:n*n},(_,i)=>{
      const x=i%n*step,y=Math.floor(i/n)*step,vertical=`<rect x="${round(x+step*.35)}" y="${round(y)}" width="${round(step*.3)}" height="${round(step)}"/>`,horizontal=`<rect x="${round(x)}" y="${round(y+step*.35)}" width="${round(step)}" height="${round(step*.3)}"/>`;
      return (i%n+Math.floor(i/n))%2===0?`${vertical}<rect x="${round(x)}" y="${round(y+step*.3)}" width="${round(step)}" height="${round(step*.4)}" fill="${p.background}"/>${horizontal}`:`${horizontal}<rect x="${round(x+step*.3)}" y="${round(y)}" width="${round(step*.4)}" height="${round(step)}" fill="${p.background}"/>${vertical}`;
    }).join('');
  }
  if(p.id==='repeated-authored-letterform') {
    const letters=Array.from({length:n*n},(_,i)=>{
      const x=(i%n+.25)*step,y=(Math.floor(i/n)+.2)*step,w=step*.5,h=step*.6;
      return `<path d="M${round(x)} ${round(y+h)}V${round(y)}L${round(x+w)} ${round(y+h)}V${round(y)}"/>`;
    }).join('');
    return `<g fill="none" stroke="${p.ink}" stroke-width="${round(step*.085)}" stroke-linecap="square" stroke-linejoin="miter">${letters}</g>`;
  }
  let state=p.seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;},particles=[];
  for(let i=0;i<n*n;i++){
    const x=random()*t,y=random()*t,r=step*(.055+random()*.14);
    // Opposite-edge copies retain periodic geometry when CSS repeats the tile.
    for(const dx of [-t,0,t])for(const dy of [-t,0,t])if(x+dx+r>0&&x+dx-r<t&&y+dy+r>0&&y+dy-r<t)particles.push(circle(x+dx,y+dy,r));
  }
  return particles.join('');
}
function construct(p) {
  const item=entry(p.id),provenance={origin:'Ingenium original finite procedural geometry',category:item.category,tags:[...item.tags],tagOrigin:'Ingenium-authored descriptive tags',construction:item.construction,meaning:'Digital visual example only; no measured uncertainty, photographed material, tactile substrate, print-process or user acceptance claim'},metadata=esc(JSON.stringify({schemaVersion:1,parameters:p,provenance,license:{spdx:'MIT',text:licenseText}}));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${p.tileSize}" height="${p.tileSize}" viewBox="0 0 ${p.tileSize} ${p.tileSize}" overflow="hidden" role="img" aria-labelledby="title"><title id="title">${esc(item.title)}</title><metadata>${metadata}</metadata><rect width="${p.tileSize}" height="${p.tileSize}" fill="${p.background}"/><g fill="${p.ink}">${marks(p)}</g></svg>\n`;
  return {schemaVersion:1,id:p.id,kind:'original',parameters:p,svg,sha256:sha(svg),provenance,license:{spdx:'MIT',text:licenseText}};
}
function intact(texture) {
  if(!plain(texture)||texture.schemaVersion!==1||!['original','derived'].includes(texture.kind)||texture.id!==texture.parameters?.id)fail('Expected intact original or derived texture record');
  const expected=construct(parameters(texture.parameters));
  if(texture.sha256!==sha(texture.svg)||texture.svg!==expected.svg||!isDeepStrictEqual(texture.license,expected.license)||!isDeepStrictEqual(texture.provenance,expected.provenance))fail('Texture geometry, rights or provenance differs from its finite constructor');
  if(texture.kind==='derived'){
    const d=texture.derivation;if(!plain(d)||!/^[a-f0-9]{64}$/.test(d.parentSHA256??'')||!plain(d.changes)||!Object.keys(d.changes).length||Object.hasOwn(d.changes,'id'))fail('Derived texture requires its parent identity and finite changes');
    const parent=construct(parameters(d.parentParameters));
    if(parent.id!==texture.id||parent.sha256!==d.parentSHA256||!isDeepStrictEqual(parameters({...parent.parameters,...d.changes}),texture.parameters))fail('Derived texture parent or recorded changes do not match its geometry');
  }
  return texture;
}
export function discoverTextures({query='',category,tag}={}) {
  if(typeof query!=='string'||query.length>100||(category!==undefined&&!catalog.some(item=>item.category===category))||(tag!==undefined&&(typeof tag!=='string'||tag.length>60)))fail('Use bounded query, known category and descriptive tag');
  return catalog.filter(item=>(!category||item.category===category)&&(!tag||item.tags.includes(tag))&&`${item.id} ${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).map(item=>({...clone(item),source:'original-synthetic',license:'MIT',tagOrigin:'Ingenium-authored',controls:['tileSize','density','ink','background',...(item.id==='seeded-grain'?['seed']:[])]}));
}
export function createTexture(input) { return construct(parameters(input)); }
export function selectTexture(id) { return {...createTexture({id}),selected:true}; }
export function customizeTexture(texture,changes) {
  intact(texture);if(!plain(changes)||!Object.keys(changes).length||Object.hasOwn(changes,'id'))fail('Use nonempty supported parameter changes; texture identity stays fixed');
  const changed=construct(parameters({...texture.parameters,...changes}));
  return {...changed,kind:'derived',selected:texture.selected??true,derivation:{parentSHA256:texture.sha256,parentParameters:clone(texture.parameters),changes:clone(changes),previous:texture.derivation?clone(texture.derivation):null}};
}
export function exportTexture(texture,{format='svg'}={}) {
  intact(texture);
  if(format==='svg')return texture.svg;
  if(format==='json')return JSON.stringify(clone(texture),null,2)+'\n';
  if(format==='css')return `/* Original Ingenium digital texture / MIT. Full notice in LICENSE.txt. */\n.texture-field{background-color:${texture.parameters.background};background-image:url('./tile.svg');background-repeat:repeat;background-size:${texture.parameters.tileSize}px ${texture.parameters.tileSize}px;}\n`;
  fail('Texture export format must be svg,css or json');
}
export async function writeTexture({source,texture=source,outputDir}={}) {
  intact(source);intact(texture);if(typeof outputDir!=='string'||!outputDir.trim())fail('Supply a new explicit outputDir');
  if(!isDeepStrictEqual(texture,source)&&(texture.kind!=='derived'||texture.derivation.parentSHA256!==source.sha256||!isDeepStrictEqual(texture.derivation.parentParameters,source.parameters)))fail('Export source must be the direct parent of this derived texture');
  const files={'original.svg':exportTexture(source),'tile.svg':exportTexture(texture),'original.json':exportTexture(source,{format:'json'}),'source.json':exportTexture(texture,{format:'json'}),'texture.css':exportTexture(texture,{format:'css'}),'LICENSE.txt':licenseText};
  files['preview.html']=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; base-uri 'none'"><title>${esc(entry(texture.id).title)}</title><link rel="stylesheet" href="texture.css"><style>body{margin:0;padding:24px;font:16px/1.4 sans-serif;background:#fff;color:#17212b}h1{font-size:22px}.texture-field{height:320px;max-width:640px;border:1px solid #888}</style><h1>${esc(entry(texture.id).title)}</h1><div class="texture-field" role="img" aria-label="${esc(entry(texture.id).title)} repeated digital tile"></div><p>Original synthetic digital texture / MIT. No physical-material or semantic meaning is implied.</p></html>\n`;
  const provenance={schemaVersion:1,sourceSHA256:source.sha256,outputSHA256:texture.sha256,parameters:clone(texture.parameters),derivation:texture.derivation?clone(texture.derivation):null,construction:clone(texture.provenance),license:'MIT',files:Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,{bytes:Buffer.byteLength(bytes),sha256:sha(bytes)}]))};
  const out=resolve(outputDir);if(await realpath(dirname(out))!==dirname(out))fail('Output parent must exist and be canonical');await mkdir(out);
  for(const[name,bytes]of Object.entries(files))await writeFile(join(out,name),bytes,{flag:'wx'});await writeFile(join(out,'provenance.json'),JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});
  return {status:'exported',outputDir:out,previewPath:join(out,'preview.html'),...provenance};
}
