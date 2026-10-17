import fs from 'node:fs/promises';
import path from 'node:path';
import { createOutput, readFont } from '../resources.mjs';

const out = await createOutput();
let html = await fs.readFile(new URL('./index.html', import.meta.url), 'utf8');
let css = await fs.readFile(new URL('./style.css', import.meta.url), 'utf8');
const js = await fs.readFile(new URL('./script.js', import.meta.url), 'utf8');
await fs.mkdir(path.join(out, 'fonts'));
for (const name of ['DejaVuSans.ttf', 'DejaVuSerif.ttf']) {
  const bytes = await readFont(name);
  await fs.writeFile(path.join(out, 'fonts', name), bytes, { flag: 'wx' });
  css = css.replace(`url(fonts/${name})`, `url(data:font/ttf;base64,${bytes.toString('base64')})`);
}
for (const name of ['index.html', 'style.css', 'script.js']) {
  await fs.copyFile(new URL(`./${name}`, import.meta.url), path.join(out, name));
}
html = html.replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)
  .replace('<script src="script.js"></script>', `<script>${js}</script>`);
await fs.writeFile(path.join(out, 'standalone.html'), html, { flag: 'wx' });
