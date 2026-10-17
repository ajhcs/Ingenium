import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveLayout } from '../../src/layout/index.mjs';

export const layoutRecord = {
  version: 1, canvas: { width: 960, height: 192 }, tokens: { margin: 24, gutter: 16, baseline: 24 },
  nodes: [
    { id: 'content', op: 'inset', from: '$canvas', insets: '$margin' },
    { id: 'columns', op: 'columns', from: 'content', count: 6, gutter: '$gutter' },
    { id: 'left', op: 'span', from: 'columns', start: 0, span: 3 },
    { id: 'right', op: 'span', from: 'columns', start: 3, span: 3 },
    { id: 'baselines', op: 'baselines', from: 'content', step: '$baseline' },
  ], exceptions: [],
};
const focusJourney = { name: 'dialog-return', steps: [
  { action: 'focus', selector: '#open' }, { action: 'press', key: 'Enter' },
  { action: 'expectFocus', selector: '#close' }, { action: 'press', key: 'Escape' },
  { action: 'expectFocus', selector: '#open' },
] };
export function buildFixture({ broken = false, guides = false } = {}) {
  const resolved = resolveLayout(layoutRecord);
  if (resolved.status !== 'pass') throw new Error('Fixture layout failed');
  const rect = (id, b, fill) => `<rect id="${id}" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="8" fill="${fill}"/>`;
  const guideLayer = guides ? `<g id="guides" stroke="#06758c" stroke-width="1" stroke-dasharray="4 4">${resolved.guides.map(g => `<path d="${g.axis === 'x' ? `M${g.value} ${g.start} V${g.end}` : `M${g.start} ${g.value} H${g.end}`}"/>`).join('')}</g>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Open studio — synthetic review fixture</title>
<style>
:root {font-family:system-ui,sans-serif;color:#242249;background:#f4ead4} *{box-sizing:border-box} body{margin:0} main{max-width:64rem;margin:auto;padding:clamp(1rem,4vw,3rem)}
h1{font-size:clamp(2rem,6vw,4rem);line-height:1.1;margin:.5em 0} p{font-size:1.125rem;line-height:1.6;max-width:42rem} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:1.5rem} .details{padding:1.25rem;border:2px solid #242249;border-radius:.5rem} h2{margin-top:0} svg{display:block;width:100%;height:auto;margin:2rem 0} button{font:inherit;color:#f4ead4;background:#242249;padding:.8rem 1.2rem;border:2px solid #242249;border-radius:.35rem;cursor:pointer} button:focus-visible{outline:3px solid #00636f;outline-offset:4px} dialog{max-width:calc(100vw - 2rem);padding:2rem;color:inherit;background:#f4ead4;border:2px solid #242249} dialog::backdrop{background:#24224988}
${broken ? '@font-face{font-family:BrokenFixture;src:url(data:font/woff2;base64,AA==)} #intro{font-family:BrokenFixture,sans-serif;height:1.75rem;overflow:hidden;white-space:nowrap;color:#b5b5b5;background:white} .grid{width:60rem} #unnamed{width:3rem;height:3rem}' : ''}
</style></head><body><main><p>ORIGINAL SYNTHETIC FIXTURE</p><h1>Open studio</h1><p id="intro">Make room for a careful look, a useful question and a shared experiment. This fictional session provides representative text for delivery checks.</p>
<svg id="composition" viewBox="0 0 960 192" role="img" aria-label="Two balanced fields showing the authored column structure">
${rect('left-field', resolved.boxes.left, '#242249')}${rect('right-field', resolved.boxes.right, '#796940')}
<g transform="translate(40 40) scale(1.5)"><circle id="transformed-mark" cx="16" cy="16" r="12" fill="#f4ead4"/></g>${guideLayer}</svg>
<section class="grid" aria-label="Session details"><div class="details"><h2>When and where</h2><p>12 May 2031<br>17:00–18:30<br>West Room, East Hall</p></div><div class="details"><h2>Plan your visit</h2><p>Free entry. Chairs and quiet space are available. This is a fictional invitation for testing.</p><button id="open">Read access details</button>${broken ? '<button id="unnamed"></button>' : ''}</div></section>
<dialog id="access" aria-labelledby="dialog-title"><h2 id="dialog-title">Access details</h2><p>Enter at the east door. Ask the host for a chair or a quieter place.</p><button id="close" autofocus>Close details</button></dialog>
</main><script>const opener=document.querySelector('#open'),dialog=document.querySelector('#access'); opener.addEventListener('click',()=>dialog.showModal());document.querySelector('#close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>opener.focus());</script></body></html>`;
  return { html, layout: layoutRecord, manifest: { version: 1, id: 'open-studio', html: 'study.html', layout: 'layout.json',
    profiles: [
      { name: 'desktop', viewport: { width: 1280, height: 900 }, delivery: 'Authored CSS viewport; no browser-zoom claim', journeys: [focusJourney] },
      { name: 'narrow', viewport: { width: 320, height: 720 }, delivery: '320 CSS pixel reflow inspection; no horizontal-scroll exception', journeys: [focusJourney] },
      { name: 'text-spacing', viewport: { width: 320, height: 720 }, textSpacing: true, delivery: 'Authored English text spacing override', journeys: [focusJourney] },
      { name: 'dialog', viewport: { width: 640, height: 720 }, states: [{ name: 'open', steps: [{ action: 'click', selector: '#open' }] }], journeys: [{ name: 'visible-dialog-return', steps: [{ action: 'expectFocus', selector: '#close' }, { action: 'press', key: 'Escape' }, { action: 'expectFocus', selector: '#open' }] }] },
    ], contrast: [{ target: 'authored-palette', scope: { profile: 'authored-colors', state: 'default' }, foreground: '#242249', background: '#f4ead4', fontSizePx: 18, fontWeight: 400 }], exceptions: [] } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length < 3 || process.argv.length > 4 || (process.argv[3] && !['--broken', '--guides'].includes(process.argv[3]))) throw new Error('Usage: node examples/foundation/build-study.mjs NEW_DIRECTORY [--broken | --guides]');
  const out = resolve(process.argv[2]);await mkdir(out);
  const f = buildFixture({ broken: process.argv[3] === '--broken', guides: process.argv[3] === '--guides' });
  for (const [name, content] of Object.entries({ 'study.html': f.html, 'fixture.json': JSON.stringify(f.manifest, null, 2) + '\n', 'layout.json': JSON.stringify(f.layout, null, 2) + '\n' })) await writeFile(resolve(out, name), content, { flag: 'wx' });
  console.log(out);
}
