#!/usr/bin/env node
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function main(args, write = value => console.log(JSON.stringify(value, null, 2))) {
  const [command, ...rest] = args;
  const selector = values => values.length === 0 ? {} : values.length === 2 && ['--sharp-module', '--renderer-dir'].includes(values[0])
    ? { [values[0] === '--sharp-module' ? 'sharpModule' : 'rendererDir']: values[1] } : null;
  try {
    if (command === 'capabilities' && selector(rest)) {
      const { discoverCapabilities } = await import('../src/svg/index.js');
      write(await discoverCapabilities(selector(rest)));
      return 0;
    }
    if (command === 'check' && rest.length === 1) {
      const { validateRecord } = await import('../src/records/index.mjs');
      const result = validateRecord(JSON.parse(await readFile(rest[0], 'utf8')));
      write(result);
      return result.valid ? 0 : 1;
    }
    if (command === 'render' && rest.length >= 2 && selector(rest.slice(2))) {
      const { exportSvg } = await import('../src/svg/index.js');
      write(await exportSvg({ sourcePath: rest[0], outputPath: rest[1], ...selector(rest.slice(2)) }));
      return 0;
    }
    write({ error: 'Usage: ingenium capabilities [--renderer-dir DIR | --sharp-module MODULE] | check RECORD.json | render SOURCE.svg OUTPUT.png [--renderer-dir DIR | --sharp-module MODULE]' });
    return 2;
  } catch (error) {
    write({ error: error.message, ...(error.code ? { code: error.code } : {}), ...(error.setup ? { setup: error.setup } : {}) });
    return 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === await realpath(process.argv[1])) process.exitCode = await main(process.argv.slice(2));
