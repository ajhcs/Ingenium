import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { readFile, lstat, readdir, rename, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { reviseRecord } from '../records/index.mjs';
import { assertProjectState, clone, fail, HASH, ID, ProjectStateError, jsonProblems, isRelativePath } from './schema.mjs';
import { sha256, hash, canonical, exists, checkedRoot, checkedPath, boundedFile, readJSON, flush, writeExclusive, makeDirectory, memberPaths, writeMember, treeRef, dependencies } from './files.mjs';
const STORE = '.ingenium';
const COMMIT_SCHEMA = 'ingenium-commit/1';
const TREE_SCHEMA = 'ingenium-artifacts/1';
const EVENT_SCHEMA = 'ingenium-event/1';
const validHash = value => typeof value === 'string' && HASH.test(value);
const validId = value => typeof value === 'string' && ID.test(value);
const kinds = ['create', 'edit', 'reopen', 'choose', 'return', 'migrate', 'recover'];
const nextRecovery = 'Run ingenium project recover STORE_DIR --inspect; preserve all pending and immutable files.';
const strict = (value, required, optional = []) => value && typeof value === 'object' && !Array.isArray(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => [...required, ...optional].includes(key));
const boundedString = (value, max = 8192) => typeof value === 'string' && !!value.trim() && Buffer.byteLength(value) <= max;
function validateChange(change) {
  if (jsonProblems(change).length || !strict(change, ['kind', 'summary'], ['reason', 'recordChange', 'basedOnVersionId']) || !kinds.includes(change.kind) || !boundedString(change.summary) || (Object.hasOwn(change, 'reason') && !boundedString(change.reason)) || (Object.hasOwn(change, 'basedOnVersionId') && !validId(change.basedOnVersionId))) fail('INVALID_CHANGE', 'Invalid strict Change object.');
  if (['reopen', 'return', 'recover'].includes(change.kind) && !boundedString(change.reason)) fail('INVALID_CHANGE', `${change.kind} requires a reason.`);
  if (change.kind === 'return' && !change.basedOnVersionId) fail('INVALID_CHANGE', 'return requires basedOnVersionId.');
}
function allRefs(state) {
  return [...state.sources.map(ref => ({ ref, role: 'source' })), ...state.outputs.map(ref => ({ ref, role: 'export' })), ...(state.versions ?? []).flatMap(version => [...version.sources.map(ref => ({ ref, role: 'source' })), ...version.previews.map(ref => ({ ref, role: 'preview' }))]), ...(state.delivery?.artifacts ?? []).map(ref => ({ ref, role: ref.role }))];
}
function mapRefs(state, project) {
  const value = clone(state);
  value.sources = value.sources.map(project); value.outputs = value.outputs.map(project);
  for (const version of value.versions ?? []) { version.sources = version.sources.map(project); version.previews = version.previews.map(project); }
  if (value.delivery) { const opening = value.delivery.artifacts.find(ref => ref.path === value.delivery.openingFile); value.delivery.artifacts = value.delivery.artifacts.map(project); if (opening) value.delivery.openingFile = project(opening).path; }
  return value;
}
function recordTransition(base, candidate, change) {
  if (!base) { if (change.recordChange) fail('INVALID_CHANGE', 'Creation has no predecessor record to revise.'); return; }
  if (base.record) {
    let expected = base.record;
    if (change.recordChange) { try { expected = reviseRecord(base.record, change.recordChange); } catch (error) { fail('PROTECTED_RECORD', error.message, 'Use an ordinary records-v1 transition and explicit reopen where required.'); } }
    if (!isDeepStrictEqual(expected, candidate.record)) fail('PROTECTED_RECORD', 'Candidate record differs from the authoritative records-v1 transition.', 'Retain the current record or supply its exact validated recordChange.');
  } else if (change.recordChange) fail('INVALID_CHANGE', 'No predecessor record exists to revise.');
}
async function processIdentity(pid = process.pid) {
  try { const [bootId, stat] = await Promise.all([readFile('/proc/sys/kernel/random/boot_id', 'utf8'), readFile(`/proc/${pid}/stat`, 'utf8')]); const close = stat.lastIndexOf(')'); const fields = stat.slice(close + 2).split(' '); return { host: hostname(), bootId: bootId.trim(), pid, processStart: fields[19] }; } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function lockStatus(lock) {
  if (!strict(lock, ['schema', 'token', 'host', 'bootId', 'pid', 'processStart']) || lock.schema !== 'ingenium-lock/1' || !boundedString(lock.token) || lock.host !== hostname() || !Number.isSafeInteger(lock.pid) || lock.pid < 1 || !/^\d+$/.test(lock.processStart)) return 'unknown';
  let boot; try { boot = (await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim(); } catch { return 'unknown'; }
  if (boot !== lock.bootId) return 'abandoned';
  try { const identity = await processIdentity(lock.pid); return !identity || identity.processStart !== lock.processStart ? 'abandoned' : 'live'; } catch { return 'unknown'; }
}

export function createProjectStore(options, testInternals = {}) {
  if (!strict(options, ['root'], ['maxBytes']) || typeof options.root !== 'string' || (options.maxBytes !== undefined && (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 1 || options.maxBytes > 67108864))) fail('INVALID_OPTIONS', 'Expected {root,maxBytes?}; maxBytes may lower the 64 MiB bound.');
  const root = resolve(options.root); const maxBytes = options.maxBytes ?? 67108864;
  const fault = async stage => { if (testInternals.fault) await testInternals.fault(stage); };
  const path = rel => resolve(root, rel);
  async function prepare() { await checkedRoot(options.root); if (await exists(path(STORE))) await checkedPath(root, STORE, { directory: true, ownerOnly: true }); }
  async function rawHead() {
    if (!await exists(path(`${STORE}/HEAD.json`))) return { status: 'missing', commitHash: null, fileHash: null };
    try {
      const bytes = await boundedFile(root, `${STORE}/HEAD.json`, 4096, true); const fileHash = sha256(bytes); let head;
      try { head = JSON.parse(bytes); } catch { return { status: 'corrupt', commitHash: null, fileHash }; }
      if (!strict(head, ['schema', 'commitHash']) || head.schema !== 'ingenium-head/1' || !validHash(head.commitHash)) return { status: 'corrupt', commitHash: null, fileHash };
      return { status: 'valid', commitHash: head.commitHash, fileHash };
    } catch (error) { if (error.code === 'PATH_ESCAPE') throw error; return { status: 'corrupt', commitHash: null, fileHash: null, diagnostic: error.message }; }
  }
  async function verifyTree(treeHash) {
    if (!validHash(treeHash)) fail('CORRUPT_STATE', 'Invalid artifact tree identity.', nextRecovery);
    const rel = `${STORE}/artifacts/${treeHash}`; await checkedPath(root, rel, { directory: true, ownerOnly: true });
    const { value: manifest, bytes } = await readJSON(root, `${rel}/tree-manifest.json`);
    if (!strict(manifest, ['schema', 'files']) || manifest.schema !== TREE_SCHEMA || !Array.isArray(manifest.files) || manifest.files.length > 1024 || hash(manifest) !== treeHash || canonical(manifest) !== bytes.toString()) fail('CORRUPT_STATE', `Invalid artifact tree ${treeHash}.`, nextRecovery);
    let total = 0; let previous = ''; const members = new Map();
    for (const file of manifest.files) {
      if (!strict(file, ['path', 'sha256', 'bytes']) || !isRelativePath(file.path) || file.path === 'tree-manifest.json' || file.path.startsWith(`${STORE}/`) || !validHash(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.path <= previous) fail('CORRUPT_STATE', 'Invalid or unsorted artifact manifest.', nextRecovery);
      previous = file.path; total += file.bytes; if (total > maxBytes) fail('LIMIT_EXCEEDED', 'Artifact tree exceeds configured bound.');
      const content = await boundedFile(root, `${rel}/${file.path}`, maxBytes, true);
      if (content.length !== file.bytes || sha256(content) !== file.sha256) fail('CORRUPT_STATE', `Changed immutable artifact ${file.path}.`, nextRecovery);
      members.set(file.path, { ...file, content });
    }
    const actual = await memberPaths(path(rel)); if (!isDeepStrictEqual(actual, [...members.keys(), 'tree-manifest.json'].sort())) fail('CORRUPT_STATE', 'Immutable artifact membership differs from manifest.', nextRecovery);
    return { hash: treeHash, manifest, members };
  }
  function verifyResourceBindings(state) {
    const hashes = new Set(allRefs(state).map(({ ref }) => ref.sha256));
    for (const selection of state.resources ?? []) for (const [field, digest] of [['originalSHA256', selection.originalSHA256], ['derivedSHA256', selection.derivedSHA256]]) {
      if (digest && !hashes.has(digest)) fail('RESOURCE_CHANGED', `Selected resource ${selection.providerId}:${selection.assetId} ${field} has no explicitly retained exact bytes.`, 'Acquire/retain the exact original and derived files with verified refs; keep catalog-only observations descriptive until acquired.');
    }
  }
  async function verifyRefs(state, trees) {
    verifyResourceBindings(state);
    for (const { ref, role } of allRefs(state)) {
      const match = treeRef(ref.path); if (!match || !trees.has(match[1])) fail('CORRUPT_STATE', `Unretained artifact reference ${ref.path}.`, nextRecovery);
      const tree = trees.get(match[1]); const member = tree.members.get(match[2]);
      if (!member || member.sha256 !== ref.sha256) fail('CORRUPT_STATE', `Artifact reference mismatch ${ref.path}.`, nextRecovery);
      const explicit = !!state.delivery?.artifacts.some(artifact => artifact.path === ref.path);
      for (const dependency of dependencies(match[2], ref.mediaType, member.content, { source: role === 'source', explicit })) if (!tree.members.has(dependency)) fail('MISSING_DEPENDENCY', `Missing dependency ${dependency} required by ${ref.path}.`, nextRecovery);
    }
  }
  function selectedClosure(state, version, trees) {
    const result = new Map();
    const selectedDelivery = state.delivery && (state.delivery.versionId === version.id || version.id.startsWith('commit:')) ? state.delivery : null;
    const namespace = [...version.sources, ...version.previews, ...(selectedDelivery?.artifacts ?? [])];
    const mediaFor = (treeHash, logicalPath) => allRefs(state).find(({ ref }) => ref.path === `${STORE}/artifacts/${treeHash}/${logicalPath}`)?.ref.mediaType ?? ({ svg: 'image/svg+xml', html: 'text/html', htm: 'text/html', css: 'text/css', js: 'application/javascript', mjs: 'application/javascript', json: 'application/json', md: 'text/markdown', txt: 'text/plain' }[logicalPath.split('.').pop().toLowerCase()] ?? 'application/octet-stream');
    function add(treeHash, logicalPath, mediaType, role = 'source', refId, prefix = '') {
      const member = trees.get(treeHash)?.members.get(logicalPath); if (!member) fail('MISSING_DEPENDENCY', `Selected version lacks ${logicalPath}.`, nextRecovery);
      const outputPath = prefix ? `${prefix}/${logicalPath}` : logicalPath;
      const previous = result.get(outputPath); if (previous) { if (previous.sha256 !== member.sha256) fail('PATH_COLLISION', `Selected version requires different bytes at ${logicalPath}.`, 'Give the conflicting source/dependency explicit distinct logical paths before committing this version.'); if (refId) previous.refId = refId; return; }
      const originalRef = allRefs(state).find(({ ref }) => { const match = treeRef(ref.path); return match?.[2] === logicalPath && ref.sha256 === member.sha256; })?.ref;
      result.set(outputPath, { ...member, path: outputPath, mediaType, refId: refId ?? (prefix ? `resource-dependency-${sha256(outputPath).slice(0, 16)}` : originalRef?.id) });
      const immutablePath = `${STORE}/artifacts/${treeHash}/${logicalPath}`;
      for (const dependency of dependencies(logicalPath, mediaType, member.content, { source: role === 'source', explicit: !!selectedDelivery?.artifacts.some(ref => ref.path === immutablePath) })) add(treeHash, dependency, mediaFor(treeHash, dependency), 'source', undefined, prefix);
    }
    for (const ref of namespace) { const match = treeRef(ref.path); if (!match) fail('CORRUPT_STATE', 'Selected ref is not immutable.', nextRecovery); add(match[1], match[2], ref.mediaType, selectedDelivery?.artifacts.find(artifact => artifact.id === ref.id)?.role ?? 'source', ref.id); }
    for (const selection of state.resources ?? []) for (const noticeId of selection.noticeIds) {
      const ref = namespace.find(ref => ref.id === noticeId) ?? [...state.sources, ...state.outputs, ...(state.delivery?.artifacts ?? [])].find(ref => ref.id === noticeId);
      if (!ref) fail('MISSING_DEPENDENCY', `Selected resource notice ${noticeId} is missing.`); const match = treeRef(ref.path); add(match[1], match[2], ref.mediaType, 'notice', ref.id);
    }
    // Resource provenance bytes can differ from selected editable bytes at the
    // same historical filename. Keep a separate literal namespace for any
    // additional original/derived resource closure, without rewriting sources.
    for (const selection of state.resources ?? []) for (const digest of [selection.originalSHA256, selection.derivedSHA256].filter(Boolean)) {
      if ([...result.values()].some(member => member.sha256 === digest)) continue;
      const binding = allRefs(state).find(({ ref }) => ref.sha256 === digest)?.ref;
      if (!binding) fail('RESOURCE_CHANGED', 'Selected resource has no exact retained reference.');
      const match = treeRef(binding.path); add(match[1], match[2], binding.mediaType, 'source', `resource-${digest.slice(0, 16)}`, `resources/${digest}`);
    }
    const total = [...result.values()].reduce((sum, member) => sum + member.bytes, 0); if (total > maxBytes || result.size > 1024) fail('LIMIT_EXCEEDED', 'Selected version closure exceeds byte/member bound.');
    return { members: result, delivery: selectedDelivery };
  }
  async function verifyCommit(commitHash, cache = new Map(), visiting = new Set()) {
    if (cache.has(commitHash)) return cache.get(commitHash);
    if (!validHash(commitHash) || visiting.has(commitHash) || visiting.size > 4096) fail('CORRUPT_STATE', 'Invalid, cyclic or excessive commit ancestry.', nextRecovery);
    visiting.add(commitHash); const rel = `${STORE}/commits/${commitHash}`;
    await checkedPath(root, rel, { directory: true, ownerOnly: true });
    if (!isDeepStrictEqual((await readdir(path(rel))).sort(), ['event.json', 'manifest.json', 'state.json'])) fail('CORRUPT_STATE', 'Unexpected immutable commit members.', nextRecovery);
    const { value: manifest, bytes: manifestBytes } = await readJSON(root, `${rel}/manifest.json`);
    if (!strict(manifest, ['schema', 'stateHash', 'eventHash', 'artifactTreeHashes']) || manifest.schema !== COMMIT_SCHEMA || hash(manifest) !== commitHash || canonical(manifest) !== manifestBytes.toString() || !validHash(manifest.stateHash) || !validHash(manifest.eventHash) || !Array.isArray(manifest.artifactTreeHashes) || manifest.artifactTreeHashes.some(value => !validHash(value)) || new Set(manifest.artifactTreeHashes).size !== manifest.artifactTreeHashes.length) fail('CORRUPT_STATE', `Invalid commit manifest ${commitHash}.`, nextRecovery);
    const [{ value: state, bytes: stateBytes }, { value: event, bytes: eventBytes }] = await Promise.all([readJSON(root, `${rel}/state.json`, 1048576), readJSON(root, `${rel}/event.json`)]);
    if (sha256(stateBytes) !== manifest.stateHash || sha256(eventBytes) !== manifest.eventHash) fail('CORRUPT_STATE', 'Commit file hash mismatch.', nextRecovery);
    assertProjectState(state);
    if (jsonProblems(event).length || !strict(event, ['schema', 'projectId', 'revision', 'parentHash', 'requestId', 'requestDigest', 'stateHash', 'change', 'submittedPaths'], ['recoveredFrom', 'disasterRecovery']) || event.schema !== EVENT_SCHEMA || event.stateHash !== manifest.stateHash || event.projectId !== state.projectId || event.revision !== state.revision || !(event.parentHash === null || validHash(event.parentHash)) || !boundedString(event.requestId, 128) || !validHash(event.requestDigest) || !Array.isArray(event.submittedPaths)) fail('CORRUPT_STATE', 'Invalid commit event.', nextRecovery);
    validateChange(event.change);
    const trees = new Map(); for (const treeHash of manifest.artifactTreeHashes) trees.set(treeHash, await verifyTree(treeHash));
    await verifyRefs(state, trees);
    let parent = null;
    if (event.parentHash) {
      parent = await verifyCommit(event.parentHash, cache, visiting);
      if (parent.state.projectId !== state.projectId || parent.state.revision + 1 !== state.revision) fail('CORRUPT_STATE', 'Broken project revision ancestry.', nextRecovery);
      recordTransition(parent.state, state, event.change);
      for (const version of parent.state.versions ?? []) if (!isDeepStrictEqual(version, state.versions?.find(item => item.id === version.id))) fail('CORRUPT_STATE', `Historical version changed: ${version.id}.`, nextRecovery);
    } else if (state.revision !== 0) fail('CORRUPT_STATE', 'Initial project revision must be zero.', nextRecovery);
    const commit = { commitHash, manifest, state, event, trees, parent }; cache.set(commitHash, commit); visiting.delete(commitHash); return commit;
  }
  async function current() {
    const head = await rawHead();
    if (head.status !== 'valid') fail(head.status === 'missing' ? 'MISSING_HEAD' : 'CORRUPT_STATE', `Project HEAD is ${head.status}.`, nextRecovery, { head });
    return { head, commit: await verifyCommit(head.commitHash) };
  }
  async function getLock() {
    if (!await exists(path(`${STORE}/writer.lock`))) return { status: 'absent' };
    try { const { value } = await readJSON(root, `${STORE}/writer.lock`, 8192); return { status: await lockStatus(value), token: value.token, metadata: value }; } catch (error) { if (error.code === 'PATH_ESCAPE') throw error; return { status: 'unknown', diagnostic: error.message }; }
  }
  async function acquireLock() {
    const identity = await processIdentity(); if (!identity) fail('DURABILITY_UNAVAILABLE', 'Local process-start identity unavailable; safe crash-lock recovery cannot be guaranteed.', 'Use a supported local process-identity adapter.');
    const lock = { schema: 'ingenium-lock/1', token: randomUUID(), ...identity };
    try { await writeExclusive(path(`${STORE}/writer.lock`), canonical(lock)); await flush(path(STORE), true); } catch (error) { if (error.code === 'EEXIST') fail('LOCKED', 'A writer lock is present.', 'Inspect recovery lock status; release only an explicitly verified abandoned token.'); throw error; }
    return lock;
  }
  async function releaseOwnLock(lock) {
    const currentLock = await getLock(); if (currentLock.token === lock.token) { await unlink(path(`${STORE}/writer.lock`)); await flush(path(STORE), true); }
  }
  async function metadata() {
    if (!await exists(path(STORE))) { try { await makeDirectory(path(STORE)); } catch (error) { if (error.code !== 'EEXIST') throw error; } }
    await checkedPath(root, STORE, { directory: true, ownerOnly: true });
    for (const name of ['commits', 'artifacts', 'pending', 'recovery']) { const rel = `${STORE}/${name}`; if (!await exists(path(rel))) { try { await makeDirectory(path(rel)); } catch (error) { if (error.code !== 'EEXIST') throw error; } } await checkedPath(root, rel, { directory: true, ownerOnly: true }); }
  }
  async function collect(state) {
    verifyResourceBindings(state);
    const newFiles = new Map(); const retained = new Map(); const submittedPaths = [];
    for (const { ref, role } of allRefs(state)) {
      const match = treeRef(ref.path); submittedPaths.push({ path: ref.path, sha256: ref.sha256 });
      if (match) {
        if (!retained.has(match[1])) retained.set(match[1], await verifyTree(match[1]));
        const member = retained.get(match[1]).members.get(match[2]); if (!member || member.sha256 !== ref.sha256) fail('SOURCE_CHANGED', `Retained source changed: ${ref.path}.`, nextRecovery);
        continue;
      }
      if (ref.path === 'tree-manifest.json' || ref.path.startsWith(`${STORE}/`)) fail('PATH_ESCAPE', 'Source enters reserved store metadata.');
      let bytes; try { bytes = await boundedFile(root, ref.path, maxBytes); } catch (error) { if (error.code === 'ENOENT') fail('SOURCE_MISSING', `Missing source ${ref.path}.`, 'Restore the selected source or explicitly revise the continuation reference.'); throw error; }
      if (sha256(bytes) !== ref.sha256) fail('SOURCE_CHANGED', `Source hash changed: ${ref.path}.`, 'Inspect the edited source, then explicitly update its reference hash.');
      const prior = newFiles.get(ref.path); if (prior && prior.sha256 !== ref.sha256) fail('PATH_COLLISION', `Conflicting bytes at ${ref.path}.`, 'Retain historical immutable tree refs; give different working bytes distinct paths.');
      newFiles.set(ref.path, { path: ref.path, sha256: ref.sha256, bytes: bytes.length, content: bytes, mediaType: ref.mediaType, source: role === 'source' || prior?.source });
    }
    const explicitPaths = new Set(state.delivery?.artifacts.map(artifact => artifact.path) ?? []);
    const namespaces = [[...state.sources, ...state.outputs, ...(state.delivery?.artifacts ?? [])], ...(state.versions ?? []).map(version => [...version.sources, ...version.previews, ...(state.delivery?.versionId === version.id ? state.delivery.artifacts : [])])];
    function includeDependencies(file, namespace, seen = new Set()) {
      if (seen.has(file.path)) return; seen.add(file.path);
      for (const dependency of dependencies(file.path, file.mediaType, file.content, { source: file.source, explicit: explicitPaths.has(file.path) })) {
        let target = newFiles.get(dependency);
        const selected = namespace.filter(ref => { const match = treeRef(ref.path); return match && match[2] === dependency; });
        if (new Set(selected.map(ref => ref.sha256)).size > 1) fail('PATH_COLLISION', `Ambiguous retained dependency ${dependency}.`);
        if (selected.length) {
          const ref = selected[0], match = treeRef(ref.path), member = retained.get(match[1])?.members.get(match[2]);
          if (!member || member.sha256 !== ref.sha256) fail('CORRUPT_STATE', `Missing verified retained dependency ${dependency}.`, nextRecovery);
          if (target && target.sha256 !== member.sha256) fail('PATH_COLLISION', `Working and retained dependencies disagree at ${dependency}.`, 'Give distinct dependency bytes explicit distinct logical paths.');
          if (!target) { target = { ...member, mediaType: ref.mediaType, source: true }; newFiles.set(dependency, target); }
        }
        if (!target) fail('MISSING_DEPENDENCY', `Dependency ${dependency} required by ${file.path} is not explicitly retained.`, 'Add the exact dependency and its hash to the source/delivery closure.');
        includeDependencies(target, namespace, seen);
      }
    }
    for (const namespace of namespaces) for (const ref of namespace) if (!treeRef(ref.path)) includeDependencies(newFiles.get(ref.path), namespace);
    let total = 0; for (const file of newFiles.values()) total += file.bytes;
    if (total > maxBytes || newFiles.size > 1024) fail('LIMIT_EXCEEDED', 'Artifact tree exceeds byte/member bound.');
    for (const resource of state.resources ?? []) for (const noticeId of resource.noticeIds) if (!allRefs(state).some(({ ref }) => ref.id === noticeId)) fail('MISSING_DEPENDENCY', `Resource notice ${noticeId} is not retained.`, 'Include the full local notice file in the explicit closure.');
    return { newFiles, retained, submittedPaths };
  }
  async function publishHead(commitHash, receiptState) {
    const headTemp = `${STORE}/HEAD-${randomUUID()}.tmp`; await writeExclusive(path(headTemp), canonical({ schema: 'ingenium-head/1', commitHash }));
    await fault('before-head-replace'); await rename(path(headTemp), path(`${STORE}/HEAD.json`)); receiptState.headReplaced = true;
    await fault('after-head-replace'); await flush(path(`${STORE}/HEAD.json`)); await flush(path(STORE), true); receiptState.lastDurableHead = commitHash; await fault('after-head-flush');
  }
  function receipt(commit) { return { status: 'saved', projectId: commit.state.projectId, revision: commit.state.revision, headHash: commit.commitHash, requestId: commit.event.requestId, sourceHashes: commit.state.sources.map(ref => ref.sha256), durable: true }; }
  async function persist({ state, change, parentHash, requestId, requestDigest, collected, recovery }, progress) {
    const transaction = randomUUID(); const rel = `${STORE}/pending/${transaction}`; progress.pendingTransaction = transaction; progress.stage = 'pending';
    await makeDirectory(path(rel)); await writeExclusive(path(`${rel}/transaction.json`), canonical({ schema: 'ingenium-pending/1', requestId, parentHash }));
    const treeManifest = { schema: TREE_SCHEMA, files: [...collected.newFiles.values()].map(({ path, sha256, bytes }) => ({ path, sha256, bytes })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) };
    const treeHash = hash(treeManifest);
    if (collected.newFiles.size || !collected.retained.size) {
      const treeRel = `${rel}/tree`; await makeDirectory(path(treeRel));
      for (const file of collected.newFiles.values()) { progress.stage = 'artifact-write'; await fault('before-artifact-write'); await writeMember(path(treeRel), file.path, file.content); progress.successfulFiles.push(file.path); }
      await writeExclusive(path(`${treeRel}/tree-manifest.json`), canonical(treeManifest)); await flush(path(treeRel), true); await fault('before-artifact-publication');
      const target = `${STORE}/artifacts/${treeHash}`;
      if (await exists(path(target))) { await verifyTree(treeHash); } else { await rename(path(treeRel), path(target)); await flush(path(`${STORE}/artifacts`), true); }
      collected.retained.set(treeHash, await verifyTree(treeHash));
    }
    const projected = mapRefs(state, ref => ({ ...ref, path: treeRef(ref.path) ? ref.path : `${STORE}/artifacts/${treeHash}/${ref.path}` })); assertProjectState(projected);
    await verifyRefs(projected, collected.retained);
    for (const version of projected.versions ?? []) selectedClosure(projected, version, collected.retained);
    selectedClosure(projected, { id: projected.delivery?.versionId ?? 'current', sources: projected.sources, previews: projected.outputs }, collected.retained);
    const stateBytes = canonical(projected); const stateHash = sha256(stateBytes);
    const event = { schema: EVENT_SCHEMA, projectId: projected.projectId, revision: projected.revision, parentHash, requestId, requestDigest, stateHash, change: clone(change), submittedPaths: collected.submittedPaths, ...(recovery ?? {}) };
    const eventBytes = canonical(event); const manifest = { schema: COMMIT_SCHEMA, stateHash, eventHash: sha256(eventBytes), artifactTreeHashes: [...collected.retained.keys()].sort() };
    const commitHash = hash(manifest); const commitRel = `${rel}/commit`; await makeDirectory(path(commitRel));
    progress.stage = 'commit-write'; await writeExclusive(path(`${commitRel}/state.json`), stateBytes); await writeExclusive(path(`${commitRel}/event.json`), eventBytes); await writeExclusive(path(`${commitRel}/manifest.json`), canonical(manifest)); await flush(path(commitRel), true);
    await fault('before-commit-publication'); await rename(path(commitRel), path(`${STORE}/commits/${commitHash}`)); await flush(path(`${STORE}/commits`), true); progress.stage = 'commit-published'; progress.candidateCommit = commitHash; await fault('after-commit-publication');
    await publishHead(commitHash, progress); progress.stage = 'acknowledgement'; await fault('before-acknowledgement');
    const saved = await verifyCommit(commitHash); progress.lastDurableHead = commitHash; return receipt(saved);
  }
  async function operation(callback) {
    const progress = { stage: 'preflight', lastDurableHead: null, pendingTransaction: null, successfulFiles: [], headReplaced: false };
    try { await prepare(); return await callback(progress); }
    catch (error) { const wrapped = error instanceof ProjectStateError ? error : new ProjectStateError(error.code === 'ENOENT' ? 'CORRUPT_STATE' : 'SPACE_OR_IO', error.message, nextRecovery, { causeCode: error.code }); wrapped.details = { ...progress, ...wrapped.details, recoveryCommand: 'ingenium project recover STORE_DIR --inspect' }; throw wrapped; }
  }
  async function commit(input) {
    return operation(async progress => {
      if (jsonProblems(input).length || !strict(input, ['expectedHeadHash', 'requestId', 'state', 'change']) || !(input.expectedHeadHash === null || validHash(input.expectedHeadHash)) || !boundedString(input.requestId, 128)) fail('INVALID_OPTIONS', 'Commit requires expectedHeadHash, opaque requestId, state and change.');
      assertProjectState(input.state); validateChange(input.change); input = clone(input);
      const digest = hash({ baseHeadHash: input.expectedHeadHash, state: input.state, change: input.change });
      const preexisting = await exists(path(STORE));
      if (preexisting && !await exists(path(`${STORE}/HEAD.json`)) && !await exists(path(`${STORE}/INITIALIZING.json`))) fail('CORRUPT_STATE', 'Unknown preexisting metadata has no HEAD or owned initialization identity.', nextRecovery);
      // Initialization preflight must not strand an empty metadata store after a
      // repairable missing/changed source or dependency refusal.
      const initialClosure = preexisting ? null : await collect(input.state);
      await metadata(); const lock = await acquireLock();
      try {
        const observed = await rawHead(); let previous = null;
        if (observed.status === 'valid') {
          previous = await verifyCommit(observed.commitHash); progress.lastDurableHead = previous.commitHash;
          for (let cursor = previous; cursor; cursor = cursor.parent) if (cursor.event.requestId === input.requestId) { if (cursor.event.requestDigest !== digest) fail('REQUEST_REPLAY_CONFLICT', 'Request ID was already used for different content.', 'Use a new request ID for a different candidate.'); await fault('before-retry-flush'); await flush(path(`${STORE}/HEAD.json`)); await flush(path(STORE), true); return receipt(cursor); }
        } else if (observed.status === 'corrupt') fail('CORRUPT_STATE', 'No verified current HEAD in an existing store.', nextRecovery);
        else if (preexisting) {
          const markerRel = `${STORE}/INITIALIZING.json`;
          if (!await exists(path(markerRel))) fail('CORRUPT_STATE', 'Existing metadata has no HEAD or verified initialization identity.', nextRecovery);
          const { value: marker } = await readJSON(root, markerRel, 8192);
          if (!strict(marker, ['schema', 'projectId', 'requestId', 'requestDigest']) || marker.schema !== 'ingenium-initializing/1' || marker.projectId !== input.state.projectId || input.expectedHeadHash !== null) fail('CORRUPT_STATE', 'Existing metadata initialization identity does not match this request.', nextRecovery);
          if (marker.requestId !== input.requestId || marker.requestDigest !== digest) fail('REQUEST_REPLAY_CONFLICT', 'Interrupted initialization belongs to a different request or candidate.', nextRecovery);
          if ((await readdir(path(`${STORE}/commits`))).length) fail('ORPHAN_COMMIT', 'Interrupted initialization has published commit candidates; select one explicitly.', nextRecovery);
        } else {
          await writeExclusive(path(`${STORE}/INITIALIZING.json`), canonical({ schema: 'ingenium-initializing/1', projectId: input.state.projectId, requestId: input.requestId, requestDigest: digest })); await flush(path(STORE), true);
        }
        const reachable = new Set(); for (let cursor = previous; cursor; cursor = cursor.parent) reachable.add(cursor.commitHash);
        for (const candidateHash of await readdir(path(`${STORE}/commits`))) {
          if (reachable.has(candidateHash)) continue; let orphan; try { orphan = await verifyCommit(candidateHash); } catch { continue; }
          if (orphan.event.requestId === input.requestId) {
            if (orphan.event.requestDigest !== digest) fail('REQUEST_REPLAY_CONFLICT', 'Request ID exists in a retained orphan with different content.', nextRecovery, { candidateCommit: candidateHash });
            fail('ORPHAN_COMMIT', 'Request exists only in a complete noncurrent orphan; retry cannot silently promote it.', nextRecovery, { candidateCommit: candidateHash });
          }
        }
        if (input.expectedHeadHash !== observed.commitHash) fail('STALE_HEAD', 'Expected HEAD differs from current HEAD.', 'Read current state and reconcile the retained candidate before retrying.', { expectedHeadHash: input.expectedHeadHash, actualHeadHash: observed.commitHash });
        const state = clone(input.state);
        if (previous) {
          if (state.projectId !== previous.state.projectId || state.revision !== previous.state.revision) fail('STALE_REVISION', 'Project identity and base revision must match current state.');
          if (state.revision === Number.MAX_SAFE_INTEGER) fail('REVISION_EXHAUSTED', 'Project revision cannot increment.');
          if (input.change.kind === 'create') fail('INVALID_CHANGE', 'create is only valid at initialization.');
          recordTransition(previous.state, state, input.change);
          for (const version of previous.state.versions ?? []) if (!isDeepStrictEqual(version, state.versions?.find(item => item.id === version.id))) fail('IMMUTABLE_VERSION', `Retained version ${version.id} must remain identical.`);
          state.revision++;
        } else if (state.revision !== 0 || !['create', 'migrate'].includes(input.change.kind)) fail('INVALID_CHANGE', 'Initialize revision zero with create or migrate.');
        if (state.versions?.some(version => version.revision > state.revision)) fail('INVALID_CHANGE', 'Version revision is ahead of its project.');
        if (input.change.basedOnVersionId && !state.versions?.some(version => version.id === input.change.basedOnVersionId)) fail('INVALID_CHANGE', 'Change basedOnVersionId does not resolve.');
        if (input.change.kind === 'return') {
          const target = previous?.state.versions?.find(version => version.id === input.change.basedOnVersionId);
          const priorIds = new Set(previous?.state.versions?.map(version => version.id) ?? []);
          const returned = state.versions?.find(version => !priorIds.has(version.id) && version.basedOnVersionId === input.change.basedOnVersionId);
          if (!target || !returned || !isDeepStrictEqual(returned.sources, target.sources) || !isDeepStrictEqual(returned.previews, target.previews) || !isDeepStrictEqual(state.sources, target.sources)) fail('INVALID_CHANGE', 'Return requires a predecessor-retained direction, a new named version of its exact retained source/preview refs, and current sources matching that direction.', 'Select the historical version, retain current protected record choices, and create a new named returned direction.');
        }
        const collected = initialClosure ?? await collect(state);
        return await persist({ state, change: input.change, parentHash: observed.commitHash, requestId: input.requestId, requestDigest: digest, collected }, progress);
      } finally { await releaseOwnLock(lock); }
    });
  }
  async function read() { return operation(async () => { const { commit } = await current(); return { state: clone(commit.state), headHash: commit.commitHash }; }); }
  async function history({ offset = 0, limit = 24 } = {}) {
    return operation(async () => { if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 128) fail('INVALID_OPTIONS', 'History offset >=0 and limit 1..128 required.'); const { commit } = await current(); const entries = []; let index = 0; let cursor = commit; while (cursor && index < offset) { cursor = cursor.parent; index++; } while (cursor && entries.length < limit) { const { event } = cursor; entries.push({ commitHash: cursor.commitHash, parentHash: event.parentHash, revision: event.revision, requestId: event.requestId, kind: event.change.kind, summary: event.change.summary }); cursor = cursor.parent; } return { entries, nextOffset: cursor ? offset + entries.length : null }; });
  }
  async function selectVersion(versionId) {
    if (!boundedString(versionId)) fail('INVALID_OPTIONS', 'Select a named version ID or commit:<sha256>.');
    const { commit } = await current();
    if (versionId.startsWith('commit:')) { const selectedHash = versionId.slice(7); if (!validHash(selectedHash)) fail('INVALID_OPTIONS', 'Invalid commit selector.'); for (let cursor = commit; cursor; cursor = cursor.parent) if (cursor.commitHash === selectedHash) return { commit: cursor, version: { id: `commit:${selectedHash}`, name: `Project revision ${cursor.state.revision}`, revision: cursor.state.revision, sources: cursor.state.sources, previews: cursor.state.outputs } }; fail('VERSION_MISSING', 'Commit selector is not reachable from current HEAD.', nextRecovery); }
    if (!validId(versionId)) fail('INVALID_OPTIONS', 'Invalid named version ID.');
    // Earliest retained owner preserves record/source provenance for that direction.
    let found; for (let cursor = commit; cursor; cursor = cursor.parent) { const version = cursor.state.versions?.find(value => value.id === versionId); if (version) found = { commit: cursor, version }; }
    if (!found) fail('VERSION_MISSING', `Unknown version ${versionId}.`, 'List project history or select an existing named version.'); return found;
  }
  async function readVersion({ versionId } = {}) { return operation(async () => { const selected = await selectVersion(versionId); return { state: clone(selected.commit.state), version: clone(selected.version), commitHash: selected.commit.commitHash }; }); }
  async function materializeVersion({ versionId, outputDir } = {}) {
    return operation(async progress => {
      const selected = await selectVersion(versionId); if (typeof outputDir !== 'string' || !outputDir.startsWith('/')) fail('PATH_ESCAPE', 'Choose an absolute exclusive output directory.'); const output = resolve(outputDir); await checkedRoot(dirname(output));
      if (output === root || output.startsWith(`${path(STORE)}/`) || output === path(STORE)) fail('PATH_ESCAPE', 'Materialization cannot target the store.');
      const selectedRefs = [...selected.version.sources, ...selected.version.previews];
      const { members, delivery: selectedDelivery } = selectedClosure(selected.commit.state, selected.version, selected.commit.trees);
      for (const reserved of ['continuation.json', 'CONTINUATION.md', 'INCOMPLETE.json']) if (members.has(reserved)) fail('PATH_COLLISION', `Selected source reserves ${reserved}; choose another source name before export.`);
      await makeDirectory(output); progress.stage = 'materialize';
      try {
        for (const member of members.values()) { await writeMember(output, member.path, member.content); progress.successfulFiles.push(member.path); await fault('materialize-member'); }
        const localRef = ref => ({ ...ref, path: treeRef(ref.path)[2] });
        let portable = { ...clone(selected.commit.state), sources: selected.version.sources.map(localRef), outputs: selected.version.previews.map(localRef), nextAction: selected.commit.state.nextAction };
        portable.versions = [{ ...clone(selected.version), id: versionId.startsWith('commit:') ? `revision-${selected.commit.state.revision}` : selected.version.id, sources: selected.version.sources.map(localRef), previews: selected.version.previews.map(localRef) }]; delete portable.versions[0].basedOnVersionId;
        if (selectedDelivery) { portable.delivery = clone(selectedDelivery); portable.delivery.artifacts = portable.delivery.artifacts.map(localRef); portable.delivery.openingFile = treeRef(portable.delivery.openingFile)[2]; }
        else delete portable.delivery;
        const explicitPaths = new Set([...portable.sources, ...portable.outputs, ...(portable.delivery?.artifacts ?? [])].map(ref => ref.path));
        for (const member of members.values()) if (!explicitPaths.has(member.path)) { portable.sources.push({ id: member.refId ?? `dependency-${sha256(member.path).slice(0, 16)}`, path: member.path, sha256: member.sha256, mediaType: member.mediaType }); explicitPaths.add(member.path); }
        assertProjectState(portable);
        await writeMember(output, 'continuation.json', `${JSON.stringify(portable, null, 2)}\n`);
        const opening = portable.delivery?.openingFile ?? portable.sources[0]?.path ?? 'continuation.json';
        const note = `# Continue this editable result\n\nOpen ${opening}. The selected direction is ${selected.version.name} (project revision ${selected.commit.state.revision}).\n\nRequested edit / next action: ${portable.nextAction ?? 'Review the retained brief and request a scoped edit.'}\n\nPreserve the supplied brief, source identities and any structured choices in continuation.json. The nested record remains the sole structured decision authority. This export retains the selected source/dependency/notice closure and omits unrelated historical versions and unreferenced tree members; the original store physically retains complete history. Hashes establish integrity only, not acceptance or engineering adequacy. No editor was launched.\n`;
        await writeMember(output, 'CONTINUATION.md', note); await flush(output, true);
        const files = [...members.values()].map(member => ({ id: `file-${sha256(member.path).slice(0, 16)}`, path: member.path, sha256: member.sha256, mediaType: member.mediaType }));
        files.push({ id: 'continuation-json', path: 'continuation.json', sha256: sha256(`${JSON.stringify(portable, null, 2)}\n`), mediaType: 'application/json' }, { id: 'continuation-note', path: 'CONTINUATION.md', sha256: sha256(note), mediaType: 'text/markdown' });
        return { files, openingFile: 'CONTINUATION.md' };
      } catch (error) { try { await writeMember(output, 'INCOMPLETE.json', `${JSON.stringify({ complete: false, stage: progress.stage, successfulFiles: progress.successfulFiles, error: error.message }, null, 2)}\n`); } catch { /* Retain existing partial files when even the receipt fails. */ } throw error; }
    });
  }
  async function acquireReleaseClaim(expectedToken) {
    const identity = await processIdentity(); if (!identity) fail('LOCKED', 'Recovery process identity is unavailable.');
    const prefix = `${STORE}/recovery/release-${sha256(expectedToken)}`;
    for (let generation = 0; generation < 1024; generation++) {
      const rel = `${prefix}-${generation}.claim.json`;
      if (await exists(path(rel))) {
        const { value: prior } = await readJSON(root, rel, 8192);
        if (!strict(prior, ['schema', 'expectedToken', 'owner']) || prior.schema !== 'ingenium-release-claim/1' || prior.expectedToken !== expectedToken) fail('CORRUPT_STATE', 'Invalid recovery claim; preserve it for inspection.');
        if (await exists(path(`${rel}.done.json`))) { const { value: done } = await readJSON(root, `${rel}.done.json`, 8192); if (done.token !== prior.owner.token || !['released', 'failed'].includes(done.outcome)) fail('CORRUPT_STATE', 'Invalid recovery claim completion.'); continue; }
        if (await lockStatus(prior.owner) !== 'abandoned') fail('LOCKED', 'An active or ambiguous recovery claimant owns this lock release.', 'Wait for the claimant; abandoned claims require positive local process-instance absence.');
        continue;
      }
      const owner = { schema: 'ingenium-lock/1', token: randomUUID(), ...identity };
      try { await writeExclusive(path(rel), canonical({ schema: 'ingenium-release-claim/1', expectedToken, owner })); await flush(path(`${STORE}/recovery`), true); return { rel, owner }; }
      catch (error) { if (error.code === 'EEXIST') { generation--; continue; } throw error; }
    }
    fail('LIMIT_EXCEEDED', 'Recovery claim generations exceed bound; preserve metadata for manual inspection.');
  }
  async function inspectRecovery() {
    const head = await rawHead(); const reachable = new Set();
    if (head.status === 'valid') { try { let commit = await verifyCommit(head.commitHash); while (commit) { reachable.add(commit.commitHash); commit = commit.parent; } } catch (error) { head.status = 'corrupt'; head.diagnostic = error.message; } }
    const lock = await getLock(); delete lock.metadata;
    const pending = []; if (await exists(path(`${STORE}/pending`))) { await checkedPath(root, `${STORE}/pending`, { directory: true, ownerOnly: true }); for (const id of await readdir(path(`${STORE}/pending`))) { if (!isRelativePath(id) || id.includes('/')) fail('CORRUPT_STATE', 'Invalid pending entry.'); const rel = `${STORE}/pending/${id}`; await checkedPath(root, rel, { directory: true, ownerOnly: true }); const complete = await exists(path(`${rel}/commit/manifest.json`)); pending.push({ id, stage: complete ? 'commit-staged' : await exists(path(`${rel}/tree`)) ? 'artifact-staged' : 'transaction-retained', complete }); } }
    const orphans = []; if (await exists(path(`${STORE}/commits`))) { await checkedPath(root, `${STORE}/commits`, { directory: true, ownerOnly: true }); for (const commitHash of await readdir(path(`${STORE}/commits`))) { if (reachable.has(commitHash)) continue; let verified = false; try { await verifyCommit(commitHash); verified = true; } catch { /* Diagnostic candidate, never promoted. */ } orphans.push({ commitHash, verified }); } }
    return { head, lock, pending, orphans };
  }
  async function recover(input = {}) {
    return operation(async progress => {
      if (!strict(input, ['mode'], input.mode === 'inspect' ? [] : input.mode === 'release-lock' ? ['expectedLockToken', 'reason'] : ['commitHash', 'expectedHeadHash', 'expectedHeadFileHash', 'reason'])) fail('INVALID_OPTIONS', 'Invalid recovery fields.');
      if (input.mode === 'inspect') return inspectRecovery();
      if (input.mode === 'release-lock') {
        if (!boundedString(input.expectedLockToken) || !boundedString(input.reason)) fail('INVALID_OPTIONS', 'Lock release requires token and reason.');
        const before = await getLock(); if (before.token !== input.expectedLockToken) fail('LOCK_CHANGED', 'Lock token changed; no lock released.'); if (before.status !== 'abandoned') fail('LOCKED', `Lock status is ${before.status}; safe release refused.`, 'Wait for live owner or obtain positive local process-instance absence evidence.');
        await checkedPath(root, `${STORE}/recovery`, { directory: true, ownerOnly: true });
        // Append-only per-token claims serialize recovery operations themselves.
        // A crash leaves a process-bound claim; a successor may advance only after
        // positive instance absence, never because the claim or writer lock is old.
        const claim = await acquireReleaseClaim(input.expectedLockToken); let outcome = 'failed';
        try {
          await fault('after-release-claim');
          const again = await getLock(); if (again.token !== before.token || again.status !== 'abandoned' || !isDeepStrictEqual(before.metadata, again.metadata)) fail('LOCK_CHANGED', 'Lock ownership/evidence changed during release.');
          await fault('before-lock-release');
          const target = `${STORE}/recovery/released-${randomUUID()}.lock`; await rename(path(`${STORE}/writer.lock`), path(target)); await flush(path(STORE), true); await flush(path(`${STORE}/recovery`), true);
          await writeExclusive(path(`${target}.receipt.json`), canonical({ schema: 'ingenium-lock-release/1', token: before.token, reason: input.reason, metadata: before.metadata, claim: claim.rel })); await flush(path(`${STORE}/recovery`), true);
          outcome = 'released'; return { released: true };
        } finally {
          await writeExclusive(path(`${claim.rel}.done.json`), canonical({ token: claim.owner.token, outcome })); await flush(path(`${STORE}/recovery`), true);
        }
      }
      if (input.mode !== 'select' || !validHash(input.commitHash ?? '') || !(input.expectedHeadHash === null || validHash(input.expectedHeadHash ?? '')) || !(input.expectedHeadFileHash === null || validHash(input.expectedHeadFileHash ?? '')) || !boundedString(input.reason)) fail('INVALID_OPTIONS', 'select requires candidate hash, both observed head identities and reason.');
      await metadata(); const lock = await acquireLock();
      try {
        const observed = await rawHead(); if (observed.commitHash !== input.expectedHeadHash || observed.fileHash !== input.expectedHeadFileHash) fail('STALE_HEAD', 'Observed HEAD identities changed during recovery.', nextRecovery);
        const candidate = await verifyCommit(input.commitHash); let healthy = null;
        if (observed.status === 'valid') { try { healthy = await verifyCommit(observed.commitHash); } catch { /* Explicit corrupt-chain disaster recovery. */ } }
        if (healthy && !isDeepStrictEqual(healthy.state.record, candidate.state.record)) fail('PROTECTED_RECORD', 'Healthy-head recovery cannot replace the current authoritative record.', 'Use ordinary commit transitions with explicit reopen/reselection as required.');
        if (healthy && healthy.state.projectId !== candidate.state.projectId) fail('IDENTITY_MISMATCH', 'Recovery candidate belongs to another project.');
        progress.lastDurableHead = healthy?.commitHash ?? null;
        const base = healthy ?? candidate; const state = clone(candidate.state); state.revision = base.state.revision + 1;
        if (!Number.isSafeInteger(state.revision)) fail('REVISION_EXHAUSTED', 'Recovery revision cannot increment.');
        if (healthy) { const versions = new Map((healthy.state.versions ?? []).map(version => [version.id, version])); for (const version of candidate.state.versions ?? []) { if (versions.has(version.id) && !isDeepStrictEqual(versions.get(version.id), version)) fail('IMMUTABLE_VERSION', 'Recovery version identity differs from current history.'); versions.set(version.id, version); } if (versions.size) state.versions = [...versions.values()]; }
        const change = { kind: 'recover', summary: healthy ? 'Explicit recovery selection from verified retained history.' : 'Disaster recovery of verified earlier state; more recent state and choices may be unknown.', reason: input.reason };
        const requestId = `recovery:${randomUUID()}`; const collected = await collect(state);
        return await persist({ state, change, parentHash: base.commitHash, requestId, requestDigest: hash({ baseHeadHash: observed.commitHash, state, change }), collected, recovery: { recoveredFrom: candidate.commitHash, disasterRecovery: !healthy } }, progress);
      } finally { await releaseOwnLock(lock); }
    });
  }
  return Object.freeze({ read, commit, history, readVersion, materializeVersion, recover });
}
