import { studies } from './studies.mjs';

const base = 'https://github.com/ajhcs/Ingenium/blob/main/';
let current = 'peel', view = 'final';
function showStudy() {
  const study = studies[current];
  if (!study.processImage) view = 'final';
  for (const button of document.querySelectorAll('[data-study]')) button.setAttribute('aria-pressed', String(button.dataset.study === current));
  for (const button of document.querySelectorAll('[data-view]')) {
    button.hidden = button.dataset.view === 'process' && !study.processImage;
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
  }
  const image = document.querySelector('#study-image');
  image.src = view === 'process' ? study.processImage : study.image;
  const frame = image.closest('figure');
  frame.classList.toggle('process-image', view === 'process');
  frame.tabIndex = view === 'process' ? 0 : -1;
  frame.setAttribute('aria-label', study.title + (view === 'process' ? ': four process views; horizontally scrollable on small screens' : ': final assembly'));
  document.querySelector('#process-hint').hidden = view !== 'process';
  image.alt = study.title + ': ' + (view === 'process' ? 'ingredients, composition, asset studio and final assembly' : study.label);
  image.removeAttribute('width'); image.removeAttribute('height');
  document.querySelector('#study-label').textContent = study.label;
  document.querySelector('#study-title').textContent = study.title;
  document.querySelector('#study-description').textContent = study.description;
  document.querySelector('#study-limit').textContent = study.limit;
  document.querySelector('#study-source').href = base + study.source;
  const process = document.querySelector('#study-process');
  process.hidden = !study.case;
  if (study.case) process.href = base + study.case;
  document.querySelector('#live-study').hidden = current !== 'fieldwork';
  document.querySelector('#reuse-prompt').textContent = study.prompt;
  document.querySelector('#study-copy-status').textContent = '';
  document.querySelector('#study-status').textContent = 'Showing ' + study.title + ', ' + (view === 'process' ? 'four process views' : 'finished assembly') + '.';
}
for (const button of document.querySelectorAll('[data-study]')) button.addEventListener('click', () => { current = button.dataset.study; showStudy(); });
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => { view = button.dataset.view; showStudy(); });

for (const [buttonId, textId, statusId] of [['copy-prompt', 'prompt-text', 'copy-status'], ['copy-study-prompt', 'reuse-prompt', 'study-copy-status']]) {
  document.getElementById(buttonId).addEventListener('click', async () => {
    const source = document.getElementById(textId), status = document.getElementById(statusId);
    try { await navigator.clipboard.writeText(source.textContent); status.textContent = 'Prompt copied.'; }
    catch {
      const range = document.createRange(); range.selectNodeContents(source);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      status.textContent = 'Prompt selected. Copy to continue.';
    }
  });
}
showStudy();
