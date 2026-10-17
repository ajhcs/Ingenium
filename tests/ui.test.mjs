import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createUiLibrary, discover, inspect, select, customize, render } from '../src/ui/index.mjs';
test('metadata discovery is usable before acquisition and defensive', async()=>{
 const list=discover(); assert.equal(list.components.length,3);list.source.version='changed';assert.equal(inspect({id:'button'}).upstream.version,'1.0.4');
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
 const root=await mkdtemp(join(process.cwd(),'work/library-ui-20261017/refusal-'));
 try {await writeFile(join(root,'package.json'),'{}');assert.equal((await createUiLibrary({packageDir:root}).capabilities()).status,'error');await assert.rejects(createUiLibrary({packageDir:root}).acquire({selection:select({id:'button'}),outputDir:join(root,'out')}),/hash mismatch/);} finally {await rm(root,{recursive:true,force:true});}
});
