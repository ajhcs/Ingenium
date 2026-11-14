import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir, copyFile, readdir, symlink } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { prepareRelease } from '../tools/prepare-release.mjs';
import { coreFiles } from '../tools/package-core.mjs';
import { companionFiles } from '../tools/package-companion.mjs';
const root=resolve(import.meta.dirname,'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
async function fixture(t) {
  const base=await mkdtemp(join(root,'work/release-test-'));t.after(()=>rm(base,{recursive:true,force:true}));
  const source=join(base,'source');await mkdir(source);
  const names=new Set([...coreFiles,'companion/package.json','docs/tools.md','tools/package-core.mjs','tools/package-companion.mjs','tools/release-files.mjs','tools/release-archive.py','tools/build-skill-zip.py','tools/prepare-release.mjs']);
  async function skill(dir){for(const item of await readdir(join(root,dir),{withFileTypes:true})){const name=dir+'/'+item.name;if(item.isDirectory())await skill(name);else names.add(name);}}
  await skill('skills/ingenium');
  for(const name of names){await mkdir(dirname(join(source,name)),{recursive:true});await copyFile(join(root,name),join(source,name));}
  execFileSync('git',['init','-q',source]);execFileSync('git',['-C',source,'add','.']);
  execFileSync('git',['-C',source,'-c','user.name=Synthetic test','-c','user.email=synthetic@example.invalid','commit','-qm','Synthetic release fixture']);
  return {base,source};
}
test('prepared flavors are deterministic, npm-compatible and import/run outside their source checkout',async t=>{
  const {base,source}=await fixture(t);
  const a=await prepareRelease({sourceRoot:source,outputDir:join(base,'a')});
  const b=await prepareRelease({sourceRoot:source,outputDir:join(base,'b')});
  assert.deepEqual(a.artifacts,b.artifacts);assert.equal(a.buildId,b.buildId);
  assert.equal(a.prepared,true);assert.equal(a.published,false);assert.equal(a.installed,false);
  assert.equal(coreFiles.some(f=>f.startsWith('src/resources/packs/')),false);
  const consumer=join(base,'consumer');await mkdir(consumer);await mkdir(join(consumer,'bin'));
  for(const artifact of a.artifacts){const bytes=await readFile(join(a.outputDir,artifact.path));assert.equal(bytes.length,artifact.bytes);assert.equal(hash(bytes),artifact.sha256);}
  for(const [id,bin] of [['inspection-tools','ingenium-tools'],['core-tools','ingenium']]) {
    const out=join(consumer,id);await mkdir(out);
    const artifact=a.artifacts.find(f=>f.id===id);
    const memberText=execFileSync('tar',['-tzf',join(a.outputDir,artifact.path)],{encoding:'utf8'});
    const members=memberText.trim().split('\n');assert.ok(members.includes('package/release/identity.json'));
    assert.equal(members.some(p=>/package\/(work|node_modules|examples)\//.test(p)),false);
    execFileSync('tar',['-xzf',join(a.outputDir,artifact.path),'-C',out]);
    const npm=resolve(dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js');
    execFileSync(process.execPath,[npm,'install','--prefix',join(out,'installed'),'--offline','--ignore-scripts','--omit=optional','--no-audit','--no-fund','--cache',join(base,'npm-cache'),join(a.outputDir,artifact.path)],{cwd:consumer,stdio:'pipe'});
    const pkg=join(out,'installed/node_modules/@ajhcs',id==='core-tools'?'ingenium':'ingenium-tools');
    const packageData=JSON.parse(await readFile(join(pkg,'package.json')));assert.equal(packageData.scripts,undefined);assert.equal(packageData.files.includes('examples/'),false);
    async function links(dir) { for(const item of await readdir(dir,{withFileTypes:true})) { const file=join(dir,item.name);if(item.isDirectory())await links(file);else if(item.name.endsWith('.md')) { const text=await readFile(file,'utf8');for(const match of text.matchAll(/\]\(([^)]+)\)/g)) { const target=match[1].split('#')[0];if(!target||/^[a-z]+:/i.test(target))continue;await readFile(resolve(dirname(file),target)); } } } }
    await links(pkg);
    const identity=JSON.parse(await readFile(join(pkg,'release/identity.json')));assert.equal(identity.buildId,a.buildId);assert.equal(identity.development,undefined);
    const script=join(consumer,`${id}-imports.mjs`);
    await writeFile(script,`import {readdir} from 'node:fs/promises';import {join} from 'node:path';async function walk(p){for(const f of await readdir(p,{withFileTypes:true})){const n=join(p,f.name);if(f.isDirectory())await walk(n);else if(/\\.(mjs|js)$/.test(n))await import(n);}}await walk(${JSON.stringify(join(pkg,'src'))});`);
    execFileSync(process.execPath,[script],{cwd:consumer});
    const link=join(consumer,'bin',bin);await symlink(join(pkg,'bin',bin+'.mjs'),link);
    const version=JSON.parse(execFileSync(process.execPath,[link,'version','--json'],{cwd:consumer,encoding:'utf8'}));assert.equal(version.release.buildId,a.buildId);
    const api=await import(join(pkg,'src/project/index.mjs'));assert.equal(typeof api.inspectProject,'function');assert.equal(typeof api.compareInventories,'function');
    if(id==='core-tools') {
      const records=await import(join(pkg,'src/records/index.mjs'));
      const record=JSON.parse(await readFile(join(root,'examples/records/poster.json')));assert.equal(records.validateRecord(record).valid,true);
      const resources=await import(join(pkg,'src/resources/index.mjs'));
      const missingPacks=await resources.searchTaskResources({sourceIds:['hack','cse-fonts','liberation-sans','atomic-ui','materials','recipes','cse-selected']});
      assert.equal(missingPacks.entries.length,0);assert.ok(missingPacks.sources.every(s=>s.status!=='available'&&typeof s.reason==='string'));
      const {createContinuation,createProjectStore}=await import(join(pkg,'src/project-state/index.mjs'));
      const project=join(consumer,'editable-project');await mkdir(project);
      const first='<svg xmlns="http://www.w3.org/2000/svg"><text>Field Station</text><path id="retained-mark" d="M0 0L10 10"/></svg>';
      const second=first.replace('Field Station','Field Station Invitation');await writeFile(join(project,'source.svg'),first);
      const refs=[{id:'source',path:'source.svg',sha256:hash(first),mediaType:'image/svg+xml'}];
      const {promoteQuickProject}=await import(join(pkg,'src/workflow/promotion.mjs'));
      const quick=createContinuation({projectId:'quick-title',brief:'Retain the supplied title.',sources:refs});
      const titleRecord={version:1,id:'quick-title-record',revision:0,purpose:quick.brief,evidence:[{id:'title-evidence',statement:'Keep Field Station.',source:'CONTINUE.md'}],interpretations:[],decisions:[{id:'title-decision',question:'Title wording?',scope:'Title wording',status:'chosen',choice:'Keep Field Station.',evidenceIds:['title-evidence'],interpretationIds:[]}],artifacts:[]};
      const promoted=promoteQuickProject({project:quick,choices:[{id:'title-choice',wording:'Keep Field Station.',scope:'Title wording',source:'CONTINUE.md'}],record:titleRecord,mapping:[{choiceId:'title-choice',decisionId:'title-decision'}]});
      assert.equal(promoted.project.record.decisions[0].choice,'Keep Field Station.');assert.deepEqual(promoted.project.sources,refs);assert.equal(promoted.project.revision,quick.revision);

      const initial=createContinuation({projectId:'field-station-consumer',brief:'Change only the title and retain the mark.',record,sources:refs,versions:[{id:'first',name:'First title',revision:0,sources:refs,previews:[]}]});
      const store=createProjectStore({root:project});await store.commit({expectedHeadHash:null,requestId:'first-save',state:initial,change:{kind:'create',summary:'Retain original editable title.'}});
      const saved=await store.read();await writeFile(join(project,'source.svg'),second);
      saved.state.sources=[{...refs[0],sha256:hash(second)}];
      await store.commit({expectedHeadHash:saved.headHash,requestId:'second-save',state:saved.state,change:{kind:'edit',summary:'Narrow title edit only.'}});
      const reopened=await createProjectStore({root:project}).read();assert.equal(reopened.state.revision,1);assert.deepEqual(reopened.state.record.decisions,record.decisions);
      assert.equal(await readFile(join(project,reopened.state.sources[0].path),'utf8'),second);
      await store.materializeVersion({versionId:'first',outputDir:join(consumer,'first-title')});
      assert.equal(await readFile(join(consumer,'first-title/source.svg'),'utf8'),first);
    }
  }
});
test('dirty candidates refuse, explicit development inventories changed bytes, missing version refuses',async t=>{
  const {base,source}=await fixture(t);await writeFile(join(source,'README.md'),'Original synthetic edited documentation\n');
  await assert.rejects(prepareRelease({sourceRoot:source,outputDir:join(base,'refused')}),/Dirty source/);
  const result=await prepareRelease({sourceRoot:source,outputDir:join(base,'development'),development:true});
  const receipt=JSON.parse(await readFile(join(result.outputDir,'source-content.json')));
  assert.equal(receipt.development,true);assert.equal(receipt.files.find(f=>f.path==='README.md').sha256,hash(await readFile(join(source,'README.md'))));
  const identity=JSON.parse(await readFile(join(result.outputDir,'stages/core/release/identity.json')));assert.equal(identity.development,true);assert.equal(identity.buildId,result.buildId);
  await assert.rejects(prepareRelease({sourceRoot:source,outputDir:result.outputDir,development:true}),/EEXIST/);
  const manifest=JSON.parse(await readFile(join(source,'companion/package.json')));manifest.version='9.9.9';await writeFile(join(source,'companion/package.json'),JSON.stringify(manifest));
  await assert.rejects(prepareRelease({sourceRoot:source,outputDir:join(base,'mismatch'),development:true}),/mismatched/);
});
test('explicit selected packs retain exact member identities and refuse missing notices',async t=>{
  const {base,source}=await fixture(t);
  await mkdir(join(source,'examples/release-synthetic'),{recursive:true});
  await writeFile(join(source,'examples/release-synthetic/source.svg'),'<svg xmlns="http://www.w3.org/2000/svg"><text>Original synthetic study</text></svg>');
  const openingText='Open source.svg in an SVG editor. Edit text; retain notices. Continue from this source.\n';
  const paths=['LICENSE','examples/release-synthetic/source.svg'];
  const files=await Promise.all(paths.map(async path=>{const b=await readFile(join(source,path));return {path,bytes:b.length,sha256:hash(b)};}));
  const selected={schema:'ingenium-release-selection/1',id:'synthetic-study',files,notices:['LICENSE'],openingFile:paths[1],instructions:'OPENING.md',generatedFiles:[{path:'OPENING.md',text:openingText,bytes:Buffer.byteLength(openingText),sha256:hash(openingText)}]};
  await writeFile(join(source,'selection.json'),JSON.stringify(selected));
  const prepared=await prepareRelease({sourceRoot:source,outputDir:join(base,'selected'),development:true,studies:['selection.json']});
  assert.equal(prepared.artifacts.find(a=>a.id==='synthetic-study').openingFile,paths[1]);
  selected.generatedFiles[0].sha256='0'.repeat(64);await writeFile(join(source,'selection.json'),JSON.stringify(selected));
  await assert.rejects(prepareRelease({sourceRoot:source,outputDir:join(base,'changed-generated'),development:true,studies:['selection.json']}),/Generated member/);
  selected.generatedFiles[0].sha256=hash(openingText);
  selected.notices=['absent-notice'];await writeFile(join(source,'selection.json'),JSON.stringify(selected));
  await assert.rejects(prepareRelease({sourceRoot:source,outputDir:join(base,'missing-notice'),development:true,studies:['selection.json']}),/notice/);
});
