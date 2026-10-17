import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dependency-free staging of the authored static presentation; never deploys it.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repository, 'site');
const requested = process.argv[2];
if (!requested || process.argv.length !== 3) {
  console.error('Usage: node tools/build-release-site.mjs NEW_OUTPUT_DIRECTORY');
  process.exit(1);
}
const destination = path.resolve(requested);
if (destination === repository || destination === source || destination.startsWith(source + path.sep)) {
  throw new Error('Choose a new directory outside site/.');
}
try {
  await fs.lstat(destination);
  throw new Error('Output already exists; choose a new directory.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const files = [];
async function inspect(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Site symlinks are unsupported: ' + full);
    if (entry.isDirectory()) await inspect(full);
    else if (entry.isFile()) files.push(full);
    else throw new Error('Unsupported site entry: ' + full);
  }
}
await inspect(source);
if (!files.includes(path.join(source, 'index.html'))) throw new Error('Missing site/index.html');
let references = 0;
for (const file of files.filter(file => /\.(html|css)$/.test(file))) {
  const text = await fs.readFile(file, 'utf8');
  const urls = [...text.matchAll(/(?:src|href|poster)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^\s"')]+)["']?\s*\)/g)]
    .map(match => match[1] ?? match[2]);
  for (const url of urls) {
    if (/^(?:https?:|data:|mailto:|#)/.test(url)) continue;
    if (url.startsWith('/')) throw new Error('Use relative URLs for project Pages: ' + url);
    const clean = decodeURIComponent(url.split(/[?#]/)[0]);
    if (!clean) continue;
    const resolved = path.resolve(path.dirname(file), clean);
    if (resolved !== source && !resolved.startsWith(source + path.sep)) throw new Error('Site reference leaves site/: ' + url);
    let stat = await fs.stat(resolved).catch(() => null);
    if (stat?.isDirectory()) stat = await fs.stat(path.join(resolved, 'index.html')).catch(() => null);
    if (!stat?.isFile()) throw new Error('Missing site reference: ' + path.relative(source, file) + ' -> ' + url);
    references++;
  }
}
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.cp(source, destination, { recursive: true, errorOnExist: true, force: false });
await fs.writeFile(path.join(destination, '.nojekyll'), '');
console.log(JSON.stringify({ status: 'staged', files: files.length, checkedLocalReferences: references, output: destination, deployed: false }));
