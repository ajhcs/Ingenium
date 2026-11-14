import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {writeDelivery} from '../../src/delivery/index.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const entries=[
 ['notice','CSE-LICENSE.txt','text/plain','notice',[]],
 ['original','document/original.html','text/html','source',['css','figure-original','brief']],
 ['revised','document/revised.html','text/html','source',['css','figure-revised','brief']],
 ['css','document/style.css','text/css','source',[]],
 ['figure-original','document/figure-original.svg','image/svg+xml','source',[]],
 ['figure-revised','document/figure-revised.svg','image/svg+xml','source',[]],
 ['markdown','document/content.md','text/markdown','source',['figure-revised','brief']],
 ['brief','brief.json','application/json','source',[]],
 ['instructions','document/README.md','text/markdown','instructions',[]],
];
export async function bundleDocument(outputDir) {
 const artifacts=await Promise.all(entries.map(async ([id,path,mediaType,role,dependsOnIds])=>({id,path,mediaType,role,dependsOnIds,sha256:createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')})));
 return writeDelivery({root,outputDir,delivery:{schema:'ingenium-delivery/1',projectId:'field-station-document',versionId:'paragraph-figure-revision',openingFile:'document/revised.html',artifacts,tools:[],checks:[{id:'print-review',status:'not-run',scope:'PDF page bounds, extraction and print appearance',evidenceIds:[]}],limitations:['Original fictional study; no formal model or engineering acceptance.']}});
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(process.argv.length!==3){console.error('Usage: node examples/evolution/bundle-document.mjs NEW_OUTPUT_DIR');process.exitCode=2;} else console.log(JSON.stringify(await bundleDocument(resolve(process.argv[2])),null,2));}
