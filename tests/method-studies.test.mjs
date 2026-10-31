import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildMethodStudies, writeMethodStudies, verifyMethodStudySources } from '../tools/generate-method-studies.mjs';
import { renderMethodStudies } from '../tools/render-method-studies.mjs';
import { checkMethodContrast } from '../tools/check-method-contrast.mjs';
import { discoverCapabilities } from '../src/svg/index.js';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function workspace(t) {
  await mkdir('work', { recursive: true });
  const dir = await mkdtemp(resolve('work/method-studies-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('published editable collection and source manifest match reproducible original generator outputs', async () => {
  const studies = buildMethodStudies();
  assert.equal(studies.length, 8);
  assert.equal(new Set(studies.map(x => x.id)).size, 8);
  const manifest = JSON.parse(await readFile(new URL('../examples/methods/source/manifest.json', import.meta.url)));
  assert.equal(manifest.renderStatus, 'not-run');
  for (const study of studies) {
    const item = manifest.artifacts.find(x => x.id === study.id);
    assert.ok(item, study.id);
    const bytes = await readFile(new URL(`../examples/methods/source/${item.file}`, import.meta.url));
    assert.equal(bytes.toString(), study.svg);
    assert.equal(digest(bytes), item.sha256);
    assert.equal(bytes.length, item.bytes);
    assert.equal(item.provenance.license, 'MIT');
    const {svg,...metadata}=study;
    const {file,bytes:byteCount,sha256,...retained}=item;
    assert.deepEqual(retained,metadata);
  }
  // Callers can adapt a returned record without mutating subsequent studies.
  studies[0].provenance.license = 'changed';
  assert.equal(buildMethodStudies()[0].provenance.license, 'MIT');
});

test('generation refuses an existing destination without replacing sources or unrelated files', async t => {
  const dir = await workspace(t);
  const destination = join(dir, 'sources');
  await writeMethodStudies(destination);
  await writeFile(join(destination, 'keep.txt'), 'existing user work');
  const before = await readFile(join(destination, 'manifest.json'));
  await assert.rejects(writeMethodStudies(destination), { code: 'EEXIST' });
  assert.deepEqual(await readFile(join(destination, 'manifest.json')), before);
  assert.equal(await readFile(join(destination, 'keep.txt'), 'utf8'), 'existing user work');
});

test('published previews and contrast evidence bind the current editable sources', async () => {
  const receipt = JSON.parse(await readFile(new URL('../examples/methods/previews/render-manifest.json', import.meta.url)));
  assert.equal(receipt.status, 'rendered');
  assert.deepEqual(receipt.artifacts.map(x => x.id).sort(), buildMethodStudies().map(x => x.id).sort());
  for (const artifact of receipt.artifacts) {
    const source = await readFile(new URL(`../examples/methods/source/${artifact.id}.svg`, import.meta.url));
    const preview = await readFile(new URL(`../examples/methods/previews/${artifact.id}.png`, import.meta.url));
    assert.equal(artifact.sourceHash, digest(source));
    assert.equal(artifact.outputHash, digest(preview));
    assert.equal(preview.readUInt32BE(16), artifact.width);
    assert.equal(preview.readUInt32BE(20), artifact.height);
  }
  const contrast = JSON.parse(await readFile(new URL('../examples/methods/contrast-report.json', import.meta.url)));
  for (const source of contrast.sources) {
    assert.equal(source.sha256, digest(await readFile(new URL(`../examples/methods/source/${source.id}.svg`, import.meta.url))));
  }
  const fresh = checkMethodContrast();
  // Node 22 and 24 differ by a few floating-point units in exponentiation.
  // Compare identities/statuses exactly; tolerate only arithmetic noise in receipts.
  for (const [index, pair] of contrast.pairs.entries()) {
    assert.ok(Math.abs(pair.ratio - fresh.pairs[index].ratio) <= 8 * Number.EPSILON * Math.max(1, pair.ratio), 'retained contrast arithmetic remains equivalent');
  }
  assert.deepEqual(contrast, { ...fresh, pairs: fresh.pairs.map((pair, index) => ({ ...pair, ratio: contrast.pairs[index].ratio })) }, 'statuses and source bindings match exactly; contrast thresholds remain unrounded');
  assert.ok(contrast.pairs.every(pair => pair.status === 'pass' && pair.ratio >= pair.threshold));
});

test('explicit missing renderer refuses without installing, falling back or creating export directory', async t => {
  const dir = await workspace(t);
  const rendererDir = join(dir, 'empty-renderer');
  await mkdir(rendererDir);
  const outputDir = join(dir, 'previews');
  await assert.rejects(renderMethodStudies({ sourceDir: dir, outputDir, rendererDir }), /Renderer absent/);
  assert.deepEqual(await readdir(dir), ['empty-renderer']);
  assert.deepEqual(await readdir(rendererDir), []);
});

test('all eight edited sources render through existing SVG admission and preserve exact source bytes', async t => {
  const renderer = await discoverCapabilities();
  if (renderer.sharp.status !== 'present') { t.skip(`Optional renderer ${renderer.sharp.status}`); return; }
  const dir = await workspace(t);
  const sourceDir = join(dir, 'sources');
  await writeMethodStudies(sourceDir,{subjectTitle:'Task light',collageSpacingScale:4});
  for(const study of buildMethodStudies()) assert.ok((await readFile(join(sourceDir,`${study.id}.svg`),'utf8')).includes('Task light'));
  // A real editable-source change must be reflected by the render receipt.
  const editedPath = join(sourceDir, 'structural-wireframe.svg');
  await writeFile(editedPath, (await readFile(editedPath, 'utf8')).replace('Task light', 'Reading lamp'));
  const before = new Map(await Promise.all(buildMethodStudies().map(async s => [s.id, await readFile(join(sourceDir, `${s.id}.svg`))])));
  const outputDir = join(dir, 'previews');
  const manifest = await renderMethodStudies({ sourceDir, outputDir });
  assert.equal(manifest.artifacts.length, 8);
  for (const item of manifest.artifacts) {
    const source = await readFile(join(sourceDir, item.source));
    const png = await readFile(join(outputDir, item.output));
    assert.deepEqual(source, before.get(item.id));
    assert.equal(item.sourceHash, digest(source));
    assert.equal(item.outputHash, digest(png));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 800);
    assert.equal(item.renderer.name, 'sharp');
  }
  const receipt = await readFile(join(outputDir, 'render-manifest.json'));
  await assert.rejects(renderMethodStudies({ sourceDir, outputDir }), { code: 'EEXIST' });
  assert.deepEqual(await readFile(join(outputDir, 'render-manifest.json')), receipt);
});

