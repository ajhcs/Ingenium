import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {searchTaskResources,inspectTaskResource,acquireTaskResource} from '../src/resources/task-selection.mjs';
const root=process.env.INGENIUM_TEST_TMP??new URL('../work/implementation/',import.meta.url).pathname;
await mkdir(root,{recursive:true});
test('offline task discovery, pagination, absent CSE and exact selected acquisition',async()=>{
 const first=await searchTaskResources({sourceIds:['hack','atomic-ui','cse'],limit:2});
 assert.equal(first.entries.length,2);assert.equal(first.sources.find(s=>s.providerId==='cse').status,'absent');assert.equal(first.nextOffset,2);
 const second=await searchTaskResources({sourceIds:['hack','atomic-ui','cse'],offset:2,limit:2});assert.notDeepEqual(first.entries,second.entries);
 const d=await inspectTaskResource({providerId:'materials',assetId:'gradient-4'});const dir=await mkdtemp(join(root,'ingenium-resource-test-'));try{
 const selection={providerId:d.providerId,assetId:d.assetId,sourceRevision:d.sourceRevision,originalSHA256:d.sourceDetails.declarationSHA256};
 await assert.rejects(acquireTaskResource({selection:{...selection,originalSHA256:'0'.repeat(64)},outputDir:join(dir,'bad')}),/hash/);
 const result=await acquireTaskResource({selection,outputDir:join(dir,'selected'),selectors:{controls:{tileSize:123}}});
 assert.ok(result.notices.length);assert.match(await readFile(join(dir,'selected','material.css'),'utf8'),/123px/);assert.match(await readFile(join(dir,'selected','LICENSE.open-props.txt'),'utf8'),/MIT License/);
 await assert.rejects(acquireTaskResource({selection,outputDir:join(dir,'selected')}));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('CSE revision, bounded discovery and exact detail do not imply admission',async(t)=>{
 const runtime=process.env.INGENIUM_CSE_RUNTIME;if(!runtime)return t.skip('Optional CSE runtime not selected');
 const options={selectors:{cseRuntimeDir:runtime}};
 const page=await searchTaskResources({...options,sourceIds:['cse'],query:'rotation',limit:2});assert.ok(page.entries.length);assert.equal(page.sources[0].status,'available');
 const d=await inspectTaskResource({...options,providerId:'cse',assetId:'mech-rotation'});assert.equal(d.sourceDetails.sha256,'e238137ea509366ea3c9ba829a443dbf366e2627047fe769576611714c63c601');assert.deepEqual(d.qualifiedOperations,[]);assert.match(d.sourceDetails.approval_state,/proposed/);
 await assert.rejects(inspectTaskResource({...options,providerId:'cse',assetId:'mech-rotation',sourceRevision:'sha256:wrong'}),/revision/);
});
test('portable CSE source selection preserves original, distinct edit and full notice',async()=>{
 const d=await inspectTaskResource({providerId:'cse-selected',assetId:'mech-gear'});const base={providerId:d.providerId,assetId:d.assetId,sourceRevision:d.sourceRevision,originalSHA256:d.sourceDetails.selectedSource.sha256};const dir=await mkdtemp(join(root,'ingenium-cse-test-'));try{
 const out=join(dir,'result');const r=await acquireTaskResource({selection:base,outputDir:out,selectors:{controls:{scale:1.25}}});assert.notEqual(r.selection.originalSHA256,r.selection.derivedSHA256);assert.match(await readFile(join(out,'original.svg'),'utf8'),/width="35mm"/);assert.match(await readFile(join(out,'derived.svg'),'utf8'),/width="43.75mm"/);assert.match(await readFile(join(out,'LICENSE.txt'),'utf8'),/MIT License/);assert.ok(r.notices.length);assert.equal(d.qualificationTier,'handoff-qualified');assert.deepEqual(d.qualifiedOperations,['acquire','edit','export','handoff']);
 await assert.rejects(acquireTaskResource({selection:{...base,originalSHA256:'0'.repeat(64)},outputDir:join(dir,'stale')}),/hash/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('four-family font discovery and selected palette preserve exact source and notice',async()=>{
 const fonts=await searchTaskResources({kind:'font',sourceIds:['hack','cse-fonts','liberation-sans'],limit:24});assert.equal(fonts.entries.length,8);assert.equal(new Set(fonts.entries.map(e=>e.title)).size,4);
 const d=await inspectTaskResource({providerId:'palettes',assetId:'radix-blue-light'}),sel={providerId:d.providerId,assetId:d.assetId,sourceRevision:d.sourceRevision,originalSHA256:d.sourceDetails.provenance.selectedFileSha256};const dir=await mkdtemp(join(root,'ingenium-palette-test-'));try{const r=await acquireTaskResource({selection:sel,outputDir:join(dir,'out'),selectors:{controls:{replacements:{'blue-6':'#556677'}}}});assert.ok(r.notices.length);assert.match(await readFile(join(dir,'out','palette.css'),'utf8'),/#556677/);assert.match(await readFile(join(dir,'out','LICENSE.txt'),'utf8'),/MIT License/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('original recipe selection exports distinct editable output and both notices',async()=>{const d=await inspectTaskResource({providerId:'recipes',assetId:'doc-title'});const selection={providerId:d.providerId,assetId:d.assetId,sourceRevision:d.sourceRevision,originalSHA256:d.sourceDetails.sha256};const dir=await mkdtemp(join(root,'ingenium-recipe-test-'));try{const r=await acquireTaskResource({selection,outputDir:join(dir,'out')});assert.notEqual(r.selection.originalSHA256,r.selection.derivedSHA256);assert.equal(r.notices.length,2);assert.match(await readFile(join(dir,'out','README.md'),'utf8'),/Open revised.svg/);await promisify(execFile)(process.execPath,['recipes.mjs','doc-title','regenerated'],{cwd:join(dir,'out')});assert.match(await readFile(join(dir,'out','regenerated','revised.svg'),'utf8'),/<svg/);await assert.rejects(acquireTaskResource({selection,outputDir:join(dir,'out')}));}finally{await rm(dir,{recursive:true,force:true});}});
