/** Explicit offline preparation for two supported item sources; Node >=22. */
import { readFile, lstat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validateIconSvg } from '../src/assets/svg.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
const digest = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const commit = x => typeof x === 'string' && /^[a-f0-9]{40}$/.test(x);
const id = x => typeof x === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x) && x.length <= 100;
const refuse = message => { throw new Error(message); };
const FLUENT = {
 'package.json': 'edd1c1733a6668b82b3ca57c661328cd9d3542e364f303fafad4bac3cb7a7dd2',
 'info.json': '9cd2f13e7039b1d1eeeef92af63b07701ba1b242aadc3c0957eae9c98dca7771',
 'icons.json': 'f5f4cf457c0db2ad5a2e42e033e02e0c87d10e43d0164cfffb3bb84914970a63'
};
const UTILS = {
  "lib/icon-set/get-icon.js": "a7d7d02e0e4384ab9fd9d64a2687b4044881525f91d028ab90e8286db4175c9b",
  "lib/icon/merge.js": "fc55e8894434e20fbf33b612d7b6674e5914ed021c1c34e408888d992242d7fa",
  "lib/icon/defaults.js": "885e3eac276eb7a330c66572d1dc9405d13bb89c3243e3058f1510610f8292ca",
  "lib/icon/transformations.js": "7a88612624b114f4d70e0cd4702450e9e85dacdcb7763275829701b471545c50",
  "lib/icon-set/tree.js": "07028a9b82768c7a99dcfeb8470efd9757c77208b67fbbf5ed08b0eb61b9c994",
  "lib/svg/build.js": "c7161aabbab6a20bd75958fd5e0823fb44a0b403d915253f0b1615f82fd5f825",
  "lib/customisations/defaults.js": "3db38d9ab4839f4aaa71409104c3f47acabeeddb141bef09b1d83ddb43aad128",
  "lib/svg/size.js": "9a4d755bb53fa929f949b36035c4fdbaebf7f791046f1855d0cb59d2b1faec97",
  "lib/svg/defs.js": "a80bff8c3baab92480639a8ff04d029f81c8e0e108fe7e7afaf41a8ca8c23aef",
  "lib/svg/html.js": "cfa250aa10c3c2d9da5288e69bba29859b2b94088b72db906823afb15a4babe8",
  "package.json": "2235aa624bf2b71beb98529fcf354bbaa6b156c68c7da9214a77c7b26369b499"
};
async function bytes(path, max, expected) {
 if (typeof path !== 'string' || !path.trim()) refuse('Explicit local file path required');
 const p = resolve(path), stat = await lstat(p);
 if (!stat.isFile() || stat.isSymbolicLink() || stat.size > max || await realpath(p) !== p) refuse('Expected bounded canonical regular local file');
 const b = await readFile(p);
 if (b.length > max || (expected !== undefined && (!digest(expected) || sha(b) !== expected))) refuse('Source/evidence SHA256 mismatch or exceeded bound');
 return b;
}
function sourceOptions(c) {
 if (!c || !['fluent', 'hero'].includes(c.source) || !id(c.assetId) || typeof c.title !== 'string' || !c.title.trim() || c.title.length > 128) refuse('Use fluent/hero source, bounded assetId and title');
 const keys = ['source','assetId','title','rightsEvidenceFile','rightsEvidenceSHA256','rightsScope','outputDir','parserDir', ...(c.source === 'fluent' ? ['packageDir','utilsDir','rightsCommit'] : ['svgFile','svgSHA256','sourceCommit'])];
 if (Object.keys(c).some(k => !keys.includes(k))) refuse('Unsupported preparation option');
 if (!digest(c.rightsEvidenceSHA256) || typeof c.rightsScope !== 'string' || !c.rightsScope.trim() || c.rightsScope.length > 650) refuse('Explicit retained rights evidence SHA256 and bounded scope required');
 if (c.source === 'hero' && (!digest(c.svgSHA256) || !commit(c.sourceCommit))) refuse('Hero requires exact SVG SHA256 and full sourceCommit; no release inferred');
 if (c.source === 'fluent' && (!commit(c.rightsCommit) || ![c.packageDir,c.utilsDir].every(x=>typeof x==='string' && x.trim()))) refuse('Fluent requires exact local packageDir, utilsDir and rightsCommit');
 if (typeof c.outputDir !== 'string' || !c.outputDir.trim()) refuse('New explicit outputDir required');
}
/** Does not fetch, install, infer rights or treat caller origin claims as verified origin. */
export async function prepareItemSource(config) {
 sourceOptions(config); const c = structuredClone(config);
 const evidence = await bytes(c.rightsEvidenceFile,65536,c.rightsEvidenceSHA256);
 if (evidence.length < 100) refuse('Retain substantive rights evidence (100..65536 bytes)');
 let svg, manifest, inputs = { rightsEvidenceSHA256:sha(evidence) };
 const originScope = ' Local bytes verified; caller supplies origin and scope. No network origin, legal sufficiency or release binding inferred.';
 if (c.source === 'hero') {
  svg = await bytes(c.svgFile,524288,c.svgSHA256);
  manifest = {schema:'ingenium-items/1',id:'hero',kind:'texture',title:'Hero Patterns selected editable tile',sourceURL:'https://heropatterns.com/',version:`git:${c.sourceCommit}`,rights:{license:'CC-BY-4.0',author:'Steve Schoger',licenseURL:'https://creativecommons.org/licenses/by/4.0/',evidenceURL:'https://heropatterns.com/',evidenceFile:'rights-evidence.txt',evidenceSHA256:sha(evidence),scope:c.rightsScope+originScope},assets:[{id:c.assetId,title:c.title,file:'original.svg',sha256:sha(svg),sourceURL:`https://raw.githubusercontent.com/sschoger/hero-patterns/${c.sourceCommit}/svg/${c.assetId}.svg`,sourceNote:'Explicit local original SVG and caller-supplied commit/path binding. Byte SHA256 checked against supplied digest. No release version or downloaded legalcode inferred.'}]};
  inputs = {...inputs,svgSHA256:sha(svg),sourceCommit:c.sourceCommit};
 } else {
  const raw = {};
  for (const [name,expected] of Object.entries(FLUENT)) raw[name] = await bytes(join(c.packageDir,name),name==='icons.json'?10000000:65536,expected);
  const pkg = JSON.parse(raw['package.json']), info = JSON.parse(raw['info.json']), set = JSON.parse(raw['icons.json']);
  if (pkg.name !== '@iconify-json/fluent-emoji-flat' || pkg.version !== '1.2.6' || pkg.license !== 'MIT' || info.license.spdx !== 'MIT') refuse('Unsupported Fluent package identity/rights');
  // Exact helper closure hashes verified before any import, including its package scope.
  for (const [name,expected] of Object.entries(UTILS)) await bytes(join(c.utilsDir,name),65536,expected);
  const { getIconData } = await import(pathToFileURL(resolve(c.utilsDir,'lib/icon-set/get-icon.js')).href);
  const { iconToSVG } = await import(pathToFileURL(resolve(c.utilsDir,'lib/svg/build.js')).href);
  const { iconToHTML } = await import(pathToFileURL(resolve(c.utilsDir,'lib/svg/html.js')).href);
  if (!Object.hasOwn(set.icons,c.assetId) && !Object.hasOwn(set.aliases??{},c.assetId)) refuse('Selected Fluent asset absent');
  const icon = getIconData(set,c.assetId); if (!icon) refuse('Unable to resolve selected Fluent asset');
  const built = iconToSVG(icon,{width:32,height:32}); svg = Buffer.from(iconToHTML(built.body,built.attributes));
  inputs = {...inputs,packageFiles:{...FLUENT},utils:{name:'@iconify/utils',version:'3.1.7',files:{...UTILS}},rightsCommit:c.rightsCommit};
  manifest = {schema:'ingenium-items/1',id:'fluent',kind:'illustration',title:'Fluent Emoji Flat selected illustration',sourceURL:info.author.url,version:`${pkg.name}@${pkg.version}`,rights:{license:'MIT',author:info.author.name,licenseURL:info.license.url,evidenceURL:`https://raw.githubusercontent.com/microsoft/fluentui-emoji/${c.rightsCommit}/LICENSE`,evidenceFile:'rights-evidence.txt',evidenceSHA256:sha(evidence),scope:c.rightsScope+originScope},assets:[{id:c.assetId,title:c.title,file:'original.svg',sha256:sha(svg),sourceURL:`https://www.npmjs.com/package/${pkg.name}/v/${pkg.version}`,sourceNote:`Helper-generated SVG from exact package icons.json SHA256=${FLUENT['icons.json']} via pinned @iconify/utils3.1.7 getIconData/iconToSVG/iconToHTML. Upstream release unknown; rights snapshot commit is not package-to-release binding.`}]};
 }
 validateIconSvg(svg,{parserDir:c.parserDir}); // static admission only; original remains unchanged
 const artifacts = {'original.svg':svg,'rights-evidence.txt':evidence,'manifest.json':JSON.stringify(manifest,null,2)+'\n'};
 const receipt = {schema:'ingenium-item-preparation/1',source:c.source,assetId:c.assetId,mode:'offline-local-preparation',networkRequests:0,originMeaning:'Pinned package/helper bytes where applicable; explicit caller-supplied file/commit/rights origin remains unverified. Registry acquisition and legal proof are separate.',inputs,files:Object.fromEntries(Object.entries(artifacts).map(([k,v])=>[k,{bytes:Buffer.byteLength(v),sha256:sha(v)}]))};
 const out = resolve(c.outputDir); if (await realpath(dirname(out)) !== dirname(out)) refuse('Output parent must exist without symlink ancestors');
 await mkdir(out); // exclusive new directory; refuse rather than replace
 for (const [name,data] of Object.entries(artifacts)) await writeFile(join(out,name),data,{flag:'wx'});
 await writeFile(join(out,'preparation.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return {status:'prepared',manifestPath:join(out,'manifest.json'),...receipt};
}
export async function runPreparationCli(args = process.argv.slice(2)) {
 if (args.length !== 1) refuse('Usage: node tools/prepare-item-source.mjs CONFIG.json (explicit local source, no network)');
 const raw = await bytes(args[0],65536); const config = JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));
 return prepareItemSource(config);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
 runPreparationCli().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