test('failed source admission cannot produce a completed render manifest', async t => {
  if ((await discoverCapabilities()).sharp.status !== 'present') { t.skip('Optional renderer absent'); return; }
  const dir = await workspace(t);
  const sourceDir = join(dir, 'sources');
  await writeMethodStudies(sourceDir);
  const path = join(sourceDir, 'structural-wireframe.svg');
  const unsupported = '<svg width="10" height="10"><script>bad()</script></svg>';
  await writeFile(path, unsupported);
  const outputDir = join(dir, 'previews');
  await assert.rejects(renderMethodStudies({ sourceDir, outputDir }), /Unsupported|unsupported/);
  assert.equal(await readFile(path, 'utf8'), unsupported);
  assert.deepEqual(await readdir(outputDir), []);
});

test('study identities and source anchors distinguish views from shared domain subjects without claiming execution', () => {
  const studies = buildMethodStudies();
  assert.equal(new Set(studies.map(study => study.artifactID)).size, 8);
  const allViewIds = new Set();
  for (const study of studies) {
    assert.equal(study.schema, 'ingenium-method-study/1');
    assert.equal(study.modelVersion, null);
    assert.equal(study.modelBinding.status, 'not-applicable');
    assert.ok(study.scenarioID && study.revision > 0);
    const behavior = study.claims.find(claim => claim.id === 'interaction-specification');
    assert.equal(study.claims.find(claim => claim.id === 'study-intent').specificationStatus, 'authored');
    assert.equal(study.claims.find(claim => claim.id === 'runtime-behavior').result, behavior.specificationStatus === 'specified' ? 'not-checked' : 'N/A');
    assert.equal(study.claims.find(claim => claim.id === 'user-acceptance').result, 'not-checked');
    const sourceIds = [...study.svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(sourceIds).size, sourceIds.length, `${study.id}: unique SVG anchors`);
    for (const element of study.viewElements) {
      assert.ok(sourceIds.includes(element.id), `${study.id}: resolvable ${element.id}`);
      assert.ok(!allViewIds.has(element.id), `distinct view identity: ${element.id}`);
      allViewIds.add(element.id);
      if (element.domainID) assert.notEqual(element.id, element.domainID);
    }
    assert.ok(study.omissions.length > 0);
  }
  const sequence = studies.find(study => study.id === 'state-sequence');
  assert.equal(new Set(sequence.viewElements.filter(element => element.role === 'assignee field').map(element => element.domainID)).size, 1);
  sequence.stateContract.snapshots[1].workingModel.assigneeId = 'changed';
  assert.equal(buildMethodStudies().find(study => study.id === 'state-sequence').stateContract.snapshots[1].workingModel.assigneeId, 'relay:person:mina-patel');
});

