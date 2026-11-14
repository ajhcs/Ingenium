import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { validateDelivery } from './schema.mjs';
import { extractDeliveryDependencies } from './dependencies.mjs';
export { validateDelivery } from './schema.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
const MAX_FILE = 16 * 1024 * 1024, MAX_TOTAL = 64 * 1024 * 1024;

async function containedFile(root, relative) {
  let current = root;
  const parts = relative.split('/');
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink() || (index < parts.length - 1 ? !info.isDirectory() : !info.isFile())) fail('UNSAFE_FILE', `Expected contained regular file without symlink components: ${relative}`);
  }
  const handle = await open(current, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > MAX_FILE) fail('FILE_BOUND', `File exceeds regular-file/16 MiB bound: ${relative}`);
    const bytes = await handle.readFile();
    if (bytes.length > MAX_FILE) fail('FILE_BOUND', `File exceeds 16 MiB bound: ${relative}`);
    return bytes;
  } finally { await handle.close(); }
}


function inventory(delivery) {
  const link = relative => `[${relative.replace(/[\[\]\\]/g, '\\$&')}](<${encodeURI(relative)}>)`;
  const lines = [
    '# Delivery', '', `Open: ${delivery.openingFile}`, '',
    'Sources and editing:', ...delivery.artifacts.filter(a => a.role === 'source').map(a => `- ${a.path}: ${a.editableKind ?? 'editing kind unspecified'}${a.editingNote ? `; ${a.editingNote}` : ''}`), '',
    'Continuation instructions:', ...delivery.artifacts.filter(a => a.role === 'instructions').map(a => `- ${link(a.path)}`), '',
    'The supplied instructions describe the requested edit, preserved scope and next action. Their meaning requires review.', '',
    'Tools:', ...delivery.tools.map(t => `- ${t.id}: ${t.purpose}; ${t.required ? 'required' : 'optional'}; tested ${t.tested}${t.version ? `; version ${t.version}` : ''}${t.limitations.length ? `; ${t.limitations.join('; ')}` : ''}`), '',
    'Declared checks:', ...delivery.checks.map(c => `- ${c.id}: ${c.status}; ${c.scope}`), '',
    'Limits:', '- Successful packaging verifies listed bytes and the supported local reference subset. It does not execute or certify editor behavior, engineering adequacy, rights or acceptance.',
    ...delivery.limitations.map(limit => `- ${limit}`), '',
  ];
  return lines.join('\n');
}

export async function writeDelivery({ root, delivery, outputDir } = {}) {
  const validation = validateDelivery(delivery);
  if (!validation.valid) fail('INVALID_DELIVERY', validation.errors.map(e => `${e.path}: ${e.message}`).join('; '));
  // Snapshot caller data before awaiting; the copied bytes below are also retained.
  delivery = structuredClone(delivery);
  if (typeof root !== 'string' || typeof outputDir !== 'string') fail('INVALID_PATH', 'Explicit root and outputDir paths are required');
  const rootPath = await realpath(root);
  if (!(await lstat(root)).isDirectory() || (await lstat(root)).isSymbolicLink()) fail('UNSAFE_ROOT', 'Root must be a real directory, not a symlink');
  const outputPath = path.resolve(outputDir);
  const outputParent = await realpath(path.dirname(outputPath));
  if (outputParent !== path.resolve(path.dirname(outputPath))) fail('UNSAFE_OUTPUT', 'Output parent must not have symlink components');
  if (outputPath === rootPath) fail('OUTPUT_COLLISION', 'Output must be exclusively new and separate from root');
  const files = new Map(), byPath = new Map(delivery.artifacts.map(a => [a.path, a])); let total = 0;
  for (const artifact of delivery.artifacts) {
    const bytes = await containedFile(rootPath, artifact.path); total += bytes.length;
    if (total > MAX_TOTAL) fail('TOTAL_BOUND', 'Delivery exceeds 64 MiB total file bound');
    if (hash(bytes) !== artifact.sha256) fail('HASH_MISMATCH', `Source hash differs from manifest: ${artifact.path}`);
    if (['instructions', 'notice'].includes(artifact.role)) {
      const text = bytes.toString('utf8').trim();
      if (!text) fail('EMPTY_NOTE', `Expected retained nonempty ${artifact.role}: ${artifact.path}`);
      if (artifact.role === 'notice' && /^(?:https?:\/\/\S+|\[[^\]]+\]\(https?:\/\/[^)]+\))$/.test(text)) fail('LINK_ONLY_NOTICE', `Retain full notice text, not only a link: ${artifact.path}`);
    }
    files.set(artifact.id, bytes);
  }
  for (const artifact of delivery.artifacts) {
    for (const relative of extractDeliveryDependencies(artifact, files.get(artifact.id))) {
      const dependency = byPath.get(relative);
      if (!dependency || !artifact.dependsOnIds.includes(dependency.id)) fail('MISSING_DEPENDENCY', `Include and declare local dependency ${relative} from ${artifact.path}`);
    }
  }
  // No output is created until all input bytes and supported dependencies pass.
  await mkdir(outputPath);
  const successfulIds = []; let stage = 'copy';
  try {
    for (const artifact of delivery.artifacts) {
      const target = path.join(outputPath, artifact.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, files.get(artifact.id), { flag: 'wx' }); successfulIds.push(artifact.id);
    }
    stage = 'inventory';
    await writeFile(path.join(outputPath, 'DELIVERY.md'), inventory(delivery), { flag: 'wx' });
    stage = 'manifest';
    await writeFile(path.join(outputPath, '.delivery-manifest.pending'), `${JSON.stringify(delivery, null, 2)}\n`, { flag: 'wx' });
    await rename(path.join(outputPath, '.delivery-manifest.pending'), path.join(outputPath, 'delivery.json'));
    return { status: 'complete', manifestPath: path.join(outputPath, 'delivery.json'), inventoryPath: path.join(outputPath, 'DELIVERY.md'), artifactIds: successfulIds };
  } catch (error) {
    const receipt = { schema: 'ingenium-incomplete-delivery/1', status: 'incomplete', stage, successfulIds, failedCode: error.code ?? 'WRITE_FAILED', nextStep: 'Keep these partial files; retry into a new output directory after correcting the failure.' };
    try { await writeFile(path.join(outputPath, 'INCOMPLETE.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' }); } catch { /* Original failure remains authoritative if receipt writing also fails. */ }
    error.deliveryReceipt = receipt; throw error;
  }
}
