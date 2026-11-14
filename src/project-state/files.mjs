import { createHash } from 'node:crypto';
import { lstat, realpath, open, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fail, isRelativePath } from './schema.mjs';
import { extractDeliveryDependencies } from '../delivery/dependencies.mjs';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
// ingenium canonical JSON v1: sorted object keys, dense array order, finite JSON.
// Stored identity serialization is independent of future checks-module changes.
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
export const hash = value => sha256(canonical(value));
export async function exists(path) { try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
export async function checkedRoot(root) {
  if (typeof root !== 'string' || !root || !root.startsWith('/')) fail('PATH_ESCAPE', 'Select an absolute existing project root.');
  const absolute = resolve(root); const stat = await lstat(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(absolute) !== absolute) fail('PATH_ESCAPE', 'Project root must be an existing canonical nonsymlink directory.');
  return absolute;
}
export async function checkedPath(root, rel, { directory = false, missing = false, ownerOnly = false } = {}) {
  if (!isRelativePath(rel)) fail('PATH_ESCAPE', `Unsafe relative path: ${rel}`);
  const pieces = rel.split('/'); let current = root;
  for (let index = 0; index < pieces.length; index++) {
    current = resolve(current, pieces[index]);
    let stat; try { stat = await lstat(current); } catch (error) { if (missing && error.code === 'ENOENT' && index === pieces.length - 1) return current; throw error; }
    if (stat.isSymbolicLink() || (index < pieces.length - 1 && !stat.isDirectory())) fail('PATH_ESCAPE', `Symlink or non-directory component: ${rel}`);
    if (ownerOnly && (stat.uid !== process.getuid?.() || (stat.mode & 0o077))) fail('CORRUPT_STATE', `Metadata must be owner-only: ${rel}`, 'Inspect permissions without replacing the existing store.');
    if (index === pieces.length - 1 && (directory ? !stat.isDirectory() : !stat.isFile())) fail('PATH_ESCAPE', `Expected ${directory ? 'directory' : 'regular file'}: ${rel}`);
  }
  return current;
}
export async function boundedFile(root, rel, maxBytes, ownerOnly = false) {
  const path = await checkedPath(root, rel, { ownerOnly }); const handle = await open(path, 'r');
  try { const stat = await handle.stat(); if (stat.size > maxBytes) fail('LIMIT_EXCEEDED', `${rel} exceeds byte bound.`); const buffer = Buffer.alloc(stat.size + 1); let bytesRead = 0; while (bytesRead < buffer.length) { const read = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead); if (!read.bytesRead) break; bytesRead += read.bytesRead; } if (bytesRead !== stat.size || bytesRead > maxBytes) fail('CORRUPT_STATE', `${rel} changed during read.`); return buffer.subarray(0, bytesRead); } finally { await handle.close(); }
}
export async function readJSON(root, rel, maxBytes = 3145728) { const bytes = await boundedFile(root, rel, maxBytes, true); let value; try { value = JSON.parse(bytes); } catch { fail('CORRUPT_STATE', `Malformed ${rel}.`, 'Run project recover STORE --inspect; preserve damaged files.'); } return { value, bytes }; }
export async function flush(path, directory = false) {
  let handle; try { handle = await open(path, 'r'); await handle.sync(); } catch (error) { if (['EINVAL', 'ENOTSUP', 'EOPNOTSUPP', 'ENOSYS', 'EBADF'].includes(error.code)) fail('DURABILITY_UNAVAILABLE', `Cannot flush ${directory ? 'directory' : 'file'}: ${path}`, 'Inspect recovery state on a filesystem supporting file and directory fsync.'); throw error; } finally { await handle?.close(); }
}
export async function writeExclusive(path, bytes) { const handle = await open(path, 'wx', 0o600); try { await handle.writeFile(bytes); try { await handle.sync(); } catch (error) { if (['EINVAL', 'ENOTSUP', 'EOPNOTSUPP', 'ENOSYS', 'EBADF'].includes(error.code)) fail('DURABILITY_UNAVAILABLE', `Cannot flush file: ${path}`, 'Inspect recovery state on a filesystem supporting file and directory fsync.'); throw error; } } finally { await handle.close(); } }
export async function makeDirectory(path) { await mkdir(path, { mode: 0o700 }); await flush(dirname(path), true); }
export async function memberPaths(root) {
  const result = [];
  async function walk(path, prefix) { for (const entry of await readdir(path, { withFileTypes: true })) { const rel = prefix ? `${prefix}/${entry.name}` : entry.name; if (entry.isSymbolicLink()) fail('CORRUPT_STATE', `Symlink inside immutable tree: ${rel}`); if (entry.isDirectory()) await walk(resolve(path, entry.name), rel); else if (entry.isFile()) result.push(rel); else fail('CORRUPT_STATE', `Unsupported tree member: ${rel}`); } }
  await walk(root, ''); return result.sort();
}
export async function writeMember(root, logicalPath, bytes) {
  if (!isRelativePath(logicalPath)) fail('PATH_ESCAPE', 'Invalid artifact member path.');
  let current = root;
  for (const component of logicalPath.split('/').slice(0, -1)) { const next = resolve(current, component); if (!await exists(next)) await makeDirectory(next); else if (!(await lstat(next)).isDirectory()) fail('PATH_ESCAPE', 'Artifact path collides with a file.'); current = next; }
  await writeExclusive(resolve(root, logicalPath), bytes); await flush(current, true);
}
export const treeRef = value => /^\.ingenium\/artifacts\/([a-f0-9]{64})\/(.+)$/.exec(value);
export function dependencies(path, mediaType, bytes, { source = false, explicit = false } = {}) {
  const textual = /^(text\/|application\/(json|javascript|xml)|image\/svg\+xml)/.test(mediaType);
  if (!textual && source && !explicit && !/^(image\/(png|jpeg|webp|gif|avif)|font\/)/.test(mediaType)) fail('UNSUPPORTED_DEPENDENCIES', `Source dependency inspection unsupported for ${mediaType}.`, 'Supply a complete explicit DeliveryV1 dependency graph or supported editable source.');
  try { return extractDeliveryDependencies({ path, role: source && !(explicit && !textual) ? 'source' : 'export' }, bytes); }
  catch (error) { fail(error.code ?? 'UNSUPPORTED_DEPENDENCIES', error.message, 'Retain the original; normalize the selected source to supported literal local references and include every exact dependency.'); }
}
