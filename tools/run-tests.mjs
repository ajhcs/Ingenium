import { spawn } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Keep both results visible: a Node failure must not hide the Python checks.
export async function runChecks(checks, { cwd = root, stdio = 'inherit', env = process.env } = {}) {
  const results = [];
  for (const { name, command, args = [] } of checks) {
    const result = await new Promise(done => {
      const child = spawn(command, args, { cwd, stdio, env, shell: false });
      child.once('error', error => done({ name, exitCode: 1, error: error.message }));
      child.once('exit', (code, signal) => done({ name, exitCode: code ?? 1, ...(signal ? { signal } : {}) }));
    });
    results.push(result);
  }
  return { exitCode: results.every(result => result.exitCode === 0) ? 0 : 1, results };
}

export async function runTests() {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Ingenium helper checks require Node 22 or later.');
  await mkdir(resolve(root, 'work'), { recursive: true });
  const temporary = resolve(process.env.INGENIUM_TEST_TMPDIR || process.env.TMPDIR || resolve(root, 'work/tmp'));
  await mkdir(temporary, { recursive: true });
  const files = [];
  for (const directory of ['tests', 'tests/records', 'tests/svg']) {
    for (const name of (await readdir(resolve(root, directory))).sort()) {
      if (/\.test\.(mjs|js)$/.test(name)) files.push(`${directory}/${name}`);
    }
  }
  return runChecks([
    { name: 'Node', command: process.execPath, args: ['--test', ...files] },
    { name: 'Python', command: process.env.INGENIUM_TEST_PYTHON || 'python3', args: ['tools/run-python-checks.py'] },
  ], { env: { ...process.env, TMPDIR: temporary, TMP: temporary, TEMP: temporary } });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runTests();
    for (const check of result.results) console.log(`${check.name}: exit ${check.exitCode}${check.error ? ` (${check.error})` : ''}`);
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
