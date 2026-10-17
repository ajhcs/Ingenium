import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runFontVector } from '../../src/font-vector/index.mjs';
const here = fileURLToPath(new URL('.', import.meta.url));
export async function buildStudy(outputDir, python) {
  const root = resolve(outputDir); await mkdir(root);
  const run = async options => { const result = await runFontVector({ python, ...options }); if (result.status !== 'pass') throw new Error(JSON.stringify(result)); return result; };
  const font = await run({ operation: 'font-demo', outputDir: join(root, 'font') });
  const vector = await run({ operation: 'normalize', sourcePath: join(here, 'vector-source.svg'), outputDir: join(root, 'normalized') });
  const base = JSON.parse(await readFile(join(here, 'boolean-source.json'), 'utf8')), booleans = [];
  for (const operation of ['union', 'intersection', 'difference']) {
    const sourcePath = join(root, `${operation}.json`);
    await writeFile(sourcePath, JSON.stringify({ ...base, operation }), { flag: 'wx' });
    booleans.push(await run({ operation: 'boolean', sourcePath, outputDir: join(root, operation) }));
  }
  const paths = [['Original editable', join(root, 'normalized/original.svg')], ['Normalized derivative', join(root, 'normalized/normalized.svg')], ...['union', 'intersection', 'difference'].map(n => [n, join(root,n,'result.svg')])];
  let figures = '';
  for (const [label,path] of paths) figures += `<figure><img alt="${label}" src="data:image/svg+xml;base64,${(await readFile(path)).toString('base64')}"><figcaption>${label}</figcaption></figure>`;
  await writeFile(join(root, 'vector-proof.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Bounded vector proof</title><style>body{font:18px/1.5 system-ui;background:#f5f2eb;color:#182e32;padding:32px}main{max-width:1000px;margin:auto}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0;padding:20px;background:white;border:1px solid #bbc7c2;border-radius:12px}img{width:100%;height:230px;object-fit:contain}figcaption{padding-top:12px}@media(max-width:600px){.grid{grid-template-columns:1fr}}</style><main><h1>Static vector qualification</h1><p>Original synthetic MIT sources. Native PathOps fill rules, holes and mutation checks; picosvg transform, clip and stroke normalization. These technical specimens are not worked design examples.</p><div class="grid">${figures}</div><p>Normalization rounds to 3 decimals; masks, filters, external resources and unsupported semantics are refused. No claim about a Canvas/library bug follows from these operations.</p></main></html>`, { flag:'wx' });
  const receipt = { font, vector, booleans }; await writeFile(join(root, 'receipt.json'), JSON.stringify(receipt,null,2)+'\n',{flag:'wx'}); return receipt;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await buildStudy(process.argv[2], process.argv[3]); console.log('Limited font and vector proof written; inspect actual outputs and glyph identities.'); }
  catch(error) { console.error(error.message); process.exitCode=1; }
}
