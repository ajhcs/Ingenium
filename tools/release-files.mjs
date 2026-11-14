import { mkdir, lstat, readFile, writeFile, chmod, readdir, realpath } from 'node:fs/promises';
import { resolve, join, dirname, posix } from 'node:path';
import { createHash } from 'node:crypto';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function relativeFile(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('%') || value.includes('\0') || value.includes(':') || posix.normalize(value) !== value || value.startsWith('/') || value.split('/').some(x => !x || x === '.' || x === '..')) throw Error('Expected normalized contained relative file path');
  return value;
}
export async function sourceBytes(root, name) {
  relativeFile(name); const base = await realpath(root), file = join(base, name);
  let at = base;
  for (const part of name.split('/')) { at = join(at, part); const stat = await lstat(at); if (stat.isSymbolicLink()) throw Error(`Symlink source refused: ${name}`); }
  const stat = await lstat(file);
  if (!stat.isFile() || await realpath(file) !== file) throw Error(`Expected regular source file: ${name}`);
  return readFile(file);
}
export async function inventory(root) {
  const result = [];
  async function visit(dir, prefix = '') {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name,'en'))) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) await visit(join(dir, entry.name), name + '/');
      else { const data = await sourceBytes(root, name); result.push({path:name,bytes:data.length,sha256:digest(data)}); }
    }
  }
  await visit(root); return result.sort((a,b) => a.path < b.path ? -1 : 1);
}
export async function stageFiles({sourceRoot, outputDir, files, identity, generated = {}}) {
  const names = [...files.map(x => typeof x === 'string' ? {from:x,to:x} : x)];
  const entries = [];
  for (const {from,to} of names) { relativeFile(to); entries.push({path:to,bytes:await sourceBytes(sourceRoot,from)}); }
  for (const [path,value] of Object.entries(generated)) { relativeFile(path); entries.push({path,bytes:Buffer.from(typeof value === 'string' ? value : JSON.stringify(value,null,2)+'\n')}); }
  if (identity) entries.push({path:'release/identity.json',bytes:Buffer.from(JSON.stringify(identity,null,2)+'\n')});
  if (new Set(entries.map(x=>x.path)).size !== entries.length) throw Error('Duplicate stage destination');
  const output = resolve(outputDir); await mkdir(output);
  for (const entry of entries) { const file=join(output,entry.path); await mkdir(dirname(file),{recursive:true}); await writeFile(file,entry.bytes,{flag:'wx'}); await chmod(file,entry.path.startsWith('bin/') ? 0o755 : 0o644); }
  return {outputDir:output,files:entries.length,sourceBytes:entries.reduce((n,x)=>n+x.bytes.length,0),dependencies:0,published:false};
}
