import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createMaterialLibrary } from '../src/materials/index.mjs';
async function workspace(t) { await mkdir(join(process.cwd(),'work'),{recursive:true}); const root=await mkdtemp(join(process.cwd(),'work/material-test-'));t.after(()=>rm(root,{recursive:true,force:true}));return root; }
test('finite selected metadata discovery is inert, defensive and separates source contents', async()=>{
 const lib=createMaterialLibrary(),list=lib.discover();assert.equal(list.materials.length,35);assert.equal(list.coverage.sourceGradientDeclarations,30);assert.equal(list.coverage.sourceNoiseDeclarations,5);
 list.materials[0].controls.push('script');assert(!lib.discover().materials[0].controls.includes('script'));
 assert.equal(lib.discover({query:'NOISE'}).materials[0].id,'noise-1');assert.equal((await lib.capabilities()).status,'acquisition-required');
 await assert.rejects(lib.inspect({id:'noise-1'}),/Acquisition required/);assert.throws(()=>lib.select({id:'gradient-31'}),/Unknown selected/);
});
test('controls and explicit selection refuse arbitrary CSS, external resources and unsupported source',()=>{
 const lib=createMaterialLibrary(),source=lib.select({id:'noise-1'}),copy=structuredClone(source),edited=lib.customize(source,{background:'#f0eee8',tileSize:128,opacity:0.4});
 assert.deepEqual(source,copy);assert.equal(edited.controls.opacity,0.4);
 for(const controls of [{recolor:{'#000':'#ffffff'}},{image:'https://example.test/a.svg'},{background:'url(https://example.test)'},{tileSize:513},{opacity:0},{opacity:Infinity}])assert.throws(()=>lib.customize(source,controls));
 assert.throws(()=>lib.customize({...source,selected:false},{}),/explicit selected/);
 assert.throws(()=>lib.customize({...source,sourceVersion:'latest'},{}),/pinned/);
 assert.throws(()=>lib.customize({...source,controls:{css:'@import "https://example.test"'}},{}),/saved/);
});
test('impersonated or modified local package refuses pinned hashes',async t=>{
 const root=await workspace(t);await writeFile(join(root,'package.json'),'{}');const lib=createMaterialLibrary({packageDir:root});assert.equal((await lib.capabilities()).status,'error');await assert.rejects(lib.inspect({id:'gradient-4'}),/hash mismatch/);
});
test('actual selected declarations export full notices, separate edits and byte-identical offline reuse',async t=>{
 const supplied=process.env.INGENIUM_MATERIAL_PACKAGE_DIR;if(!supplied){t.skip('Supply existing exact Open Props1.7.23 package; no acquisition/install attempted');return;}
 const root=await workspace(t),lib=createMaterialLibrary({packageDir:resolve(supplied)});assert.equal((await lib.capabilities()).status,'local');
 for(const id of ['gradient-4','gradient-8','gradient-14','gradient-18','gradient-30','noise-1','noise-5']){
  const detail=await lib.inspect({id});assert.match(detail.license.text,/Copyright \(c\) 2021 Adam Argyle/);
  const selection=lib.customize(lib.select({id}),id.startsWith('noise-')?{background:'#f0eee8',tileSize:128,opacity:0.4}:{...(detail.palette.length?{recolor:{[detail.palette[0]]:'#006c70'}}:{}),tileSize:128});
  const rendered=await lib.render({selection});assert(rendered.originalCSS.includes(detail.originalDeclaration));assert(rendered.css.includes(id.startsWith('noise-')?'opacity:0.4':detail.palette.length?'#006c70':'background-size:128px'));
  if(id.startsWith('noise-'))assert(rendered.detail.sourceFeatures.includes('outside')||rendered.detail.sourceFeatures.includes('not admitted'));
  const a=await lib.acquire({selection,outputDir:join(root,id)}),b=await lib.acquire({selection,outputDir:join(root,id+'-repeat')});assert.deepEqual(a.artifacts,b.artifacts);
  assert.deepEqual(await readFile(join(a.outputDir,'LICENSE.open-props.txt')),await readFile(join(resolve(supplied),'LICENSE')));
  assert.deepEqual(JSON.parse(await readFile(join(a.outputDir,'source.json'),'utf8')),selection);
  const before=await Promise.all((await readdir(a.outputDir)).map(async name=>[name,await readFile(join(a.outputDir,name))]));
  await assert.rejects(lib.acquire({selection,outputDir:a.outputDir}),/EEXIST/);
  assert.deepEqual(await Promise.all((await readdir(a.outputDir)).map(async name=>[name,await readFile(join(a.outputDir,name))])),before);
 }
 const bad=lib.customize(lib.select({id:'gradient-4'}),{recolor:{'#ffffff':'#000000'}});await assert.rejects(lib.render({selection:bad}),/existing source/);
});

test('all pinned numbered materials exposed; arbitrary names and CSS semantics remain outside controls',async()=>{
 const lib=createMaterialLibrary();assert.equal(lib.discover().materials.filter(x=>x.kind==='gradient').length,30);assert.equal(lib.discover().materials.filter(x=>x.kind==='noise').length,5);
 for(const id of ['noise-0','noise-6','noise-filter-1','gradient-31','gradient-01'])assert.throws(()=>lib.select({id}),/Unknown/);
 for(const id of ['gradient-1','gradient-30','noise-5']){const selected=lib.select({id});assert.throws(()=>lib.customize(selected,{css:'url(https://example.invalid)'}),/Unsupported/);}
});
test('source CSS named and rgba stops do not masquerade as editable hex tokens',async t=>{
 const supplied=process.env.INGENIUM_MATERIAL_PACKAGE_DIR;if(!supplied){t.skip('Supply retained exact Open Props1.7.23 package; no network');return;}
 const lib=createMaterialLibrary({packageDir:resolve(supplied)});
 for(const id of ['gradient-14','gradient-18']){const detail=await lib.inspect({id});assert.deepEqual(detail.palette,[]);assert.match(detail.recolorScope,/named colors and rgba/);const selected=lib.customize(lib.select({id}),{opacity:.5,background:'#123456'});assert.equal((await lib.render({selection:selected})).source.controls.opacity,.5);assert.throws(()=>lib.customize(selected,{recolor:{red:'#ffffff'}}),/Recolor/);await assert.rejects(lib.render({selection:lib.customize(selected,{recolor:{'#ffffff':'#123456'}})}),/existing source/);}
 const d=await lib.inspect({id:'gradient-10'});assert(d.originalDeclaration.includes('gold'));assert(!d.palette.includes('gold'));
 const detail=await lib.inspect({id:'gradient-29'}),edited=await lib.render({selection:lib.customize(lib.select({id:'gradient-29'}),{recolor:{[detail.palette[0]]:'#123456'}})});assert(edited.css.includes('#123456'));assert(edited.css.includes('rgba(191,179,255,0)'));assert(edited.originalCSS.includes(detail.originalDeclaration));
});
