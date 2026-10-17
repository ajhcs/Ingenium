import test from'node:test';import assert from'node:assert/strict';import{mkdtemp,mkdir,readFile,readdir,rm}from'node:fs/promises';import{join}from'node:path';
import{discoverTextures,createTexture,selectTexture,customizeTexture,exportTexture,writeTexture}from'../src/textures/index.mjs';
test('six original representations have authored categories/tags and explicit scope',()=>{
 const all=discoverTextures();assert.equal(all.length,6);assert.equal(discoverTextures({category:'geometric-repetition'}).length,4);assert.equal(discoverTextures({query:'letterform'})[0].id,'repeated-authored-letterform');assert.equal(discoverTextures({tag:'particle'})[0].id,'seeded-grain');all[0].tags.push('changed');assert(!discoverTextures()[0].tags.includes('changed'));
 for(const item of all){const texture=createTexture({id:item.id});assert.equal(texture.license.spdx,'MIT');assert.match(texture.license.text,/2026 ajhcs and contributors/);assert.match(texture.provenance.meaning,/no measured uncertainty/);assert(!texture.svg.includes('<image'));assert(!texture.svg.includes('<text'));assert(!texture.svg.includes('<filter'));}
});
test('finite parameter bounds refuse unsupported sources, alpha and external/font/filter inputs',()=>{
 for(const controls of [{id:'unknown'},{id:'dot-screen',tileSize:31},{id:'dot-screen',tileSize:257},{id:'dot-screen',density:1},{id:'dot-screen',density:17},{id:'dot-screen',density:2.5},{id:'dot-screen',ink:'#ffffff80'},{id:'dot-screen',background:'url(https://example.test)'},{id:'dot-screen',font:'external'},{id:'dot-screen',seed:2},{id:'seeded-grain',seed:-1},{id:'seeded-grain',seed:4294967296},{id:'seeded-grain',seed:1.5}])assert.throws(()=>createTexture(controls));
 for(const density of [2,16])for(const tileSize of [32,256])assert(createTexture({id:'woven-grid',density,tileSize}).svg.length<200000);
});
test('seeded grain is repeatable for zero/max seeds and visibly distinct in source geometry',()=>{
 for(const seed of [0,1,0xffffffff]){const a=createTexture({id:'seeded-grain',seed}),b=createTexture({id:'seeded-grain',seed});assert.equal(a.svg,b.svg);assert.equal(a.sha256,b.sha256);}
 assert.notEqual(createTexture({id:'seeded-grain',seed:0}).sha256,createTexture({id:'seeded-grain',seed:1}).sha256);
});
test('customization preserves originals and binds exact direct-parent parameters and changes',()=>{
 const source=selectTexture('parallel-hatch'),before=structuredClone(source),changed=customizeTexture(source,{density:10,ink:'#6b342b'});assert.deepEqual(source,before);assert.equal(changed.kind,'derived');assert.equal(changed.derivation.parentSHA256,source.sha256);assert.equal(changed.parameters.tileSize,source.parameters.tileSize);assert.notEqual(changed.svg,source.svg);assert.deepEqual(JSON.parse(exportTexture(changed,{format:'json'})),changed);
 const tampered=structuredClone(changed);tampered.derivation.changes={density:3};assert.throws(()=>exportTexture(tampered),/recorded changes/);assert.throws(()=>customizeTexture(source,{id:'dot-screen'}));assert.throws(()=>exportTexture({...source,svg:source.svg+' '}),/differs/);assert.throws(()=>exportTexture(source,{format:'png'}));
});
test('exclusive exports preserve originals/notice and support byte-identical offline repeat and collision refusal',async t=>{
 await mkdir(join(process.cwd(),'work'),{recursive:true});const root=await mkdtemp(join(process.cwd(),'work/texture-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const item of discoverTextures()){
  const source=selectTexture(item.id),texture=customizeTexture(source,{density:9,ink:'#6b342b',...(item.id==='seeded-grain'?{seed:42}:{})}),a=await writeTexture({source,texture,outputDir:join(root,item.id)}),b=await writeTexture({source,texture,outputDir:join(root,item.id+'-repeat')});
  assert.deepEqual(a.files,b.files);assert.equal(await readFile(join(a.outputDir,'original.svg'),'utf8'),source.svg);assert.equal(await readFile(join(a.outputDir,'tile.svg'),'utf8'),texture.svg);assert.equal(await readFile(join(a.outputDir,'LICENSE.txt'),'utf8'),source.license.text);assert.match(await readFile(join(a.outputDir,'texture.css'),'utf8'),/background-repeat:repeat/);
  const names=await readdir(a.outputDir),before=await Promise.all(names.map(name=>readFile(join(a.outputDir,name))));await assert.rejects(writeTexture({source,texture,outputDir:a.outputDir}),/EEXIST/);assert.deepEqual(await Promise.all(names.map(name=>readFile(join(a.outputDir,name)))),before);
 }
 const unrelated=createTexture({id:'dot-screen'}),changed=customizeTexture(selectTexture('crosshatch'),{density:8});await assert.rejects(writeTexture({source:unrelated,texture:changed,outputDir:join(root,'wrong-parent')}),/direct parent/);assert(!(await readdir(root)).includes('wrong-parent'));
 const earlier=createTexture({id:'dot-screen',density:6}),actualParent=createTexture({id:'dot-screen',density:7}),sameGeometry=customizeTexture(actualParent,{density:6});assert.equal(earlier.sha256,sameGeometry.sha256);await assert.rejects(writeTexture({source:earlier,texture:sameGeometry,outputDir:join(root,'same-geometry-wrong-parent')}),/direct parent/);assert(!(await readdir(root)).includes('same-geometry-wrong-parent'));
});
