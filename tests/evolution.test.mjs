import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, cp, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { graphic, createExample } from '../examples/engineering-quickstart/field-station.mjs';

const root = resolve('examples/evolution');
const brief = JSON.parse(await readFile(join(root,'brief.json'),'utf8'));
test('graphic revision preserves all but title treatment, and validates directions', () => {
  const before = graphic(brief), after = graphic(brief,true);
  const normalized = s => s.replace(/(<text id="title"[^>]*font-size=")[^"]+(" font-weight=")[^"]+/, '$1SIZE$2WEIGHT');
  assert.equal(normalized(before), normalized(after));
  for (const text of [brief.title,brief.date,brief.invitation,...brief.components.map(c=>c.label),...brief.connections.map(c=>c.label)]) assert.ok(after.includes(text));
  assert.throws(() => graphic({...brief,connections:[{...brief.connections[0],to:'display'},brief.connections[1]]}), /directed connections/);
  const unusual = graphic({...brief,title:'Long & <unusual> عنوان '.repeat(4)});
  assert.ok(unusual.includes('&amp; &lt;unusual&gt;'));
});
test('create, validate, revise, export and reopen a complete handoff without renderer', async () => {
  const parent=await mkdtemp(join(tmpdir(),'ingenium-field-'));
  const out=join(parent,'result');
  const result=await createExample(out,{rendererDir:join(parent,'missing')});
  assert.equal(result.recordValid,true); assert.equal(result.preview.status,'not-run'); assert.equal(result.handoff.status,'complete');
  const manifest=JSON.parse(await readFile(join(out,'handoff/delivery.json'),'utf8'));
  assert.equal(manifest.openingFile,'revised.svg');
  assert.equal(await readFile(join(out,'handoff/revised.svg'),'utf8'),graphic(brief,true));
  const prior=JSON.parse(await readFile(join(out,'record-original.json'),'utf8'));
  const next=JSON.parse(await readFile(join(out,'record-revised.json'),'utf8'));
  assert.deepEqual(next.decisions,prior.decisions); assert.equal(next.revision,1);
  await assert.rejects(createExample(out),/EEXIST/);
});
test('document and site revisions retain unrelated content and resolve local links after copying', async () => {
  const original=await readFile(join(root,'document/original.html'),'utf8');
  const revised=await readFile(join(root,'document/revised.html'),'utf8');
  assert.equal(original.replace('This view identifies three elements and their directed connections.','PARAGRAPH').replace('figure-original.svg','FIGURE'),revised.replace('This view identifies the three elements and makes the direction of each connection explicit.','PARAGRAPH').replace('figure-revised.svg','FIGURE'));
  const first=await readFile(join(root,'website/study-original.html'),'utf8'), second=await readFile(join(root,'website/study.html'),'utf8');
  assert.equal(first.replace('The overview shows Sensor, Controller and Display.','TEXT'),second.replace('Sensor sends measurement to Controller; Controller sends reading to Display.','TEXT'));
  const tmp=await mkdtemp(join(tmpdir(),'ingenium-copy-')); await cp(root,join(tmp,'evolution'),{recursive:true});
  for (const folder of ['website','document']) for (const name of await readdir(join(tmp,'evolution',folder))) if(name.endsWith('.html')) {
    const path=join(tmp,'evolution',folder,name), html=await readFile(path,'utf8');
    for (const [,link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) { assert.ok(!/^(https?:|\/\/)/.test(link)); assert.ok((await stat(resolve(dirname(path),link))).isFile(),link); }
  }
});
test('website delivery includes a complete linked source closure with hashes', async () => {
  const {bundleWebsite}=await import('../examples/evolution/bundle-website.mjs');
  const parent=await mkdtemp(join(tmpdir(),'ingenium-site-')); const out=join(parent,'bundle');
  const receipt=await bundleWebsite(out); assert.equal(receipt.status,'complete');
  const manifest=JSON.parse(await readFile(join(out,'delivery.json'),'utf8'));
  assert.equal(manifest.openingFile,'website/index.html');
  const crypto=await import('node:crypto');
  for(const item of manifest.artifacts) assert.equal(crypto.createHash('sha256').update(await readFile(join(out,item.path))).digest('hex'),item.sha256);
  for(const item of manifest.artifacts.filter(a=>a.path.endsWith('.html'))) {
    const path=join(out,item.path), html=await readFile(path,'utf8');
    for(const [,link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) assert.ok((await stat(resolve(dirname(path),link))).isFile());
  }
});
test('document delivery reopens with its separate figure and local sources', async () => {
  const {bundleDocument}=await import('../examples/evolution/bundle-document.mjs');
  const out=join(await mkdtemp(join(tmpdir(),'ingenium-doc-')),'bundle');
  assert.equal((await bundleDocument(out)).status,'complete');
  const manifest=JSON.parse(await readFile(join(out,'delivery.json'),'utf8'));
  assert.equal(manifest.openingFile,'document/revised.html');
  for(const item of manifest.artifacts.filter(a=>a.path.endsWith('.html'))) {
    const path=join(out,item.path), html=await readFile(path,'utf8');
    for(const [,link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) assert.ok((await stat(resolve(dirname(path),link))).isFile());
  }
});
