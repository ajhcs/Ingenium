/** Offline paged metadata over explicitly supplied local packages; no provider/network discovery. */
import { readFile, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createPackageLibrary } from '../assets/packages.mjs';
import { createItemLibrary } from '../items/index.mjs';
import { prepareItemSource } from '../../tools/prepare-item-source.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const word = x => typeof x === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x) && x.length <= 100;
const plain = x => x && Object.getPrototypeOf(x) === Object.prototype;
const fail = message => { throw new Error(message); };
const FLUENT = Object.freeze({ 'package.json': 'edd1c1733a6668b82b3ca57c661328cd9d3542e364f303fafad4bac3cb7a7dd2', 'info.json': '9cd2f13e7039b1d1eeeef92af63b07701ba1b242aadc3c0957eae9c98dca7771', 'icons.json': 'f5f4cf457c0db2ad5a2e42e033e02e0c87d10e43d0164cfffb3bb84914970a63' });
const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
async function bytes(path, max, expected) {
  const p = resolve(path), stat = await lstat(p);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > max || await realpath(p) !== p) fail('Expected bounded canonical regular local catalog file');
  const b = await readFile(p);
  if (b.length > max || (expected && hash(b) !== expected)) fail('Catalog source hash mismatch or byte bound exceeded');
  return b;
}
async function json(path, max, expected) { const raw = await bytes(path,max,expected); return { raw, value: JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw)) }; }
function strings(value, max = 64) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max || value.some(x=>typeof x !== 'string' || x.length > 128)) fail('Unsupported source metadata text list');
  return [...value];
}
function metadata(meta, kind) {
  if (!plain(meta) || (meta.version !== undefined && (typeof meta.version !== 'string' || meta.version.length > 128))) fail('Unsupported source metadata/version label');
  const category = meta.category ?? null;
  if (category !== null && (typeof category !== 'string' || category.length > 128)) fail('Unsupported source category');
  const result = { category, tags: strings(meta.tags), meaning: 'Source-supplied package metadata; collection labels apply to the collection, not independently tagged individual artwork.' };
  if (kind === 'font') {
    if (typeof meta.family !== 'string' || !meta.family.trim() || meta.family.length > 128) fail('Font family metadata missing or oversized');
    if (!Array.isArray(meta.weights) || meta.weights.length > 64 || meta.weights.some(w=>!Number.isInteger(w)||w<1||w>1000)) fail('Unsupported font weight metadata');
    Object.assign(result,{ family: meta.family, weights:[...meta.weights], styles:strings(meta.styles), subsets:strings(meta.subsets), metadataVersionLabel:meta.version ?? null, meaning:'Source family metadata; advertised weights/styles/subsets are not proof every corresponding CSS face or binary is present. Inspect an actual CSS file before acquisition.' });
  }
  return result;
}
function setNames(set, prefix, cap) {
  if (set.prefix !== prefix || !plain(set.icons) || !plain(set.aliases ?? {})) fail('Unsupported collection identity/structure');
  const names = Object.keys(set.icons), aliases = Object.keys(set.aliases ?? {});
  if (names.length > cap || aliases.length > cap || aliases.some(n=>Object.hasOwn(set.icons,n)) || [...names,...aliases].some(n=>!word(n))) fail('Unsupported collection name/count');
  return [...names.map(name=>({name,alias:false})),...aliases.map(name=>({name,alias:true}))].sort((a,b)=>a.name.localeCompare(b.name,'en'));
}
function selection(input) {
  if (!plain(input) || !word(input.sourceId)) fail('Supply an explicit sourceId');
}
/** sources use the existing package-library config. fluent is one exact supported raw package. */
export function createResourceCatalog({ sources = [], parserDir, iconUtilsDir, fluent } = {}) {
  if (!Array.isArray(sources) || sources.length > 8 || (!sources.length && !fluent)) fail('Supply1..8 explicit package sources and/or one Fluent source');
  const configured = structuredClone(sources), library = sources.length ? createPackageLibrary({sources:configured,parserDir,iconUtilsDir}) : null;
  let f;
  if (fluent !== undefined) {
    if (!plain(fluent) || !word(fluent.id ?? 'fluent') || typeof fluent.packageDir !== 'string' || !fluent.packageDir.trim()) fail('Fluent catalog requires explicit packageDir and safe optional id');
    f = { ...structuredClone(fluent), id: fluent.id ?? 'fluent' };
    if (configured.some(s=>s.id===f.id)) fail('Source IDs must be unique including Fluent');
  }
  async function load(sourceId) {
    const source = configured.find(s=>s.id===sourceId);
    if (!source && sourceId !== f?.id) fail('Unknown catalog sourceId');
    const isFluent = !source, config = isFluent ? f : source, root = resolve(config.packageDir), kind = isFluent ? 'illustration' : source.kind;
    const pkg = await json(join(root,'package.json'),1048576,isFluent ? FLUENT['package.json'] : undefined);
    const pattern = kind==='font' ? /^@fontsource(?:-variable)?\/[a-z0-9-]+$/ : /^@iconify-json\/[a-z0-9-]+$/;
    if (!pattern.test(pkg.value.name ?? '') || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(pkg.value.version ?? '')) fail('Unsupported local package identity');
    const metaName = kind==='font'?'metadata.json':'info.json', meta = await json(join(root,metaName),1048576,isFluent ? FLUENT[metaName] : undefined), supplied = metadata(meta.value,kind);
    const identity = { sourceId,kind,packageName:pkg.value.name,packageVersion:pkg.value.version,packageJSONSHA256:hash(pkg.raw),metadataFile:metaName,metadataSHA256:hash(meta.raw),metadataVersionLabel:meta.value.version ?? null,registryMeaning:'Local byte identity only; retained registry acquisition receipts are separate evidence.' };
    if (kind==='font') return { identity,meta:supplied,records:[{...identity,name:supplied.family,family:supplied.family,alias:false,sourceMetadata:supplied,inferred:{nameTokens:sourceId.split('-'),meaning:'Inferred from configured sourceId spelling; not source semantic/style tags.'},selection:{sourceId},cssSelection:'Use an actual CSS file from this explicitly supplied package; inspect parses its real faces.'}] };
    const icons = await json(join(root,'icons.json'),isFluent?10_000_000:5_000_000,isFluent?FLUENT['icons.json']:undefined);
    const names = setNames(icons.value,meta.value.prefix,isFluent?4000:20000);
    const records = names.map(({name,alias})=>({...identity,name,alias,prefix:icons.value.prefix,sourceMetadata:supplied,inferred:{nameTokens:name.split('-'),meaning:'Inferred hyphen-separated name tokens only; not source-supplied semantic tags.'},selection:{sourceId,name}}));
    return {identity:{...identity,collectionJSONSHA256:hash(icons.raw),actualNamedIcons:Object.keys(icons.value.icons).length,actualAliases:Object.keys(icons.value.aliases??{}).length,declaredTotal:meta.value.total ?? null,totalMeaning:'Actual JSON keys are catalog counts; metadata declaredTotal may differ. No listed SVG is admitted by metadata discovery.'},meta:supplied,records};
  }
  async function states() {
    return Promise.all([...configured.map(s=>s.id),...(f?[f.id]:[])].map(async id=>{try {const x=await load(id);return {...x.identity,state:'local',records:x.records};}catch(error){return {sourceId:id,state:error.code==='ENOENT'?'acquisition-required':'error',reason:error.message,records:[]};}}));
  }
  async function capabilities() { return {mode:'explicit-offline-package-catalog',sources:(await states()).map(({records,...state})=>state),limits:['Metadata browsing does not execute upstream code or admit all SVGs.','Only selected assets pass existing source/right/admission helpers.','No network, installation, remote provider discovery or inferred visual/taste ranking.']}; }
  async function search({kind,sourceId,query='',offset=0,limit=24,filters={}}={}) {
    if ((kind!==undefined && !['font','symbol','illustration'].includes(kind)) || (sourceId!==undefined && !word(sourceId)) || typeof query!=='string' || query.length>128 || !Number.isSafeInteger(offset) || offset<0 || offset>100000 || !Number.isSafeInteger(limit) || limit<1 || limit>64 || !plain(filters)) fail('Use bounded query, source/kind, offset0..100000 and limit1..64');
    const allowed=['category','sourceTags','inferredNameTokens','weight','style','subset','alias','namePrefix'];
    if (Object.keys(filters).some(k=>!allowed.includes(k))) fail('Unknown catalog filter');
    for (const key of ['category','style','subset','namePrefix']) if (filters[key]!==undefined && (typeof filters[key]!=='string'||filters[key].length>128)) fail('Catalog text filter must be bounded');
    for (const key of ['sourceTags','inferredNameTokens']) if (filters[key]!==undefined) {const v=strings(filters[key],16);if(v.some(x=>!x.trim()))fail('Empty catalog filter token');}
    if (filters.weight!==undefined && (!Number.isInteger(filters.weight)||filters.weight<1||filters.weight>1000)) fail('Weight filter1..1000 integer');
    if (filters.alias!==undefined && typeof filters.alias!=='boolean') fail('Alias filter must be boolean');
    const all=await states();if(sourceId!==undefined&&!all.some(s=>s.sourceId===sourceId))fail('Unknown catalog sourceId');
    let records=all.flatMap(s=>s.records);if(records.length>100000)fail('Combined catalog exceeds100000 records');
    const lower=x=>x.toLowerCase(),matches=(list,required)=>required===undefined||required.every(x=>list.some(y=>lower(y)===lower(x)));
    records=records.filter(r=>(!kind||kind===r.kind)&&(!sourceId||sourceId===r.sourceId)&&`${r.sourceId} ${r.name}`.toLowerCase().includes(query.toLowerCase())&&(filters.category===undefined||lower(r.sourceMetadata.category??'')===lower(filters.category))&&matches(r.sourceMetadata.tags,filters.sourceTags)&&matches(r.inferred.nameTokens,filters.inferredNameTokens)&&(filters.weight===undefined||r.sourceMetadata.weights?.includes(filters.weight))&&(filters.style===undefined||r.sourceMetadata.styles?.includes(filters.style))&&(filters.subset===undefined||r.sourceMetadata.subsets?.includes(filters.subset))&&(filters.alias===undefined||r.alias===filters.alias)&&(filters.namePrefix===undefined||r.name.startsWith(filters.namePrefix.toLowerCase()))).sort((a,b)=>a.sourceId.localeCompare(b.sourceId,'en')||a.name.localeCompare(b.name,'en'));
    return {mode:'offline-metadata-only',query,filters:structuredClone(filters),total:records.length,offset,limit,nextOffset:offset+limit<records.length?offset+limit:null,results:structuredClone(records.slice(offset,offset+limit)),sources:all.map(({records,...s})=>s),admission:'not-run; selected inspect/preview/acquire may refuse individual assets',ranking:'Stable sourceId/name order; no aesthetic or semantic relevance scoring'};
  }
  async function selectedRecord(input) {
    selection(input);const loaded=await load(input.sourceId);
    if (loaded.identity.kind==='font')return {loaded,record:loaded.records[0]};
    if (!word(input.name)) fail('Select an actual bounded catalog name');
    const record=loaded.records.find(r=>r.name===input.name);if(!record)fail('Selected catalog name absent');return {loaded,record};
  }
  async function prepareFluent(input, outputDir) {
    if (input.selected!==true)fail('Explicit selected:true required for Fluent preparation');
    const {record}=await selectedRecord(input);
    if(record.kind!=='illustration')fail('Fluent preparation requires illustration source');
    return prepareItemSource({source:'fluent',assetId:input.name,title:input.name,packageDir:f.packageDir,utilsDir:f.utilsDir??iconUtilsDir,rightsEvidenceFile:f.rightsEvidenceFile,rightsEvidenceSHA256:f.rightsEvidenceSHA256,rightsScope:f.rightsScope,rightsCommit:f.rightsCommit,parserDir,outputDir});
  }
  async function inspect(input={}) {
    const {loaded,record}=await selectedRecord(input);
    if(record.kind==='font')return {...record,detail:await library.details(input),admission:'Parsed selected CSS faces; binary/right validation occurs on explicit acquisition.'};
    if(record.kind==='symbol') {
      if(input.selected!==true || typeof input.preparationDir!=='string' || !input.preparationDir.trim())fail('Selected symbol inspect requires selected:true and new explicit preparationDir');
      const detail=await library.acquire({...input,outputDir:input.preparationDir});
      return {...record,detail,previewSVG:(await bytes(join(input.preparationDir,input.customize!==undefined?'derived.svg':'safe.svg'),524288)).toString('utf8'),admission:'Selected resolved SVG admitted by existing static-icon policy; not a bulk catalog claim.'};
    }
    if(typeof input.preparationDir!=='string'||!input.preparationDir.trim())fail('Selected illustration inspect requires new explicit preparationDir and selected:true');
    const prepared=await prepareFluent(input,input.preparationDir),items=createItemLibrary({sources:[prepared.manifestPath],parserDir});
    return {...record,preparation:prepared,detail:await items.inspect({sourceId:'fluent',assetId:input.name}),admission:'Selected original SVG admitted by existing static-icon policy; not a bulk catalog claim.'};
  }
  async function acquire(input={}) {
    if(input.selected!==true||typeof input.outputDir!=='string'||!input.outputDir.trim())fail('Explicit selected:true and new outputDir required');
    const {record}=await selectedRecord(input);
    const allowed=['sourceId','selected','outputDir',...(record.kind==='font'?['cssFile','faceIndex']:record.kind==='symbol'?['name','customize']:['name','recolor','background'])];
    if(Object.keys(input).some(key=>!allowed.includes(key)))fail('Unsupported selected acquisition option for this catalog kind');
    let result,previewPath;
    if(record.kind==='illustration') {
      const out=resolve(input.outputDir);if(await realpath(dirname(out))!==dirname(out))fail('Output parent must exist and be canonical');await mkdir(out);
      const prepared=await prepareFluent(input,join(out,'source')),items=createItemLibrary({sources:[prepared.manifestPath],parserDir});
      result=await items.acquire({sourceId:'fluent',assetId:input.name,selected:true,outputDir:join(out,'asset'),...(input.recolor!==undefined?{recolor:input.recolor}:{}),...(input.background!==undefined?{background:input.background}:{})});
      previewPath=join(out,'asset','preview.html');result={...result,outputDir:out,preparation:prepared};
    } else {
      result=await library.acquire(input);const out=resolve(input.outputDir);
      const html=record.kind==='font'?`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'none'"><link rel="stylesheet" href="font.css"><style>body{margin:32px}p{font-family:'${escape(result.face.family)}';font-style:${result.face.style};font-weight:${result.face.weight};font-size:32px}</style><h1>${escape(record.family)}</h1><p>Selected font face preview 0123456789</p>`:`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; base-uri 'none'"><title>Selected symbol</title><img src="${input.customize!==undefined?'derived.svg':'safe.svg'}" width="128" height="128" alt="${escape(input.name)}">`;
      previewPath=join(out,'catalog-preview.html');await writeFile(previewPath,html,{flag:'wx'});
    }
    const receipt={schema:'ingenium-catalog-selection/1',selection:record.selection,kind:record.kind,metadataMeaning:'Catalog presence is separate from selected source/admission/rights evidence in delegated provenance.',previewSHA256:hash(await readFile(previewPath)),previewFile:record.kind==='illustration'?'asset/preview.html':'catalog-preview.html'};
    await writeFile(join(result.outputDir,'catalog-selection.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    return {...result,previewPath,catalog:receipt};
  }
  return Object.freeze({capabilities,search,inspect,acquire,preview:acquire});
}
