import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { main } from '../bin/ingenium-tools.mjs';
import { createContinuation, validateProjectState } from '../src/project-state/index.mjs';
import { validateInspectionProfiles } from '../src/project/index.mjs';
import { commands, toolCommands } from '../src/cli/commands.mjs';
import { commandHelp } from '../src/cli/help.mjs';
import { parseCommand } from '../src/cli/parse.mjs';

const checkout = resolve(import.meta.dirname, '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ref = (id, path, bytes) => ({ id, path, sha256: digest(bytes), mediaType: 'image/svg+xml' });
async function temporary(t) { await mkdir(join(checkout, 'work'), { recursive: true }); const root = await mkdtemp(join(checkout, 'work/cli-repairs-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
const binary = (product, args, cwd) => spawnSync(process.execPath, [join(checkout, `bin/${product}.mjs`), ...args], { cwd, encoding: 'utf8' });
const capture = async args => { let result; const exit = await main(args, value => { result = value; }); return { exit, result }; };

test('actual continuation binary retains the brief and choice, roots exact current refs at its document and creates no store', async t => {
  const root = await temporary(t), documents = join(root, 'documents'); await mkdir(documents);
  const source = '<svg xmlns="http://www.w3.org/2000/svg"><text>Original synthetic source</text></svg>';
  await writeFile(join(documents, 'source.svg'), source); await writeFile(join(root, 'source.svg'), 'wrong cwd file');
  const record = { version: 1, id: 'record', revision: 0, purpose: 'Synthetic selection', evidence: [], interpretations: [], artifacts: [], decisions: [{ id: 'palette', question: 'Which color?', scope: 'Title only', status: 'chosen', choice: 'Emerald green', evidenceIds: [], interpretationIds: [] }] };
  const state = createContinuation({ projectId: 'repair-study', brief: 'Keep the original geometry and the settled title color.', record, sources: [ref('source', 'source.svg', source)], outputs: [ref('preview', 'preview.svg', source)], nextAction: 'Increase only the title weight.' });
  await writeFile(join(documents, 'preview.svg'), source);
  const file = join(documents, 'continuation.json'); await writeFile(file, JSON.stringify(state));
  const before = await readdir(documents);
  const text = binary('ingenium', ['project', 'continue', file], root);
  assert.equal(text.status, 0, text.stdout + text.stderr); assert.match(text.stdout, /Brief: Keep the original geometry/); assert.match(text.stdout, /Choice palette \(chosen\): Emerald green/); assert.match(text.stdout, /Sources: pass \(2\/2/);
  const json = binary('ingenium', ['project', 'continue', file, '--json'], root), summary = JSON.parse(json.stdout);
  assert.equal(summary.brief, state.brief); assert.deepEqual(summary.choices, record.decisions); assert.equal(summary.sourceVerification.refs[0].actualSHA256, digest(source)); assert.equal(summary.saved, false);
  await writeFile(join(documents, 'source.svg'), source + 'changed'); await rm(join(documents, 'preview.svg'));
  const changed = binary('ingenium', ['project', 'continue', file, '--json'], root), failure = JSON.parse(changed.stdout);
  assert.equal(changed.status, 1); assert.equal(failure.sourceVerification.status, 'fail'); assert.equal(failure.sourceVerification.refs[0].code, 'SOURCE_CHANGED'); assert.equal(failure.sourceVerification.refs[1].code, 'SOURCE_MISSING'); assert.equal(failure.brief, state.brief);
  assert.equal(validateProjectState(state).valid, true, 'pure validation does not open files');
  assert.deepEqual((await readdir(documents)).sort(), before.filter(name => name !== 'preview.svg').sort()); assert.deepEqual((await readdir(root)).sort(), ['documents', 'source.svg']);
});

test('continuation refuses linked file/directory refs and unsafe paths while empty optional refs stay usable', async t => {
  const root = await temporary(t), outer = join(root, 'outer'); await mkdir(outer); await writeFile(join(outer, 'source.svg'), '<svg/>');
  const dir = join(root, 'documents'); await mkdir(dir); await symlink(outer, join(dir, 'linked')); await symlink(join(outer, 'source.svg'), join(dir, 'linked.svg'));
  const state = createContinuation({ projectId: 'links', brief: 'Original symlink refusal fixture', sources: [ref('directory-link', 'linked/source.svg', '<svg/>'), ref('file-link', 'linked.svg', '<svg/>')] });
  const file = join(dir, 'continuation.json'); await writeFile(file, JSON.stringify(state));
  const links = binary('ingenium', ['project', 'continue', file, '--json'], root); assert.equal(links.status, 1); assert.ok(JSON.parse(links.stdout).sourceVerification.refs.every(r => r.code === 'PATH_ESCAPE'));
  for (const path of ['../outer/source.svg', '/absolute.svg', 'encoded%2fsource.svg']) {
    await writeFile(file, JSON.stringify({ ...state, sources: [{ ...state.sources[0], path }], outputs: [] }));
    const invalid = binary('ingenium', ['project', 'continue', file, '--json'], root); assert.equal(invalid.status, 2); assert.equal(JSON.parse(invalid.stdout).category, 'usage');
  }
  await writeFile(file, JSON.stringify(createContinuation({ projectId: 'empty', brief: 'Guidance-only work needs no stored source.' })));
  const empty = binary('ingenium', ['project', 'continue', file, '--json'], root); assert.equal(empty.status, 0); assert.equal(JSON.parse(empty.stdout).sourceVerification.status, 'not-applicable');
});

test('legacy config errors point into the supplied second profile, and all bad baselines refuse before output', async t => {
  const root = await temporary(t), config = join(root, 'legacy.json'), output = join(root, 'never-created');
  const profiles = [{ name: 'desktop', viewport: { width: 800, height: 600 } }, { name: 'phone', viewport: { width: 390, height: 844 }, states: [{ name: 'open', steps: [{ action: 'invented', selector: '#open' }] }] }];
  await writeFile(config, JSON.stringify({ profiles }));
  const action = await capture(['inspect', 'http://127.0.0.1:3000', output, '--config', config]);
  assert.equal(action.exit, 2); assert.equal(action.result.category, 'usage'); assert.equal(action.result.field, '$.profiles[1].states[0].steps[0].action'); assert.doesNotMatch(action.result.message, /routes/);
  profiles[1].states[0].steps = []; profiles[1].viewport.width = 0; await writeFile(config, JSON.stringify({ profiles }));
  const viewport = await capture(['inspect', 'http://127.0.0.1:3000', output, '--config', config]); assert.equal(viewport.exit, 2); assert.equal(viewport.result.field, '$.profiles[1].viewport.width');
  profiles[1].viewport.width = 390; profiles[1].journeys = [{ name: 'focus', steps: [{ action: 'fill', selector: '#name', value: 42 }] }];
  const checked = validateInspectionProfiles(profiles); assert.equal(checked.valid, false); assert.equal(checked.errors[0].path, '$.profiles[1].journeys[0].steps[0].value');
  const unknown = validateInspectionProfiles([{ name: 'desktop', id: 'overridden', viewport: { width: 800, height: 600 } }]); assert.equal(unknown.valid, false); assert.equal(unknown.errors[0].path, '$.profiles[0].id');
  let accessed = false; const nonJSON = { get name() { accessed = true; return 'desktop'; } }; assert.equal(validateInspectionProfiles([nonJSON]).valid, false); assert.equal(accessed, false);
  const plan = { schema: 'ingenium-inspection-plan/1', origin: 'http://127.0.0.1:3000', profiles: [{ id: 'desktop', viewport: { width: 800, height: 600 } }], routes: [{ id: 'home', path: '/', profiles: ['desktop'], states: [{ id: 'default', steps: [] }] }], budgets: { maxCaptures: 4, deadlineMs: 1000 } };
  const planFile = join(root, 'plan.json'), previous = join(root, 'previous.json'); await writeFile(planFile, JSON.stringify(plan));
  for (const snapshot of [{}, { version: 1, kind: 'ingenium-project', route: '/', pages: [] }]) {
    await writeFile(previous, JSON.stringify(snapshot));
    const result = await capture(['inspect-set', planFile, output, '--previous', previous]); assert.equal(result.exit, 2); assert.equal(result.result.category, 'usage'); assert.equal(result.result.field, '--previous'); assert.equal(result.result.stage, 'preflight'); assert.deepEqual(result.result.incompleteOutputs, []);
  }
  await writeFile(previous, JSON.stringify({ version: 1, kind: 'ingenium-project', route: '/', pages: [null] }));
  const invalidLegacy = await capture(['inspect', plan.origin, output, '--previous', previous]); assert.equal(invalidLegacy.exit, 2); assert.equal(invalidLegacy.result.code, 'INVALID_INSPECTION_SNAPSHOT'); assert.equal(invalidLegacy.result.field, '--previous');
  assert.deepEqual((await readdir(root)).sort(), ['legacy.json', 'plan.json', 'previous.json']);
});

test('explicit legacy null collections and missing names refuse at supplied fields while omitted defaults remain valid', async t => {
  const root = await temporary(t), file = join(root, 'profiles.json'), output = join(root, 'never-created');
  const base = () => ({ name: 'phone', viewport: { width: 390, height: 844 } });
  const first = { name: 'desktop', viewport: { width: 800, height: 600 } };
  assert.equal(validateInspectionProfiles([first, base()]).valid, true);
  const cases = [
    [{ viewport: { width: 390, height: 844 } }, '$.profiles[1].name'],
    [{ ...base(), states: null }, '$.profiles[1].states'],
    [{ ...base(), journeys: null }, '$.profiles[1].journeys'],
    [{ ...base(), states: [{ name: 'default', steps: null }] }, '$.profiles[1].states[0].steps'],
    [{ ...base(), journeys: [{ name: 'focus', steps: null }] }, '$.profiles[1].journeys[0].steps'],
    [{ ...base(), states: [{}] }, '$.profiles[1].states[0].name'],
    [{ ...base(), journeys: [{}] }, '$.profiles[1].journeys[0].name'],
  ];
  for (const [profile, field] of cases) {
    await writeFile(file, JSON.stringify({ profiles: [first, profile] }));
    const result = binary('ingenium-tools', ['inspect', 'http://127.0.0.1:3000', output, '--config', file, ...(process.env.INGENIUM_BROWSER_ADAPTER_DIR ? ['--adapter-dir', process.env.INGENIUM_BROWSER_ADAPTER_DIR] : [])], root);
    assert.equal(result.status, 2, result.stdout + result.stderr); const payload = JSON.parse(result.stdout);
    assert.equal(payload.category, 'usage'); assert.equal(payload.stage, 'preflight'); assert.equal(payload.field, field); assert.deepEqual(payload.incompleteOutputs, []); assert.deepEqual(await readdir(root), ['profiles.json']);
  }
});

test('operation help gives relevant examples, argument meanings and output boundaries for each actual command', async t => {
  const root = await temporary(t);
  for (const [product, inventory] of [['ingenium', commands], ['ingenium-tools', toolCommands]]) {
    for (const command of inventory) {
      const help = commandHelp({ product, topic: command.path });
      assert.equal(help.commands.length, 1); assert.ok(help.outputs[0].length > 30);
      if (command.min) assert.ok(help.commands[0].arguments.length, command.path);
      for (const argument of help.commands[0].arguments) assert.ok(argument.meaning?.length > 10, `${command.path}: ${argument.name}`);
      for (const example of help.examples) { const args = example.split(' ').slice(1); assert.equal(parseCommand(args, product).entry.path, command.path); }
    }
  }
  const continued = binary('ingenium', ['help', 'project', 'continue', '--json'], root), help = JSON.parse(continued.stdout);
  assert.equal(continued.status, 0); assert.deepEqual(help.examples, ['ingenium project continue continuation.json --json']); assert.match(help.outputs[0], /Missing\/changed refs exit 1/); assert.equal(help.commands[0].arguments[0].name, 'CONTINUATION.json');
  const palette = binary('ingenium', ['palettes', 'inspect', 'radix-green-light'], root); assert.equal(palette.status, 0, palette.stdout);
  const review = binary('ingenium', ['help', 'review', '--json'], root), reviewHelp = JSON.parse(review.stdout);
  const baseline = reviewHelp.commands[0].arguments.find(argument => argument.name === '--previous'); assert.match(baseline.meaning, /common review report JSON/); assert.doesNotMatch(baseline.meaning, /inspect-set|v1|v2/);
  const discovery = binary('ingenium-tools', ['help', 'inspect-set'], root); assert.match(discovery.stdout, /PLAN.json: Inspection plan/); assert.match(discovery.stdout, /Example: ingenium-tools inspect-set plan.json/); assert.doesNotMatch(discovery.stdout, /Example: ingenium shapes/); assert.deepEqual(await readdir(root), []);
});

test('required selected broken browser exits 1 while absent browser exits 2 in actual source binaries', { skip: !process.env.INGENIUM_BROWSER_ADAPTER_DIR && 'Explicit adapter needed; never installs it' }, async t => {
  const root = await temporary(t);
  for (const product of ['ingenium', 'ingenium-tools']) {
    const failed = binary(product, ['health', '--probes', 'browser', '--require', 'browser', '--adapter-dir', process.env.INGENIUM_BROWSER_ADAPTER_DIR, '--executable-path', '/usr/bin/false', '--json'], root);
    assert.equal(failed.status, 1, failed.stdout + failed.stderr); assert.equal(JSON.parse(failed.stdout).capabilities[0].status, 'error');
    const absent = binary(product, ['health', '--probes', 'browser', '--require', 'browser', '--adapter-dir', join(root, 'absent'), '--json'], root);
    assert.equal(absent.status, 2); assert.equal(JSON.parse(absent.stdout).capabilities[0].status, 'absent');
  }
  assert.deepEqual(await readdir(root), []);
});
