import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = b => createHash('sha256').update(b).digest('hex');
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const copy = {
  before: ['Your connection dropped.', 'Check your connection and try again.'],
  after: f => ['Assignment was not saved.', f.working.assignee + ' is still selected. Try again when ready.'],
};
const rect=(x,y,w,h,fill='#fff')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#c0c9cc"/>`;
const text=(x,y,s,size=18,fill='#23313b')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${esc(s)}</text>`;

// Original finite static specimen. No model, transport or application engine.
export function buildReviewExamples(fixture) {
  return Object.entries(copy).map(([id,lines]) => {
    const f=structuredClone(fixture);
    if(typeof lines==='function') lines=lines(f);
    const [messageLine1,messageLine2='']=lines[1].split(/(?<=\.) /);
    const body=rect(32,142,1136,550)+rect(32,142,1136,52,'#23313b')+text(52,176,'Relay / Work orders',22,'#fff')
      +rect(32,194,230,498,'#f5f7f8')+text(52,234,'Team queue',21)
      +rect(48,254,198,90,'#eaf0f9')+text(62,280,'R-1048',15)+text(62,310,f.subject.title,20)
      +text(62,333,'Ready',14)+text(52,394,'R-1047 · City bicycle',15)+text(52,440,'R-1046 · Desk fan',15)
      +text(286,236,f.subject.title,27)+text(286,267,'R-1048 · selected work order',15)
      +text(286,316,'Reported issue',18)+text(286,346,f.subject.issue,15)
      +text(286,408,'Service note · separate editing session',17)+rect(286,428,480,112,'#f5f7f8')
      +text(302,460,f.independentNote.raw,15)+text(286,584,'Note retained · other workspace regions available',15)
      +rect(790,194,378,498)+text(814,236,'Assignment',23)+text(814,268,'PERSON',14)
      +rect(814,282,330,45)+text(828,312,f.working.assignee,18)
      +rect(814,350,330,132,'#fff3dc')+text(830,380,lines[0],18,'#78500d')
      +text(830,414,messageLine1,14)+text(830,443,messageLine2,14)
      +rect(814,508,134,42,'#23313b')+text(831,535,'Try again',16,'#fff')
      +text(814,590,'Local change retained · not saved',15)+text(814,620,'Last saved: '+f.durable.assignee,14)
      +text(814,654,'Request failed · cause unknown',14);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><title id="title">${id==='before'?'Before review':'After review'}: failed assignment, retained workspace</title><desc id="desc">Original prospective static fixture. Selected order, assignment and independent service note remain visible. ${id==='before'?'The message asserts a connection failure without evidence.':'The message states the known outcome and retained selection.'} Depicted Try again is not an interactive control. No request, editing, retry or Undo executes.</desc><desc id="fixture">${esc(JSON.stringify(f))}</desc><rect width="1200" height="800" fill="#f2f0e7"/><g font-family="sans-serif">${text(32,46,'INGENIUM / TASK-BASED REVIEW',16)}${text(32,92,id==='before'?'Before · unsupported cause':'After · known outcome and retained work',29)}${text(32,122,'Controlled change: error copy only · same content, geometry, task and state policy',16)}${body}${text(32,736,'Static specification. Buttons depict proposed actions; no native model, save or retry is executed.',16)}${text(32,765,'Review target: error message · preserve simultaneous panes, selection, draft, revision and ownership.',15)}</g></svg>\n`;
    return {id,fixture:f,svg};
  });
}

export async function writeReviewExamples(outputDir) {
  const fixture=JSON.parse(await readFile(new URL('../examples/review/fixture.json',import.meta.url)));
  const variants=buildReviewExamples(fixture);
  await mkdir(resolve(outputDir)); // Exclusive destination; never replace prior work.
  const artifacts=[];
  for(const v of variants) {
    const bytes=Buffer.from(v.svg);
    await writeFile(join(outputDir,v.id+'.svg'),bytes,{flag:'wx'});
    artifacts.push({id:v.id,file:v.id+'.svg',bytes:bytes.length,sha256:hash(bytes),fixtureSha256:hash(JSON.stringify(v.fixture))});
  }
  const manifest={schema:'ingenium-review-example/1',authorship:'Original synthetic Ingenium fixture; MIT',comparison:'Error-copy-only prospective case; no claim previous Relay study contained this defect.',changed:['error message','editorial variant title and accessible description'],held:['all fixture values and policies','pane geometry','selection','working and durable revisions','request freshness','invalid draft retention','automatic update policy','Undo new revision','editing ownership','independent note'],execution:'Static specification only; no product actions executed.',artifacts};
  await writeFile(join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.argv.length!==3) throw new Error('Usage: node tools/generate-review-example.mjs NEW_OUTPUT_DIR');
  await writeReviewExamples(process.argv[2]);
}
