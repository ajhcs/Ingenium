/** Selected user-local PNG acquisition; no icon pixels are shipped or discovered over the network. */
import { readFile, writeFile, lstat, realpath, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
const COMMIT = '380fbd33513193164b31821ae1ea62b6e9ccd388';
const REPOSITORY = 'BIAsia/voxel-icon';
const BASE = `https://raw.githubusercontent.com/${REPOSITORY}/${COMMIT}/`;
const TERMS = Object.freeze({ path:'LICENSE.md', bytes:1831, sha256:'c18474f2be8b6ad8559a9948d51be4b435b2f10e1d2d8dbf2b57ac9a95da89b6', gitBlobSHA1:'e63dacbcb426ca66f6d8e7cf71a8bff56773e7a6' });
const ENTRIES = [
  {
    "id": "basket-plum-gold",
    "variant": "directed",
    "path": "icons/directed/basket-plum-gold.png",
    "bytes": 749025,
    "gitBlobSHA1": "aa31c0c472b79ee5af55487d7a74b5030ecd7b63"
  },
  {
    "id": "brick-grapefruit",
    "variant": "directed",
    "path": "icons/directed/brick-grapefruit.png",
    "bytes": 367529,
    "gitBlobSHA1": "73703f141b2906dd7e01d2bb506aece57163d23b"
  },
  {
    "id": "floppy-disk-blueberry-milk",
    "variant": "directed",
    "path": "icons/directed/floppy-disk-blueberry-milk.png",
    "bytes": 554029,
    "gitBlobSHA1": "c687817f5996fb35da5e3d23e4ed5a8fce143f51"
  },
  {
    "id": "gem-stone-aqua-orchid",
    "variant": "directed",
    "path": "icons/directed/gem-stone-aqua-orchid.png",
    "bytes": 364644,
    "gitBlobSHA1": "01ea4c5dcce6efd7ac92d41ceade77b9d3e6aa70"
  },
  {
    "id": "headphones-moon-pearl",
    "variant": "directed",
    "path": "icons/directed/headphones-moon-pearl.png",
    "bytes": 335977,
    "gitBlobSHA1": "5cd3af92f01617d59c2728be27b2454478f47c7d"
  },
  {
    "id": "hourglass-lagoon-gold",
    "variant": "directed",
    "path": "icons/directed/hourglass-lagoon-gold.png",
    "bytes": 587025,
    "gitBlobSHA1": "ec87ad9028c269f475f4771c64d6f697811161aa"
  },
  {
    "id": "locked-plum-gold",
    "variant": "directed",
    "path": "icons/directed/locked-plum-gold.png",
    "bytes": 497817,
    "gitBlobSHA1": "d4fc16abb7faecb4efcaff722f284f4cc5ff7e72"
  },
  {
    "id": "mailbox-with-raised-flag-sky-melon",
    "variant": "directed",
    "path": "icons/directed/mailbox-with-raised-flag-sky-melon.png",
    "bytes": 428811,
    "gitBlobSHA1": "8572f2f86aeb2f32acd929358747b6e110172879"
  },
  {
    "id": "microscope-teal-void",
    "variant": "directed",
    "path": "icons/directed/microscope-teal-void.png",
    "bytes": 505465,
    "gitBlobSHA1": "ea947f62ea2f792a250d0d0cdc6395ef49ff9a8c"
  },
  {
    "id": "pencil-sunset-punch",
    "variant": "directed",
    "path": "icons/directed/pencil-sunset-punch.png",
    "bytes": 313708,
    "gitBlobSHA1": "ffa5ae87105bcc7a0d0369348e0170d97d8ae5ac"
  },
  {
    "id": "scissors-cherry-cola",
    "variant": "directed",
    "path": "icons/directed/scissors-cherry-cola.png",
    "bytes": 361492,
    "gitBlobSHA1": "c4cdfec2fef21f5ebbd964ab285e4180d65dd8a2"
  },
  {
    "id": "shopping-cart-blue-cream",
    "variant": "directed",
    "path": "icons/directed/shopping-cart-blue-cream.png",
    "bytes": 278858,
    "gitBlobSHA1": "c88c683b4b283699b76b927c93207264df61b545"
  },
  {
    "id": "teddy-bear-peach-cream",
    "variant": "directed",
    "path": "icons/directed/teddy-bear-peach-cream.png",
    "bytes": 587273,
    "gitBlobSHA1": "082f9e5b10d48fb6e3736ddf1a7b767ff1e855ba"
  },
  {
    "id": "telescope-blue-cream",
    "variant": "directed",
    "path": "icons/directed/telescope-blue-cream.png",
    "bytes": 338049,
    "gitBlobSHA1": "a1309afb729e3f0543db773c5235e604a86b8edb"
  },
  {
    "id": "toolbox-grapefruit",
    "variant": "directed",
    "path": "icons/directed/toolbox-grapefruit.png",
    "bytes": 445256,
    "gitBlobSHA1": "0857f636bed7420a395b4a6ed73b78e204aabb37"
  },
  {
    "id": "basket",
    "variant": "native",
    "path": "icons/native/basket.png",
    "bytes": 676268,
    "gitBlobSHA1": "6f47e59176d47292300664da8b3426243943e63e"
  },
  {
    "id": "brick",
    "variant": "native",
    "path": "icons/native/brick.png",
    "bytes": 349787,
    "gitBlobSHA1": "aa278fe014672e4c332005a317dbf6e928be545a"
  },
  {
    "id": "floppy-disk",
    "variant": "native",
    "path": "icons/native/floppy-disk.png",
    "bytes": 587426,
    "gitBlobSHA1": "af04f60f38cf33750cf36330f64636ea12cb61fb"
  },
  {
    "id": "gem-stone",
    "variant": "native",
    "path": "icons/native/gem-stone.png",
    "bytes": 384140,
    "gitBlobSHA1": "867cf7af2dcd47cfea00003a839d1b96e892624b"
  },
  {
    "id": "headphones",
    "variant": "native",
    "path": "icons/native/headphones.png",
    "bytes": 420932,
    "gitBlobSHA1": "b84b0ba5230ead0df65cc09eedc670fbbaf47b52"
  },
  {
    "id": "hourglass",
    "variant": "native",
    "path": "icons/native/hourglass.png",
    "bytes": 641532,
    "gitBlobSHA1": "fa7aba43551e9184cfb724f9cb07cfcf0ae2b5a0"
  },
  {
    "id": "locked",
    "variant": "native",
    "path": "icons/native/locked.png",
    "bytes": 500012,
    "gitBlobSHA1": "85c716ee76b7cce5ab68c0f4fefb7372af6c649b"
  },
  {
    "id": "mailbox-with-raised-flag",
    "variant": "native",
    "path": "icons/native/mailbox-with-raised-flag.png",
    "bytes": 402138,
    "gitBlobSHA1": "b58d621dbd56806b847b0ee54b73ea20e7277a01"
  },
  {
    "id": "microscope",
    "variant": "native",
    "path": "icons/native/microscope.png",
    "bytes": 494967,
    "gitBlobSHA1": "1cbdf2266fa27e8081d65687ecf93e93b091ea24"
  },
  {
    "id": "pencil",
    "variant": "native",
    "path": "icons/native/pencil.png",
    "bytes": 309317,
    "gitBlobSHA1": "1c8527fb71be5078c40e0ca04d9a1fcd2ec48264"
  },
  {
    "id": "scissors",
    "variant": "native",
    "path": "icons/native/scissors.png",
    "bytes": 400128,
    "gitBlobSHA1": "c293fabda2d19ce63f5ad5939ab28ec14e779649"
  },
  {
    "id": "shopping-cart",
    "variant": "native",
    "path": "icons/native/shopping-cart.png",
    "bytes": 295635,
    "gitBlobSHA1": "d108054f3b0319a17ae8ba50abd7dd9e6d344b08"
  },
  {
    "id": "teddy-bear",
    "variant": "native",
    "path": "icons/native/teddy-bear.png",
    "bytes": 547542,
    "gitBlobSHA1": "ef0a7ccfcff4486a81b50983289cb44a43d4254c"
  },
  {
    "id": "telescope",
    "variant": "native",
    "path": "icons/native/telescope.png",
    "bytes": 359330,
    "gitBlobSHA1": "648bbe5208ea94bee088b79c75181d5e739f44c4"
  },
  {
    "id": "toolbox",
    "variant": "native",
    "path": "icons/native/toolbox.png",
    "bytes": 455388,
    "gitBlobSHA1": "62272a02b5c4cf69d3a5bb839b4b67c4b0fc048a"
  }
];
const MAX_PNG = 2_000_000, MAX_TERMS = 65536, TIMEOUT = 15000;
const sha = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
const plain = v => v && Object.getPrototypeOf(v) === Object.prototype;
const fail = (code,message) => { const error = new Error(message);error.code=code;throw error; };
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const constraint = 'Free personal/commercial projects and modifications; no reselling, redistribution or republishing original/modified icon files alone or in packs, asset libraries, templates or generators. Keep acquired pixels in user-local outputs; do not bundle them into Ingenium or a redistributed library. Full exact terms accompany each selection; skill code/docs MIT does not license icon artwork.';
function entry(id) { return ENTRIES.find(x=>x.id===id) ?? fail('selection','Select a known Voxel catalog id'); }
function record(e) { return { ...structuredClone(e), title:e.id.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '), sourceURL:BASE+e.path, sourceMetadata:{categories:[],tags:[],meaning:'No source semantic categories/tags asserted. Native/directed is the source directory grouping.'}, inferredNameTokens:e.id.split('-'), inferredMeaning:'Filename spelling only, not source-supplied semantic tags.', availability:'selected-user-local-acquisition', license:{id:'LicenseRef-Voxel-Free-Icons',url:BASE+TERMS.path,sha256:TERMS.sha256,constraint}, version:{commit:COMMIT,release:null,meaning:'Immutable retained repository commit; no release/tag version inferred.'} }; }
async function local(file,max) { const p=resolve(file),s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.size>max||await realpath(p)!==p)fail('local-file','Expected bounded canonical regular local source');const b=await readFile(p);if(b.length>max)fail('local-file','Local byte bound exceeded');return b; }
/** Header/container and exact-byte identity check only; a browser/decoder is separate. */
export function inspectPngBytes(value,expected={}) {
  if(!(value instanceof Uint8Array))fail('png','Expected PNG bytes');const b=Buffer.from(value);
  if(b.length<45||b.length>MAX_PNG||!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.readUInt32BE(8)!==13||b.toString('ascii',12,16)!=='IHDR')fail('png','Expected bounded PNG signature and IHDR');
  const width=b.readUInt32BE(16),height=b.readUInt32BE(20);if(!width||!height||width>4096||height>4096||width*height>16_777_216)fail('png','PNG dimension bound exceeded');
  if(!Number.isSafeInteger(expected.bytes)||expected.bytes!==b.length||(!/^[a-f0-9]{40}$/.test(expected.gitBlobSHA1??'')&&!/^[a-f0-9]{64}$/.test(expected.sha256??'')))fail('integrity','Expected exact byte size and Git blob SHA1 or SHA256');
  const identity={bytes:b.length,sha256:sha(b),gitBlobSHA1:blob(b),width,height,validation:'Bounded PNG header and exact bytes; not a universal image sanitizer or full decoder.'};
  if((expected.gitBlobSHA1&&identity.gitBlobSHA1!==expected.gitBlobSHA1)||(expected.sha256&&identity.sha256!==expected.sha256))fail('integrity','Selected PNG exact-byte identity mismatch');return identity;
}
async function liveTransport({url,maxBytes,signal}) {
  const response=await fetch(url,{redirect:'manual',signal});
  if(response.status!==200){await response.body?.cancel();return {status:response.status,url:response.url,headers:{},body:Buffer.alloc(0)};}
  const length=response.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes)){await response.body?.cancel();fail('response-size','HTTP Content-Length exceeded bound');}
  const chunks=[];let count=0;const reader=response.body?.getReader();if(!reader)fail('transport','Missing response body');
  try{for(;;){const{done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>maxBytes)fail('response-size','HTTP body exceeded bound');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  return {status:response.status,url:response.url,headers:{'content-type':response.headers.get('content-type'),'content-length':length},body:Buffer.concat(chunks)};
}
export function createLocalAssetCatalog({allowNetwork=false,transport,timeoutMs=TIMEOUT}={}) {
  if(typeof allowNetwork!=='boolean'||(transport!==undefined&&typeof transport!=='function')||!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)fail('input','Use boolean allowNetwork, optional transport function and timeoutMs100..30000');
  const mode=transport?'fixture':'live';
  function discover({query='',variant,offset=0,limit=12}={}) {
    if(typeof query!=='string'||query.length>128||(variant!==undefined&&!['native','directed'].includes(variant))||!Number.isSafeInteger(offset)||offset<0||offset>30||!Number.isSafeInteger(limit)||limit<1||limit>32)fail('input','Use bounded query, native/directed, offset0..30 and limit1..32');
    const all=ENTRIES.filter(e=>(!variant||e.variant===variant)&&e.id.includes(query.toLowerCase())).sort((a,b)=>a.id.localeCompare(b.id,'en'));
    return {schema:'ingenium-local-asset-catalog/1',provider:REPOSITORY,commit:COMMIT,total:all.length,offset,limit,nextOffset:offset+limit<all.length?offset+limit:null,entries:all.slice(offset,offset+limit).map(record),networkRequests:0,pixelsBundled:false,constraint};
  }
  function details({id}={}) { return { ...record(entry(id)),terms:{...TERMS,url:BASE+TERMS.path},acquisition:'Explicit selected user-local output; network disabled unless allowNetwork:true. Retained output can be verified/reused offline.',imageValidation:'Not-run until selected acquisition; catalog presence is metadata only.' }; }
  async function capabilities() { return {provider:REPOSITORY,commit:COMMIT,metadata:'local',network:allowNetwork?'explicitly-enabled':'disabled',transport:mode,timeoutMs,selectedPNGCount:ENTRIES.length,pixelsBundled:false,redistribution:'Icon files are excluded from this package/prepacked libraries. Full custom terms apply to selected user-local outputs.'}; }
  async function acquire(input={}) {
    if(!plain(input)||input.selected!==true||typeof input.outputDir!=='string'||!input.outputDir.trim()||Object.keys(input).some(k=>!['id','selected','outputDir','reuseDir'].includes(k)))fail('input','Use id, selected:true, new outputDir and optional existing reuseDir only');
    const selected=details({id:input.id}),out=resolve(input.outputDir);if(await realpath(dirname(out))!==dirname(out))fail('output','Output parent must exist and be canonical');
    try{await lstat(out);fail('EEXIST','Output already exists; no existing work replaced');}catch(error){if(error.code!=='ENOENT')throw error;}
    let png,terms,originAcquisitionMode,acquisitionMode;const requests=[];
    try {
    if(input.reuseDir!==undefined) {
      if(typeof input.reuseDir!=='string'||!input.reuseDir.trim())fail('input','reuseDir must name an existing owned export');
      const from=resolve(input.reuseDir),receipt=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(await local(join(from,'provenance.json'),65536)));
      if(receipt.schema!=='ingenium-user-local-png/1'||receipt.id!==input.id||receipt.source?.commit!==COMMIT||receipt.source?.path!==selected.path||!plain(receipt.files)||JSON.stringify(Object.keys(receipt.files).sort())!==JSON.stringify(['LICENSE.md','original.png','preview.html','source.json'].sort()))fail('reuse','Retained selected-output provenance mismatch');
      for(const[file,expected]of Object.entries(receipt.files)){if(!/^[a-f0-9]{64}$/.test(expected))fail('reuse','Retained artifact hash malformed');const b=await local(join(from,file),file==='original.png'?MAX_PNG:MAX_TERMS);if(sha(b)!==expected)fail('reuse','Retained artifact hash mismatch');if(file==='original.png')png=b;if(file==='LICENSE.md')terms=b;}
      originAcquisitionMode=receipt.acquisition?.originAcquisitionMode;
      if(!['live','fixture'].includes(originAcquisitionMode))fail('reuse','Retained original acquisition mode missing');acquisitionMode='offline-reuse';
    } else {
      if(!allowNetwork&&!transport)fail('network-disabled','Enable allowNetwork:true for selected acquisition or supply a retained reuseDir; discovery never fetches');
      async function get(url,maxBytes,kind) {
        const controller=new AbortController();let timer;const request={url,maxBytes,timeoutMs,redirect:'manual',signal:controller.signal};const observation={url,kind,mode,status:null};requests.push(observation);
        let response;try{response=await Promise.race([(transport??liveTransport)(request),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();const error=new Error('Selected request deadline exceeded');error.code='timeout';reject(error);},timeoutMs);})]);}catch(error){observation.errorCode=error.code??error.name??'transport-error';const e=new Error('Selected request failed; no retry or endpoint fallback: '+error.message);e.code='transport';e.requests=structuredClone(requests);throw e;}finally{clearTimeout(timer);}
        observation.status=response?.status;
        if(response?.url!==undefined&&response.url!==url)fail('redirect','Unexpected final URL; no redirect/fallback allowed');
        if(response?.status!==200){const error=new Error(`Selected request refused HTTP ${response?.status??'unknown'}; no retry or redirect fallback`);error.code='http-status';error.requests=structuredClone(requests);throw error;}
        if(!(response.body instanceof Uint8Array)||response.body.byteLength>maxBytes)fail('response-size','Transport must return bounded raw bytes');const body=Buffer.from(response.body);observation.bytes=body.length;observation.sha256=sha(body);return body;
      }
      terms=await get(BASE+TERMS.path,MAX_TERMS,'terms');
      if(terms.length!==TERMS.bytes||sha(terms)!==TERMS.sha256||blob(terms)!==TERMS.gitBlobSHA1)fail('terms-integrity','Exact pinned full custom terms mismatch');
      png=await get(selected.sourceURL,Math.min(MAX_PNG,selected.bytes),'selected-png');acquisitionMode=mode;originAcquisitionMode=mode;
    }
    if(terms.length!==TERMS.bytes||sha(terms)!==TERMS.sha256||blob(terms)!==TERMS.gitBlobSHA1)fail('terms-integrity','Exact pinned full custom terms mismatch');
    const identity=inspectPngBytes(png,{bytes:selected.bytes,gitBlobSHA1:selected.gitBlobSHA1});
    const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'"><title>${esc(selected.title)}</title><style>body{margin:24px;font-family:sans-serif}img{display:block;max-width:100%;width:384px;height:auto}p{max-width:60ch}</style><h1>${esc(selected.title)}</h1><img src="original.png" alt="${esc(selected.title)}"><p>Selected user-local Voxel PNG. Full custom terms: LICENSE.md. Not a redistributed asset pack.</p></html>\n`;
    const artifacts={'original.png':png,'LICENSE.md':terms,'source.json':JSON.stringify(selected,null,2)+'\n','preview.html':html};
    const provenance={schema:'ingenium-user-local-png/1',id:input.id,source:{repository:REPOSITORY,commit:COMMIT,path:selected.path,url:selected.sourceURL,expectedBytes:selected.bytes,expectedGitBlobSHA1:selected.gitBlobSHA1},image:identity,terms:{...TERMS,url:BASE+TERMS.path,licenseId:'LicenseRef-Voxel-Free-Icons',scope:constraint},acquisition:{mode:acquisitionMode,originAcquisitionMode,originMeaning:acquisitionMode==='offline-reuse'?'Origin mode is reported by a retained unverified receipt; this operation verifies pinned bytes without a new network claim.':mode==='fixture'?'Injected transport fixture, not live provider acquisition.':'Explicit immutable raw-host requests; Git blob/size and full terms hashes checked. Not signature verification or legal clearance.'},requests,files:Object.fromEntries(Object.entries(artifacts).map(([name,b])=>[name,sha(b)])),limits:['No artwork pixels shipped by this package; no bulk acquisition API.','Header/container and byte identity checks; browser/image decoding separate.','No editing/generation, package redistribution, physical/print qualification or user acceptance claim.','Trusted single owner; local path/byte bounds are practical controls, not a universal sandbox.']};
    await mkdir(out);for(const[name,b]of Object.entries(artifacts))await writeFile(join(out,name),b,{flag:'wx'});await writeFile(join(out,'provenance.json'),JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});
    return {status:'acquired',outputDir:out,previewPath:join(out,'preview.html'),...provenance};
    } catch(error) {if(!error.requests)error.requests=structuredClone(requests);throw error;}
  }
  return Object.freeze({capabilities,discover,search:discover,details,acquire});
}
