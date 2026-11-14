import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { writeDelivery } from '../../src/delivery/index.mjs';
import { planTask, reviewRevision } from '../../src/workflow/task.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateRecord, reviseRecord } from '../../src/records/index.mjs';
import { discoverCapabilities, exportSvg } from '../../src/svg/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Authored view of the fictional brief, not a formal model or engineering validation.
export function graphic(brief, revised = false) {
  if (brief.components?.length !== 3 || brief.connections?.length !== 2 || brief.connections[0].from !== brief.components[0].id || brief.connections[0].to !== brief.components[1].id || brief.connections[1].from !== brief.components[1].id || brief.connections[1].to !== brief.components[2].id) throw new Error('Expected three components and the two declared directed connections');
  const title = escape(brief.title);
  const titleSize = Math.min(revised ? 48 : 42, Math.floor(860 / Math.max(1, [...brief.title].length) * 1.5));
  const labels = brief.components.map(c => escape(c.label));
  const edges = brief.connections.map(c => escape(c.label));
  const ids = brief.components.map(c => escape(c.id));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
<title>${title} — system overview</title><desc>${labels.join(' to ')}. ${escape(brief.invitation)}</desc>
<rect width="960" height="540" fill="#f7f9f9"/>
<path d="M48 42 H912" stroke="#90B6CB" stroke-width="4"/>
<text id="title" x="48" y="112" fill="#172f3c" font-family="sans-serif" font-size="${titleSize}" font-weight="${revised ? '700' : '400'}">${title}</text>
<text id="date" x="48" y="151" fill="#385260" font-family="sans-serif" font-size="19">${escape(brief.date)}</text>
<g fill="#ffffff" stroke="#385260" stroke-width="2">
<rect id="${ids[0]}" x="48" y="226" width="220" height="104" rx="6"/><rect id="${ids[1]}" x="370" y="226" width="220" height="104" rx="6"/><rect id="${ids[2]}" x="692" y="226" width="220" height="104" rx="6"/>
</g>
<g fill="#172f3c" font-family="sans-serif" font-size="24" text-anchor="middle"><text x="158" y="286">${labels[0]}</text><text x="480" y="286">${labels[1]}</text><text x="802" y="286">${labels[2]}</text></g>
<g fill="none" stroke="#DA5C18" stroke-width="3"><path id="sensor-controller" d="M268 278 H360 M350 270 L360 278 L350 286"/><path id="controller-display" d="M590 278 H682 M672 270 L682 278 L672 286"/></g>
<g fill="#385260" font-family="sans-serif" font-size="13" text-anchor="middle"><text x="319" y="260">${edges[0]}</text><text x="641" y="260">${edges[1]}</text></g>
<path d="M48 408 H912" stroke="#90B6CB" stroke-width="1"/>
<text id="invitation" x="48" y="452" fill="#172f3c" font-family="sans-serif" font-size="22">${escape(brief.invitation)}</text>
</svg>\n`;
}

export async function createExample(outputDir, options = {}) {
  const brief = JSON.parse(await readFile(resolve(here, '../evolution/brief.json'), 'utf8'));
  const record = {version:1,id:'field-station-record',revision:0,purpose:brief.request,evidence:[{id:'brief',statement:brief.request}],interpretations:[],decisions:[{id:'direction',question:'What relationship is shown?',scope:'overview',status:'chosen',choice:'Sensor to Controller to Display',evidenceIds:['brief'],interpretationIds:[]}],artifacts:[{id:'overview',description:'Editable overview',evidenceIds:['brief'],decisionIds:['direction'],path:'original.svg'}]};
  const plan = planTask({intent:'create',request:brief.request,deliverables:['editable SVG']});
  const checked = validateRecord(record);
  if (!checked.valid) throw new Error(checked.errors.join('; '));
  const next = reviseRecord(record,{baseRevision:0,updates:{artifacts:[{...record.artifacts[0],path:'revised.svg'}]}});
  const review = reviewRevision({before:{brief,record},after:{brief,record:next},protectedFields:['/brief/components','/brief/connections','/brief/title','/brief/date','/brief/invitation'],recordChange:{baseRevision:0,updates:{artifacts:next.artifacts}}});
  if (review.status !== 'pass') throw new Error('Protected revision failed');
  const target = resolve(outputDir);
  await mkdir(target);
  const notice = await readFile(resolve(here, '../evolution/CSE-LICENSE.txt'), 'utf8');
  const files = {'CSE-LICENSE.txt':notice, 'original.svg':graphic(brief), 'revised.svg':graphic(brief,true), 'record-original.json':JSON.stringify(record,null,2)+'\n', 'record-revised.json':JSON.stringify(next,null,2)+'\n', 'README.md':`# Field Station: open and continue\n\nOpen revised.svg in an SVG editor; text remains live and geometry is editable. The original is original.svg. Requested edit: ${brief.revisionRequest} The title weight and size changed; wording, date, invitation, labels and direction remain. Next: adjust the title only if requested, keeping the retained original. Color tokens C32-B and C27-B are from CSE 0.2.0-alpha.8; retain CSE-LICENSE.txt. Generic sans-serif appearance varies by installed font. This is a fictional illustrative overview, not a formal model or verified system.\n`};
  for (const [name, content] of Object.entries(files)) await writeFile(resolve(target,name), content, {flag:'wx'});
  const capability = await discoverCapabilities(options);
  let preview = {status:'not-run',reason:'Optional SVG renderer unavailable'};
  if (capability.sharp.status === 'present') {
    try { preview = {status:'complete', receipt:await exportSvg({sourcePath:resolve(target,'revised.svg'),outputPath:resolve(target,'revised.png'),...options})}; }
    catch (error) { preview = {status:'error',reason:error.message}; }
  }
  const hash = value => createHash('sha256').update(value).digest('hex');
  const delivery = {schema:'ingenium-delivery/1',projectId:'field-station',versionId:'title-revision',openingFile:'revised.svg',artifacts:[
    {id:'notice',path:'CSE-LICENSE.txt',sha256:hash(files['CSE-LICENSE.txt']),mediaType:'text/plain',role:'notice',dependsOnIds:[]},
    {id:'original',path:'original.svg',sha256:hash(files['original.svg']),mediaType:'image/svg+xml',role:'source',editableKind:'vector-geometry',dependsOnIds:[]},
    {id:'revised',path:'revised.svg',sha256:hash(files['revised.svg']),mediaType:'image/svg+xml',role:'source',editableKind:'live-text',dependsOnIds:[]},
    {id:'instructions',path:'README.md',sha256:hash(files['README.md']),mediaType:'text/markdown',role:'instructions',dependsOnIds:['original','revised']}
  ],tools:[],checks:[{id:'record-validation',status:'pass',scope:'Record structure and protected choice',evidenceIds:[]},{id:'visual-review',status:'not-run',scope:'Native editor and intended-size visual review',evidenceIds:[]}],limitations:['Fictional illustrative source; no formal model or engineering acceptance.']};
  const handoff = await writeDelivery({root:target,delivery,outputDir:resolve(target,'handoff')});
  return {source:target, plan, recordValid:validateRecord(next).valid, review, preview, handoff};
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) { console.error('Usage: node examples/engineering-quickstart/field-station.mjs NEW_OUTPUT_DIR'); process.exitCode=2; }
  else console.log(JSON.stringify(await createExample(process.argv[2]),null,2));
}
