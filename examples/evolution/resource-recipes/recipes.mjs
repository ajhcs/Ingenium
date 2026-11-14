import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sha=s=>createHash('sha256').update(s).digest('hex');
const txt=(x,y,s,size=18,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(s)}</text>`;
const line=(x1,y1,x2,y2,color='#385260')=>`<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2"/>`;
const rect=(x,y,w,h,fill='#fff')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="#90B6CB"/>`;
function renderDoc(id,p){
 const t=(x,y,v,size=18,extra='')=>txt(x,y,v,size,extra);
 if(id==='doc-title')return `${rect(40,45,720,310)}${t(65,95,p.title,36,'font-weight="700"')}${line(65,120,735,120)}${t(65,170,'DOCUMENT',13)}${t(65,205,p.identifier,23)}${t(430,170,'ISSUED',13)}${t(430,205,p.date,23)}`;
 if(['doc-revision','doc-requirements','doc-issues'].includes(id)){
  const headings=id==='doc-revision'?['ISSUE','CHANGE']:id==='doc-requirements'?['ID','REQUIREMENT','METHOD']:['ID','ACTION','STATUS'];
  const xs=headings.length===2?[60,200]:[60,180,565];
  return `${t(40,55,id==='doc-revision'?'REVISION HISTORY':id==='doc-requirements'?'REQUIREMENTS':'ISSUES & ACTIONS',20,'font-weight="700"')}${line(40,78,760,78)}${headings.map((v,i)=>t(xs[i],112,v,13,'font-weight="700"')).join('')}${p.rows.map((row,i)=>`${line(40,135+i*65,760,135+i*65,'#c6d7df')}${row.map((v,j)=>t(xs[j],165+i*65,v,17)).join('')}`).join('')}`;
 }
 if(id==='doc-legend')return `${t(40,60,'RELATIONSHIP KEY',20,'font-weight="700"')}${p.rows.map((r,i)=>`<path d="M60 ${120+i*75} H205" stroke="#DA5C18" stroke-width="3" ${r[0]==='dashed'?'stroke-dasharray="8 6"':''}/>${t(240,126+i*75,r[1],20)}`).join('')}`;
 if(id==='doc-caution')return `<rect x="40" y="65" width="720" height="225" rx="4" fill="#fff8f0" stroke="#DA5C18" stroke-width="2"/><path d="M40 65 H760 V116 H40 Z" fill="#DA5C18"/>${t(65,100,p.heading,20,'fill="#fff" font-weight="700"')}${t(65,175,p.body,20)}`;
 if(id==='doc-caption')return `${line(40,80,760,80)}${t(40,120,p.heading,14,'font-weight="700" fill="#9a3f12"')}${t(40,165,p.body,26,'font-weight="700"')}${t(40,205,p.note,16)}`;
 return `${rect(40,50,720,265)}${t(65,100,p.heading,19)}${t(65,205,p.value,72,'font-weight="700"')}${t(175,205,p.unit,23)}${t(65,260,p.note,16)}`;
}
function renderChart(id,p){
 const vals=p.data.flatMap(r=>r.slice(1));const max=Math.ceil(Math.max(...vals,1)*1.15); const scale=v=>110+590*v/max;
 let body=`${txt(45,52,p.unit,17,'font-weight="700"')}${line(110,315,700,315)}`;
 if(id==='chart-line') body+=`${line(110,80,110,315)}${txt(100,315,'0',14,'text-anchor="end"')}${txt(100,85,String(Math.round(max)),14,'text-anchor="end"')}`;
 else body+=`${txt(105,345,'0',14)}${txt(700,345,String(Math.round(max)),14,'text-anchor="end"')}`;
 if(id==='chart-line'){
  const coords=p.data.map((r,i)=>[140+i*250,315-(r[1]/max)*235]);
  body+=coords.slice(1).map((c,i)=>line(...coords[i],...c,'#DA5C18')).join('');
  body+=coords.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="6" fill="#DA5C18"/>${txt(x,Math.max(80,y-16),p.data[i][1],16,'text-anchor="middle"')}${txt(x,340,p.data[i][0],15,'text-anchor="middle"')}`).join('');
 }else body+=p.data.map((r,i)=>{const y=110+i*75;let mark;if(id==='chart-bar')mark=`<rect x="110" y="${y-18}" width="${scale(r[1])-110}" height="32" fill="#90B6CB"/>${txt(scale(r[1])+10,y+5,r[1],16)}`;else if(id==='chart-dot')mark=`<circle cx="${scale(r[1])}" cy="${y}" r="7" fill="#DA5C18"/>${txt(scale(r[1])+12,y+5,r[1],16)}`;else mark=`${line(scale(r[1]),y,scale(r[2]),y,'#DA5C18')}<circle cx="${scale(r[1])}" cy="${y}" r="5" fill="#DA5C18"/><circle cx="${scale(r[2])}" cy="${y}" r="5" fill="#DA5C18"/>${txt(scale(r[2])+12,y+5,`${r[1]}–${r[2]}`,16)}`;return `${txt(40,y+5,r[0],16)}${mark}`}).join('');
 return body;
}
function renderDiagram(id,p){
 const width=id==='diagram-chain'?150:200;
 const positions=id==='diagram-chain'?[[35,150],[325,150],[615,150]]:id==='diagram-join'?[[55,65],[55,230],[565,150]]:[[55,150],[565,65],[565,230]];
 const lookup=new Map(p.nodes.map((n,i)=>[n,positions[i]]));
 if(new Set(p.nodes).size!==3||p.edges.length!==2||p.edges.some(e=>!lookup.has(e[0])||!lookup.has(e[1])||e[0]===e[1]))throw Error('Diagram needs distinct nodes and two valid directed endpoints');
 let edges=p.edges.map(([from,to,label],i)=>{const a=lookup.get(from),b=lookup.get(to); const x1=a[0]+width,y1=a[1]+45,x2=b[0]-10,y2=b[1]+45;const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;return `${line(x1,y1,x2,y2,'#DA5C18')}<path d="M${x2-10*ux-5*uy} ${y2-10*uy+5*ux} L${x2} ${y2} L${x2-10*ux+5*uy} ${y2-10*uy-5*ux}" fill="none" stroke="#DA5C18" stroke-width="2"/>${txt((x1+x2)/2,(y1+y2)/2-10,label,14,'text-anchor="middle"')}`}).join('');
 return `${edges}${p.nodes.map((n,i)=>`${rect(...positions[i],width,90)}${txt(positions[i][0]+width/2,positions[i][1]+52,n,18,'text-anchor="middle"')}`).join('')}`;
}
function renderImage(id,p){
 const a=esc(p.accent);if(!/^#[0-9a-fA-F]{6}$/.test(p.accent))throw Error('accent must be a six-digit hex color');
 if(id==='image-contours')return `<g fill="none" stroke="#385260" stroke-width="3"><path d="M70 320 Q90 80 310 90 T730 135 Q780 230 670 325 Z"/><path d="M145 292 Q160 135 315 135 T670 160 Q700 230 630 290 Z"/><path d="M220 270 Q230 180 330 180 T610 190 Q630 240 585 265 Z"/><path d="M290 248 Q300 215 355 210 T530 220 Q540 242 510 246 Z"/></g><circle cx="410" cy="225" r="7" fill="${a}"/>`;
 if(id==='image-sensor')return `<g fill="none" stroke="#385260" stroke-width="3"><path d="M230 100 L385 40 L540 100 L385 165 Z M230 100 V190 L385 260 V165 M540 100 V190 L385 260"/><path d="M385 260 V325 M325 325 H445" stroke-dasharray="8 6"/><rect x="345" y="325" width="80" height="25" rx="8"/></g><circle cx="385" cy="103" r="18" fill="${a}"/>`;
 if(id==='image-field')return `<path d="M80 310 Q230 275 370 310 T720 310" fill="none" stroke="#385260" stroke-width="3"/><path d="M200 270 V175 L300 110 L400 175 V270 Z M185 175 L300 95 L415 175" fill="#fff" stroke="#385260" stroke-width="3"/><rect x="270" y="205" width="60" height="65" fill="#90B6CB"/><path d="M545 295 V90 M515 145 H575 M525 110 H565" stroke="#385260" stroke-width="4"/><circle cx="545" cy="85" r="9" fill="${a}"/>`;
 return `<circle cx="400" cy="200" r="102" fill="#e5f0f4" stroke="#385260" stroke-width="3"/><ellipse cx="400" cy="200" rx="290" ry="95" transform="rotate(-18 400 200)" fill="none" stroke="#385260" stroke-width="3"/><path d="M346 150 Q390 165 365 198 T410 245 M450 120 Q420 160 460 180 T445 260" fill="none" stroke="#90B6CB" stroke-width="4"/><path d="M640 96 l24 -12 18 16 -24 12 Z" fill="${a}" stroke="#385260" stroke-width="2"/>`;
}
export async function loadRecipe(id){if(!/^[a-z][a-z0-9-]{0,40}$/.test(id))throw Error('Invalid recipe ID'); const catalog=JSON.parse(await readFile(resolve(here,'catalog.json'),'utf8'));if(!catalog.entries.some(e=>e.id===id))throw Error('Unknown recipe');return JSON.parse(await readFile(resolve(here,'examples',`${id}.json`),'utf8'));}
export async function renderRecipe(id,overrides={}){
 const recipe=await loadRecipe(id);if(!overrides||Array.isArray(overrides)||typeof overrides!=='object'||Object.keys(overrides).some(k=>!Object.hasOwn(recipe.edit,k)))throw Error('Overrides must use permitted edit fields');
 const p={...recipe.original,...overrides}; const data=JSON.stringify(p);
 const short = x => typeof x==='string' && x.trim().length>0 && [...x].length<=60;
 if(recipe.kind==='document' && (p.rows ? !Array.isArray(p.rows)||p.rows.length!==2||p.rows.some(row=>!Array.isArray(row)||row.length!==(id==='doc-revision'||id==='doc-legend'?2:3)||row.some(x=>!short(x))) : Object.values(p).some(x=>!short(x)))) throw Error('Document values must be bounded short text with the original table shape');
 if(recipe.kind==='diagram' && (!Array.isArray(p.nodes)||p.nodes.length!==3||p.nodes.some(x=>!short(x))||!Array.isArray(p.edges)||p.edges.length!==2||p.edges.some(e=>!Array.isArray(e)||e.length!==3||e.some(x=>!short(x)))))throw Error('Diagram needs three bounded labels and two labelled connections');if(data.length>4096||/[\u0000-\u001f]/.test(data))throw Error('Parameters exceed bounds');
 if(recipe.kind==='document' && id==='doc-legend' && p.rows.some(r=>!['solid','dashed'].includes(r[0])))throw Error('Legend styles must remain solid or dashed');
 if(recipe.kind==='diagram' && p.edges.some((edge,i)=>edge[0]!==recipe.original.edges[i][0] || edge[1]!==recipe.original.edges[i][1]))throw Error('Diagram endpoints are protected; only connection labels may change');
 if(recipe.kind==='chart'&&(!Array.isArray(p.data)||p.data.length!==3||p.data.some(r=>!Array.isArray(r)||r.length!==(id==='chart-range'?3:2)||typeof r[0]!=='string'||r[0].length>30||r.slice(1).some(x=>!Number.isFinite(x)||x<0||x>10000)||(r.length===3&&r[1]>r[2]))))throw Error('Chart needs three bounded nonnegative sample rows and ordered ranges');
 if(recipe.kind==='chart' && p.data.some((row,i)=>row[0]!==recipe.original.data[i][0]))throw Error('Chart category and time labels are protected');
 const content=recipe.kind==='document'?renderDoc(id,p):recipe.kind==='chart'?renderChart(id,p):recipe.kind==='diagram'?renderDiagram(id,p):renderImage(id,p);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><title>${esc(recipe.title)}</title><desc>${esc(recipe.description)}; original synthetic example.</desc><rect width="800" height="400" fill="#f7f9f9"/><g fill="#172f3c" font-family="sans-serif">${content}</g></svg>\n`;
}
export async function writeRecipe({id,outputDir,overrides}={}){
 const recipe=await loadRecipe(id);const selected=overrides??recipe.edit; const original=await renderRecipe(id), revised=await renderRecipe(id,selected);
 const license=await readFile(resolve(here,'LICENSE'),'utf8');const cseLicense=await readFile(resolve(here,'CSE-LICENSE.txt'),'utf8');await mkdir(outputDir);const note=`# ${recipe.title}\n\nOpen revised.svg in an SVG editor; text and geometry remain editable. Original: original.svg. Second edit: ${Object.keys(selected).join(', ')}. Preserve the remaining input in input.json. Next: revise only a permitted field or adapt a separate copy; recheck relationships and units. Content is synthetic and has no engineering acceptance. Retain LICENSE and CSE-LICENSE.txt. Palette colors C32-B and C27-B derive from CSE 0.2.0-alpha.8; hue carries no engineering semantics. Generic fonts vary by environment.\n`;
 for(const [name,data] of Object.entries({'original.svg':original,'revised.svg':revised,'input.json':JSON.stringify(recipe,null,2)+'\n','README.md':note,'LICENSE':license,'CSE-LICENSE.txt':cseLicense}))await writeFile(resolve(outputDir,name),data,{flag:'wx'});
 const receipt={schema:'ingenium-recipe-output/1',id,sourceId:`${id}-original`,derivedId:`${id}-revised`,originalSHA256:sha(original),derivedSHA256:sha(revised),edit:selected};await writeFile(resolve(outputDir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(process.argv.length!==4){console.error('Usage: node recipes.mjs RECIPE_ID NEW_OUTPUT_DIR');process.exitCode=2;}else console.log(JSON.stringify(await writeRecipe({id:process.argv[2],outputDir:resolve(process.argv[3])}),null,2));}
