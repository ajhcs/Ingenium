import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { isAbsolute } from 'node:path';
const execute = promisify(execFile);
const backend = fileURLToPath(new URL('../../tools/font-vector/backend.py', import.meta.url));
/** Explicit optional isolated Python. No import-time probes, install, server or fetch. */
export async function runFontVector({ python, operation = 'capabilities', sourcePath, outputDir } = {}) {
  if (python === undefined) return { status: 'not-run', reason: 'Select an existing isolated Python with the documented locked optional tools' };
  if (typeof python !== 'string' || !isAbsolute(python)) throw new TypeError('python must be an absolute existing interpreter path');
  if (!['capabilities', 'font-demo', 'compile-font', 'normalize', 'boolean'].includes(operation)) throw new TypeError('Unsupported font/vector operation');
  if (operation !== 'capabilities' && (typeof outputDir !== 'string' || !outputDir.trim())) throw new TypeError('A new outputDir is required');
  if (['compile-font', 'normalize', 'boolean'].includes(operation) && (typeof sourcePath !== 'string' || !sourcePath.trim())) throw new TypeError('An owned sourcePath is required');
  const args = ['-I', backend, operation];
  if (sourcePath) args.push('--source', sourcePath);
  if (outputDir) args.push('--output', outputDir);
  try {
    const { stdout } = await execute(python, args, { timeout: 25000, maxBuffer: 1048576, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
    return JSON.parse(stdout);
  } catch (error) {
    if (error.stdout) { try { return JSON.parse(error.stdout); } catch { /* explicit execution failure below */ } }
    return { status: error.code === 'ENOENT' ? 'not-run' : 'error', reason: error.killed ? 'Optional font/vector worker exceeded deadline or output budget' : error.message };
  }
}
