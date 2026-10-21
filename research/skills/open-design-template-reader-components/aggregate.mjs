// Original research audit: verifies source reconstruction and joins explicit reader receipts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
if(!process.argv[2])throw Error('Usage: node aggregate.mjs OPEN_DESIGN_SOURCE_DIR (run from Ingenium checkout root)');
const source=path.resolve(process.argv[2]),out=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const research=path.dirname(out),manifest=JSON.parse(fs.readFileSync(path.join(out,'block-manifest.json'),'utf8'));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const blockText=new Map();
for(const f of manifest.files){const raw=fs.readFileSync(path.join(source,f.path));if(sha(raw)!==f.sha256)throw Error('Source changed: '+f.path);
 for(const t of raw.toString('utf8').split(/(\r?\n[\t ]*\r?\n)/)){if(t)blockText.set(sha(t),t);}
 const rebuilt=f.blockIds.map(id=>{if(!blockText.has(id))throw Error('Missing block');return blockText.get(id);}).join('');
 if(!Buffer.from(rebuilt).equals(raw))throw Error('Exact reconstruction failure: '+f.path);
}
const knownBatches=new Map(manifest.batches.map(x=>[x.batch,x])),readers=[];
for(const name of fs.readdirSync(research).filter(x=>x.startsWith('open-design-template-reader-'))){
 const p=path.join(research,name,'progress.json');if(!fs.existsSync(p))continue;const d=JSON.parse(fs.readFileSync(p,'utf8'));
 if(!Array.isArray(d.readBatches)||!d.reader)throw Error('Invalid reader receipt: '+name);
 if(d.pin&&d.pin!==manifest.pin)throw Error('Receipt source pin mismatch');
 const receiptMapHash=d.manifestSHA256??d.manifestSha256;
 if(receiptMapHash&&receiptMapHash!==sha(fs.readFileSync(path.join(out,'block-manifest.json'))))throw Error('Receipt map identity mismatch');
 const batches=d.readBatches.map(b=>Number.isInteger(b)?`batch-${String(b).padStart(2,'0')}.txt`:b);
 for(const b of batches)if(!knownBatches.has(b))throw Error('Unknown read batch');
 for(const record of d.batchRecords??[]){if(!Array.isArray(record.blockIds))continue;const b=record.name??(Number.isInteger(record.batch)?`batch-${String(record.batch).padStart(2,'0')}.txt`:record.batch);
  if(JSON.stringify(record.blockIds)!==JSON.stringify(knownBatches.get(b)?.blockIds))throw Error('Receipt ordered blocks mismatch');}
 readers.push({receipt:`${name}/progress.json`,reader:d.reader,batches});
}
const blockReaders=new Map(),batchReaders=new Map();
for(const r of readers)for(const b of r.batches){const br=batchReaders.get(b)??new Set();br.add(r.reader);batchReaders.set(b,br);
 for(const id of knownBatches.get(b).blockIds){const owners=blockReaders.get(id)??new Set();owners.add(r.reader);blockReaders.set(id,owners);}}
const formatting=new Set(manifest.blocks.filter(x=>x.formattingOnly).map(x=>x.id)),firstHashPath=new Map();
const files=manifest.files.map(f=>{
 const complete=f.blockIds.every(id=>formatting.has(id)||blockReaders.has(id));
 const owners=new Set(f.blockIds.flatMap(id=>[...(blockReaders.get(id)??[])]));
 const alias=firstHashPath.get(f.sha256);if(!alias)firstHashPath.set(f.sha256,f.path);
 return {path:f.path,sha256:f.sha256,bytes:f.bytes,read_status:complete?'read-complete-block-reconstruction':'partial-block-coverage',reader:[...owners],
 evidence:'Exact original bytes reconstruct from block-manifest.json ordered blockIds; every non-whitespace block has an explicit completed-batch reader receipt.',
 exactByteAliasOf:alias??null,missingSemanticBlocks:[...new Set(f.blockIds.filter(id=>!formatting.has(id)&&!blockReaders.has(id)))]};
});
const coverage={source:manifest.source,pin:manifest.pin,method:manifest.policy,readers,
 counts:{assignedFiles:files.length,uniqueFullFileHashes:firstHashPath.size,completeFiles:files.filter(f=>f.read_status==='read-complete-block-reconstruction').length,
 partialFiles:files.filter(f=>f.read_status!=='read-complete-block-reconstruction').length,semanticBlocks:manifest.counts.semanticBlocks,readSemanticBlocks:blockReaders.size,
 batches:knownBatches.size,readBatches:batchReaders.size},
 completeBatchIds:[...batchReaders.keys()].sort(),files,
 limits:'Complete body-text coverage through deduplicated ordered reconstruction is distinct from holistic per-skill evaluation: reading shared paragraphs once does not evaluate every cross-block combination. SKILL.md text only; linked references, code/assets, actual runtime behavior and source license declarations remain distinct evidence.'};
fs.writeFileSync(path.join(out,'coverage.json'),JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify(coverage.counts));
