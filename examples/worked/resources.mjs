import fs from 'node:fs/promises';
import path from 'node:path';

// Example output is opt-in and separate from these editable sources.
export async function createOutput(directory = process.argv[2]) {
  if (!directory) throw new Error('Usage: node build.mjs NEW_OUTPUT_DIRECTORY');
  const output = path.resolve(directory);
  await fs.mkdir(output); // Refuse an existing directory; preserve earlier studies.
  await fs.copyFile(new URL('./fonts/FONT-NOTICES.txt', import.meta.url), path.join(output, 'FONT-NOTICES.txt'));
  return output;
}

export function readFont(name) {
  if (!['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf', 'DejaVuSerif.ttf'].includes(name)) {
    throw new Error('Unknown selected example font');
  }
  return fs.readFile(new URL(`./fonts/${name}`, import.meta.url));
}
