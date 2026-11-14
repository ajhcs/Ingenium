#!/usr/bin/env node
// Explicit, opt-in real-client exercise. Ordinary Node tests never launch a model.
import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const fixtureRoot = fileURLToPath(new URL('../tests/fixtures/evaluation/', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const executeFile = promisify(execFile);
export async function inventory(root, prefix = '') {
  if ((await lstat(root)).isSymbolicLink()) throw new Error('Symlink evidence root is not permitted');
  const result = [];
  for (const entry of (await readdir(path.join(root, prefix), { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink not permitted in evidence input: ${relative}`);
    if (entry.isDirectory()) result.push(...await inventory(root, relative));
    else if (entry.isFile()) {
      const bytes = await readFile(path.join(root, relative));
      result.push({ path: relative, bytes: bytes.length, sha256: digest(bytes) });
    } else throw new Error(`Unsupported evidence input: ${relative}`);
  }
  return result;
}
export function validateManifest(manifest) {
  const errors = [], ids = new Set();
  if (manifest?.schema !== 'ingenium-behavioral-cases/1' || !Array.isArray(manifest.cases)) return ['Unsupported behavioral manifest'];
  for (const item of manifest.cases) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push('Case must be an object'); continue; }
    if (typeof item.id !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/.test(item.id) || ids.has(item.id)) errors.push('Invalid or duplicate case id');
    ids.add(item.id);
    for (const key of ['task', 'inputs', 'requestedDeliverables', 'protectedFacts', 'expectedObservableChecks', 'judgmentQuestions', 'sourceIds']) {
      if (key === 'task' ? typeof item[key] !== 'string' || !item[key].trim() : !Array.isArray(item[key]) || !item[key].every(value => typeof value === 'string' && value.trim())) errors.push(`${item.id}: invalid ${key}`);
    }
    for (const input of Array.isArray(item.inputs) ? item.inputs : []) if (typeof input !== 'string' || input.startsWith('/') || input.split(/[\\/]/).includes('..')) errors.push(`${item.id}: unsafe input`);
    if (!Array.isArray(item.sourceIds) || !item.sourceIds.every(id => /^A\d{3}$/.test(id))) errors.push(`${item.id}: invalid sourceIds`);
  }
  return errors;
}
export async function prepareCase({ manifest, id, outputDir, skillDir, repetition = 1 }) {
  const errors = validateManifest(manifest);
  if (errors.length) throw new Error(errors.join('; '));
  const scenario = manifest.cases.find(item => item.id === id);
  if (!scenario) throw new Error(`Unknown case: ${id}`);
  if (!Number.isInteger(repetition) || repetition < 1 || repetition > 20) throw new Error('Repetition must be 1..20');
  const skillInventory = await inventory(skillDir);
  if (!skillInventory.some(item => item.path === 'SKILL.md')) throw new Error('Candidate requires SKILL.md');
  const fromSkill = path.relative(path.resolve(skillDir), path.resolve(outputDir));
  if (fromSkill === '' || (!fromSkill.startsWith('..' + path.sep) && fromSkill !== '..' && !path.isAbsolute(fromSkill))) throw new Error('Output must be outside candidate skill');
  await mkdir(outputDir, { recursive: false });
  const projectDir = path.join(outputDir, 'project');
  await mkdir(path.join(projectDir, '.agents/skills'), { recursive: true });
  await cp(skillDir, path.join(projectDir, '.agents/skills/ingenium'), { recursive: true, errorOnExist: true });
  for (const input of scenario.inputs) {
    const source = path.join(fixtureRoot, input);
    if (!(await lstat(source)).isFile()) throw new Error(`Input must be a regular file: ${input}`);
    await mkdir(path.dirname(path.join(projectDir, input)), { recursive: true });
    await cp(source, path.join(projectDir, input), { errorOnExist: true });
  }
  const prompt = `Use the project-local $ingenium skill for this task. Work only in this disposable project. Do not install anything, alter global configuration, contact external services, or modify the skill.\n\n${scenario.task}\n\n${scenario.inputs.length ? `Supplied local inputs: ${scenario.inputs.join(', ')}.` : ''}\n`;
  await writeFile(path.join(outputDir, 'producer-prompt.txt'), prompt);
  const receipt = { schema: 'ingenium-behavioral-result/1', id, repetition, releaseIdentity: { kind: 'development-skill-content', sha256: digest(JSON.stringify(skillInventory)), files: skillInventory }, environment: {}, status: 'not-run', evidenceFiles: ['producer-prompt.txt'], judgments: [], limits: ['Preparing a case does not execute client/model behavior.'], preparedInputs: await inventory(projectDir) };
  await writeFile(path.join(outputDir, 'result.json'), JSON.stringify(receipt, null, 2) + '\n');
  return { receipt, projectDir, prompt };
}
async function launch(client, args, outputDir, timeoutMs, tempRoot) {
  const temporaryDir = tempRoot ? await mkdtemp(path.join(tempRoot, 'ingenium-eval-')) : path.join(outputDir, 'client-tmp');
  if (!tempRoot) await mkdir(temporaryDir, { recursive: false });
  return new Promise((resolve, reject) => {
    const stdout = createWriteStream(path.join(outputDir, 'client-events.jsonl'), { flags: 'wx' });
    const stderr = createWriteStream(path.join(outputDir, 'client-stderr.txt'), { flags: 'wx' });
    const child = spawn(client, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, TMPDIR: temporaryDir } });
    let timedOut = false, bytes = 0, errorBytes = 0, overflow = false, killTimer, stopping = false;
    const stop = () => { if (stopping) return; stopping = true; child.kill('SIGTERM'); killTimer = setTimeout(() => child.kill('SIGKILL'), 5000); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    child.stdout.on('data', chunk => { bytes += chunk.length; if (bytes <= 16 * 1024 * 1024) stdout.write(chunk); else { overflow = true; stop(); } });
    child.stderr.on('data', chunk => { errorBytes += chunk.length; if (errorBytes <= 1024 * 1024) stderr.write(chunk); else { overflow = true; stop(); } });
    child.once('error', error => { clearTimeout(timer); clearTimeout(killTimer); stdout.end(); stderr.end(); reject(error); });
    child.once('close', (code, signal) => { clearTimeout(timer); clearTimeout(killTimer); stdout.end(); stderr.end(); resolve({ code, signal, timedOut, overflow, temporaryDir }); });
  });
}
export async function runCase(options) {
  const { client, model, timeoutMs = 600000, tempRoot, sandbox = 'workspace-write' } = options;
  if (!['workspace-write', 'danger-full-access'].includes(sandbox)) throw new Error('Sandbox must be workspace-write or danger-full-access');
  if (!client || !path.isAbsolute(client) || !model) throw new Error('Explicit absolute client executable and model are required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 3600000) throw new Error('Timeout must be 1000..3600000 milliseconds');
  if (tempRoot && !path.isAbsolute(tempRoot)) throw new Error('Temporary root must be an explicit absolute existing directory');
  const clientVersion = (await executeFile(client, ['--version'], { timeout: 5000, maxBuffer: 65536 })).stdout.trim();
  const { receipt, projectDir, prompt } = await prepareCase(options);
  const args = ['-a', 'never', 'exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '-m', model, '-c', 'model_reasoning_effort="low"', '-s', sandbox, '--json', '-C', projectDir, '-o', path.join(options.outputDir, 'producer-final.txt'), prompt];
  receipt.environment = { route: 'Codex CLI project-local .agents/skills', clientVersion, requestedModel: model, sandbox, platform: process.platform, arch: process.arch, node: process.version, startedAt: new Date().toISOString(), invocation: args.slice(0, -1), client };
  receipt.limits = ['Model behavior observed only for these exact inputs and candidate bytes.', 'Process completion is not a behavioral verdict. Independent evaluator must inspect events, sources and requested outputs.', 'No generic-assistant comparison or native-editor qualification.'];
  receipt.status = 'running';
  await writeFile(path.join(options.outputDir, 'result.json'), JSON.stringify(receipt, null, 2) + '\n');
  try { receipt.process = await launch(client, args, options.outputDir, timeoutMs, tempRoot); receipt.status = receipt.process.code === 0 ? 'observed-needs-review' : 'client-error'; }
  catch (error) { receipt.status = 'client-error'; receipt.error = String(error.message); }
  receipt.environment.finishedAt = new Date().toISOString();
  receipt.outputs = await inventory(projectDir);
  receipt.evidenceFiles.push('client-events.jsonl', 'client-stderr.txt', 'producer-final.txt', 'project/');
  await writeFile(path.join(options.outputDir, 'result.json'), JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}
export async function main(args) {
  const options = {}, allowed = new Set(['manifest', 'case', 'output', 'skill', 'client', 'model', 'repeat', 'timeout-ms', 'temp-root', 'sandbox']);
  let execute = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run') { if (execute) throw new Error('Duplicate --run'); execute = true; continue; }
    const key = args[i].slice(2);
    if (!args[i].startsWith('--') || !allowed.has(key) || options[key] !== undefined || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Invalid option ${args[i]}`);
    options[key] = args[++i];
  }
  for (const key of ['case', 'output', 'skill']) if (!options[key]) throw new Error(`Required --${key}`);
  if (options.sandbox && !['workspace-write', 'danger-full-access'].includes(options.sandbox)) throw new Error('Sandbox must be workspace-write or danger-full-access');
  const manifest = JSON.parse(await readFile(options.manifest ?? path.join(fixtureRoot, 'manifest.json'), 'utf8'));
  const count = Number(options.repeat ?? 3);
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('--repeat must be 1..20');
  await mkdir(path.dirname(path.resolve(options.output)), { recursive: true });
  await mkdir(options.output, { recursive: false });
  const receipts = [];
  for (let repetition = 1; repetition <= count; repetition++) {
    const spec = { manifest, id: options.case, outputDir: path.resolve(options.output, `run-${repetition}`), skillDir: path.resolve(options.skill), repetition, client: options.client, model: options.model, tempRoot: options['temp-root'], sandbox: options.sandbox, timeoutMs: Number(options['timeout-ms'] ?? 600000) };
    receipts.push(execute ? await runCase(spec) : (await prepareCase(spec)).receipt);
  }
  return receipts;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then(result => process.stdout.write(JSON.stringify(result.map(({id,repetition,status}) => ({id,repetition,status})), null, 2) + '\n')).catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
