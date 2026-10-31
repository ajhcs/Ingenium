#!/usr/bin/env node
import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createBrowserSession } from '../src/browser/index.mjs';
import { inspectProject, readProjectJson } from '../src/project/index.mjs';

const usage = 'ingenium-tools capabilities [--adapter-dir DIR] [--executable-path FILE] | inspect LOOPBACK_URL NEW_OUTPUT_DIR [--config JSON] [--previous SNAPSHOT.json] [--adapter-dir DIR] [--executable-path FILE]';
export async function main(args, write = value => console.log(JSON.stringify(value, null, 2))) {
  const [command, ...rest] = args;
  try {
    if (!['capabilities', 'inspect'].includes(command)) { write({ usage }); return 2; }
    const options = {}, flags = { '--adapter-dir': 'adapterDir', '--executable-path': 'executablePath', '--config': 'config', '--previous': 'previousSnapshotPath' };
    if (command === 'inspect') { options.url = rest.shift(); options.outputDir = rest.shift(); }
    for (let i = 0; i < rest.length; i += 2) {
      const key = flags[rest[i]];
      if (!key || !rest[i + 1] || options[key] !== undefined || command === 'capabilities' && !['adapterDir', 'executablePath'].includes(key)) throw new TypeError('Use unique supported flag/value pairs. ' + usage);
      options[key] = rest[i + 1];
    }
    if (command === 'capabilities') {
      const prepared = await createBrowserSession(options);
      try { write({ status: prepared.status, ...prepared.capability, operations: ['inspect', 'preservation-comparison'], downloads: false, hooks: false }); }
      finally { await prepared.session?.close(); }
      return prepared.status === 'pass' ? 0 : prepared.status === 'not-run' ? 2 : 1;
    }
    if (options.config) {
      const config = await readProjectJson(options.config); delete options.config;
      if (!config || Object.keys(config).some(key => key !== 'profiles') || !Array.isArray(config.profiles)) throw new TypeError('Config accepts only profiles');
      options.profiles = config.profiles;
    }
    const result = await inspectProject(options); write(result);
    return ['fail', 'error'].includes(result.status) ? 1 : result.status === 'not-run' ? 2 : 0;
  } catch (error) { write({ error: error.message }); return 1; }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === await realpath(process.argv[1])) process.exitCode = await main(process.argv.slice(2));
