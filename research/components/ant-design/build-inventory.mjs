// Research-owned inventory helper. Reads pinned local Git files; executes no upstream code.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
if (!process.argv[2]) throw new Error('Usage: node build-inventory.mjs SOURCE_DIR');
const source = path.resolve(process.argv[2]);
const output = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const git = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();
const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
const commit = git('rev-parse','HEAD');
const blobIds = new Map(git('ls-files','-s').split('\n').map(line=>{const [meta,p]=line.split('\t'); return [p,meta.split(' ')[1]];}));
const semantic = new Set([
  'AGENTS.md','LICENSE','package.json','DESIGN.md',
  '.github/PULL_REQUEST_TEMPLATE.md','.github/PULL_REQUEST_TEMPLATE_CN.md',
  '.github/workflows/verify-package-version.yml',
  'scripts/check-version-md.ts','scripts/pre-publish.ts','scripts/check-repo.ts',
  'scripts/post-publish.ts','scripts/generate-version.ts','scripts/generate-component-changelog.ts',
  'docs/react/i18n.en-US.md','docs/react/design-md.en-US.md','docs/react/for-agents.en-US.md',
  'docs/react/customize-theme.en-US.md',
  'components/tooltip/index.en-US.md','components/switch/index.en-US.md',
  'components/tooltip/shared/sharedProps.en-US.md','components/tooltip/shared/sharedFAQ.en-US.md',
  ...['data-entry','data-display','copywriting','data-format','feedback','navigation','reaction','motion',
  'research-form','research-list','research-workbench','research-message-and-feedback'].map(x=>`docs/spec/${x}.en-US.md`),
]);
const textOnly = new Set(['alignment','buttons','colors','contrast','dark','direct','font','layout',
  'proximity','repetition','stay','transition','invitation'].map(x=>`docs/spec/${x}.en-US.md`));
const skills = tracked.filter(p=>p.endsWith('/SKILL.md'));
const skillRefs = tracked.filter(p=>/^\.agents\/skills\/[^/]+\/references\//.test(p));
for(const p of [...skills,...skillRefs,'public/.well-known/agent-skills/index.json']) semantic.add(p);
const corpora = new Set(['CHANGELOG.en-US.md','CHANGELOG.zh-CN.md','BUG_VERSIONS.json']);
const selected = tracked.filter(p=>semantic.has(p)||textOnly.has(p)||corpora.has(p)||
 /^docs\/(spec|react)\/.*\.md$/.test(p)||/^components\/[^/]+\/index\.(en-US|zh-CN)\.md$/.test(p));
const rows = selected.map(p=>{
 const bytes=fs.readFileSync(path.join(source,p));
 const status=semantic.has(p)?'read-full-source-text':textOnly.has(p)?'read-prose-media-lines-omitted':'catalogued-not-semantic-read';
 return {path:p,gitBlob:blobIds.get(p),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
 category:skills.includes(p)?'actual-skill':skillRefs.includes(p)?'skill-local-reference':
 p.startsWith('docs/spec/')?'design-document':p.startsWith('docs/react/')?'integration-document':
 p.startsWith('components/')?'component-document':corpora.has(p)?'task-input-corpus':'operational-or-license',
 readStatus:status,url:`https://github.com/ant-design/ant-design/blob/${commit}/${p}`};
});
const aliases=['.claude/skills','.cursor/skills'].map(p=>({path:p,gitBlob:git('rev-parse',`HEAD:${p}`),
 target:git('show',`HEAD:${p}`),readStatus:'resolved-alias-not-extra-skills'}));
const metadata={schema:'ingenium-research-source-inventory/1',repository:'ant-design/ant-design',
 commit,commitTime:git('log','-1','--format=%cI'),branch:git('branch','--show-current'),
 acquired:'2026-10-21',acquisition:'authorized shallow git clone, no upstream execution',
 totalTrackedFiles:tracked.length,actualSkills:skills.length,skillLocalReferences:skillRefs.length,
 actualSkillsPaths:skills,aliases,
 selectedDocumentationPolicy:'All Markdown under docs/spec and docs/react, all component-level bilingual index docs; plus exact skill/local-reference closure and selected operational, rights and component shared files.',
 exclusions:'Implementation, test/demo source, blog archive, images/video/fonts/binaries not semantically reviewed wholesale. English design/API docs selected; Chinese docs catalogued unless an actual skill/ref.',
 counts:{inventory:rows.length,byStatus:Object.fromEntries([...new Set(rows.map(r=>r.readStatus))].map(s=>[s,rows.filter(r=>r.readStatus===s).length])),byCategory:Object.fromEntries([...new Set(rows.map(r=>r.category))].map(s=>[s,rows.filter(r=>r.category===s).length]))},files:rows};
fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({commit:metadata.commit,...metadata.counts}));
