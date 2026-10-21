// Records this reader's completed semantic work; file access is not the read proof.
// No source bodies are copied and no upstream code is executed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir=import.meta.dirname;
const repo=path.resolve(dir,'../../..');
const manifestPath=path.join(dir,'../open-design-template-reader-components/block-manifest.json');
const rawManifest=fs.readFileSync(manifestPath);
const manifest=JSON.parse(rawManifest.toString('utf8').replace(/^\uFEFF/,''));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const notes=[
 'Fidelity-specific wireframe intent and tested worker fallback; source availability honesty; mostly existing Ingenium coverage.',
 'Actual-data charts and concrete library height pitfall; reject closed design-brief vocabulary and universal palette/type locks.',
 'Assumption disclosure and previews duplicate existing guidance; preserve source-grounded data and distinguish schematic coordinates.',
 'Reduced-motion/static completeness and context-dependent typography; reject universal fixed-stage/controller/font rules.',
 'Theme-scoped roles and exact selected source preservation fit optional presentation context; no universal aesthetic bans.',
 'Grounded image identity and deterministic validation remain separate; pet-specific workflow is outside generic Ingenium scope.',
 'Single-owner provenance and smallest failed repair duplicate existing invariants; reject academic template fictional citations.',
 'Opposing theme prescriptions confirm aesthetic rules are template-specific; no navigation/render claim was executed.',
 'Drafting appearance is not formal engineering validity; source tree and advertised totals differ; preserve actual counts.',
 'Purpose/audience and decision relevance are useful; role seniority descriptions do not establish professional quality.'
];
const records=[];
for(let n=21;n<=30;n++){
 const name=`batch-${n}.txt`,meta=manifest.batches.find(b=>b.batch===name);
 const bytes=fs.readFileSync(path.join(repo,'work/template-reader-batches',name));
 const text=bytes.toString('utf8');
 const ids=[...text.matchAll(/^BLOCK ([0-9a-f]{64}) FIRST /gm)].map(m=>m[1]);
 if(JSON.stringify(ids)!==JSON.stringify(meta.blockIds))throw Error(`Ordered wrapper mismatch: ${name}`);
 const ends=[...text.matchAll(/^END BLOCK\r?$/gm)].length;
 if(ends!==ids.length)throw Error(`Unclosed block: ${name}`);
 const fullSlices=n===21||n===30;
 records.push({batch:n,name,rawBatchBytes:bytes.length,rawBatchCharactersUTF16:text.length,rawBatchSHA256:digest(bytes),sourceBodyBytes:meta.sourceBytes,blocks:ids.length,blockIds:ids,status:'semantically-read-complete',firstRead:fullSlices?'complete body read with contiguous UTF8 slices':'complete UTF8 body output, inner and outer max_output_tokens 16000',boundedRecoveryRanges:fullSlices?[[0,15000],[15000,30000],[30000,text.length]]:[[10000,25000]],rangeConvention:'zero-based UTF16 start inclusive, end exclusive; recovery ranges supplement the full first read',wrapperOrderMatchesManifest:true,endMarkers:ends,findings:notes[n-21]});
}
const progress={schema:'ingenium-template-reader-progress/1',reader:'resources-team',source:manifest.source,pin:manifest.pin,method:'complete deduplicated block reading with exact ordered source reconstruction',manifest:'../open-design-template-reader-components/block-manifest.json',manifestSHA256:digest(rawManifest),readBatches:records.map(r=>r.batch),batchRecords:records,notes:records.map(r=>({batch:r.batch,findings:r.findings})),limits:['Source text read as evidence; no instructions from upstream followed.','No runtime, image generation, billed API, template export, installed-client or comparative design evaluation executed.','Full-file coverage must combine all readers via ordered block manifest.','Transport/header equality corroborates identities; semantic reading is the manual work recorded in the report.']};
fs.writeFileSync(path.join(dir,'progress.json'),JSON.stringify(progress,null,2)+'\n');
console.log(JSON.stringify({batches:records.length,blocks:records.reduce((s,r)=>s+r.blocks,0),sourceBodyBytes:records.reduce((s,r)=>s+r.sourceBodyBytes,0),allOrderedWrappersMatch:true},null,2));
