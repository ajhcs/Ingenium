import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { main } from '../bin/ingenium.mjs';

test('canonical portable package discovers the real independently named skill', async () => {
  const manifest = JSON.parse(await readFile(new URL('../plugin.json', import.meta.url)));
  assert.equal(manifest.name, 'ingenium');
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  const text = await readFile(new URL('../skills/ingenium/SKILL.md', import.meta.url), 'utf8');
  assert.match(text, /^---\nname: ingenium\ndescription: .+\n---/);
  for (const [, target] of text.matchAll(/\]\((references\/[^)]+)\)/g)) await access(new URL('../skills/ingenium/' + target, import.meta.url));
});

test('CLI refuses unknown commands without running an operation', async () => {
  const output = [];
  assert.equal(await main(['deploy'], x => output.push(x)), 2);
  assert.equal(output.length, 1);
  assert.match(output[0].error, /Usage/);
});

test('CLI reports malformed record JSON as failure', async () => {
  const output = [];
  assert.equal(await main(['check', new URL('../plugin.json', import.meta.url).pathname], x => output.push(x)), 1);
  assert.equal(output[0].valid, false);
});