test('retained invalid input, automatic valid update and scoped model undo keep distinct revisions and acknowledgement', () => {
  const sequence=buildMethodStudies().find(study=>study.id==='state-sequence');
  const contract=sequence.stateContract;
  const [invalid,repaired,applied,undone]=contract.snapshots;
  assert.equal(invalid.rawDraft.status,'invalid');
  assert.equal(invalid.workingModel.semanticRevision,contract.baseline.semanticRevision);
  assert.equal(invalid.workingModel.assigneeId,null);
  assert.equal(repaired.rawDraft.status,'valid');
  assert.notEqual(repaired.workingModel.semanticRevision,invalid.workingModel.semanticRevision);
  assert.equal(applied.workingModel.semanticRevision,repaired.workingModel.semanticRevision);
  assert.equal(applied.rawDraft,null);
  assert.equal(undone.workingModel.assigneeId,invalid.workingModel.assigneeId);
  assert.notEqual(undone.workingModel.semanticRevision,invalid.workingModel.semanticRevision);
  assert.notEqual(undone.workingModel.semanticRevision,applied.workingModel.semanticRevision);
  for(const snapshot of contract.snapshots) {
    assert.equal(snapshot.acknowledgedSave.semanticRevision,contract.baseline.semanticRevision);
    assert.equal(snapshot.validation.executed,false);
    assert.equal(snapshot.saveStatus,'not-requested');
    assert.ok(sequence.svg.includes(`id="${snapshot.viewElementId}"`));
  }
  assert.equal(contract.undo.newSemanticRevision,undone.workingModel.semanticRevision);
  assert.match(contract.receiptRule,/Reject stale/);
  assert.match(sequence.svg,/Mina\?/);
  const fontplate=buildMethodStudies().find(study=>study.id==='fontplate');
  assert.equal(fontplate.comparison.kind,'fixed-metrics family-request comparison');
  assert.ok(fontplate.comparison.modes.fixedMetrics && fontplate.comparison.modes.tunedFit);
  assert.equal((fontplate.svg.match(/Inspect the switch before service\./g)||[]).length,2);
});

test('canonical title option changes every visible study projection without changing subject identity', () => {
  const baseline=buildMethodStudies();
  const changed=buildMethodStudies({subjectTitle:'Task light & bracket'});
  for(let i=0;i<baseline.length;i++) {
    assert.equal(changed[i].semanticFixture.domainID,baseline[i].semanticFixture.domainID);
    assert.equal(changed[i].artifactID,baseline[i].artifactID);
    assert.notEqual(changed[i].sourceScenario.revision,baseline[i].sourceScenario.revision);
    assert.ok(changed[i].svg.includes('Task light &amp; bracket'));
    assert.ok(!changed[i].svg.includes('Bench lamp'));
    assert.notEqual(changed[i].svg,baseline[i].svg);
  }
  assert.throws(()=>buildMethodStudies({subjectTitle:''}),/subjectTitle/);
  assert.throws(()=>buildMethodStudies({collageSpacingScale:6}),/collageSpacingScale/);
});

