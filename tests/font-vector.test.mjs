import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { runFontVector } from '../src/font-vector/index.mjs';
const python = process.env.INGENIUM_FONT_VECTOR_PYTHON;
const root = () => mkdtemp(resolve('work/fv-node-'));
test('font/vector helper is inert and missing/invalid tools are explicit', async () => {
  assert.equal((await runFontVector()).status,'not-run');
  assert.equal((await runFontVector({python:'/does-not-exist/python'})).status,'not-run');
  assert.equal((await runFontVector({python:'/usr/bin/python3'})).status,'not-run');
  await assert.rejects(runFontVector({python:'python3'}), /absolute/);
  await assert.rejects(runFontVector({python:'/usr/bin/python3',operation:'install'}), /Unsupported/);
});
test('actual optional font compile/shape and source-preserving overwrite refusal', {skip:!python}, async () => {
  const dir=await root(), outputDir=join(dir,'font');
  const caps=await runFontVector({python});assert.equal(caps.status,'pass');assert.equal(caps.versions.uharfbuzz,'0.56.3');
  const built=await runFontVector({python,operation:'font-demo',outputDir});assert.equal(built.status,'pass');
  assert.equal(Object.keys(built.font.cmap).length,45);assert.equal(built.shaping.results.fontSha256,built.font.sha256);
  assert.equal(built.shaping.results.ligaOn[0].name,'f_i');
  const before=await readFile(join(outputDir,'GridProof.ttf'));
  assert.equal((await runFontVector({python,operation:'font-demo',outputDir})).status,'error');
  assert.deepEqual(await readFile(join(outputDir,'GridProof.ttf')),before);
});
test('native vector normalization preserves exact original and explicit source identities', {skip:!python}, async () => {
  const dir=await root(), sourcePath=resolve('examples/font-vector/vector-source.svg'), outputDir=join(dir,'normalize');
  const result=await runFontVector({python,operation:'normalize',sourcePath,outputDir});assert.equal(result.status,'pass');
  assert.deepEqual(await readFile(join(outputDir,'original.svg')),await readFile(sourcePath));
  assert.notEqual(result.sourceSha256,result.result.outputSha256);
  assert.match(await readFile(join(outputDir,'normalized.svg'),'utf8'), /<path/);
});
test('actual raster comparison qualifies this transform/rectclip/stroke fixture', {skip:!python}, async () => {
  const dir=await root(), sourcePath=resolve('examples/font-vector/vector-source.svg'), outputDir=join(dir,'normalize');
  const result=await runFontVector({python,operation:'normalize',sourcePath,outputDir});assert.equal(result.status,'pass');
  const require=createRequire(import.meta.url), sharp=require('sharp');
  const original=await sharp(sourcePath).resize(800,560).ensureAlpha().raw().toBuffer();
  const normalized=await sharp(join(outputDir,'normalized.svg')).resize(800,560).ensureAlpha().raw().toBuffer();
  assert.equal(original.length,normalized.length);
  let changed=0,maxDifference=0,totalDifference=0;
  for(let i=0;i<original.length;i++){const d=Math.abs(original[i]-normalized[i]);if(d)changed++;maxDifference=Math.max(maxDifference,d);totalDifference+=d;}
  const corners=[[468,132],[768,132],[468,432],[768,432]];
  for(let i=0;i<original.length;i+=4) {
    if (![0,1,2,3].some(c=>original[i+c]!==normalized[i+c])) continue;
    const x=(i/4)%800+0.5,y=Math.floor(i/4/800)+0.5;
    assert.ok(corners.some(([cx,cy])=>Math.abs(Math.hypot(x-cx,y-cy)-16)<=1), 'Residual escaped qualified round-join edge rings');
  }
  // Normalized round stroke curves have bounded antialiasing residuals, not byte equality.
  assert.ok(changed/original.length<0.001 && maxDifference<=32 && totalDifference/original.length<0.01, `changed channels=${changed}, max=${maxDifference}`);
  await sharp(sourcePath).resize(800,560).png().toFile(join(dir,'original.png'));
  await sharp(join(outputDir,'normalized.svg')).resize(800,560).png().toFile(join(dir,'normalized.png'));
  assert.ok((await stat(join(dir,'normalized.png'))).size>0);
});
test('boolean SVG export includes actual out-of-default bounds and empty cases', {skip:!python}, async () => {
  const dir=await root(),sourcePath=join(dir,'boolean.json');
  await writeFile(sourcePath,JSON.stringify({operation:'union',left:{d:'M-100 -100H-50V-50H-100Z',fillRule:'nonzero'},right:{d:'M500 500H550V550H500Z',fillRule:'nonzero'}}));
  const result=await runFontVector({python,operation:'boolean',sourcePath,outputDir:join(dir,'union')});
  assert.equal(result.status,'pass');assert.deepEqual(result.result.exportViewBox,[-110,-110,670,670]);
  assert.match(await readFile(join(dir,'union/result.svg'),'utf8'),/viewBox="-110\.0 -110\.0 670\.0 670\.0"/);
  await writeFile(sourcePath,JSON.stringify({operation:'difference',left:{d:'M0 0H10V10H0Z',fillRule:'nonzero'},right:{d:'M0 0H10V10H0Z',fillRule:'nonzero'}}));
  const empty=await runFontVector({python,operation:'boolean',sourcePath,outputDir:join(dir,'empty')});
  assert.equal(empty.status,'pass');assert.equal(empty.result.area,0);assert.ok(empty.result.exportViewBox[2]>0);
});
