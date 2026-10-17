/** Bundled data navigation. Construction/import never installs, downloads or admits a whole catalog. */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const clone=x=>structuredClone(x);
const fail=m=>{throw new Error(m);};
const data=async name=>JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'));
function page(entries,{query='',category,offset=0,limit=12}={}){
 if(typeof query!=='string'||query.length>128||!Number.isSafeInteger(offset)||offset<0||offset>50000||!Number.isSafeInteger(limit)||limit<1||limit>32||category!==undefined&&(typeof category!=='string'||category.length>100))fail('Expected bounded query, offset and limit1..32');
 const q=query.toLowerCase(),filtered=entries.filter(e=>(!category||e.category===category)&&(!q||[e.id,e.name,e.title,e.familyName,e.category,...(e.tags??[])].some(x=>typeof x==='string'&&x.toLowerCase().includes(q))));
 return{total:filtered.length,offset,limit,nextOffset:offset+limit<filtered.length?offset+limit:null,entries:clone(filtered.slice(offset,offset+limit))};
}
export async function discoverResources(){return clone(await data('./providers.json'));}
async function provider(id){if(typeof id!=='string')fail('Explicit provider id required');const p=(await discoverResources()).providers.find(p=>p.id===id);if(!p)fail('Unknown bundled provider');return p;}
/** Explicit selected user-local downloads; browsing this factory never enables networking. */
export async function openResourceDownloader({id,allowNetwork=false,transport,timeoutMs}={}){
 const p=await provider(id),options={allowNetwork,...(transport===undefined?{}:{transport}),...(timeoutMs===undefined?{}:{timeoutMs})};
 if(p.id==='simple-icons')return(await import('../catalog/brand-download.mjs')).createBrandDownloadClient(options);
 if(p.kind==='font-directory'&&p.id!=='hack-index')return(await import('../catalog/font-download.mjs')).createFontDownloadClient(options);
 if(p.kind==='local-assets')return(await import('../catalog/local-assets.mjs')).createLocalAssetCatalog(options);
 fail('This provider uses bundled data; openResourceLibrary supplies its selected route');
}
/** Selected provider factory; optional parser/utils paths remain explicit and local. */
export async function openResourceLibrary({id,parserDir,iconUtilsDir,allowNetwork=false,timeoutMs}={}){
 const p=await provider(id);
 if(p.kind==='svg-pack')return(await import('../catalog/svg-packs.mjs')).createSvgPackLibrary({manifestPath:fileURLToPath(new URL(p.manifest,import.meta.url)),parserDir});
 if(p.kind==='font-pack')return(await import('../catalog/font-packs.mjs')).createFontPackLibrary({manifestPath:fileURLToPath(new URL(p.manifest,import.meta.url))});
 if(p.kind==='atomic-ui')return(await import('../ui/atomic.mjs')).createAtomicUiLibrary({packageDir:fileURLToPath(new URL(p.packageDir,import.meta.url))});
 if(p.kind==='materials')return(await import('../materials/index.mjs')).createMaterialLibrary({packageDir:fileURLToPath(new URL(p.packageDir,import.meta.url))});
 if(p.kind==='local-assets')return(await import('../catalog/local-assets.mjs')).createLocalAssetCatalog({allowNetwork,...(timeoutMs===undefined?{}:{timeoutMs})});
 if(p.kind==='iconify-package')return(await import('../catalog/index.mjs')).createResourceCatalog({parserDir,iconUtilsDir,sources:[{id:p.id,kind:'symbol',packageDir:fileURLToPath(new URL(p.packageDir,import.meta.url)),license:{declaredURL:'https://github.com/tabler/tabler-icons/blob/master/LICENSE',path:fileURLToPath(new URL(p.notice,import.meta.url)),sha256:p.noticeSHA256,scope:p.scope}}]});
 fail('This provider is a metadata directory; use searchResourceDirectory/detailsResourceDirectory');
}
async function directory(id){
 const p=await provider(id);
 if(p.kind==='stock-directory')return{provider:p,entries:(await data('./stock-directory.json')).entries};
 if(p.kind==='font-directory'){const s=(await data('./font-provider-index.json')).providers.find(s=>s.repository===p.repository);return{provider:p,entries:s.entries};}
 fail('Expected a directory provider');
}
export async function searchResourceDirectory({id,...options}={}){
 const d=await directory(id),entries=d.entries.map((e,i)=>({id:String(e.id??i),name:e.name??e.title??e.metadata?.familyName??String(e.id??i),category:e.category??e.licenseBucketHint??null,kind:e.kind??'font-metadata',held:e.held??false,files:e.files?.length??e.fontCount??null,bytes:e.fontBytes??e.byte??null,formats:e.formats??null,availability:e.repositoryFontBlobState??'metadata-only'}));
 return{provider:d.provider,...page(entries,options),meaning:'Source labels and metadata only; no inferred rights for linked assets or all fonts. No downloads on discovery.'};
}
/** One selected record; file listings are paged so a family cannot dump an entire collection. */
export async function detailsResourceDirectory({id,entryId,offset=0,limit=12}={}){
 if(typeof entryId!=='string'||entryId.length>512)fail('Explicit bounded entryId required');
 const d=await directory(id),entry=d.entries.find((e,i)=>String(e.id??i)===entryId);if(!entry)fail('Unknown directory entry');
 const e=clone(entry),files=e.files??[],selectedFiles=page(files.map((f,i)=>({...f,id:String(i)})),{offset,limit});delete e.files;
 // Large metadata values remain in the retained data file, not repeated in normal search output.
 if(e.release?.assets){e.release={...e.release,assets:e.release.assets.slice(0,8)};}
 return{provider:d.provider,entry:e,files:selectedFiles,sourceURL:e.url??e.repositoryURL??'https://github.com/'+d.provider.repository+'/tree/'+d.provider.commit,meaning:'Linked/source metadata only. Retain the selected file and its exact full notice before using a local font pack. No linked website or font payload fetched.'};
}
