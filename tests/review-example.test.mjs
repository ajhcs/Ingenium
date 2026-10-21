import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildReviewExamples, writeReviewExamples } from '../tools/generate-review-example.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const fixture=async()=>JSON.parse(await readFile(new URL('../examples/review/fixture.json',import.meta.url)));
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&');
const sourceFixture=svg=>JSON.parse(decode(svg.match(/<desc id="fixture">([\s\S]*?)<\/desc>/)[1]));
async function workspace(t) {
  await mkdir('work',{recursive:true});
  const dir=await mkdtemp(resolve('work/review-test-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  return dir;
}
test('before/after sources preserve complete state, request, ownership and Undo policies independently of their copy',async()=>{
  const f=await fixture();
  const variants=buildReviewExamples(f);
  const expected=structuredClone(f);
  assert.deepEqual(variants.map(v=>v.id),['before','after']);
  for(const v of variants) {
    const actual=sourceFixture(v.svg);
    assert.deepEqual(actual,expected);
    assert.equal(actual.selection,'order.R-1048');
    assert.equal(actual.working.revision,2);
    assert.equal(actual.durable.revision,1);
    assert.equal(actual.request.requestedRevision,2);
    assert.equal(actual.request.status,'failed');
    assert.equal(actual.request.cause,'unknown');
    assert.equal(actual.request.id,'save-q1');
    assert.equal(actual.editing.owner,'assignment-inspector');
    assert.equal(actual.editing.sharedSession,'assignment.R-1048');
    assert.equal(actual.editing.validUpdates,'automatic');
    assert.deepEqual(actual.editing.invalidInput.workingUnchanged,{revision:2,assignee:'Mina Patel'});
    assert.equal(actual.editing.invalidInput.retained,true);
    assert.equal(actual.editing.undo.newRevision,3);
    assert.equal(actual.editing.undo.valueFrom,1);
    assert.equal(actual.editing.undo.inheritsReceipt,false);
    assert.equal(actual.independentNote.retained,true);
    assert.equal(actual.claims.nativeBinding,'absent');
    assert.deepEqual(Object.values(actual.claims).slice(0,4),Array(4).fill('specified-only'));
  }
  assert.notEqual(variants[0].svg,variants[1].svg);
  // The entire same UI body outside the admitted message region is invariant.
  const ui=svg=>svg.slice(svg.indexOf('<rect x="32" y="142"')).split('<text x="32" y="736"')[0]
    .replace(/<text x="830" y="(?:380|414|443)"[^>]*>[\s\S]*?<\/text>/g,'');
  assert.equal(ui(variants[0].svg),ui(variants[1].svg));
  variants[0].fixture.editing.owner='changed';
  assert.deepEqual(f,expected);
  assert.deepEqual(variants[1].fixture,expected);
});
test('canonical content changes project into both editable variants without changing identity or input',async()=>{
  const f=await fixture();
  f.subject.title='Portable inspection lamp';
  f.working.assignee='Owen Reed';
  const before=structuredClone(f);
  for(const v of buildReviewExamples(f)) {
    assert.deepEqual(sourceFixture(v.svg),f);
    assert.ok(v.svg.includes('Portable inspection lamp'));
    assert.ok(v.svg.includes('Owen Reed'));
    if(v.id==='after') assert.ok(v.svg.includes('Owen Reed is still selected.'));
  }
  assert.deepEqual(f,before);
});
test('published review sources, XML metadata and separate previews bind the complete fixture and actual bytes',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../examples/review/source/manifest.json',import.meta.url)));
  const renders=JSON.parse(await readFile(new URL('../examples/review/previews/render-manifest.json',import.meta.url)));
  const variants=buildReviewExamples(await fixture());
  for(const v of variants) {
    const item=manifest.artifacts.find(x=>x.id===v.id);
    const source=await readFile(new URL('../examples/review/source/'+item.file,import.meta.url));
    assert.equal(source.toString(),v.svg);
    assert.equal(source.length,item.bytes);
    assert.equal(hash(source),item.sha256);
    assert.equal(item.fixtureSha256,hash(JSON.stringify(sourceFixture(v.svg))));
    const render=renders.artifacts.find(x=>x.id===v.id);
    const png=await readFile(new URL('../examples/review/previews/'+v.id+'.png',import.meta.url));
    assert.equal(hash(source),render.sourceHash);
    assert.equal(hash(png),render.outputHash);
    assert.equal(png.readUInt32BE(16),1200);
    assert.equal(png.readUInt32BE(20),800);
  }
  const xml=spawnSync('python3',['-c','import xml.etree.ElementTree as E; from pathlib import Path; [E.parse(p) for p in Path("examples/review/source").glob("*.svg")]'],{encoding:'utf8'});
  assert.equal(xml.status,0,xml.stderr);
});
test('example generation refuses existing output and preserves unrelated work and source receipts',async t=>{
  const dir=await workspace(t), destination=join(dir,'source');
  await writeReviewExamples(destination);
  await writeFile(join(destination,'user.txt'),'keep');
  const before=await readFile(join(destination,'manifest.json'));
  await assert.rejects(writeReviewExamples(destination),{code:'EEXIST'});
  assert.deepEqual(await readFile(join(destination,'manifest.json')),before);
  assert.equal(await readFile(join(destination,'user.txt'),'utf8'),'keep');
  assert.equal((await readdir(destination)).length,4);
});
test('guidance ZIP carries complete adaptation notices and exact source bytes and refuses replacement',async t=>{
  const dir=await workspace(t), archive=join(dir,'guidance.zip');
  const build=spawnSync('python3',['-B','tools/build-skill-zip.py',archive],{encoding:'utf8'});
  assert.equal(build.status,0,build.stderr);
  const verify=spawnSync('python3',['-c',`import zipfile,sys; from pathlib import Path
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 for n in ["LICENSE","LICENSE-IMPECCABLE","NOTICE-IMPECCABLE","references/methods/contract.md"]:
  assert z.read("ingenium/"+n)==(Path("skills/ingenium")/n).read_bytes()
 assert not any(n.endswith((".js",".mjs",".py")) for n in z.namelist())
`,archive],{encoding:'utf8'});
  assert.equal(verify.status,0,verify.stderr);
  const before=await readFile(archive);
  const second=spawnSync('python3',['-B','tools/build-skill-zip.py',archive],{encoding:'utf8'});
  assert.notEqual(second.status,0);
  assert.deepEqual(await readFile(archive),before);
});
