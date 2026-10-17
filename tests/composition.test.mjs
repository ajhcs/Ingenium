import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildStudy, layout } from '../examples/composition/listening-garden.mjs';

test('controlled composition resource preserves the conceptual text without the worked-source suffix', async () => {
  const ordinary = await readFile(new URL('../skills/ingenium/references/composition.md', import.meta.url));
  const concepts = await readFile(new URL('../skills/ingenium/references/composition-concepts.md', import.meta.url));
  const boundary = ordinary.indexOf('## Worked source');
  assert.ok(boundary > 0, 'ordinary guidance still retains its worked source');
  assert.equal(concepts.toString(), ordinary.subarray(0, boundary).toString().trimEnd() + '\n');
});

test('clean and guide sources retain identical editable artwork', () => {
  const { clean, guides } = buildStudy();
  const artworkStart = '<g id="artwork">';
  const cleanArtwork = clean.slice(clean.indexOf(artworkStart), clean.lastIndexOf('</svg>')).trim();
  const guidedArtwork = guides.slice(guides.indexOf(artworkStart), guides.indexOf('<g id="layout-guides">')).trim();
  assert.ok(cleanArtwork.startsWith(artworkStart));
  assert.equal(guidedArtwork, cleanArtwork);
  assert.ok(!clean.includes('<g id="layout-guides">'));
});

test('ordinary layout edits update artwork, baseline guides, dimension marks and record together', () => {
  const revised = structuredClone(layout);
  revised.type.subtitle.x = 80;
  revised.type.subtitle.leading = 48;
  revised.panel.width = 728;
  revised.accessBand.x = 108;
  revised.motif.center = [800, 420];
  const result = buildStudy(revised);
  assert.match(result.clean, /<tspan x="80" dy="48">sound-art study\.<\/tspan>/);
  assert.match(result.guides, /M56 608 H944/);
  assert.match(result.clean, /id="details-panel"[^>]*width="728"/);
  assert.match(result.guides, /M76 810 H804/);
  assert.match(result.guides, /panel 728 \/ inherited \+8 at right/);
  assert.match(result.guides, /M108 824 V1096/);
  assert.match(result.clean, /id="sound-garden" transform="translate\(-10 5\)"/);
  assert.match(result.guides, /<rect x="656" y="276" width="288" height="288"/);
  assert.equal(result.measurements.panelInset, 32);
  assert.equal(result.measurements.subtitleLeading, 48);
  assert.equal(layout.panel.width, 724);
  assert.equal(layout.type.subtitle.leading, 40);
});
