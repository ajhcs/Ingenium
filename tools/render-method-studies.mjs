import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildMethodStudies } from './generate-method-studies.mjs';
import { discoverCapabilities, exportSvg } from '../src/svg/index.js';

// Explicit full-checkout helper. Discovery never installs a renderer.
export async function renderMethodStudies({ sourceDir, outputDir, rendererDir, sharpModule }) {
  if (!sourceDir || !outputDir) throw new Error('Source and new output directories are required');
  const capabilities = await discoverCapabilities({ rendererDir, sharpModule });
  if (capabilities.sharp.status !== 'present') {
    throw new Error(`Renderer ${capabilities.sharp.status}: ${capabilities.sharp.reason ?? 'see renderer setup'}`);
  }
  const destination = resolve(outputDir);
  await mkdir(destination); // Refuse existing directories; preserve every prior export.
  const artifacts = [];
  for (const study of buildMethodStudies()) {
    const source = `${study.id}.svg`;
    const output = `${study.id}.png`;
    const result = await exportSvg({ sourcePath: join(resolve(sourceDir), source), outputPath: join(destination, output), rendererDir, sharpModule });
    artifacts.push({ id: study.id, source, output, ...result });
  }
  const manifest = {
    schema: 'ingenium-method-renders/1',
    status: 'rendered',
    limitations: 'Static previews only. No executed application behavior, user acceptance, exact portable fonts or complete accessibility qualification.',
    artifacts,
  };
  await writeFile(join(destination, 'render-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [sourceDir, outputDir, selector, rendererDir, ...extra] = process.argv.slice(2);
  if (!sourceDir || !outputDir || (selector && selector !== '--renderer-dir') || (selector && !rendererDir) || extra.length) {
    console.error('Usage: node tools/render-method-studies.mjs SOURCE_DIR NEW_OUTPUT_DIR [--renderer-dir EXISTING_INSTALL]');
    process.exitCode = 2;
  } else {
    try {
      const manifest = await renderMethodStudies({ sourceDir, outputDir, rendererDir });
      console.log(`Rendered ${manifest.artifacts.length} studies; inspect the PNGs before delivery.`);
    } catch (error) {
      console.error(`Method render failed: ${error.message}. A newly created partial output directory may remain; use a fresh directory after inspection.`);
      process.exitCode = 1;
    }
  }
}
