/** Optional explicitly selected CSE catalog, read as data; no subprocess or network. */
import {readFile, lstat, realpath} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
export const CSE_CATALOG_SHA256='1a75aae3836202b203f08936d1e6d3f6745c124fd431a24cbe1c26d7f38628c6';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function openCseCatalog({runtimeDir}={}) {
 if(typeof runtimeDir!=='string'||!runtimeDir) throw new Error('Explicit CSE runtimeDir required');
 const file=join(resolve(runtimeDir),'assets/engineering-library/index.json');
 const st=await lstat(file); if(!st.isFile()||st.isSymbolicLink()||st.size>8_000_000||await realpath(file)!==file) throw new Error('CSE catalog must be a bounded canonical regular file');
 const raw=await readFile(file); if(hash(raw)!==CSE_CATALOG_SHA256) throw new Error('CSE catalog revision changed; select and review the new revision');
 const data=JSON.parse(raw); if(data.schema!=='cse.component-library/1'||!Array.isArray(data.components)||data.components.length!==1076||data.count!==data.components.length||new Set(data.components.map(x=>x.id)).size!==data.components.length) throw new Error('Invalid CSE catalog identity');
 const entries=data.components;
 return Object.freeze({count:entries.length,catalogSHA256:CSE_CATALOG_SHA256,search({query='',offset=0,limit=24}={}){if(typeof query!=='string'||query.length>128||!Number.isSafeInteger(offset)||offset<0||offset>50000||!Number.isSafeInteger(limit)||limit<1||limit>64) throw new Error('Invalid bounded CSE search'); const q=query.toLowerCase(),found=entries.filter(e=>[e.id,e.name,e.family,e.category,e.meaning].some(v=>typeof v==='string'&&v.toLowerCase().includes(q)));return {total:found.length,nextOffset:offset+limit<found.length?offset+limit:null,entries:structuredClone(found.slice(offset,offset+limit))};},detail(id){if(typeof id!=='string'||id.length>128)throw new Error('Exact CSE ID required');const entry=entries.find(e=>e.id===id);if(!entry)throw new Error('Unknown CSE ID');return structuredClone(entry);}});
}
