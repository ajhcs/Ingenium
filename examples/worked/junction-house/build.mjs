import fs from 'node:fs/promises';
import path from 'node:path';
import { createOutput, readFont } from '../resources.mjs';
const out = await createOutput();
const font = await readFont('DejaVuSans-Bold.ttf');
const C={ink:'#242A36',paper:'#F3EFDF',west:'#D99A45',east:'#80B6AD',line:'#B8B8AA'};
const nodes=[];
const text=(id,x,y,s,size,fill=C.ink,anchor='start')=>{nodes.push({id,x,y,size,text:s});return `<text id="${id}" x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${s}</text>`};
const rect=(x,y,w,h,fill,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const line=(x1,y1,x2,y2,w=3,stroke=C.ink)=>`<path d="M${x1} ${y1}H${x2}" fill="none" stroke="${stroke}" stroke-width="${w}"/>`;
function arrow(x,y,size,dir,color=C.ink){return `<g transform="translate(${x} ${y}) scale(${size/100})${dir==='right'?' rotate(180)':''}" fill="${color}"><path d="M-48 0L-8-40V-15H48V15H-8V40Z"/></g>`;}
function icon(kind,x,y,size,color=C.ink){const p={workshop:`<path d="M-34-5H34V5H28V33H19V5H-19V33H-28V5H-34ZM-23-29H8V-5H-23ZM25-20H34V-5H25Z" fill="${color}"/>`,toilets:`<path d="M-30-32H-5V-5H31V5C31 20 19 29 6 29H-9V14C-24 11-30 2-30-10Z" fill="none" stroke="${color}" stroke-width="8" stroke-linejoin="round"/><path d="M-9 29H23M-30-36H-5" stroke="${color}" stroke-width="8" stroke-linecap="round"/>`,hall:`<path d="M-32 28V-10Q-32-34 0-34Q32-34 32-10V28M-40 30H40M-18-24V13H-30M18-24V13H30M-26 23H26" fill="none" stroke="${color}" stroke-width="7" stroke-linejoin="round"/>`,cafe:`<path d="M-32-17H20V4Q20 26-5 26Q-32 26-32 4ZM21-14H29Q45-14 41 2Q38 12 21 12M-39 35H31M-17-35V-26M3-35V-26" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`};return `<g aria-label="${kind}" transform="translate(${x} ${y}) scale(${size/100})">${p[kind]}</g>`;}
const signSpecs=[];
async function save(name,w,h,label,body){const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${label}</title><desc id="desc">${label}. Junction House visitor wayfinding.</desc><style>@font-face{font-family:Junction;src:url(data:font/ttf;base64,${font.toString('base64')}) format('truetype');font-weight:700}text{font-family:Junction,'DejaVu Sans',sans-serif;font-weight:700}</style>${rect(0,0,w,h,C.paper)}${body}</svg>`;await fs.writeFile(path.join(out,`${name}.svg`),svg);signSpecs.push({name,w,h,label});}
let b=rect(0,0,800,190,C.ink)+text('brand',48,70,'Junction House',46,C.paper)+text('welcome',48,143,'Welcome',64,C.paper);
b+=text('orientation',48,238,'Lobby · facing north',27);
b+=rect(48,274,704,340,C.paper,12);
// A single west/east corridor spine joins the lobby; endpoint markers are groups, not extra paths.
b+=`<path d="M114 400H686" fill="none" stroke="${C.ink}" stroke-width="18"/>`;
b+=arrow(105,400,62,'left')+arrow(695,400,62,'right');
b+=rect(298,306,204,226,C.ink,24)+text('lobby-map',400,352,'Lobby',33,C.paper,'middle')+text('reception-map',400,391,'Reception',24,C.paper,'middle');
b+=`<circle cx="400" cy="448" r="15" fill="${C.paper}"/><circle cx="400" cy="448" r="6" fill="${C.ink}"/>`+text('here',400,496,'You are here',23,C.paper,'middle');
b+=text('west-map',100,330,'WEST',30)+text('east-map',700,330,'EAST',30,C.ink,'end');
b+=text('workshop-map',48,560,'Workshop A',24)+text('toilets-map',48,596,'Toilets',24)+text('hall-map',752,560,'Event Hall',24,C.ink,'end')+text('cafe-map',752,596,'Cafe',24,C.ink,'end');
b+=rect(48,668,704,196,C.west,12)+arrow(101,714,57,'left')+text('west-label',151,727,'WEST',33);
b+=icon('workshop',101,778,56)+text('workshop-list',151,789,'Workshop A',37)+icon('toilets',101,832,50)+text('toilets-list',151,843,'Toilets',37);
b+=rect(48,888,704,196,C.east,12)+arrow(101,934,57,'right')+text('east-label',151,947,'EAST',33);
b+=icon('hall',101,998,56)+text('hall-list',151,1009,'Event Hall',37)+icon('cafe',101,1052,50)+text('cafe-list',151,1063,'Cafe',37);
b+=text('reception-bottom',48,1150,'Reception is here in the Lobby',25);
await save('01-lobby-directory',800,1200,'Lobby directory. Facing north: west left to Workshop A and Toilets; east right to Event Hall and Cafe. Reception is in the Lobby.',b);
for(const side of ['west','east']){const west=side==='west';const color=west?C.west:C.east;const dir=west?'left':'right';const destinations=west?[['workshop','Workshop A'],['toilets','Toilets']]:[['hall','Event Hall'],['cafe','Cafe']];let s=rect(0,0,240,400,C.ink)+arrow(120,205,175,dir,C.paper)+rect(240,0,960,400,color)+text(`${side}-heading`,288,80,side.toUpperCase(),42)+text(`${side}-brand`,1152,75,'Junction House',23,C.ink,'end');for(let i=0;i<2;i++){s+=icon(destinations[i][0],320,163+i*137,80)+text(`${side}-${i}`,391,182+i*137,destinations[i][1],62);}await save(`02-${side}-direction`,1200,400,`${side.toUpperCase()}. ${west?'Left':'Right'} to ${destinations.map(x=>x[1]).join(' and ')}.`,s);}
for(const [key,label,side] of [['workshop','Workshop A','west'],['toilets','Toilets','west'],['hall','Event Hall','east'],['cafe','Cafe','east']]){let s=rect(0,0,148,200,C.ink)+icon(key,74,100,112,C.paper)+rect(148,0,452,12,C[side])+text(`${key}-name`,177,119,label,label==='Workshop A'?46:51);await save(`03-${key}-destination`,600,200,label,s);}
await fs.writeFile(path.join(out,'specs.json'),JSON.stringify({palette:C,signs:signSpecs,textNodes:nodes,geometry:{directoryInset:48,directoryGroupGap:24,directionArrowWidth:240,destinationIconWidth:148,spine:[[114,400],[686,400]],lobby:{x:298,y:306,w:204,h:226}},routes:[{destination:'Reception',from:'Lobby',route:'At Lobby',turn:'None'},{destination:'Workshop A',from:'Lobby facing north',route:'West corridor',turn:'LEFT'},{destination:'Toilets',from:'Lobby facing north',route:'West corridor',turn:'LEFT'},{destination:'Event Hall',from:'Lobby facing north',route:'East corridor',turn:'RIGHT'},{destination:'Cafe',from:'Lobby facing north',route:'East corridor',turn:'RIGHT'}]},null,2));
