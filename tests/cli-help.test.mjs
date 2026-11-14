import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { main } from '../bin/ingenium.mjs';
import { main as tools } from '../bin/ingenium-tools.mjs';
import { commands, toolCommands } from '../src/cli/commands.mjs';
import { parseCommand } from '../src/cli/parse.mjs';
import { executeCli } from '../src/cli/runtime.mjs';
import { version } from '../src/cli/version.mjs';
const root = resolve(import.meta.dirname, '..');
async function temporary(t) {
  await mkdir(join(root, 'work'), { recursive: true });
  const directory = await mkdtemp(join(root, 'work/cli-help-'));
  t.after(() => rm(directory, { recursive: true, force: true })); return directory;
}
const capture = async (fn, args) => { let result; const exit = await fn(args, value => { assert.equal(typeof value, 'object'); result = value; }); return { result, exit }; };

test('central inventory covers every supported family and help preempts malformed selectors and nonexistent inputs', async t => {
  const directory = await temporary(t), originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected network call'); };
  t.after(() => { globalThis.fetch = originalFetch; });
  for (const [fn, inventory] of [[main, commands], [tools, toolCommands]]) {
    for (const command of inventory) {
      const { result, exit } = await capture(fn, [...command.path.split(' '), join(directory, 'does-not-exist'), '--unknown', '--adapter-dir', '', '--help']);
      assert.equal(exit, 0, command.path); assert.equal(result.schema, 'ingenium-help/1');
      assert.ok(result.commands.some(c => c.path === command.path), command.path);
    }
    assert.equal((await capture(fn, [])).exit, 0);
    assert.equal((await capture(fn, ['help'])).exit, 0);
  }
  assert.deepEqual(await readdir(directory), []);
  const families = new Set(commands.map(c => c.path.split(' ')[0]));
  for (const family of ['resources', 'catalog', 'svg-pack', 'font-pack', 'shapes', 'palettes', 'textures', 'items', 'ui', 'atomic', 'materials', 'library', 'render', 'check', 'review', 'project', 'local-assets', 'font-download', 'brand-download']) assert.ok(families.has(family));
});

test('all inventory examples parse and unsupported/missing/duplicate flags use exit2 before file access', async () => {
  for (const [inventory, product] of [[commands, 'ingenium'], [toolCommands, 'ingenium-tools']]) {
    for (const c of inventory) {
      const args = [...c.path.split(' '), ...Array.from({ length: c.min }, (_, i) => `input-${i}`)];
      assert.equal(parseCommand(args, product).entry.path, c.path);
    }
  }
  for (const args of [['deploy'], ['review', 'missing', 'out', '--unknown', 'x'], ['render', 'missing'], ['capabilities', '--renderer-dir'], ['capabilities', '--renderer-dir', 'x', '--renderer-dir', 'x'], ['health', '--renderer-dir', 'x', '--sharp-module', 'y'], ['health', '--json', '--format', 'json'], ['health', '--probes', 'browser,browser'], ['health', '--require', 'unknown']]) {
    const { result, exit } = await capture(main, args); assert.equal(exit, 2, args.join(' ')); assert.equal(result.category, 'usage'); assert.equal(result.schema, 'ingenium-error/1'); assert.equal(result.stage, 'preflight');
  }
  assert.match((await capture(tools, ['deploy'])).result.usage, /capabilities/);
  assert.equal((await capture(tools, ['inspect', 'http://127.0.0.1', 'out', '--previous'])).exit, 2);
});

test('malformed JSON is usage; operational file failure is1; callback success payload remains legacy object', async t => {
  const directory = await temporary(t), input = join(directory, 'broken.json'); await writeFile(input, '{"secret":"private-token",oops');
  const malformed = await capture(main, ['check', input]); assert.equal(malformed.exit, 2); assert.equal(malformed.result.code, 'JSON_INVALID'); assert.ok(!JSON.stringify(malformed.result).includes('private-token'));
  const missing = await capture(main, ['check', join(directory, 'missing')]); assert.equal(missing.exit, 1); assert.equal(missing.result.category, 'operation');
  const checked = await capture(main, ['check', join(root, 'examples/records/poster.json')]); assert.equal(checked.exit, 0); assert.deepEqual(Object.keys(checked.result).sort(), ['errors', 'valid']);
});

