// Original review helper; transforms source text into complete deduplicated blocks.
// No source instructions or scripts are executed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
if(process.argv.length<5)throw Error('Usage: node build-blocks.mjs SOURCE_DIR INVENTORY_JSON PRIVATE_BATCH_DIR');
const source=path.resolve(process.argv[2]),inventoryPath=path.resolve(process.argv[3]),batches=path.resolve(process.argv[4]);
const out=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const inventory=JSON.parse(fs.readFileSync(inventoryPath,'utf8'));
const assigned=inventory.filter(x=>/^(design-templates\/|plugins\/_official\/examples\/)/.test(x.path));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const blocks=new Map(),files=[];
for(const f of assigned){
 const bytes=fs.readFileSync(path.join(source,f.path));if(sha(bytes)!==f.sha256)throw Error('Source hash changed: '+f.path);
 const text=bytes.toString('utf8');
 const parts=text.split(/(\r?\n[\t ]*\r?\n)/); // Captured separators retain all original text.
 if(parts.join('')!==text)throw Error('Reconstruction failed');
 const ids=[];
 for(const content of parts){if(!content)continue;const id=sha(content);ids.push(id);
  const existing=blocks.get(id);if(existing&&existing.content!==content)throw Error('Hash collision');
  if(existing)existing.uses.push(f.path);else blocks.set(id,{id,content,bytes:Buffer.byteLength(content),firstPath:f.path,uses:[f.path],formattingOnly:!content.trim()});
 }
 files.push({path:f.path,sha256:f.sha256,bytes:f.bytes,blockIds:ids,readStatus:'awaiting-complete-block-review'});
}
fs.mkdirSync(batches,{recursive:true});
const semantic=[...blocks.values()].filter(b=>!b.formattingOnly);
let batch=0,size=0,chunk=[];const batchManifests=[];
function flush(){if(!chunk.length)return;batch++;const name=`batch-${String(batch).padStart(2,'0')}.txt`;
 const body=chunk.map(b=>`BLOCK ${b.id} FIRST ${b.firstPath} USES ${b.uses.length}\n${b.content}\nEND BLOCK\n`).join('\n');
 fs.writeFileSync(path.join(batches,name),body);batchManifests.push({batch:name,sourceBytes:size,blockIds:chunk.map(b=>b.id),readStatus:'not-read'});chunk=[];size=0;}
for(const b of semantic){if(size+b.bytes>29000)flush();chunk.push(b);size+=b.bytes;}flush();
const manifest={schema:'ingenium-full-block-read/1',source:'nexu-io/open-design',pin:'8d820a698908dc279ef3d5aeb4ce6d156211a499',
 policy:'Every assigned complete UTF-8 SKILL body is exactly reconstructible by ordered block IDs from the unchanged pinned source. Equal block hashes are exact content equality; not a claim that distinct full-file hashes are duplicate skills. Every unique non-whitespace block must be read before marking a file complete. Blank-line separators are formatting-only.',
 files,blocks:[...blocks.values()].map(({content,...b})=>b),batches:batchManifests,
 counts:{files:files.length,sourceBytes:assigned.reduce((n,f)=>n+f.bytes,0),uniqueFullFileHashes:new Set(files.map(f=>f.sha256)).size,totalBlocks:blocks.size,semanticBlocks:semantic.length,uniqueSemanticBytes:semantic.reduce((n,b)=>n+b.bytes,0),batches:batch}};
fs.writeFileSync(path.join(out,'block-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.counts));
