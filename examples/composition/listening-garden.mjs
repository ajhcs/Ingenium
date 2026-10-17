import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Original synthetic content. This example is deliberately not a general layout engine.
export const layout = {
  version: 1,
  canvas: { width: 1000, height: 1200 },
  task: 'Study whether a quiet asymmetric event card makes attendance details findable.',
  audience: 'Hypothetical interested attendee; no audience research supplied.',
  medium: 'Fixed-size 1000 by 1200 screen study; smaller sharing and print remain unqualified.',
  hierarchy: ['event title', 'date and time', 'place', 'entry and seating', 'supporting context'],
  grid: { left: 76, right: 924, columns: 6, columnWidth: 128, gutter: 16, module: 4 },
  palette: { ground: '#242249', ink: '#F4EAD4' },
  type: {
    series: { size: 16, weight: 400, x: 76, baseline: 104 },
    title: { size: 96, weight: 400, x: 72, baseline: 344, leading: 104 },
    subtitle: { size: 28, weight: 400, x: 76, baseline: 560, leading: 40 },
    disclosure: { size: 20, weight: 400, x: 104, baseline: 872 },
    date: { size: 36, weight: 700, x: 104, baseline: 920 },
    place: { size: 32, weight: 400, x: 104, baseline: 968 },
    access: { size: 28, weight: 700, x: 124, baseline: 1040 },
  },
  panel: { x: 76, y: 824, width: 724, height: 272, radius: 8 },
  accessBand: { x: 104, y: 992, width: 668, height: 76, radius: 4 },
  motif: { center: [796, 416], radii: [144, 112, 80, 48] },
  exceptions: [
    { element: 'title', reason: 'Text origin is 4 units left of the content axis for optical alignment of serif capitals; inspect glyphs in the actual renderer.' },
    { element: 'details-panel', reason: 'Retained 724-unit width ends at800, 4 beyond the sixth column start796; content-fit inheritance takes precedence over forcing a grid span.' },
    { element: 'sound-garden', reason: 'Ring bounds652..940 start at column5; extend16 beyond the924 right content axis to counterbalance the large title.' },
    { element: 'access', reason: '20-unit inset from band edge preserves a distinct inner text role; not every text origin follows a column.' },
  ],
  openQuestions: [
    'FIELD NOTES / 01 has no established series purpose; retained as supplied content, not validated editorial meaning.',
    'The access band remains a strong visual region even with smaller type. Intended hierarchy requires a reader task test.',
    'Generic serif and sans-serif metrics may vary by renderer; no font installation is required or assumed.',
    'Meaning, aesthetic quality, originality and audience acceptance are not determined by geometry.',
  ],
};
const rect = (id, r, fill) => `<rect id="${id}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.radius}" fill="${fill}"/>`;