test('binary new commands default text; explicit JSON and legacy defaults are deterministic', async t => {
  const directory = await temporary(t);
  const run = args => spawnSync(process.execPath, [join(root, 'bin/ingenium.mjs'), ...args], { cwd: directory, encoding: 'utf8' });
  const text = run(['version']); assert.equal(text.status, 0); assert.match(text.stdout, /^ingenium /);
  const json = run(['version', '--json']); assert.equal(JSON.parse(json.stdout).schema, 'ingenium-version/1');
  const old = run(['check', join(root, 'examples/records/poster.json')]); assert.equal(JSON.parse(old.stdout).valid, true);
  const help = run(['--help', '--json']); assert.equal(JSON.parse(help.stdout).schema, 'ingenium-help/1');
  const actual = await version(); assert.equal(actual.version, JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version);
  if (!actual.prepared) assert.equal(actual.release, null);
});

test('cooperative interruption waits for cleanup and reports retained files without claiming they completed', async t => {
  const directory = await temporary(t), output = join(directory, 'output');
  const controller = new AbortController(); let cleaned = false, result;
  const exit = await executeCli(['shapes', 'create', 'synthetic.json', output], value => { result = value; }, { signal: controller.signal, dispatch: async () => {
    try { await mkdir(output); await writeFile(join(output, 'editable.svg'), '<svg/>'); controller.abort(); }
    finally { cleaned = true; }
    return 0;
  } });
  assert.equal(cleaned, true); assert.equal(exit, 130); assert.equal(result.code, 'CANCELED');
  assert.deepEqual(result.successfulOutputs, []); assert.deepEqual(result.incompleteOutputs, [join(output, 'editable.svg')]);
  assert.equal(await readFile(join(output, 'editable.svg'), 'utf8'), '<svg/>');
});


test('binary SIGINT waits for owned cleanup and exits130 with a retained-file receipt', { timeout: 5000 }, async t => {
  const directory = await temporary(t), script = join(directory, 'interrupt.mjs'), output = join(directory, 'output'), cleanup = join(directory, 'cleanup');
  await writeFile(script, `import {mkdir,writeFile} from 'node:fs/promises';
import {executeCli,runBinary} from ${JSON.stringify(new URL('../src/cli/runtime.mjs', import.meta.url).href)};
const output=${JSON.stringify(output)};
const main=(args,write,{signal}={})=>executeCli(args,write,{signal,dispatch:async(parsed,emit)=>{
const keepAlive=setInterval(()=>{},1000);
try { await mkdir(output); await writeFile(output+'/editable.svg','<svg/>');
await new Promise(resolve=>{signal.addEventListener('abort',resolve,{once:true});console.error('READY');});
} finally { clearInterval(keepAlive); await writeFile(${JSON.stringify(cleanup)},'closed'); }
emit({files:['editable.svg']}); return 0;
}});
process.exitCode=await runBinary(main,['shapes','create','synthetic.json',output,'--json']);`);
  const child = spawn(process.execPath, [script], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  let stdout = '', stderr = '', interrupted = false;
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; if (!interrupted && stderr.includes('READY')) { interrupted = true; child.kill('SIGINT'); } });
  const exit = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolve({code,signal})); });
  assert.equal(exit.code, 130, stderr); assert.equal(exit.signal, null); assert.equal(await readFile(cleanup, 'utf8'), 'closed');
  const receipt = JSON.parse(stdout); assert.equal(receipt.code, 'CANCELED'); assert.deepEqual(receipt.incompleteOutputs, [join(output,'editable.svg')]);
});


test('failed output operations report newly retained partial files and never relabel preexisting files', async t => {
  const directory = await temporary(t), output = join(directory,'partial'); let result;
  const dispatch = async () => { await mkdir(output); await writeFile(join(output,'source.svg'),'<svg/>'); throw new Error('Export failed'); };
  assert.equal(await executeCli(['shapes','create','fixture.json',output], value => { result=value; }, {dispatch}),1);
  assert.deepEqual(result.incompleteOutputs,[join(output,'source.svg')]);
  assert.equal(await executeCli(['shapes','create','fixture.json',output], value => { result=value; }, {dispatch}),1);
  assert.deepEqual(result.incompleteOutputs,[]);
});
