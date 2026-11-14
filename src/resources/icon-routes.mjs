/** Metadata-only task routes into the shipped icon APIs. No SVG parsing or export on discovery. */
export const iconSourceIds=['ionicons','minimal-icons','lobe-icons','remixicon-apache','remixicon-current','simple-icons','tabler'];
export function iconRoute(id,assetId){
 const tabler=id==='tabler';return {module:'src/resources/index.mjs',factory:'openResourceLibrary',options:{id},optionalSelectors:tabler?['parserDir','iconUtilsDir']:['parserDir'],reference:tabler?'skills/ingenium/references/catalog.md':'skills/ingenium/references/svg-packs.md',search:{query:assetId??'',limit:4},...(assetId?{[tabler?'acquire':'inspect']:tabler?{sourceId:id,name:assetId,selected:true,outputDir:'NEW_OUTPUT_DIRECTORY'}:{id:assetId},...(!tabler?{acquire:{id:assetId,selected:true,outputDir:'NEW_OUTPUT_DIRECTORY'}}:{})}:{}),limits:'Metadata route only. Select an existing optional parser (and Tabler utils) for admission/acquisition. Individual unsupported or unavailable sources may refuse; no network or catalog-wide export.'};
}
export async function iconMetadata(id,query=''){
 const {openResourceLibrary,discoverResources}=await import('./index.mjs');
 const p=(await discoverResources()).providers.find(p=>p.id===id),lib=await openResourceLibrary({id});const entries=[];
 for(let offset=0;;){const page=await lib.search({query,offset,limit:32});entries.push(...(page.entries??page.results).map(e=>({...e,id:e.id??e.name,title:e.title??e.name})));if(page.nextOffset===null)break;offset=page.nextOffset;}
 return {p,entries};
}
