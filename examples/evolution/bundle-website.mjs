import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {writeDelivery} from '../../src/delivery/index.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const entries=[
 ['notice','CSE-LICENSE.txt','text/plain','notice',[]],
 ['home','website/index.html','text/html','source',['home','css','study','resources','about']],
 ['study','website/study.html','text/html','source',['study','css','home','resources','about','figure']],
 ['resources','website/resources.html','text/html','source',['resources','css','home','study','about','figure','doc']],
 ['about','website/about.html','text/html','source',['about','css','home','study','resources']],
 ['css','website/style.css','text/css','source',[]],
 ['figure','website/overview.svg','image/svg+xml','source',[]],
 ['doc','document/revised.html','text/html','source',['doccss','docfigure','brief']],
 ['doccss','document/style.css','text/css','source',[]],
 ['docfigure','document/figure-revised.svg','image/svg+xml','source',[]],
 ['brief','brief.json','application/json','source',[]],
 ['instructions','website/README.md','text/markdown','instructions',[]],
];
export async function bundleWebsite(outputDir) {
 const artifacts=await Promise.all(entries.map(async ([id,path,mediaType,role,dependsOnIds])=>({id,path,mediaType,role,dependsOnIds,sha256:createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')})));
 return writeDelivery({root,outputDir,delivery:{schema:'ingenium-delivery/1',projectId:'field-station-site',versionId:'content-revision',openingFile:'website/index.html',artifacts,tools:[],checks:[{id:'behavior',status:'not-run',scope:'Browser behavior and accessibility',evidenceIds:[]}],limitations:['Original fictional study; no engineering acceptance or cross-browser claim.']}});
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(process.argv.length!==3){console.error('Usage: node examples/evolution/bundle-website.mjs NEW_OUTPUT_DIR');process.exitCode=2;} else console.log(JSON.stringify(await bundleWebsite(resolve(process.argv[2])),null,2));}
