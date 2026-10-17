import fs from 'node:fs/promises';import path from 'node:path';
import { createOutput, readFont } from '../resources.mjs';
const out = await createOutput();
const bold=await readFont('DejaVuSans-Bold.ttf'),regular=await readFont('DejaVuSans.ttf');
const C={ink:'#17283A',cream:'#F5F1E8',clay:'#E46C49',lime:'#E6F08A'};
const style=(body=false)=>`<style>@font-face{font-family:P3V2;src:url(data:font/ttf;base64,${bold.toString('base64')});font-weight:700}${body?`@font-face{font-family:P3V2;src:url(data:font/ttf;base64,${regular.toString('base64')});font-weight:400}`:''}text{font-family:P3V2,sans-serif}</style>`;
const t=(x,y,s,v,c=C.ink,w=700,id='')=>`<text ${id?`id="${id}"`:''} x="${x}" y="${y}" font-size="${s}" font-weight="${w}" fill="${c}">${v}</text>`;
const svg=(w,h,body,title,fonts=true)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w=== '297mm'?1188:w} ${h=== '420mm'?1680:h}" role="img"><title>${title}</title>${fonts?style(w==='297mm'):''}${body}</svg>`;
const bg=(w,h,c=C.cream)=>`<rect width="${w}" height="${h}" fill="${c}"/>`;
const joint=`<path d="M8 58V30A22 22 0 0 1 30 8H58V30H30V58Z" fill="${C.ink}"/><path d="M68 8H112V58H90V30H68Z" fill="${C.clay}"/><path d="M8 68H30V90H58V112H8Z" fill="${C.ink}"/>`;
const stitch=`<path d="M9 8V68Q9 102 42 102H110" fill="none" stroke="${C.ink}" stroke-width="18"/><path d="M46 8L110 72L72 110" fill="none" stroke="${C.clay}" stroke-width="18"/><path d="M10 47H78V110" fill="none" stroke="${C.ink}" stroke-width="18"/>`;
// Tiles are all authored within a 48×48 cell; their different profiles remain visible.
const profiles=[`<path d="M0 48V24A24 24 0 0 1 24 0H48V48Z"/>`,`<path d="M0 0H48V24L24 48H0Z"/>`,`<path d="M0 0H48V48H24V24H0Z"/>`];
function workbench(x,y,s,permutation=[0,1,2],mono=null){const pos=[[0,0],[56,0],[0,56]],ink=[C.ink,C.clay,C.ink];return `<g transform="translate(${x} ${y}) scale(${s})" data-variant="${permutation.join('')}">${permutation.map((n,i)=>`<g transform="translate(${pos[i].join(' ')})" fill="${mono||ink[n]}">${profiles[n]}</g>`).join('')}</g>`;}
let alt=bg(1200,900)+t(64,104,44,'Manyfold / structural studies');
for(let i=0;i<3;i++){let x=64+i*368;alt+=`<rect x="${x}" y="184" width="336" height="566" fill="${i===1?C.lime:'#EAE5DB'}"/>`;
alt+=i===0?`<g transform="translate(${x+64} 280) scale(1.7)">${joint}</g>`:i===1?`<g transform="translate(${x+64} 280) scale(1.7)">${stitch}</g>`:workbench(x+73,280,1.85);
alt+=t(x+24,578,42,'Manyfold')+t(x+24,666,20,['01 / Common joint','02 / Shared stitch','03 / Open workbench'][i]);}
await fs.writeFile(path.join(out,'structural-alternatives.svg'),svg(1200,900,alt,'P3 structural alternatives — supporting study'));

const permutations=[[0,1,2],[2,0,1],[1,2,0]];
let sheet=bg(1200,900)+t(64,169,112,'Manyfold')+workbench(940,60,1.6)+`<path d="M64 239H1136" stroke="${C.ink}" stroke-width="2"/>`;
for(let i=0;i<3;i++){const x=64+i*376;sheet+=`<g id="variant-${i+1}"><rect x="${x}" y="295" width="320" height="470" fill="${i===1?C.lime:'#EAE5DB'}"/>`+workbench(x+56,354,2,permutations[i])+t(x+25,707,48,'Manyfold')+'</g>';}
await fs.writeFile(path.join(out,'identity-sheet.svg'),svg(1200,900,sheet,'Manyfold Open workbench identity: three collaborators exchange positions'));
let poster=bg(1188,1680)+workbench(84,68,.60)+t(176,121,55,'Manyfold',C.ink,700,'brand')+t(77,344,186,'Open',C.ink,700,'event-line-1')+t(77,526,186,'Studio',C.ink,700,'event-line-2')+workbench(84,600,7)+t(500,1080,24,'Meet the people.',C.ink,400,'message-1')+t(500,1124,24,'See the process.',C.ink,400,'message-2')+t(500,1168,24,'Make something together.',C.ink,400,'message-3')+t(84,1414,45,'21 November 2026',C.ink,700,'date')+t(84,1470,34,'10:00–18:00',C.ink,400,'time')+t(84,1522,34,'Hall 3, Riverside Works',C.ink,400,'place')+`<path d="M84 1550H1104" stroke="${C.ink}" stroke-width="2"/>`+t(84,1620,33,'Free entry',C.ink,700,'entry')+t(774,1620,30,'manyfold.example',C.ink,400,'url');
await fs.writeFile(path.join(out,'poster-a3.svg'),svg('297mm','420mm',poster,'Manyfold Open Studio — an open place at a shared workbench'));
await fs.writeFile(path.join(out,'symbol.svg'),svg(116,116,workbench(6,6,1),'Manyfold open workbench symbol',false));
await fs.writeFile(path.join(out,'one-color-mark.svg'),svg(116,116,workbench(6,6,1,[0,1,2],C.ink),'Manyfold open workbench in one ink',false));
await fs.writeFile(path.join(out,'mark-32.svg'),svg(32,32,workbench(3,3,.25,[0,1,2],C.ink),'Manyfold open workbench at 32 pixels',false));

await fs.writeFile(path.join(out,'grammar.json'),JSON.stringify({name:'Open workbench',invariants:{cells:[[0,0],[56,0],[0,56]],cellSize:48,gap:8,openSocket:[56,56],profiles:['quarter-rounded workpiece','chamfered workpiece','stepped workpiece'],wordmark:'DejaVu Sans Bold'},variables:{permutations,profileColor:'clay always follows chamfered profile; other profiles stay ink'},identity:{canvas:[1200,900],panels:{x:[64,440,816],y:295,width:320,height:470,gaps:[56,56]}},poster:{canvasMM:[297,420],viewBox:[1188,1680],workbench:{x:84,y:600,scale:7,bounds:[84,600,812,1328]},invitationSocket:[476,992,812,1328],invitationTextX:500}},null,2));
