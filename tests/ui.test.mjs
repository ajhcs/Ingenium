import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createAtomicUiLibrary, createUiLibrary, discover, inspect, select, customize, render } from '../src/ui/index.mjs';
test('metadata discovery is usable before acquisition and defensive', async()=>{
 const list=discover(); assert.equal(list.components.length,6);list.source.version='changed';assert.equal(inspect({id:'button'}).upstream.version,'1.0.4');
 assert.equal(discover({query:'dialog'}).components[0].id,'dialog');assert.equal(discover({query:'action'}).components[0].id,'button');assert.equal(discover({query:'REQUIRED'}).components[0].id,'input');assert.equal((await createUiLibrary().capabilities()).status,'acquisition-required');
 await assert.rejects(createUiLibrary().acquire({selection:select({id:'button'}),outputDir:'unused'}),/Acquisition required/);
});
test('selection and customization refuse unsupported source, component and injections',()=>{
 assert.throws(()=>select({id:'full-page'}),/Unknown small component/);
 assert.throws(()=>customize({...select({id:'button'}),sourceVersion:'latest'}),/exact/);
 for(const controls of [{hue:360},{radius:-1},{size:'huge'},{theme:'remote'},{script:'alert(1)'},{label:'\0'}]) assert.throws(()=>customize(select({id:'button'}),controls));
 const s=select({id:'dialog'}), changed=customize(s,{label:'<img src=x onerror=alert(1)>',hue:220,radius:12,size:'large'}),r=render(changed);
 assert.match(r.fragment,/&lt;img/);assert.doesNotMatch(r.fragment,/<img/);assert.match(r.css,/220deg/);assert.match(r.css,/12px/);assert.match(r.fragment,/is-large/);assert.equal(s.controls,undefined);
});
test('real native semantics and authored behavior are present for all three wrappers',()=>{
 assert.match(render(select({id:'button'})).fragment,/<button.*type="button"/);
 const input=render(select({id:'input'}));assert.match(input.fragment,/for="value"/);assert.match(input.fragment,/required maxlength/);assert.match(input.script,/preventDefault/);
 const dialog=render(select({id:'dialog'}));assert.match(dialog.fragment,/<dialog.*aria-labelledby/);assert.match(dialog.script,/showModal/);assert.match(dialog.fragment,/method="dialog"/);
});
test('arbitrary local packages cannot impersonate pinned source',async()=>{
 await mkdir(join(process.cwd(),'work'),{recursive:true});
 const root=await mkdtemp(join(process.cwd(),'work/ui-refusal-'));
 try {await writeFile(join(root,'package.json'),'{}');assert.equal((await createUiLibrary({packageDir:root}).capabilities()).status,'error');await assert.rejects(createUiLibrary({packageDir:root}).acquire({selection:select({id:'button'}),outputDir:join(root,'out')}),/hash mismatch/);} finally {await rm(root,{recursive:true,force:true});}
});
test('native select, notification and tabs expose editable labels, choices and scoped behavior',()=>{
 const options=['Sketch','Prototype','Deliver'];
 const selected=customize(select({id:'select'}),{label:'Review stage',options,activeIndex:1});
 const native=render(selected);assert.match(native.fragment,/<select.*required/);assert.match(native.fragment,/value="1" selected>Prototype/);assert.match(native.script,/selectedOptions/);
 options[0]='Changed';assert.equal(selected.controls.options[0],'Sketch');
 const notification=render(customize(select({id:'notification'}),{label:'Saved',message:'<Editable> update'}));assert.match(notification.fragment,/role="status"/);assert.match(notification.fragment,/&lt;Editable&gt;/);assert.match(notification.script,/hidden=true/);assert.match(notification.script,/result.focus/);
 const tabs=render(customize(select({id:'tabs'}),{label:'Sections',options:['Summary','Details'],activeIndex:1}));assert.match(tabs.fragment,/role="tablist" aria-label="Sections"/);assert.match(tabs.fragment,/id="tab-1".*aria-selected="true" tabindex="0"/);assert.match(tabs.script,/ArrowRight/);assert.match(tabs.script,/Home/);assert.match(tabs.script,/End/);
 for(const controls of [{options:null},{options:['Duplicate','Duplicate']},{options:['Only one']},{options:['A','B'],activeIndex:2},{options:['A','<x>'],activeIndex:-1}])assert.throws(()=>customize(select({id:'tabs'}),controls));
 assert.throws(()=>customize(select({id:'button'}),{options:['A','B']}));assert.throws(()=>customize(select({id:'notification'}),{message:'\0'}));
 const retained=customize(customize(select({id:'tabs'}),{hue:42,options:['A','B']}),{radius:18});assert.equal(retained.controls.hue,42);assert.deepEqual(retained.controls.options,['A','B']);assert.equal(retained.controls.radius,18);
});
test('larger atomic catalog separates exact source inventory from authored recipes/tags and paginates',async()=>{
 const lib=createAtomicUiLibrary(),first=lib.discover(),second=lib.search({offset:first.nextOffset});
 assert.equal(first.coverage.sourceComponentStyleFiles,61);assert.equal(first.coverage.sourceThemeStyleFiles,35);assert.equal(first.total,26);assert.equal(first.components.length,12);assert.equal(second.offset,12);
 assert(first.categories.includes('Forms'));assert.match(first.tagOrigin,/Ingenium-authored/);
 assert.equal(lib.discover({query:'exclusive'}).components[0].id,'radio');assert.equal(lib.discover({tags:['slider']}).components[0].id,'range');assert.equal(lib.discover({category:'Navigation'}).total,3);
 first.components[0].tags.push('changed');assert(!lib.discover().components[0].tags.includes('changed'));
 assert.equal(lib.navigate({id:'button'}).previous,null);assert(lib.navigate({id:'select'}).related.includes('input'));
 assert.equal((await lib.capabilities()).status,'acquisition-required');await assert.rejects(lib.inspect({id:'checkbox'}),/Acquisition required/);
 assert.throws(()=>lib.select({id:'hero'}),/Unknown supported/);assert.throws(()=>lib.discover({limit:100}));
});
test('atomic controls retain prior scoped choices, copy arrays and reject arbitrary source execution',()=>{
 const lib=createAtomicUiLibrary(),selection=lib.select({id:'select'}),items=['Draft','Review'];const edited=lib.customize(selection,{items,activeIndex:1,label:'<Editable label>'});items[0]='Changed';assert.equal(edited.controls.items[0],'Draft');assert.equal(selection.controls,undefined);
 const retained=lib.customize(edited,{theme:'dark'});assert.equal(retained.controls.activeIndex,1);assert.equal(retained.controls.theme,'dark');
 for(const controls of [{html:'<script>bad()</script>'},{css:'@import "https://example.test"'},{theme:'remote'},{items:null},{items:['A','A']},{activeIndex:9},{disabled:'yes'}])assert.throws(()=>lib.customize(selection,controls));
 assert.throws(()=>lib.customize({...selection,sourceVersion:'latest'},{}),/exact/);assert.throws(()=>lib.customize({...selection,selected:false},{}),/selected/);
});
test('atomic source impersonation refuses before preview or code loading',async()=>{
 await mkdir(join(process.cwd(),'work'),{recursive:true});const root=await mkdtemp(join(process.cwd(),'work/atomic-refusal-'));
 try{await writeFile(join(root,'package.json'),'{"name":"daisyui","version":"5.7.50"}');const lib=createAtomicUiLibrary({packageDir:root});assert.equal((await lib.capabilities()).status,'error');await assert.rejects(lib.preview({selection:lib.select({id:'button'})}),/source mismatch/);}finally{await rm(root,{recursive:true,force:true});}
});
test('actual atomic source: all26 recipes preserve selected CSS/full notice and offline edited source round trips',async t=>{
 const packageDir=process.env.INGENIUM_ATOMIC_PACKAGE_DIR;if(!packageDir){t.skip('Supply existing exact DaisyUI5.7.50 source; no install/network attempted');return;}
 await mkdir(join(process.cwd(),'work'),{recursive:true});const root=await mkdtemp(join(process.cwd(),'work/atomic-source-'));t.after(()=>rm(root,{recursive:true,force:true}));const lib=createAtomicUiLibrary({packageDir});assert.equal((await lib.capabilities()).status,'local');
 for(const item of lib.discover({limit:32}).components){
  const detail=await lib.inspect({id:item.id});assert.match(detail.license.text,/Copyright \(c\) 2020 Pouya Saadeghi/);assert(detail.selectedFiles.every(file=>file.bytes<=65536));
  const source=lib.customize(lib.select({id:item.id}),Object.fromEntries(Object.entries({label:'<Editable>',description:'Synthetic local source proof',theme:'dark',size:'large'}).filter(([key])=>item.controls.includes(key)))),preview=await lib.preview({selection:source});assert(!preview.fragment.includes('<Editable>'));assert(preview.fragment.includes('&lt;Editable&gt;'));
  const a=await lib.acquire({selection:source,outputDir:join(root,item.id)}),b=await lib.acquire({selection:source,outputDir:join(root,item.id+'-repeat')});assert.deepEqual(a.artifacts,b.artifacts);
  assert.deepEqual(await readFile(join(a.outputDir,'LICENSE.daisyui.txt')),await readFile(join(packageDir,'LICENSE')));assert.deepEqual(JSON.parse(await readFile(join(a.outputDir,'source.json'),'utf8')),source);
  const css=preview.sourceFiles.filter(file=>file.file.endsWith('.css'));for(let i=0;i<css.length;i++)assert.deepEqual(await readFile(join(a.outputDir,'original-'+i+'.css')),await readFile(join(packageDir,css[i].file)));
  if(item.id==='button'){const names=await readdir(a.outputDir),before=await Promise.all(names.map(name=>readFile(join(a.outputDir,name))));await assert.rejects(lib.acquire({selection:source,outputDir:a.outputDir}),/EEXIST/);assert.deepEqual(await Promise.all(names.map(name=>readFile(join(a.outputDir,name)))),before);}
 }
});
test('atomic recipes refuse unsupported edits and preserve native range step semantics',()=>{
 const lib=createAtomicUiLibrary();
 for(const[id,control,value]of [['dropdown','activeIndex',1],['button','description','ignored'],['disclosure','size','large'],['loading','tone','error']])assert.throws(()=>lib.customize(lib.select({id}),{[control]:value}),/Unsupported atomic control/);
 assert.throws(()=>lib.customize(lib.select({id:'range'}),{value:40.5}),/integer step/);assert.equal(lib.customize(lib.select({id:'progress'}),{value:40.5}).controls.value,40.5);
 const source=lib.customize(lib.select({id:'disclosure'}),{description:'Details'});assert.equal(source.controls.size,undefined);assert.equal(source.controls.tone,undefined);assert.deepEqual(lib.customize(source,{}),source);
});
