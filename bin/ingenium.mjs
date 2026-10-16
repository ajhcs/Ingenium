#!/usr/bin/env node
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function main(args, write = value => console.log(JSON.stringify(value, null, 2))) {
  const [command, ...rest] = args;
  try {
    if (command === 'capabilities' && rest.length === 0) {
      const { discoverCapabilities } = await import('../src/svg/index.js');
      write(await discoverCapabilities());
      return 0;
    }
    if (command === 'check' && rest.length === 1) {
      const { validateRecord } = await import('../src/records/index.mjs');
      const result = validateRecord(JSON.parse(await readFile(rest[0], 'utf8')));
      write(result);
      return result.valid ? 0 : 1;
    }
    if (command === 'render' && (rest.length === 2 || (rest.length === 4 && rest[2] === '--sharp-module'))) {
      const { exportSvg } = await import('../src/svg/index.js');
      write(await exportSvg({ sourcePath: rest[0], outputPath: rest[1], ...(rest.length === 4 ? { sharpModule: rest[3] } : {}) }));
      return 0;
    }
    write({ error: 'Usage: ingenium capabilities | check RECORD.json | render SOURCE.svg OUTPUT.png [--sharp-module MODULE]' });
    return 2;
  } catch (error) {
    write({ error: error.message });
    return 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === await realpath(process.argv[1])) process.exitCode = await main(process.argv.slice(2));
