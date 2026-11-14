import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { runChecks } from '../tools/run-tests.mjs';

test('real Node and Python failures fail the aggregate while both checks execute', async () => {
  await mkdir('work', { recursive: true });
  const cwd = await mkdtemp(resolve('work/check-runner-'));
  await writeFile(join(cwd, 'node.mjs'), "import {writeFileSync} from 'node:fs';writeFileSync('node-ran','yes');process.exit(Number(process.argv[2]));");
  await writeFile(join(cwd, 'python.py'), "import pathlib,sys\npathlib.Path('python-ran').write_text('yes')\nsys.exit(int(sys.argv[1]))\n");
  for (const [nodeCode, pythonCode, expected] of [[1, 0, 1], [0, 1, 1], [0, 0, 0]]) {
    const result = await runChecks([
      { name: 'Node', command: process.execPath, args: ['node.mjs', String(nodeCode)] },
      { name: 'Python', command: process.env.INGENIUM_TEST_PYTHON || 'python3', args: ['python.py', String(pythonCode)] },
    ], { cwd, stdio: 'pipe' });
    assert.equal(result.exitCode, expected);
    assert.deepEqual(result.results.map(item => item.exitCode), [nodeCode, pythonCode]);
    assert.equal(await readFile(join(cwd, 'node-ran'), 'utf8'), 'yes');
    assert.equal(await readFile(join(cwd, 'python-ran'), 'utf8'), 'yes');
  }
});
