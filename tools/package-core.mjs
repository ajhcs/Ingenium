import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stageFiles, sourceBytes } from './release-files.mjs';
import { companionFiles } from './package-companion.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const coreFiles=Object.freeze([...new Set([
  ...companionFiles, 'bin/ingenium.mjs', 'src/cli/continuation.mjs', 'package.json', 'plugin.json', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'THIRD_PARTY.json',
  'src/assets/cache.mjs','src/assets/index.mjs','src/assets/packages.mjs','src/assets/svg.mjs','src/assets/transport.mjs',
  'src/catalog/brand-download.mjs','src/catalog/font-download.mjs','src/catalog/font-packs.mjs','src/catalog/index.mjs','src/catalog/local-assets.mjs','src/catalog/svg-packs.mjs',
  'src/delivery/index.mjs','src/delivery/schema.mjs','src/delivery/dependencies.mjs','src/font-vector/index.mjs','src/items/index.mjs','src/layout/index.mjs','src/materials/index.mjs','src/palettes/index.mjs',
  'src/project-state/index.mjs','src/project-state/schema.mjs','src/project-state/files.mjs','src/project-state/store.mjs','src/project-state/diff.mjs',
  'src/records/index.mjs','src/resources/index.mjs','src/resources/task-selection.mjs','src/resources/cse-adapter.mjs','src/resources/cse-selected.mjs','src/resources/palette-task.mjs','src/resources/recipe-task.mjs','src/resources/texture-task.mjs','src/resources/icon-routes.mjs','src/resources/recipe-pins.json','src/resources/qualification.mjs','src/resources/qualification-records.json',
  'src/resources/providers.json','src/resources/font-provider-index.json','src/resources/stock-directory.json','src/resources/stock-directory-LICENSE',
  'src/resources/font-directory-notices/free-font-LICENSE','src/resources/font-directory-notices/nerd-fonts-LICENSE',
  'src/review/index.mjs','src/shapes/index.mjs','src/svg/index.js','src/textures/index.mjs','src/textures/license.mjs',
  'src/ui/index.mjs','src/ui/atomic.mjs','src/ui/atomic-catalog.json','src/workflow/task.mjs','src/workflow/promotion.mjs',
  'src/palettes/source/LICENSE','src/palettes/source/provenance.json',
  ...['amber','blue','gray','green','red','slate','teal','violet'].flatMap(x=>[`src/palettes/source/${x}.css`,`src/palettes/source/${x}-dark.css`]),
  'docs/api/cli.md','docs/api/delivery.md','docs/api/inspection.md','docs/api/resources.md','docs/api/workflow.md','docs/api/project-state.md','schemas/project-state-v1.schema.json','docs/cli/README.md','docs/cli/troubleshooting.md',
  'tools/prepare-item-source.mjs','tools/export-study-svg.mjs','docs/study-export.md','tools/font-vector/backend.py','tools/font-vector/fonts.py','tools/font-vector/vectors.py','tools/font-vector/requirements-linux-py312.lock',
])]);
export async function stageCore(outputDir,{sourceRoot=root,identity}={}) {
  // Keep source development metadata unchanged; the staged helper has no test tree.
  const packageData=JSON.parse((await sourceBytes(sourceRoot,'package.json')).toString());
  delete packageData.scripts;delete packageData.devDependencies;
  packageData.files=['bin/','src/','tools/','docs/','schemas/','release/','plugin.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md','THIRD_PARTY.json'];
  return stageFiles({sourceRoot,outputDir,identity,files:coreFiles.filter(p=>p!=='package.json'),generated:{'package.json':packageData,'README.md':'# Ingenium optional core helper\n\nNode22+ is required. Run `node bin/ingenium.mjs help` or `node bin/ingenium.mjs version --json`. Public modules live under src/. See [CLI/API guide](docs/cli/README.md), [inspection](docs/api/inspection.md), [resources](docs/api/resources.md), [delivery](docs/api/delivery.md), and [task planning](docs/api/workflow.md), and [continuation/history](docs/api/project-state.md). Optional browser, renderer and Python adapters remain separately selected; no dependencies install automatically.\n\nThe [release identity](release/identity.json) records this prepared artifact. Provider metadata is included; selected resource data packs are separate. See [optional packs](release/OPTIONAL-PACKS.md). Editable examples and heavy media are separate downloads. Artifact closure checks do not establish actual agent-client qualification or user acceptance.\n', 'release/OPTIONAL-PACKS.md':'# Optional resource data\n\nThe core helper contains provider metadata and runtime code. Selected resource data packs are separate artifacts; extract each complete approved resource ZIP into this installed helper root (CONSUMER/node_modules/@ajhcs/ingenium) before using its bundled factories. Pack identity and selection metadata live under release/packs/<pack-id>/ and preserve this helper release/identity.json. Check `node bin/ingenium.mjs version --json` before and after extraction; the core identity must be unchanged. Extract standalone editable-study ZIPs into separate new directories. Missing packs do not establish selected availability. No packs are downloaded automatically.\n'}});
}
