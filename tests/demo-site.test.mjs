import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('staged site supplies every process study and current Fieldwork download', async t => {
  const root=await mkdtemp(resolve('work/demo-site-')); t.after(()=>rm(root,{recursive:true,force:true}));
  const out=join(root,'site');
  const result=JSON.parse(execFileSync(process.execPath,['tools/build-release-site.mjs',out],{encoding:'utf8'}));
  assert.equal(result.studies,17); assert.equal(result.deployed,false);
  const home = await readFile(join(out, 'index.html'), 'utf8');
  assert.match(home, /href="#studies">Explore the work/);
  assert.match(home, /href="play\/common-measure.html"/);
  assert.deepEqual(await readFile(join(out, 'play/common-measure.html')), await readFile('skills/ingenium/assets/common-measure.html'));
  const manifest=JSON.parse(await readFile('examples/process/manifest.json','utf8'));
  for(const item of manifest.studies) {
    for(let i=1;i<=4;i++) assert.match(await readFile(join(out,'studies',item.id,String(i),'index.html'),'utf8'),/View stage source/);
    assert.ok((await stat(join(out,'downloads/studies',item.id+'.zip'))).size>0);
  }
  assert.ok((await stat(join(out,'downloads/studies/fieldwork.zip'))).size>0);
  for(const id of ['field-station-engineering-graphic','field-station-document','field-station-website']) assert.ok((await stat(join(out,'downloads/studies',id+'.zip'))).size>0);
  const check=execFileSync('python3',['-c',`import sys,zipfile,json
z=zipfile.ZipFile(sys.argv[1]); i=json.loads(z.read('inventory.json')); original=z.read('site/studies/fieldwork/index.html').decode(); standalone=z.read(i['openingFile']).decode(); assert 'Return to studies' in original and 'Return to studies' not in standalone; assert 'parent site' in standalone; print(i['openingFile'])`,join(out,'downloads/studies/fieldwork.zip')],{encoding:'utf8'});
  assert.match(check,/standalone\.html/);
  assert.match(await readFile(join(out,'downloads/index.html'),'utf8'),/No prepared release manifest was supplied/);
});

test('release links are made only for supplied, verified artifact bytes', async t => {
  const { writeFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const root=await mkdtemp(resolve('work/site-manifest-')); t.after(()=>rm(root,{recursive:true,force:true}));
  const data=Buffer.from('prepared fixture'); await writeFile(join(root,'fixture.zip'),data); await writeFile(join(root,'peel-v-test.zip'),data);
  const descriptor={schema:'ingenium-release-artifacts/1',version:'test',sourceRevision:'test',sourceTree:'test',buildId:'test',prepared:true,published:false,artifacts:[{id:'guidance',flavor:'guidance',path:'fixture.zip',bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')},{id:'peel-citrus-book',flavor:'editable-study',path:'peel-v-test.zip',bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')}]};
  await writeFile(join(root,'manifest.json'),JSON.stringify(descriptor));
  execFileSync(process.execPath,['tools/build-release-site.mjs',join(root,'site'),join(root,'manifest.json')]);
  assert.deepEqual(await readFile(join(root,'site/downloads/release/fixture.zip')),data);
  const home=await readFile(join(root,'site/index.html'),'utf8'); assert.match(home,/Experimental test/); assert.match(home,/downloads\/release\/fixture\.zip/); assert.doesNotMatch(home,/Package declares private/);
  const downloads=await readFile(join(root,'site/downloads/index.html'),'utf8');
  assert.match(downloads,/Portable skill instructions and references/); assert.match(downloads,/Current release: test/); assert.match(downloads,/0.00 MiB/); assert.doesNotMatch(downloads,/Development preview/);
  for(const route of ['studies/peel-citrus-book/index.html','studies/peel-citrus-book/1/index.html']) { const content=await readFile(join(root,'site',route),'utf8'); assert.match(content,/downloads\/release\/peel-v-test\.zip/); assert.doesNotMatch(content,/downloads\/studies\/peel-citrus-book\.zip/); }
  const missing=await readFile(join(root,'site/studies/the-last-meridian/index.html'),'utf8'); assert.match(missing,/development snapshot/);
  assert.match(await readFile(join(root,'site/guide/index.html'),'utf8'),/manual project-local route has been exercised/);
  descriptor.development=true; await writeFile(join(root,'dev.json'),JSON.stringify(descriptor));
  execFileSync(process.execPath,['tools/build-release-site.mjs',join(root,'dev-site'),join(root,'dev.json')]);
  assert.match(await readFile(join(root,'dev-site/downloads/index.html'),'utf8'),/Development build: test development build/);
  assert.match(await readFile(join(root,'dev-site/index.html'),'utf8'),/Development downloads/);
  descriptor.artifacts[0].sha256='0'.repeat(64);await writeFile(join(root,'bad.json'),JSON.stringify(descriptor));
  assert.throws(()=>execFileSync(process.execPath,['tools/build-release-site.mjs',join(root,'bad-site'),join(root,'bad.json')],{stdio:'pipe'}));
});
