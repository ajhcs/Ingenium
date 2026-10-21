// Research helper authored for this study; never imports or runs upstream code.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(process.argv[2]??'upstream-skills/open-design');
const out=path.resolve('team-skills/research/skills');
fs.mkdirSync(out,{recursive:true});
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.name==='.git'?[]:e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const rel=p=>path.relative(root,p).replaceAll('\\','/');
const all=walk(root), skills=all.filter(p=>path.basename(p)==='SKILL.md');
const manifest=skills.map(p=>({path:rel(p),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bytes:fs.statSync(p).size,read_status:'inventoried-not-read',reader:'',evidence:''}));
const stubs=skills.filter(p=>rel(p).startsWith('skills/')&&fs.readFileSync(p,'utf8').includes('This catalogue entry advertises the skill'));
const normalizations=stubs.map(p=>{
 const text=fs.readFileSync(p,'utf8'), name=/^name: (.+)$/m.exec(text)?.[1].trim(),url=/^  upstream: "(.+)"/m.exec(text)?.[1];
 const fm=text.split('---')[1];
 const body=text.slice(text.indexOf('---',3)+3);
 const normalize=body.replaceAll(name,'NAME').replaceAll(url,'URL').replace(/(## What it does\s*)[\s\S]*?(\s*## Source)/,'$1DESCRIPTION$2').replace(/^- Category:.*$/m,'- Category: CATEGORY').replace(/^> Curated.*$/m,'> CURATION');
 const match=/(## What it does\s*)[\s\S]*?(\s*## Source)/.exec(body);
 const omitted=match[0].slice(match[1].length,match[0].length-match[2].length);
 const category=/^- Category:.*$/m.exec(body)?.[0]??'';
 const curation=/^> Curated.*$/m.exec(body)?.[0]??'';
 const reconstructed=normalize.replaceAll('NAME',name).replaceAll('URL',url).replace('DESCRIPTION',omitted).replace('- Category: CATEGORY',category).replace('> CURATION',curation);
 return {path:rel(p),name,url,frontmatter:fm,body,normalized:normalize,reconstructionExact:reconstructed===body};
});
const groups=Object.groupBy(normalizations,x=>x.normalized);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const log=JSON.parse(fs.readFileSync(path.join(out,'open-design-functional-read-log.json'),'utf8'));
const direct=new Set(log.full_body_direct_read.map(n=>`skills/${n}/SKILL.md`));
for(const row of manifest){
 if(direct.has(row.path)){row.read_status='full-body-read';row.reader=log.reader;row.evidence='open-design-functional-read-log.json';}
 if(normalizations.some(s=>s.path===row.path)){row.read_status='complete-normalized-template-and-variable-fields-read';row.reader=log.reader;row.evidence='open-design-stub-read-evidence.json';}
}
const extraFile=path.join(out,'open-design-extra-reader-mui/functional24-read-evidence.json');
const extra=fs.existsSync(extraFile)?JSON.parse(fs.readFileSync(extraFile,'utf8')).records:[];
for(const r of extra){const m=manifest.find(m=>m.path===r.path);if(!m||m.sha256!==r.sha256)throw Error(`Delegated source hash mismatch: ${r.path}`);Object.assign(m,{read_status:r.read_status,reader:r.reader,evidence:'open-design-extra-reader-mui/functional24-read-evidence.json'});}
// Keep metadata and hashes only: no copied upstream body or asset in deliverables.
fs.writeFileSync(path.join(out,'open-design-stub-read-evidence.json'),JSON.stringify({method:log.normalized_template_read,normalizer:'open-design-audit.mjs',reconstructionExactCount:normalizations.filter(m=>m.reconstructionExact).length,groups:Object.entries(groups).map(([body,members])=>({normalizedBodySha256:hash(body),paths:members.map(m=>m.path)})),entries:normalizations.map(m=>({path:m.path,fullTextSha256:hash(fs.readFileSync(path.join(root,m.path))),frontmatterSha256:hash(m.frontmatter),normalizedBodySha256:hash(m.normalized),reconstructionExact:m.reconstructionExact,curationLine:/^> Curated.*$/m.exec(m.body)?.[0]??null,whatItDoesEqualsDescription:(/## What it does\s*([\s\S]*?)(?=\n## Source)/.exec(m.body)?.[1]??'').replace(/\s+/g,' ').trim()===(/description: \|\s*([\s\S]*?)(?=\ntriggers:)/.exec(m.frontmatter)?.[1]??'').replace(/\s+/g,' ').trim()}))},null,2));
fs.writeFileSync(path.join(out,'open-design-inventory.json'),JSON.stringify(manifest,null,2));
const csv=rows=>[Object.keys(rows[0]).join(','),...rows.map(r=>Object.values(r).map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(','))].join('\n')+'\n';
fs.writeFileSync(path.join(out,'open-design-inventory.csv'),csv(manifest));
fs.writeFileSync(path.join(out,'open-design-functional-inventory.csv'),csv(manifest.filter(m=>m.path.startsWith('skills/'))));
const support=all.filter(p=>rel(p).startsWith('skills/')&&path.basename(p)!=='SKILL.md'&&(/\.(md|txt|py|mjs|js|ts|json|html|css|yaml|yml|sh)$/i.test(p)||/^(LICENSE|NOTICE|COPYING)$/.test(path.basename(p)))).map(p=>({path:rel(p),sha256:hash(fs.readFileSync(p)),bytes:fs.statSync(p).size,kind:/\/references\//.test(rel(p))?'reference':/\/scripts\//.test(rel(p))?'script-source':/LICENSE|NOTICE|COPYING/.test(path.basename(p))?'license-notice':'other-sidecar',read_status:log.references_full_read.includes(rel(p))?'full-read':'inventoried-not-read',executed:false}));
const ownLicenseReads=['skills/frontend-design/LICENSE.txt','skills/soft-skill/LICENSE','skills/web-clone/LICENSE'];
for(const m of support)if(ownLicenseReads.includes(m.path))m.read_status='full-read';
const extraSupportFile=path.join(out,'open-design-extra-reader-mui/support-inventory.json');
const extraSupport=fs.existsSync(extraSupportFile)?JSON.parse(fs.readFileSync(extraSupportFile,'utf8')):[];
for(const r of extraSupport){const m=support.find(m=>m.path===r.path);if(m&&m.sha256!==r.sha256)throw Error(`Support hash mismatch: ${r.path}`);if(m&&r.read_status==='full-semantic-read')m.read_status=r.read_status;}
fs.writeFileSync(path.join(out,'open-design-functional-support-inventory.csv'),csv(support));
const rules={
 'brand-extract':['candidate+duplicate+rejected','OD-F01;OD-F08;OD-F18','Measured reference evidence can support adaptation; do not import asset harvesting or rights shorthand.'],
 'brandkit':['candidate+duplicate+rejected','OD-F01;OD-F11;OD-F14','Reference quality/content split; collage overlap; fixed brand-world defaults remain contextual.'],
 'ecommerce-image-workflow':['candidate','OD-F03;OD-F06','Subject identity anchors, slot outputs and asynchronous readiness; provider dispatch/three-shot process rejected.'],
 'export-download-debugging':['candidate','OD-F04','Capture versus save failure localization.'],
 'od-next-media-inputs':['candidate','OD-F03','Slot preservation, capability reuse, causal recovery and collected terminal outputs.'],
 'pptx-html-fidelity-audit':['candidate+duplicate','OD-F05','Destination runtime/font fidelity; geometry alone already bounded by baseline.'],
 'reference-design-contract':['candidate','OD-F01','Keep/change/do-not-copy adaptation and concise handoff; no forced freeze/files.'],
 'research-decision-room':['candidate','OD-F02','Source/context/contradictions/next reversible experiment; no score or compulsory dashboard.'],
 'gpt-tasteskill':['rejected','OD-F13;OD-F14','Simulated execution, thought plans, aesthetic/animation mandates.'],
 'soft-skill':['rejected','OD-F13;OD-F14','Silent variance protocol and incompatible universal aesthetic constraints.'],
 'brutalist-skill':['rejected-as-global-workflow','OD-F14','Contextual visual recipe; no universal mechanical geometry/style.'],
 'minimalist-skill':['rejected-as-global-workflow','OD-F14','Contextual visual recipe; no universal font/icon/palette/border rule.'],
 'design-brief':['rejected+duplicate','OD-F16','Assumption disclosure overlaps; closed token grammar/default mapping rejected.'],
 'output-skill':['rejected','OD-F17','No universal production-critical/full-output protocol.'],
 'pr-feedback-quality-gate':['rejected-outside-scope','OD-F17','Repository review/monitoring policy does not belong in portable creative skill.'],
 'web-clone':['duplicate+rejected','OD-F08;OD-F18','Actual-source evidence useful but present; no mirror/harvesting or licensing shorthand.'],
 'library-curator':['duplicate','OD-F10','Metadata match versus semantic fit and actual returned paths already covered.'],
 'agent-browser':['duplicate+rejected','OD-F07;OD-F08;OD-F17','Actual state evidence already covered; no fixed browser/global installation/CDP lifecycle.'],
 'frontend-design':['duplicate+rejected','OD-F07;OD-F09;OD-F14','Intent, state and existing stack preservation overlap; blanket aesthetic defaults rejected.'],
 'impeccable-design-polish':['duplicate+rejected','OD-F09;OD-F14','Scoped polish overlaps prior baseline Impeccable integration; no style tell detector.'],
 'redesign-skill':['duplicate+rejected','OD-F07;OD-F09;OD-F14;OD-F15','Existing stack/state preservation overlaps; style bans/fabricated realism rejected.'],
 'web-design-guidelines':['duplicate','OD-F12','Pinned local reference principle; rules in sidecar not fully audited by this reader.'],
 'writing-guidelines':['duplicate','OD-F12','Pinned local reference principle; rules in sidecar not fully audited by this reader.'],
 'release-notes-one-pager':['duplicate+rejected','OD-F11;OD-F15','Template IA is contextual; unprovided breaking-change information cannot establish none.'],
 'social-reddit-card':['duplicate+rejected','OD-F11;OD-F15','Card styling contextual; fabricated identity/engagement must not appear observed.'],
 'social-spotify-card':['duplicate+rejected','OD-F11;OD-F15','Card styling contextual; default track duration must stay synthetic.']
};
const dispositions=manifest.filter(m=>m.path.startsWith('skills/')).map(m=>{
 const n=m.path.split('/')[1];
 let rule=rules[n]??['duplicate+contextual-recipe','OD-F07;OD-F11','Renderable template/configuration is a contextual example, not an additional generic method; preserve content and genuine interaction checks.'];
 if(normalizations.some(s=>s.path===m.path))rule=['discovery-metadata-only','OD-F10;OD-F12','Full upstream capability is not locally bundled; catalogue description is not evaluated behavior or OpenAI guidance.'];
 const er=extra.find(e=>e.path===m.path);
 if(er){
  const ids=n==='taste-skill'?'OD-F14;OD-F22':n==='taste-skill-v1'?'OD-F11;OD-F14':n==='oil-motion'?'OD-F19;OD-F20;OD-F21':n==='hatch-pet'||n.startsWith('image')||n==='stitch-skill'?'OD-F11;OD-F14':'OD-F19;OD-F21';
  rule=['delegated-complete-considered',ids,er.observation+' See exact analysis/limits in open-design-extra-reader-mui/FINDINGS.md.'];
 }
 if(n==='creative-director')rule=['catalogue-plus-local-orchestration','OD-F09;OD-F10;OD-F17','Custom local orchestration section read in full; staged resource selection mostly overlaps; full upstream methodologies not bundled.'];
 if(n==='ui-ux-pro-max')rule=['catalogue-plus-explicit-capability-limit','OD-F10','Custom current-scope section read in full; full CSV/search/template workflow explicitly not locally bundled.'];
 return {...m,disposition:rule[0],matrix_ids:rule[1],rationale:rule[2]};
});
fs.writeFileSync(path.join(out,'open-design-functional-dispositions.csv'),csv(dispositions));
console.log(JSON.stringify({skillCount:skills.length,uniqueHashes:new Set(manifest.map(m=>m.sha256)).size,functionalDirectFullBodies:direct.size,functionalDelegatedFullBodies:extra.length,stubCount:stubs.length,normalizedStubGroups:Object.keys(groups).length,functionalSupportFiles:support.length,functionalSupportRead:support.filter(m=>m.read_status!=='inventoried-not-read').length},null,2));