export function buildStudy(model = layout) {
  const layout = model;
  const { canvas, grid, palette, motif } = layout;
  const { panel, accessBand, type } = layout;
  const text = (id, role, content, family = 'sans-serif') => {
    const t = type[role];
    return `<text id="${id}" x="${t.x}" y="${t.baseline}" font-family="${family}" font-size="${t.size}" font-weight="${t.weight}">${content}</text>`;
  };
  // Stem/leaf paths use fixed native illustration coordinates, translated with its center.
  const motifOffset = [motif.center[0] - 810, motif.center[1] - 415];
  const root = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`;
  const artwork = `<g id="artwork">
<rect id="ground" width="${canvas.width}" height="${canvas.height}" fill="${palette.ground}"/>
<g id="sound-garden" transform="translate(${motifOffset.join(' ')})" fill="none" stroke="${palette.ink}" stroke-width="2" opacity="0.7">
${motif.radii.map(r => `<circle cx="810" cy="415" r="${r}"/>`).join('\n')}
<path d="M810 558 Q748 690 825 790 M815 665 Q737 605 695 649 M810 704 Q885 628 931 684"/>
<path d="M695 649 Q700 707 810 704 M931 684 Q910 735 810 739"/>
</g>
<g fill="${palette.ink}">
${text('series', 'series', 'FIELD NOTES / 01')}
${text('title', 'title', `<tspan x="${type.title.x}">Listening</tspan><tspan x="${type.title.x}" dy="${type.title.leading}">Garden</tspan>`, 'serif')}
<path id="title-rule" d="M76 504 L284 504" stroke="${palette.ink}" stroke-width="2"/>
${text('subtitle', 'subtitle', `<tspan x="${type.subtitle.x}">A quiet outdoor</tspan><tspan x="${type.subtitle.x}" dy="${type.subtitle.leading}">sound-art study.</tspan>`)}
</g>
${rect('details-panel', layout.panel, palette.ink)}
<g id="event-details" fill="${palette.ground}">
${text('event-disclosure', 'disclosure', 'FICTIONAL EVENT / JOIN US')}
${text('date-time', 'date', '18 June 2030 · 18:30–20:00')}
${text('location', 'place', 'Moss Court, North Gate')}
${rect('access-band', layout.accessBand, palette.ground)}
<g fill="${palette.ink}">${text('access', 'access', 'Free entry · Seating available')}</g>
</g>
</g>`;
  const columns = Array.from({ length: grid.columns }, (_, i) => {
    const x = grid.left + i * (grid.columnWidth + grid.gutter);
    return `<rect x="${x}" y="${grid.left}" width="${grid.columnWidth}" height="${panel.y + panel.height - grid.left}" fill="#62D4F2" fill-opacity="0.07" stroke="#62D4F2" stroke-opacity="0.55" stroke-width="1"/>`;
  }).join('\n');
  const baselineYs = [...new Set(Object.values(layout.type).flatMap(t => t.leading ? [t.baseline, t.baseline + t.leading] : [t.baseline]))];
  const baselines = baselineYs.map(y => `<path d="M${grid.left - 20} ${y} H${grid.right + 20}" stroke="#FFC96E" stroke-width="1" stroke-dasharray="4 8"/>`).join('\n');
  const dimension = (x, y, width) => `<path d="M${x} ${y} H${x + width} M${x} ${y - 6} V${y + 6} M${x + width} ${y - 6} V${y + 6}" fill="none" stroke="#F59AD6" stroke-width="2"/>`;
  const radius = motif.radii[0];
  const guides = `<g id="layout-guides">
${columns}
${baselines}
<path d="M${accessBand.x} ${panel.y} V${panel.y + panel.height} M${type.access.x} ${accessBand.y} V${accessBand.y + accessBand.height}" stroke="#62D4F2" stroke-width="1" stroke-dasharray="8 4"/>
<rect x="${motif.center[0] - radius}" y="${motif.center[1] - radius}" width="${radius * 2}" height="${radius * 2}" fill="none" stroke="#F59AD6" stroke-width="2"/>
${dimension(panel.x, panel.y - 14, panel.width)}
${dimension(accessBand.x, panel.y + panel.height + 16, accessBand.width)}
<g fill="#62D4F2" font-family="sans-serif" font-size="16">
<text x="76" y="156">${grid.columns} columns: ${grid.columnWidth} wide / ${grid.gutter} gutter / content ${grid.left}–${grid.right}</text>
<text x="76" y="184">Cyan: columns + insets / Amber: actual text baselines</text>
<text x="76" y="212">Pink: retained spans + motif overhang / module: ${grid.module}</text>
</g>
<g fill="#F59AD6" font-family="sans-serif" font-size="16">
<text x="${panel.x}" y="${panel.y - 24}">panel ${panel.width} / inherited +${panel.x + panel.width - (grid.left + (grid.columns - 1) * (grid.columnWidth + grid.gutter))} at right</text>
<text x="${accessBand.x}" y="1140">band ${accessBand.width} / panel padding ${accessBand.x - panel.x} / date-place baselines ${type.place.baseline - type.date.baseline} apart</text>
</g>
</g>`;
  const title = '<title>Listening Garden — fictional event layout study</title>';
  const description = '<desc>Listening Garden, a fictional quiet outdoor sound-art study. 18 June 2030, 18:30 to 20:00, Moss Court, North Gate. Free entry and seating available. Cream lettering and a botanical listening-ring motif on indigo.</desc>';
  return {
    clean: `${root}\n${title}\n${description}\n${artwork}\n</svg>\n`,
    guides: `${root}\n<title>Listening Garden — editable layout guides</title>\n<desc>Companion study: cyan columns and insets, amber text baselines, pink inherited spans and motif overhang.</desc>\n${artwork}\n${guides}\n</svg>\n`,
    measurements: {
      panelInset: accessBand.x - panel.x,
      relatedBaselineStep: type.place.baseline - type.date.baseline,
      subtitleLeading: type.subtitle.leading,
      titleLeading: type.title.leading,
      ringSteps: motif.radii.slice(1).map((r, i) => motif.radii[i] - r),
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) {
    console.error('Usage: node examples/composition/listening-garden.mjs <new-output-directory>');
    process.exitCode = 2;
  } else {
    // mkdir without recursive deliberately refuses an existing directory; no source clobbering.
    const destination = resolve(process.argv[2]);
    await mkdir(destination);
    const study = buildStudy();
    for (const [name, value] of Object.entries({ 'clean.svg': study.clean, 'guides.svg': study.guides, 'layout.json': JSON.stringify({ ...layout, measurements: study.measurements }, null, 2) + '\n' })) {
      await writeFile(resolve(destination, name), value, { flag: 'wx' });
    }
    console.log(destination);
  }
}