test('appearance-only parameter changes its declared source without mutating canonical semantics', () => {
  const baseline=buildMethodStudies(),changed=buildMethodStudies({collageSpacingScale:4});
  for(let i=0;i<baseline.length;i++) {
    assert.deepEqual(changed[i].semanticFixture,baseline[i].semanticFixture);
    assert.equal(changed[i].sourceScenario.revision,baseline[i].sourceScenario.revision);
    if(changed[i].id==='element-collage') assert.notEqual(changed[i].svg,baseline[i].svg);
    else assert.equal(changed[i].svg,baseline[i].svg);
  }
});

test('explicit source verification detects a stale manifest after an editable source change', async t => {
  const dir=await workspace(t),destination=join(dir,'source');
  await writeMethodStudies(destination,{subjectTitle:'Task light'});
  assert.equal((await verifyMethodStudySources(destination)).result,'pass');
  const path=join(destination,'wireflow.svg');
  await writeFile(path,(await readFile(path,'utf8')).replace('Task light','Changed source'));
  const report=await verifyMethodStudySources(destination);
  assert.equal(report.result,'fail');
  assert.ok(report.issues.some(issue=>issue.includes('wireflow: stale')));
});


test('wireflow binds its saved route to a visible matching acknowledgement and pre-submit cancel to unchanged queue', () => {
  const study=buildMethodStudies().find(item=>item.id==='wireflow');
  const anchors=new Set([...study.svg.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
  const edges=study.edges;
  assert.equal(new Set(edges.map(edge=>edge.id)).size,edges.length);
  for(const edge of edges) {
    for(const id of [edge.id,edge.sourceStateID,edge.destinationStateID,edge.controlRef].filter(Boolean)) assert.ok(anchors.has(id),`${edge.id}: resolvable ${id}`);
    for(const label of edge.labels) {
      const node=study.svg.match(new RegExp(`<text id="${label.id}"[^>]*>([^<]*)</text>`));
      assert.ok(node,`${edge.id}: visible ${label.purpose}`);
      assert.equal(node[1],label.text,`${edge.id}: rendered label matches route source`);
    }
  }
  const saved=edges.filter(edge=>edge.destinationStateID==='wireflow-updated');
  assert.equal(saved.length,1);
  assert.equal(saved[0].triggerKind,'save acknowledgement');
  assert.equal(saved[0].sourceStateID,'wireflow-pending');
  assert.equal(saved[0].controlRef,null);
  assert.deepEqual(Object.keys(saved[0].requiredAcknowledgement).sort(),['freshness','requestID','requestedRevision']);
  const acknowledgementLabel=saved[0].labels.find(label=>label.guardRef==='requiredAcknowledgement');
  assert.ok(acknowledgementLabel && anchors.has(acknowledgementLabel.id));
  const cancel=edges.find(edge=>edge.id==='wireflow-edge-cancel');
  assert.equal(cancel.sourceStateID,'wireflow-detail');
  assert.equal(cancel.destinationStateID,'wireflow-queue');
  assert.deepEqual(cancel.cancellation,{scope:'unsubmitted command',inFlight:false,discards:'command draft',changesWorkingModel:false});
  assert.equal(edges.find(edge=>edge.id==='wireflow-edge-refuse').destinationStateID,'wireflow-detail');
});


test('wireflow separates local working values, pending requests, matching acknowledgement and retained-input failure', () => {
  const study=buildMethodStudies().find(item=>item.id==='wireflow');
  const states=new Map(study.states.map(state=>[state.id,state]));
  assert.equal(states.size,5);
  for(const state of states.values()) {
    const text=study.svg.match(new RegExp(`<text id="${state.revisionLabelID}"[^>]*>([^<]*)</text>`));
    assert.ok(text,`${state.id}: visible revision ledger`);
    assert.ok(text[1].includes(`Working ${state.workingRevision} · acknowledged ${state.acknowledgedRevision}`));
  }
  for(const edge of study.edges) {
    assert.ok(states.has(edge.sourceStateID));
    assert.ok(states.has(edge.destinationStateID));
  }
  const local=states.get('wireflow-detail'),pending=states.get('wireflow-pending'),failed=states.get('wireflow-failed'),saved=states.get('wireflow-updated');
  assert.equal(local.saveStatus,'not-requested');
  assert.notEqual(local.workingRevision,local.acknowledgedRevision);
  assert.equal(pending.saveStatus,'pending');
  assert.equal(pending.workingRevision,local.workingRevision);
  assert.equal(pending.acknowledgedRevision,local.acknowledgedRevision);
  const submit=study.edges.find(edge=>edge.id==='wireflow-edge-submit');
  assert.equal(submit.sourceStateID,local.id);
  assert.equal(submit.destinationStateID,pending.id);
  assert.equal(submit.controlRef,'wireflow-detail-action');
  assert.equal(submit.request.newIdentityPerAttempt,true);
  assert.equal(failed.saveStatus,'failed');
  assert.equal(failed.rawValue,pending.rawValue);
  assert.equal(failed.workingRevision,pending.workingRevision);
  assert.equal(failed.acknowledgedRevision,pending.acknowledgedRevision);
  const failure=study.edges.find(edge=>edge.id==='wireflow-edge-fail');
  assert.deepEqual(failure.failure,{retainsRawValue:true,retainsWorkingRevision:true,advancesAcknowledgedRevision:false});
  const retry=study.edges.find(edge=>edge.id==='wireflow-edge-retry');
  assert.equal(retry.sourceStateID,failed.id);
  assert.equal(retry.destinationStateID,pending.id);
  assert.equal(retry.request.newIdentityPerAttempt,true);
  assert.equal(saved.saveStatus,'acknowledged');
  assert.equal(saved.acknowledgedRevision,saved.workingRevision);
  const queue=states.get('wireflow-queue');
  assert.equal(queue.workingRevision,local.workingRevision);
  assert.equal(queue.acknowledgedRevision,local.acknowledgedRevision);
});

test('desktop retained invalid draft shows its correction and unavailable assignment action separately from valid model and note session', () => {
  const study=buildMethodStudies().find(item=>item.id==='desktop-workflow');
  const state=study.assignmentState;
  assert.equal(state.rawDraft.status,'invalid');
  assert.equal(state.workingModel.assigneeId,null);
  assert.equal(state.workingModel.semanticRevision,state.acknowledgedRevision);
  assert.equal(state.action.enabled,false);
  for(const item of [state.error,state.action]) {
    const anchor=study.svg.match(new RegExp(`id="${item.id}"[^>]*>(.*?)</(?:text|g)>`));
    assert.ok(anchor,`${item.id}: rendered`);
    assert.ok(anchor[1].includes(item.text),`${item.id}: rendered label matches state contract`);
  }
  assert.match(study.eventLedger.policy,/Automatic valid/);
  assert.equal(study.eventLedger.matrix.note,'Independent subject/field session');
});


test('maximum and realistic long titles use bounded visible slots while retaining complete canonical editable text', () => {
  for(const subjectTitle of ['W'.repeat(40),'Portable inspection lamp and bracket']) {
    const studies=buildMethodStudies({subjectTitle});
    for(const study of studies) {
      assert.equal(study.semanticFixture.subjectTitle,subjectTitle);
      assert.ok(study.titlePresentations.length>0);
      for(const slot of study.titlePresentations) {
        assert.ok(slot.fullText.includes(subjectTitle));
        assert.ok([...slot.visibleText].length<=slot.characterBudget);
        const full=slot.fullText.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
        const visible=slot.visibleText.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
        assert.ok(study.svg.includes(`<title id="${slot.id}-full">${full}</title>`));
        const node=study.svg.match(new RegExp(`<text id="${slot.id}-visible"[^>]*>([^<]*)</text>`));
        assert.equal(node?.[1],visible);
        if([...slot.fullText].length>slot.characterBudget) assert.ok(slot.visibleText.endsWith('…'));
      }
    }
  }
  assert.throws(()=>buildMethodStudies({subjectTitle:'W'.repeat(41)}),/subjectTitle/);
  assert.throws(()=>buildMethodStudies({subjectTitle:'A\u0085B'}),/subjectTitle/);
});
