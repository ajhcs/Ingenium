import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { buildContrastPairs, buildMethodStudies } from './generate-method-studies.mjs';
import { contrastRatio } from '../src/checks/index.mjs';

export function checkMethodContrast() {
  const pairs = buildContrastPairs().map(pair => {
    const ratio = contrastRatio(pair.foreground, pair.background);
    return { ...pair, ratio, status: ratio >= pair.threshold ? 'pass' : 'fail' };
  });
  return {
    schema: 'ingenium-method-contrast/1',
    sources: buildMethodStudies().filter(study => ['palette-families', 'fontplate'].includes(study.id)).map(study => ({ id: study.id, sha256: createHash('sha256').update(study.svg).digest('hex') })),
    scope: 'Declared opaque text pairs in palette and type specimens, shared editorial copy, and candidate focus ink against surface. Some semantic-role swatches are suggestions for later application.',
    limits: 'Not a full SVG composition or accessibility audit. Borders are decorative grouping in these static sheets, not qualified control boundaries. Selection fill has labeled text; no selection-fill contrast claim. Hover, actual focus geometry, interactive states, alpha, zoom and dark mode are untested.',
    status: pairs.every(pair => pair.status === 'pass') ? 'pass' : 'fail',
    pairs,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) {
    console.error('Usage: node tools/check-method-contrast.mjs NEW_OUTPUT.json');
    process.exitCode = 2;
  } else {
    try {
      const report = checkMethodContrast();
      await writeFile(resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(`${report.status}: ${report.pairs.length} declared contrast pairs.`);
      process.exitCode = report.status === 'pass' ? 0 : 1;
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
