/** Adapter for the six original finite texture constructors; no optional tools. */
import {discoverTextures,createTexture,customizeTexture,writeTexture} from '../textures/index.mjs';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export const textureEntries=query=>discoverTextures({query});
export const inspectTaskTexture=id=>createTexture({id});
export async function acquireTaskTexture({id,originalSHA256,outputDir,controls}={}){
 const source=createTexture({id});if(source.sha256!==originalSHA256)throw new Error('Texture selected source hash changed');
 const texture=controls===undefined?source:customizeTexture(source,controls);
 await writeTexture({source,texture,outputDir});
 await writeFile(join(outputDir,'CONTINUE.md'),'Open preview.html. Current editable parameters are in source.json; original.json and original.svg retain the source. Use createTexture(current.parameters), customizeTexture(current, changes), and writeTexture({source: current, texture: changed, outputDir}) from src/textures/index.mjs for a next narrow edit. Preserve LICENSE.txt. Digital geometry carries no physical-material meaning.\n',{flag:'wx'});
}
