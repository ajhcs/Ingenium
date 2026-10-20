import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const C = { ink:'#23313b', muted:'#63727c', line:'#d8e0e5', paper:'#f5f7f8', white:'#ffffff', blue:'#315f9b', teal:'#15776d', pale:'#e8f3ef', soft:'#eaf0f9', amber:'#946018', warm:'#fff2dc' };
const PALETTE_FAMILIES=[{x:56,name:'01 / Harbor',ink:'#23313b',accent:'#315f9b',soft:'#eaf0f9',bg:'#f5f7f8',status:'#15776d'},{x:428,name:'02 / Field',ink:'#2f3832',accent:'#456e50',soft:'#edf2e7',bg:'#f7f7f0',status:'#556128'},{x:800,name:'03 / Mineral',ink:'#37333d',accent:'#735875',soft:'#f1eaf2',bg:'#f7f4f7',status:'#696080'}];
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rect = (x,y,w,h,fill=C.white,stroke=C.line,r=12,id='') => `<rect${id ? ` id="${id}"` : ''} x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const text = (x,y,value,size=16,fill=C.ink,weight=400,id='',family='sans-serif') => `<text${id ? ` id="${id}"` : ''} x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(value)}</text>`;
const line = (x1,y1,x2,y2,color=C.line,width=1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
const label = (x,y,v) => text(x,y,v,12,C.muted,600);
const pill = (x,y,v,fill=C.pale,color=C.teal,w=100) => rect(x,y,w,26,fill,fill,13)+text(x+12,y+18,v,12,color,600);
const button = (x,y,w,v,primary=true,id='') => `<g${id ? ` id="${id}"` : ''}>${rect(x,y,w,36,primary?C.blue:C.white,primary?C.blue:C.line,6)}${text(x+14,y+24,v,13,primary?C.white:C.ink,600)}</g>`;
const arrow = (x1,y1,x2,y2,color=C.blue,id='') => {
 const a=Math.atan2(y2-y1,x2-x1), n=8;
 const p1=`${x2-n*Math.cos(a-.45)},${y2-n*Math.sin(a-.45)}`;
 const p2=`${x2-n*Math.cos(a+.45)},${y2-n*Math.sin(a+.45)}`;
 return `<g${id ? ` id="${id}"` : ''}>${line(x1,y1,x2,y2,color,2)}<polygon points="${x2},${y2} ${p1} ${p2}" fill="${color}"/></g>`;
};
const note = (x,y,title,body,width=330) => rect(x,y,width,78,C.soft,C.soft,8)+text(x+16,y+25,title,13,C.blue,600)+text(x+16,y+51,body,13,C.ink);
function board(id,title,subtitle,content,footer,fixture) {
 return `<svg id="${id}-scene" xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><title id="${id}-title">${esc(title)}</title><desc id="${id}-description">${esc(subtitle)} Original synthetic Relay study. Editable source, not a working product.</desc>${rect(0,0,1200,800,'#f2f0e8','#f2f0e8',0)}${rect(56,29,12,16,'#e5ff55','#202824',0)}${text(79,43,'INGENIUM / RELAY STUDIES',12,'#202824',600)}${text(560,43,`R-1048 / ${fixture.subjectTitle}`,12,'#545e55',400,`${id}-subject-title`)}${line(56,57,1144,57,'#bdc4b6')}${text(56,96,title,34,'#202824',400,'','DejaVuSerif, Georgia, serif')}${text(56,125,subtitle,15,'#545e55')}<g id="${id}-view">${content}</g>${line(56,737,1144,737,'#bdc4b6')}${text(56,765,footer,12,'#545e55')}${text(1045,765,'INGENIUM',12,'#545e55',600)}</svg>\n`;
}
function structural(fixture,appearance) {
 let s=rect(56,153,1088,454,C.white,C.line,10,'wireframe-app');
 s+=rect(56,153,180,454,'#edf1f3',C.line,10)+text(78,190,'Relay',22,C.ink,700)+label(78,231,'WORKSPACE');
 ['Overview','Work orders','People','Parts'].forEach((v,i)=>{s+=(i===1?rect(68,251+i*43,156,34,'#dce4e9','#dce4e9',5):'')+text(82,274+i*43,v,14,C.ink,i===1?600:400);});
 s+=text(264,190,'Work orders',24,C.ink,600)+label(264,218,'TEAM QUEUE · TUESDAY')+button(962,171,154,'New work order',false);
 s+=rect(264,242,852,46,C.paper,C.line,5)+text(280,271,'Search by title or order ID',14,C.muted)+label(920,271,'Status: all');
 s+=label(280,321,'ORDER / DESCRIPTION')+label(710,321,'ASSIGNEE')+label(906,321,'STATUS');
 const rows=[['R-1048',`${fixture.subjectTitle} · loose switch`,'Mina','Ready'],['R-1047','City bicycle · brake service','Owen','In progress'],['R-1046','Desk fan · intermittent power','Unassigned','Needs review']];
 rows.forEach((r,i)=>{const y=342+i*75;s+=line(264,y,1116,y)+text(280,y+25,r[0],12,C.muted)+text(280,y+49,r[1],15,C.ink,600)+text(710,y+43,r[2],14)+rect(906,y+19,180,30,'#edf1f3','#edf1f3',4)+text(920,y+39,r[3],13);});
 s+=label(264,587,'3 ORDERS · MOST RECENT FIRST');
 s+=note(56,631,'01 / Persistent navigation','Place and active section remain visible.',344)+note(428,631,'02 / Queue hierarchy','Scan ID, description, owner, then status.',344)+note(800,631,'03 / Deliberately unresolved','Search rules and permissions need definition.',344);
 return board('structural-wireframe','Structural wireframe','Content and hierarchy first · one queue view · intentionally low fidelity',s,'Study boundary: static structure; no interactions, permissions or data behavior implemented.',fixture);
}
function miniScreen(x,y,w,title,rows,action,id) {
 let s=`<g id="${id}">`+rect(x,y,w,250,C.white,C.line,10)+rect(x,y,w,40,C.soft,C.soft,10)+text(x+16,y+26,title,16,C.ink,600);
 rows.forEach((r,i)=>{s+=label(x+16,y+69+i*46,r[0])+text(x+16,y+91+i*46,r[1],13);});
 return s+button(x+16,y+200,w-32,action,true,`${id}-action`)+`</g>`;
}
function wireflow(fixture,appearance) {
 let s=miniScreen(56,200,290,'01 / Queue',[['SELECTED ORDER',`R-1048 · ${fixture.subjectTitle}`],['STATUS','Ready for assignment']],'Open order','wireflow-queue');
 s+=miniScreen(455,200,290,'02 / Order detail',[['ASSIGNEE','Mina Patel'],['CHECK','Required: assignee']],'Assign order','wireflow-detail');
 s+=miniScreen(854,200,290,'03 / Queue updated',[['R-1048','Assigned to Mina'],['FEEDBACK','Assignment saved']],'Open order','wireflow-updated');
 s+=arrow(354,324,447,324,C.blue,'wireflow-edge-open')+text(356,285,'Open',13,C.blue,600)+arrow(753,324,846,324,C.blue,'wireflow-edge-assign')+text(760,276,'Assign',13,C.blue,600)+text(760,296,'[assignee set]',12,C.muted);
 s+=line(599,458,599,511,C.amber,2)+arrow(599,511,373,511,C.amber,'wireflow-edge-refuse')+text(395,500,'[missing assignee]',12,C.amber,600)+rect(56,483,309,84,C.warm,C.warm,8)+text(72,511,'Stay on order detail',15,C.ink,600)+text(72,538,'Show “Choose an assignee.”',13,C.ink);
 s+=note(56,621,'Route scope','Single assignment path; no bulk actions.',344)+note(428,621,'Recovery','Invalid input retains entered values.',344)+note(800,621,'Arrow language','Blue: route; amber: in-place refusal.',344);
 return board('wireflow','Wireflow','Connected views with explicit actions, preconditions and a recoverable branch',s,'Static route sketch; authentication, API timing and concurrent edits remain unspecified.',fixture);
}
function stateSequence(fixture,appearance) {
 const states=[{id:'invalid',name:'A / Invalid retained',value:'Mina?',message:'Choose a listed person.',working:'r1 / Unassigned',draft:'Raw v1 · invalid',action:'Repair input',fill:C.warm},{id:'repaired',name:'B / Repair → valid update',value:'Mina Patel',message:'Valid → working r2.',working:'r2 / Mina Patel',draft:'Raw v2 · valid',action:'Automatic update',fill:C.pale},{id:'applied',name:'C / Applied locally',value:'Mina Patel',message:'Local value · unsaved.',working:'r2 / Mina Patel',draft:'No active raw draft',action:'Undo assignment',fill:C.soft},{id:'undone',name:'D / Model undo',value:'Unassigned',message:'Prior value → NEW r3.',working:'r3 / Unassigned',draft:'No active raw draft',action:'Undo is not text undo',fill:C.soft}];
 let s='';states.forEach((v,i)=>{const x=56+i*278,view=`state-sequence-${v.id}`;s+=`<g id="${view}">`+text(x,175,v.name,13,C.muted,600)+rect(x,193,254,340,C.white,C.line,10,`${view}-panel`)+text(x+16,225,'R-1048 / Assignment',16,C.ink,600)+label(x+16,263,'ASSIGNEE')+rect(x+16,277,222,42,C.paper,C.line,6,`${view}-assignee`)+text(x+28,304,v.value,15)+text(x+16,346,v.draft,12,C.muted)+rect(x+16,364,222,45,v.fill,v.fill,6)+text(x+28,392,v.message,13,C.ink)+text(x+16,437,`Working: ${v.working}`,12,C.ink)+text(x+16,461,'Acknowledged: r1 / Unassigned',11,C.muted)+text(x+16,503,v.action,12,C.blue,600,`${view}-action`)+`</g>`;});
 s+=text(56,568,'Repair valid input → automatic model update → close draft → model Undo creates r3',15,C.blue,600);
 s+=note(56,610,'Changes / same panel anchors','Raw value, working value and revision.',344)+note(428,610,'Unchanged / all four snapshots','Subject R-1048; durable acknowledgement r1.',344)+note(800,610,'Undo scope / explicit precondition','Resolve raw draft first; never rewind revision.',344);
 return board('state-sequence','Same-screen state sequence','One panel over time · invalid raw input never replaces the last valid working value',s,'Static automatic-update policy; no persistence, timing, focus or receipt rejection executed.',fixture);
}
function desktopWorkflow(fixture,appearance) {
 let s=rect(56,157,1088,423,C.white,C.line,10)+rect(56,157,1088,46,C.ink,C.ink,10)+text(76,187,'Relay',18,C.white,700)+text(198,185,'Work orders / Team queue',14,'#dce4e9')+text(996,185,'Mina · Planner',13,C.white);
 s+=rect(56,203,244,377,C.paper,C.line,0)+text(74,234,'Queue',19,C.ink,600)+pill(185,215,'3 open',C.soft,C.blue,95);
 [['R-1048',fixture.subjectTitle],['R-1047','City bicycle'],['R-1046','Desk fan']].forEach((r,i)=>{const y=251+i*91;s+=rect(68,y,220,79,i===0?C.soft:C.white,i===0?C.blue:C.line,6)+label(82,y+23,r[0])+text(82,y+48,r[1],15,C.ink,600)+text(82,y+67,i===0?'Ready':'In progress',12,C.muted);});
 s+=text(322,237,fixture.subjectTitle,25,C.ink,600)+pill(656,214,'Ready',C.pale,C.teal,94)+label(322,265,'R-1048 · RECEIVED TODAY')+line(322,284,766,284)+text(322,316,'Reported issue',14,C.ink,600)+text(322,343,'Switch moves freely; lamp stays off.',14)+text(322,384,'Service note',14,C.ink,600)+rect(322,399,440,72,C.paper,C.line,6)+text(336,425,'Inspect switch housing before service.',14,C.muted)+button(322,498,136,'Save note',false)+text(478,522,'Note session · local raw draft',12,C.muted);
 s+=line(790,203,790,580)+text(814,237,'Assignment',20,C.ink,600)+text(814,258,`R-1048 · ${fixture.subjectTitle}`,12,C.muted)+label(814,279,'PERSON')+rect(814,292,306,40,C.white,C.line,6)+text(828,318,'Mina? · invalid draft',14)+label(814,363,'PLANNED DATE')+rect(814,376,306,40,C.white,C.line,6)+text(828,402,'Tomorrow',14)+button(814,498,306,'Assign work order');
 s+=rect(56,600,1088,104,C.soft,C.soft,8)+text(72,624,'EVENT TRACE / SHARED ASSIGNMENT EDIT SESSION · PROPOSED AUTOMATIC VALID UPDATES',12,C.blue,600)+text(72,650,'1 Select R-1048 → queue + detail show valid r1; focus enters inspector.',13)+text(72,672,'2 Type Mina? → raw draft retained in inspector; linked views keep valid r1.',13)+text(650,650,'3 Move panes → transfer same draft/session; restore field focus.',13)+text(650,672,'4 Repair → auto r2; valid views refresh; save request may be pending.',13);
 return board('desktop-workflow','Complex desktop workflow','Queue + working detail + inspector · shared assignment draft, separate note session',s,'Selection change retains drafts by subject/field; focus restoration, request freshness and resizing are untested.',fixture);
}
function emptyError(fixture,appearance) {
 let s=label(56,171,'A / FIRST USE · NO ORDERS')+label(614,171,'B / REQUEST FAILED · CONTENT RETAINED');
 s+=rect(56,190,530,370,C.white,C.line,10)+rect(614,190,530,370,C.white,C.line,10);
 s+=rect(281,237,80,65,C.soft,C.soft,12)+line(301,260,341,260,C.blue,2)+line(301,276,331,276,C.blue,2)+text(173,345,'Your queue starts here',24,C.ink,600)+text(138,378,'Create a work order to coordinate the next repair.',14,C.muted)+button(221,414,200,'Create work order')+text(196,489,'No records yet · no filters applied',13,C.muted);
 s+=text(638,227,'Assign R-1048',23,C.ink,600)+label(638,270,'ASSIGNEE')+rect(638,284,482,42,C.paper,C.line,6)+text(653,312,'Mina Patel',15)+rect(638,347,482,99,C.warm,C.warm,8)+text(654,376,'Assignment could not be saved',17,C.amber,600)+text(654,401,'Connection interrupted. Your selection is still here.',13)+text(654,424,'Check the connection, then retry.',13)+button(638,479,132,'Try again')+button(784,479,160,'Back to queue',false);
 s+=note(56,611,'Empty ≠ no matches','Filtered zero results need “Clear filters”.',530)+note(614,611,'Recovery is explicit','Retry keeps values; leaving needs draft policy.',530);
 return board('empty-error','Empty and error states','Explain the condition, preserve context, and provide a useful next action',s,'Error copy is synthetic. Actual recovery, duplicate prevention and announcement behavior are unimplemented.',fixture);
}
function collage(fixture,appearance) {
 let s=rect(56,157,1088,546,'#edf1f3','#edf1f3',12)+label(80,187,'VISUAL VOCABULARY · FRAGMENTS ONLY');
 s+=rect(88,216,298,180,C.white,C.white,12)+label(109,245,'VOICE / CLEAR + PRACTICAL')+text(109,285,'Keep repairs',29,C.ink,600)+text(109,321,'moving.',29,C.ink,600)+text(109,368,'Plain language. A calm working rhythm.',12,C.muted);
 s+=rect(410,216,286,118,C.ink,C.ink,12)+text(432,250,'RELAY',18,C.white,700)+text(432,286,'Every handoff, visible.',20,'#dce4e9')+text(432,312,'Compatible: plain type + labeled status',11,'#b9cad4');
 s+=rect(721,216,394,211,C.white,C.white,12)+label(744,247,'BADGE TREATMENT / SAME CONTENT')+pill(744,274,'Ready',C.pale,C.teal,151)+rect(928,274,151,26,C.white,C.teal,13)+text(940,292,'Ready',12,C.teal,600)+pill(744,319,'Needs review',C.warm,C.amber,151)+rect(928,319,151,26,C.white,C.amber,13)+text(940,337,'Needs review',12,C.amber,600)+text(744,376,'Variable: fill/outline · constants: words + type',12,C.muted)+text(744,400,'Filled: emphasis / outline: quieter · choice open',12,C.muted);
 s+=rect(410,359,286,164,C.white,C.white,12)+label(432,389,'CONTROL CHARACTER')+button(432,411,242,'Assign work order')+button(432,466,242,'Save note',false);
 s+=rect(410,546,286,124,C.white,C.white,12)+label(432,574,'COMPATIBILITY / BOTH OPTIONS')+pill(432,596,'Ready',C.pale,C.teal,102)+rect(554,596,120,26,C.white,C.teal,13)+text(566,614,'Ready',12,C.teal,600)+text(432,651,'Same label; treatment choice stays open.',12,C.muted);
 s+=rect(88,421,298,249,C.white,C.white,12)+label(109,451,`SPACING / WIDTHS AT ${appearance.collageSpacingScale}×`);[8,16,24,32].forEach((n,i)=>{s+=rect(109,474+i*40,n*appearance.collageSpacingScale,15,C.teal,C.teal,2)+text(288,487+i*40,`${n} px`,12,C.muted);});
 s+=rect(721,451,394,219,C.white,C.white,12)+label(744,481,'DETAIL / SMALL AND USEFUL')+text(744,519,'R-1048',14,C.muted,400,'collage-order','monospace')+text(744,550,fixture.subjectTitle,21,C.ink,600)+text(744,575,'Reported: loose switch',13,C.muted)+line(744,591,1088,591)+text(744,617,'Owner',13,C.muted)+text(940,617,'Mina Patel',14,C.ink,600)+text(744,650,'One divider, a deliberate pair of alignments.',12,C.muted);
 return board('element-collage','Element collage','Treatment variables: type, color, spacing, surface · held: Relay repair vocabulary and task labels',s,'Decoration and presentation study only. Fragment placement implies no navigation, sequence or product behavior.',fixture);
}
function paletteFamilies(fixture,appearance) {
 const themes=PALETTE_FAMILIES;
 let s='';themes.forEach(t=>{s+=text(t.x,176,t.name,19,C.ink,600)+rect(t.x,197,344,301,t.bg,C.line,10)+rect(t.x+16,213,312,44,t.ink,t.ink,6)+text(t.x+30,241,'Relay / Work orders',16,C.white,600)+text(t.x+24,292,fixture.subjectTitle,24,t.ink,600)+text(t.x+24,319,'R-1048 · Mina Patel',13,t.ink)+rect(t.x+24,340,296,48,t.soft,t.soft,6)+text(t.x+38,370,'Ready for assignment',14,t.status,600)+rect(t.x+24,419,296,43,t.accent,t.accent,6)+text(t.x+40,447,'Assign work order',14,C.white,600);
 const roles=[['Text',t.ink],['Action',t.accent],['Focus',t.accent],['Selection',t.soft],['Success',t.status],['Warning','#946018'],['Error','#a23d3d'],['Surface',t.bg],['Border',C.line],['On action',C.white]];
 roles.forEach(([name,c],i)=>{const cx=t.x+(i%2)*174,cy=520+Math.floor(i/2)*43;s+=rect(cx,cy,25,25,c,C.line,4)+text(cx+34,cy+11,name,11,C.ink,600)+text(cx+34,cy+27,c,11,C.muted,400,'','monospace');});});
 return board('palette-families','Palette families','Three authored families applied to the same compact view · no preference is preselected',s,'Same specimen and role map; no preferred family. See contrast report for measured pairs; focus behavior and dark mode are untested.',fixture);
}
function fontplate(fixture,appearance) {
 let s='';
 const corpus=[['heading','Heading / 28 / 600','Keep repairs moving.',28,600],['section','Section / 20 / 600','Assignment details',20,600],['body','Body / 16 / 400','Inspect the switch before service.',16,400],['long-label','Long label / 16 / 400','Assignment and inspection history',16,400],['tree','Tree / 16 / 400','Work orders / R-1048 / Assignment',16,400],['field','Field / 13 / 600','Assignee: Mina Patel',13,600],['identifier','Identifier / 18 / 400','R-1048  0123456789',18,400],['characters','Characters / 18 / 400','0O 1lI · → ≤ Δ / :',18,400],['error','Error / 13 / 400','Error: Choose a listed person.',13,400],['units','Units / 16 / 400','12 mm · 2.5 kg · 08:30',16,400]];
 [{x:56,family:'sans-serif',name:'A / GENERIC SANS'},{x:614,family:'serif',name:'B / GENERIC SERIF'}].forEach(t=>{s+=rect(t.x,157,530,485,C.white,C.line,10)+label(t.x+20,187,t.name)+text(t.x+20,213,'Same copy, 490 px width, sizes, weights, line steps.',12,C.muted);corpus.forEach((r,i)=>{const y=240+i*39;s+=label(t.x+20,y,r[1])+text(t.x+20,y+24,r[2],r[3],C.ink,r[4],`fontplate-${t.family}-${r[0]}`,t.family);});});
 s+=rect(56,660,1088,46,C.soft,C.soft,6)+text(72,687,'FIXED METRICS ONLY · Tuned-fit omitted; metric deltas: none. Actual font identities/glyph coverage: unresolved.',13,C.blue,600);
 return board('fontplate','Fontplate / type specimen','Controlled family-request comparison · identical corpus and nominal metrics · no winner selected',s,'Generic family requests are not exact font identities. Rendering and glyph fallback remain host-dependent.',fixture);
}
const DEFINITIONS=[
 ['structural-wireframe','Structural wireframe','structure','One queue view; content hierarchy before visual styling.',structural],
 ['wireflow','Wireflow','navigation','Three connected views; action and guard labels plus invalid-input branch.',wireflow],
 ['state-sequence','Same-screen state sequence','state','Four aligned temporal states: invalid draft, repair/automatic valid update, applied local value and semantic undo.',stateSequence],
 ['desktop-workflow','Complex desktop workflow','workspace','Three-pane desktop with separate note and assignment commit boundaries.',desktopWorkflow],
 ['empty-error','Empty and error states','recovery','First-use empty state and retained-input connection error.',emptyError],
 ['element-collage','Element collage','visual-study','Independent presentation fragments without implied behavior.',collage],
 ['palette-families','Palette families','visual-comparison','Three families applied to identical content and geometry.',paletteFamilies],
 ['fontplate','Fontplate / type specimen','typography','Fixed-metrics identical-corpus generic sans/serif comparison; actual fonts unresolved.',fontplate]
];
/** Build original editable static SVG studies without filesystem or renderer effects. */
export function buildContrastPairs() {
 const pair=(study,target,foreground,background,threshold=4.5)=>({study,target,foreground,background,threshold,composition:'opaque sRGB'});
 const pairs=PALETTE_FAMILIES.flatMap(t=>[
  pair('palette-families',`${t.name}: body`,t.ink,t.bg),
  pair('palette-families',`${t.name}: reversed heading`,C.white,t.ink),
  pair('palette-families',`${t.name}: action text`,C.white,t.accent),
  pair('palette-families',`${t.name}: status text`,t.status,t.soft),
  pair('palette-families',`${t.name}: focus ink on surface`,t.accent,t.bg,3),
  pair('palette-families',`${t.name}: warning ink on surface`,C.amber,t.bg),
  pair('palette-families',`${t.name}: error ink on surface`,'#a23d3d',t.bg),
 ]);
 for(const [target,fg,bg] of [['corpus',C.ink,C.white],['labels',C.muted,C.white],['comparison note',C.blue,C.soft]]) pairs.push(pair('fontplate',target,fg,bg));
 pairs.push(pair('shared frame','editorial copy','#545e55','#f2f0e8'));
 return pairs;
}

function studyMetadata(id,fixture,appearance) {
 const specifiesBehavior=['wireflow','state-sequence','desktop-workflow','empty-error'].includes(id);
 const assignmentSubject='relay:work-order:R-1048:assignment';
 const metadata={
  schema:'ingenium-method-study/1', artifactID:`ingenium:relay:study:${id}`, revision:3, primaryMethod:id,
  scenarioID:'ingenium:relay:scenario:repair-coordination', sceneID:`${id}-scene`,
  sourceScenario:{kind:'fixture',scenarioID:'ingenium:relay:scenario:repair-coordination',revision:fixture.revision,modelVersion:null,mappingStatus:'no native mapping supplied',backend:'absent'},
  semanticFixture:fixture, appearanceParameters:appearance,
  purpose:DEFINITIONS.find(row=>row[0]===id)[3], audience:'People reviewing a proposed repair-coordination workspace',
  fidelity:{layout:'authored 1200 × 800 fixed viewport',appearance:['element-collage','palette-families','fontplate'].includes(id)?'visual study':'restrained structural sketch',content:'original fictional repair content'},
  interactivity:{level:'static',actions:specifiesBehavior?'Drawn controls specify proposed actions only.':'No interactive path specified.'}, modelVersion:null,
  modelBinding:{status:'not-applicable',reason:'Original synthetic domain; no authoritative native model or API supplied.'},
  assumptions:['Relay, its people, work orders and revision labels are fictional.','No application runtime, persistence or backend is present.'],
  claims:[{id:'study-intent',status:'authored',scope:'Original study of the stated question, without implying behavior.'},{id:'interaction-specification',status:specifiesBehavior?'specified':'not-applicable',scope:specifiesBehavior?'Only the visible paths and annotations in this artifact.':'This study does not specify an interaction path.'},{id:'runtime-behavior',status:specifiesBehavior?'not-run':'not-applicable',scope:'No controls or transitions executed.'},{id:'model-conformance',status:'not-applicable',scope:'No native model binding supplied.'},{id:'user-acceptance',status:'not-established',scope:'No scoped user choice or acceptance recorded.'},{id:'engineering-adequacy',status:'not-established',scope:'No engineering qualification performed.'}],
  viewElements:[{id:`${id}-scene`,role:'decorative scene shell'},{id:`${id}-view`,role:'interaction requirement',requirementID:`relay:study-requirement:${id}`},{id:`${id}-subject-title`,role:'domain projection',domainID:'relay:work-order:R-1048'}],
  elementMappingLimit:'Only named anchors are mapped; remaining text/geometry is presentation within its named view, not additional model entities. Detailed control coverage is omitted except the declared sequence and wireflow anchors.',
  omissions:['Runtime keyboard/focus, timing, persistence, concurrency and responsive behavior are untested.'],
  unresolvedDecisions:['Proposed visual and behavior choices await scoped review.']
 };
 if(id==='state-sequence') {
  const baseline='relay:assignment:semantic-r1',working='relay:assignment:semantic-r2',undone='relay:assignment:semantic-r3';
  metadata.scenarioID='ingenium:relay:scenario:assignment-edit';
  const states=['invalid','repaired','applied','undone'];
  metadata.viewElements.push(...states.flatMap(state=>[
   {id:`state-sequence-${state}`,role:'temporal view',domainID:assignmentSubject},
   {id:`state-sequence-${state}-assignee`,role:'assignee field',domainID:assignmentSubject},
   {id:`state-sequence-${state}-action`,role:'interaction requirement',requirementID:`relay:assignment:${state}`}
  ]));
  metadata.stateContract={status:'specified',domainID:assignmentSubject,editingPolicy:'Valid input updates working model automatically; invalid raw input is retained separately. No global Apply gate.',
   owner:{selection:'relay:work-order:R-1048',editing:'shared assignment subject/field session',focus:'assignee field; restoration specified, untested'},
   receiptRule:'Only a matching requestID/requestedRevision that is fresh for the current working revision may acknowledge validation or durable save. Reject stale results; this is a static rule, not executed rejection.',
   baseline:{semanticRevision:baseline,assigneeId:null},
   snapshots:states.map(viewState=>({viewElementId:`state-sequence-${viewState}`,viewState,
    rawDraft:viewState==='invalid'?{text:'Mina?',status:'invalid',version:'relay:draft-v1'}:viewState==='repaired'?{text:'Mina Patel',status:'valid',version:'relay:draft-v2'}:null,
    workingModel:{semanticRevision:viewState==='invalid'?baseline:viewState==='undone'?undone:working,assigneeId:['repaired','applied'].includes(viewState)?'relay:person:mina-patel':null},
    validation:{status:viewState==='invalid'?'raw-invalid; prior valid model retained':'specified-valid',semanticRevision:viewState==='invalid'?baseline:viewState==='undone'?undone:working,diagnosticVersion:`relay:diagnostics:${viewState}`,executed:false},
    request:null,acknowledgedSave:{semanticRevision:baseline,status:'specified-prior-durable-acknowledgement'},saveStatus:'not-requested'})),
   edges:[{id:'assignment-repair',sourceStateID:'state-sequence-invalid',destinationStateID:'state-sequence-repaired',triggerKind:'valid input repair',controlRef:'state-sequence-invalid-action',guard:'raw text resolves to a listed person',preservation:'same subject and durable r1',effect:'Automatic valid model update creates r2; raw invalid input never overwrites r1.'},{id:'assignment-close-draft',sourceStateID:'state-sequence-repaired',destinationStateID:'state-sequence-applied',triggerKind:'finish editing',controlRef:null,guard:'valid update already applied; close gesture unspecified',preservation:'working r2 and durable r1',effect:'Close raw draft; working r2 unchanged.'},{id:'assignment-model-undo',sourceStateID:'state-sequence-applied',destinationStateID:'state-sequence-undone',triggerKind:'scoped model undo',controlRef:'state-sequence-applied-action',guard:'no unresolved raw draft',preservation:'same subject and durable r1',effect:'Restore r1 value as NEW r3; do not rewind revision identity.'}],
   undo:{status:'drawn specification',newSemanticRevision:undone,restoresValueFrom:baseline,precondition:'Resolve a pending raw draft by valid update or discard first; text undo is a distinct editor operation.',acknowledgedSaveRevision:baseline},
   deltaLedger:{changed:['raw draft content/status','working value and semantic revision','diagnostic version'],unchanged:['panel anchors','subject selection','editing owner','durable acknowledgement r1']},
   omissions:['Pending saves, stale receipt arrival, failed acknowledgement, cancellation and concurrent update recovery are specified as rules or omitted; none is executed.']};
 }
 if(id==='element-collage') metadata.comparison={kind:'exploratory assemblage',treatmentVariables:['type roles','color','spacing','surface and component treatment'],heldContent:['Relay repair vocabulary','work-order R-1048','assignment and note task labels'],controlledFragment:{question:'Filled or outlined status badge?',variants:['filled','outlined'],constants:['Ready and Needs review wording','semantic text color','type size and weight','badge dimensions'],variable:'background fill versus outline',openChoice:'No preferred treatment selected',compatibility:'Both preserve a written status cue.'},limit:'Assemblage includes one local controlled badge comparison; not a full controlled multi-direction collage or product layout.'};
 if(id==='palette-families') metadata.comparison={kind:'controlled family comparison',treatmentVariables:['color values by role'],heldContent:['text','geometry','typography','semantic role names'],nonColorCue:'Written status label preserves meaning.',allowedPairs:'Only the declared opaque pairs in contrast-report.json are measured.',unsupported:['Focus ring against adjacent dark action and actual geometry','selection-versus-focus behavior','alpha, hover and dark mode'],limit:'No preferred family, universal tone ranking or interactive focus qualification.'};
 if(id==='fontplate') metadata.comparison={kind:'fixed-metrics family-request comparison',treatmentVariables:['generic requested family: sans-serif versus serif'],heldContent:['identical corpus','490 px width','nominal size/weight/line step','spacing'],modes:{fixedMetrics:'Drawn side by side with identical corpus and nominal metrics.',tunedFit:'Omitted; no per-family metric adjustments.'},metricDeltas:[],actualFonts:{status:'unresolved',candidateEvidence:'../font-environment.json; system fontconfig candidates only',reason:'Generic family request; renderer does not establish per-glyph actual font identities.'},limit:'No exact font binding, glyph coverage, tuned-fit result or superiority claim.'};
 if(id==='wireflow') metadata.edges=[
  {id:'wireflow-edge-open',sourceStateID:'wireflow-queue',destinationStateID:'wireflow-detail',triggerKind:'navigation',controlRef:'wireflow-queue-action',guard:'selected order exists',effect:'Open selected order',preservation:'Keep order identity'},
  {id:'wireflow-edge-assign',sourceStateID:'wireflow-detail',destinationStateID:'wireflow-updated',triggerKind:'save acknowledgement',controlRef:'wireflow-detail-action',guard:'valid assignee; matching current acknowledgement',effect:'Show assigned queue result',preservation:'Keep order and assignee identity'},
  {id:'wireflow-edge-refuse',sourceStateID:'wireflow-detail',destinationStateID:'wireflow-detail',triggerKind:'validation refusal',controlRef:'wireflow-detail-action',guard:'assignee missing',effect:'Show correction in place',preservation:'Keep entered values'}];
 if(id==='wireflow') {
  metadata.viewElements.push(...['queue','detail','updated'].flatMap(view=>[{id:`wireflow-${view}`,role:'domain projection',domainID:'relay:work-order:R-1048'},{id:`wireflow-${view}-action`,role:'interaction requirement',requirementID:`relay:wireflow-action:${view}`}]),...metadata.edges.map(edge=>({id:edge.id,role:'interaction requirement',requirementID:`relay:${edge.id}`})));
  metadata.omissions.push('Missing-title creation, cancellation, back navigation, authentication, concurrency and external handoffs are not drawn.');
 }
 if(id==='desktop-workflow') metadata.eventLedger={status:'drawn static event trace',policy:'Automatic valid working-model updates; no forced global Apply or save-before-navigation.',sessionKey:{domainID:assignmentSubject,field:'assignee'},
  events:[{id:'desktop-select',selection:'relay:work-order:R-1048',focusOwner:'inspector.assignee',editingOwner:'shared assignment session',rawDraft:null,workingRevision:'r1',pendingOperation:null,views:'Queue/detail/inspector project valid r1.'},
   {id:'desktop-invalid',selection:'relay:work-order:R-1048',focusOwner:'inspector.assignee',editingOwner:'same shared session',rawDraft:'Mina?',workingRevision:'r1',pendingOperation:null,views:'Raw editor draft only; linked views retain valid r1.'},
   {id:'desktop-transfer',selection:'relay:work-order:R-1048',focusOwner:'destination assignee editor restores caret',editingOwner:'same session transfers across panes',rawDraft:'Mina?',workingRevision:'r1',pendingOperation:null,views:'No duplicate subject or independent draft.'},
   {id:'desktop-repair',selection:'relay:work-order:R-1048',focusOwner:'assignee editor',editingOwner:'same session',rawDraft:'Mina Patel',workingRevision:'r2',pendingOperation:{requestID:'relay:save-request:r2',requestedRevision:'r2',freshness:'reject if current revision differs'},views:'Valid input auto-updates working views; durable acknowledgement remains r1.'}],
  selectionChange:'Keep unresolved draft keyed by subject and field; a new selection starts or resumes its own session. Returning restores the previous draft/focus where supported; no forced save-before-navigation.',
  matrix:{rawProjection:'Inspector/editor session only',appliedProjection:'Queue/detail and other views use valid working revision',diagnostics:'Versioned separately; raw draft errors do not overwrite working model',note:'Independent subject/field session'},
  omissions:['Focus restoration, keyboard/non-drag alternatives, minimum resize, reopen behavior, shared-session transfer and stale receipt rejection are specified only; no live execution.']};
 if(id==='empty-error') metadata.stateInventory={drawn:['first use: no records, create action','failed assignment: retained selection, retry or leave'],omitted:['no results','invalid input','access unavailable','malformed import','pending or stale response'],retry:'A retry is a new request requiring valid inputs and a fresh matching acknowledgement; duplicate safety and real reachability are untested.',exit:'Leaving needs an unresolved-draft policy; not specified as a successful save.'};
 if(id==='structural-wireframe') metadata.probes={status:'not-checked',viewport:'1200 × 800',targets:['Locate selected order and next action','Try a long subject label via canonical fixture','Inspect resizing separately; static source has no responsive behavior'],actionSourceMap:'Controls are proposed queue actions; no native/API source supplied.'};
 metadata.claims=metadata.claims.map(({id:claimID,status,scope})=>({id:claimID,subject:metadata.artifactID,result:status==='not-applicable'?'N/A':'not-checked',specificationStatus:status,evidence:[],limits:[scope,'Pure authoring metadata; not an executed check receipt.'],toolVersion:null,sourceRevision:fixture.revision,viewRevision:metadata.revision}));
 return metadata;
}

export function buildMethodStudies(options={}) {
 if(!options || typeof options!=='object' || Array.isArray(options) || Object.keys(options).some(key=>!['subjectTitle','collageSpacingScale'].includes(key))) throw new TypeError('Options support only subjectTitle and collageSpacingScale.');
 const subjectTitle=options.subjectTitle ?? 'Bench lamp';
 const collageSpacingScale=options.collageSpacingScale ?? 5;
 if(typeof subjectTitle!=='string' || !subjectTitle.trim() || subjectTitle.length>40 || /[\u0000-\u001f\u007f]/u.test(subjectTitle)) throw new TypeError('subjectTitle must be 1–40 visible characters.');
 if(!Number.isInteger(collageSpacingScale) || collageSpacingScale<1 || collageSpacingScale>5) throw new TypeError('collageSpacingScale must be an integer from 1 to 5.');
 const semantic={domainID:'relay:work-order:R-1048',subjectTitle};
 const revision=`sha256:${createHash('sha256').update(JSON.stringify(semantic)).digest('hex')}`;
 return DEFINITIONS.map(([id,title,method,scope,build])=>{
  const fixture={...semantic,revision};
  const appearance={collageSpacingScale};
  return {id,title,method,scope,...studyMetadata(id,fixture,appearance),width:1200,height:800,editable:true,provenance:{authorship:'Original synthetic Ingenium example',license:'MIT',scenario:'Relay: fictional repair coordination workspace',fonts:'System generic sans-serif, serif and monospace requests; editorial DejaVuSerif, Georgia, serif fallbacks; no font binaries'},limitations:['Static authored study, not product implementation or user acceptance.','Rendered typography depends on host fonts; accessibility and runtime behavior are not established.'],svg:build(fixture,appearance)};
 });
}
/** Exclusively create a new directory; refusal never replaces existing output. */
export async function writeMethodStudies(outputDir,options={}) {
 if(typeof outputDir!=='string'||!outputDir.trim()) throw new TypeError('Provide one new output directory.');
 const destination=resolve(outputDir);
 const studies=buildMethodStudies(options);
 await mkdir(destination,{recursive:false});
 const manifest={schema:'ingenium-method-source-collection/1',schemaVersion:1,generator:'tools/generate-method-studies.mjs',license:'MIT',scenario:'Original synthetic Relay repair workspace',renderStatus:'not-run',artifacts:[]};
 for(const {svg,...metadata} of studies){
  const file=`${metadata.id}.svg`;
  await writeFile(resolve(destination,file),svg,{flag:'wx'});
  manifest.artifacts.push({...metadata,file,bytes:Buffer.byteLength(svg),sha256:createHash('sha256').update(svg).digest('hex')});
 }
 await writeFile(resolve(destination,'manifest.json'),`${JSON.stringify(manifest,null,2)}\n`,{flag:'wx'});
 return manifest;
}
/** Check the supplied source collection against its own exact byte bindings; no semantic acceptance. */
export async function verifyMethodStudySources(sourceDir) {
 const manifest=JSON.parse(await readFile(resolve(sourceDir,'manifest.json'),'utf8'));
 if(manifest.schema!=='ingenium-method-source-collection/1' || !Array.isArray(manifest.artifacts)) throw new Error('Unsupported source manifest.');
 const issues=[];
 const expected=DEFINITIONS.map(row=>row[0]);
 if(manifest.artifacts.length!==expected.length || new Set(manifest.artifacts.map(item=>item.id)).size!==expected.length) issues.push('Expected eight unique study records.');
 for(const id of expected) {
  const item=manifest.artifacts.find(record=>record.id===id);
  if(!item || item.file!==`${id}.svg`) {issues.push(`${id}: missing record or unexpected file binding.`);continue;}
  const bytes=await readFile(resolve(sourceDir,`${id}.svg`));
  if(bytes.length!==item.bytes || createHash('sha256').update(bytes).digest('hex')!==item.sha256) issues.push(`${id}: stale source hash/byte binding.`);
 }
 return {schema:'ingenium-method-source-check/1',result:issues.length?'fail':'pass',scope:'Supplied source bytes against manifest bindings only.',limits:'Does not establish source meaning, model mapping, behavior, font identity or acceptance.',issues};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(process.argv[2]==='--verify') {
  try {if(process.argv.length!==4) throw new Error('Usage: node tools/generate-method-studies.mjs --verify SOURCE_DIR'); const report=await verifyMethodStudySources(process.argv[3]); process.stdout.write(`${JSON.stringify(report,null,2)}\n`);process.exitCode=report.result==='pass'?0:1;} catch(error) {process.stderr.write(`${error.message}\n`);process.exitCode=1;}
 } else {
 const [outputDir,selector,optionsPath,...extra]=process.argv.slice(2);
 if(!outputDir || (selector && selector!=='--options') || (selector && !optionsPath) || extra.length){process.stderr.write('Usage: node tools/generate-method-studies.mjs OUTPUT_DIR [--options OPTIONS.json]\n');process.exitCode=1;}
 else {try {let options={}; if(optionsPath) {if((await stat(optionsPath)).size>4096) throw new Error('Options JSON exceeds 4096 bytes.'); options=JSON.parse(await readFile(optionsPath,'utf8'));} const result=await writeMethodStudies(outputDir,options);process.stdout.write(`Created ${result.artifacts.length} editable SVG studies and manifest.\n`);} catch(error){process.stderr.write(`Method study generation failed: ${error.message}\n`);process.exitCode=1;}}
}
}
