/** Pure comparison; a current digest cannot manufacture a qualification receipt. */
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function assessResourceEvidence({record,sourceBytes,recipeBytes,noticeBytes}={}) {
 if(!record||!digest(record.sourceSHA256)||!digest(record.recipeSHA256)||!digest(record.noticeSHA256)||!Array.isArray(record.evidenceIds)||!['candidate','handoff-qualified'].includes(record.tier))throw new TypeError('Expected a digest-bound resource evidence record');
 for(const b of [sourceBytes,recipeBytes,noticeBytes])if(!Buffer.isBuffer(b)&&!(b instanceof Uint8Array))throw new TypeError('Supply exact current source, recipe and notice bytes');
 const changed=[];for(const [name,b,expected] of [['source',sourceBytes,record.sourceSHA256],['recipe',recipeBytes,record.recipeSHA256],['notice',noticeBytes,record.noticeSHA256]])if(sha(b)!==expected)changed.push(name);
 if(changed.length)return {tier:'stale',qualifiedOperations:[],evidenceIds:[...record.evidenceIds],changed};
 return {tier:record.tier,qualifiedOperations:record.tier==='handoff-qualified'?['acquire','edit','export','handoff']:[],evidenceIds:[...record.evidenceIds],changed:[]};
}

// Evidence bindings point only to shipped, explicitly named source and operation files.
// They do not execute, install, download or promote anything.
import {readFile} from 'node:fs/promises';
const ROOT=new URL('../../',import.meta.url);
const PATHS={
 'cse-selected':[['src/resources/task-selection.mjs','src/resources/cse-selected.mjs','src/resources/packs/cse-selected/manifest.json'],['src/resources/packs/cse-selected/LICENSE']],
 'hack':[['src/resources/task-selection.mjs','src/catalog/font-packs.mjs','src/resources/packs/hack/manifest.json'],['src/resources/packs/hack/LICENSE.md']],
 'cse-fonts':[['src/resources/task-selection.mjs','src/catalog/font-packs.mjs','src/resources/packs/cse-fonts/manifest.json','src/resources/packs/cse-fonts/cse-source-manifest.json'],[]],
 'liberation-sans':[['src/resources/task-selection.mjs','src/catalog/font-packs.mjs','src/resources/packs/liberation-sans/manifest.json'],['src/resources/packs/liberation-sans/LICENSE']],
 'atomic-ui':[['src/resources/task-selection.mjs','src/ui/atomic.mjs','src/ui/atomic-catalog.json'],['src/resources/packs/daisyui/LICENSE']],
 'materials':[['src/resources/task-selection.mjs','src/materials/index.mjs','src/resources/packs/open-props/gradients.min.css','src/resources/packs/open-props/package.json'],['src/resources/packs/open-props/LICENSE']],
 'palettes':[['src/resources/task-selection.mjs','src/resources/palette-task.mjs','src/palettes/index.mjs','src/palettes/source/provenance.json'],['src/palettes/source/LICENSE']],
 'recipes':[['src/resources/task-selection.mjs','src/resources/recipe-task.mjs','src/resources/recipe-pins.json','examples/evolution/resource-recipes/catalog.json','examples/evolution/resource-recipes/recipes.mjs'],['examples/evolution/resource-recipes/LICENSE','examples/evolution/resource-recipes/CSE-LICENSE.txt']]
};
async function bundle(paths){const records=[];for(const path of paths){const b=await readFile(new URL(path,ROOT));records.push({path,sha256:sha(b)});}return Buffer.from(JSON.stringify(records));}
export async function resourceEvidenceBytes(providerId,assetId,detail){const p=PATHS[providerId];if(!p)throw new Error('No resource evidence binding');let source,notice=p[1];if(providerId==='cse-selected')source=await readFile(new URL(`src/resources/packs/cse-selected/${detail.selectedSource.file}`,ROOT));else if(['hack','cse-fonts','liberation-sans'].includes(providerId)){source=await readFile(new URL(`src/resources/packs/${providerId}/${detail.path}`,ROOT));if(providerId==='cse-fonts')notice=[`src/resources/packs/cse-fonts/${assetId.startsWith('inter-')?'inter-OFL.txt':'space-OFL.txt'}`];}else if(providerId==='atomic-ui')source=await readFile(new URL(`src/resources/packs/daisyui/${detail.styles[0]}`,ROOT));else if(providerId==='materials')source=Buffer.from(detail.originalDeclaration);else if(providerId==='palettes')source=await readFile(new URL(`src/palettes/source/${detail.provenance.selectedFile.split('/').at(-1)}`,ROOT));else source=await readFile(new URL(`examples/evolution/resource-recipes/${detail.source}`,ROOT));const recipePaths=providerId==='recipes'?[...p[0],`examples/evolution/resource-recipes/${detail.parameters}`]:p[0];return {sourceBytes:source,recipeBytes:await bundle(recipePaths),noticeBytes:await bundle(notice)};}
export async function currentResourceQualification({providerId,assetId,sourceDetails}={}){if(providerId==='cse-selected'&&sourceDetails?.selectedSource?.fontDependent)return {tier:'held',qualifiedOperations:[],evidenceIds:[],reason:'Named font dependencies are not included in this handoff.'};try{const data=JSON.parse(await readFile(new URL('./qualification-records.json',import.meta.url)));const row=data.records.find(r=>r.providerId===providerId&&r.assetId===assetId);if(!row)return {tier:'not-qualified',qualifiedOperations:[],evidenceIds:[]};const bytes=await resourceEvidenceBytes(providerId,assetId,sourceDetails);return assessResourceEvidence({record:{...row,tier:row.tier==='handoff-qualified'?'handoff-qualified':'candidate',evidenceIds:[row.evidenceId]},...bytes});}catch(error){return {tier:'stale',qualifiedOperations:[],evidenceIds:[],reason:error.message};}}
