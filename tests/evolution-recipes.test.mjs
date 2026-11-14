import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {loadRecipe,renderRecipe,writeRecipe} from '../examples/evolution/resource-recipes/recipes.mjs';
const root=resolve('examples/evolution/resource-recipes');
const catalog=JSON.parse(await readFile(join(root,'catalog.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('twenty distinct recipes retain master hashes, sample meaning and two editable revisions',async()=>{
 assert.equal(catalog.schema,'ingenium-resource-recipes/1');
 assert.deepEqual(Object.fromEntries(['document','chart','diagram','imagery'].map(k=>[k,catalog.entries.filter(e=>e.kind===k).length])),{document:8,chart:4,diagram:4,imagery:4});
 assert.equal(new Set(catalog.entries.map(e=>e.id)).size,20);
 const parent=await mkdtemp(join(tmpdir(),'ingenium-recipes-'));
 for(const e of catalog.entries){
  const recipe=await loadRecipe(e.id), master=await readFile(join(root,e.source));
  assert.equal(hash(master),e.sha256);assert.equal(master.toString(),await renderRecipe(e.id));
  const out=join(parent,e.id),receipt=await writeRecipe({id:e.id,outputDir:out});
  assert.equal(hash(await readFile(join(out,'original.svg'))),receipt.originalSHA256);
  assert.equal(hash(await readFile(join(out,'revised.svg'))),receipt.derivedSHA256);
  assert.notEqual(receipt.originalSHA256,receipt.derivedSHA256);
  assert.ok((await readFile(join(out,'LICENSE'),'utf8')).includes('MIT'));
  assert.ok((await readFile(join(out,'CSE-LICENSE.txt'),'utf8')).length>200);
  let alt=structuredClone(recipe.edit), key=Object.keys(alt)[0];
  if(e.kind==='chart') alt.data[1][1]+=1;
  else if(e.kind==='diagram') alt.edges[0][2]+=' revised';
  else if(e.kind==='imagery') alt.accent='#123456';
  else if(Array.isArray(alt[key])) alt[key][0][alt[key][0].length-1]+=' revised';
  else alt[key]+=' revised';
  const second=await renderRecipe(e.id,alt);
  assert.notEqual(hash(second),receipt.derivedSHA256);
  if(e.kind==='chart') assert.ok(second.includes(recipe.original.unit));
  if(e.kind==='diagram') for(const node of recipe.original.nodes) assert.ok(second.includes(node));
  await assert.rejects(renderRecipe(e.id,{unexpected:'value'}),/permitted/);
 }
});
test('data and graph validation refuses malformed selections',async()=>{
 await assert.rejects(renderRecipe('chart-range',{data:[['A',3,2],['B',1,2],['C',0,1]]}),/ordered/);
 const d=await loadRecipe('diagram-chain'); const edges=structuredClone(d.original.edges);edges[0][1]='missing';
 await assert.rejects(renderRecipe('diagram-chain',{edges}),/endpoints/);
 await assert.rejects(renderRecipe('image-field',{accent:'url(x)'}),/hex color/);
});
test('ordinary document wording wraps without dropping units or relationship wording',async()=>{
 const title='Technical specification for remote field station monitoring',svg=await renderRecipe('doc-title',{title});assert.ok(svg.includes('<tspan'));assert.equal([...svg.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map(m=>m[1]).join('').includes(title),true);
 const rows=[['REQ-01','The system shall display the measured pressure in kPa.','Inspection'],['REQ-02','Preserve all measured units and relationship directions.','Demonstration']],table=await renderRecipe('doc-requirements',{rows});const text=[...table.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map(m=>m[1]).join('');for(const row of rows)for(const cell of row)assert.ok(text.includes(cell));
 await assert.rejects(renderRecipe('doc-title',{title:'x'.repeat(61)}),/bounded/);
});

test('astral characters before a word break use code-point boundaries and preserve all text',async()=>{
 const title='😀'.repeat(12)+' '+'W'.repeat(40),svg=await renderRecipe('doc-title',{title});
 const lines=[...svg.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map(m=>m[1]);
 assert.equal(lines[0],'😀'.repeat(12)+' ');
 assert.ok(lines.slice(1,4).every(line=>/^W{1,15}$/.test(line)));
 assert.equal(lines.slice(0,4).join(''),title);
});
