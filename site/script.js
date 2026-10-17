const base = 'https://github.com/ajhcs/Ingenium/blob/main/';
const studies = {
  cover: {title:'Common Ground', label:'Historical study / V3', image:'cover.png', source:'cover/cover.svg', alt:'Common Ground publication cover with navy typography and blue and rust forms on yellow.', description:'A publication cover built around a bold editorial hierarchy and two open forms in conversation. The type and artwork remain editable.', limit:'A cover study for review. Print production and editor import remain untested.'},
  fieldwork: {title:'Fieldwork', label:'Historical study / V2', image:'fieldwork-desktop.png', source:'fieldwork/index.html', alt:'Fieldwork responsive website study with original project illustrations and an editorial layout.', description:'A responsive public-space collective website with original artwork, project dialogs, an interactive pattern control, and editable HTML, CSS and JavaScript.', limit:'Selected desktop, mobile and keyboard states were reviewed. This is a fictional website; broad browser and audience qualification remain untested.'},
  identity: {title:'Manyfold', label:'Historical study / V3', image:'identity.png', source:'identity/identity-sheet.svg', alt:'Manyfold identity study with modular symbol variations and typography.', description:'A folded-paper identity whose applications share a panel rhythm. The study includes color applications, a one-ink mark and a small-size proof.', limit:'A visual exploration, not a novelty or production acceptance claim. Small-size mark details need contextual review.'},
  wayfinding: {title:'Junction House', label:'Historical study / V3', image:'wayfinding.png', source:'wayfinding/sources/lobby-directory.svg', alt:'Junction House wayfinding study showing a lobby directory and directional signs.', description:'A directory and a family of directional signs, with explicit route relationships and symbols paired with words.', limit:'A fictional wayfinding study. Visitor comprehension, mounting, viewing distance and regulatory suitability remain untested.'},
  poster: {title:'Open Studio', label:'Historical study / V3', image:'poster.png', source:'identity/open-studio-A3.svg', alt:'Manyfold Open Studio poster with modular symbol and a clear event invitation.', description:'An event poster extends the folded-paper identity into a different format, balancing a large symbol with a clear invitation.', limit:'An editable poster study. Print production and audience response remain untested.'}
};
let catalog = null;
fetch('assets/demos/catalog.json').then(response => response.ok ? response.json() : null).then(value => {catalog = value;}).catch(() => {});
for (const button of document.querySelectorAll('[data-study]')) {
  button.addEventListener('click', () => {
    const id = button.dataset.study;
    const study = studies[id];
    if (!study) return;
    for (const item of document.querySelectorAll('[data-study]')) item.setAttribute('aria-pressed', String(item === button));
    document.querySelector('#live-study').hidden = id !== 'fieldwork';
    const entry = catalog?.items?.find(item => item.id === (id === 'fieldwork' ? 'fieldwork-desktop' : id));
    const image = document.querySelector('#study-image');
    image.src = `assets/demos/${entry?.preview || study.image}`;
    image.alt = entry?.alt || study.alt;
    if (entry?.width && entry?.height) {image.width = entry.width; image.height = entry.height;}
    document.querySelector('#study-label').textContent = study.label;
    document.querySelector('#study-title').textContent = study.title;
    document.querySelector('#study-description').textContent = study.description;
    document.querySelector('#study-limit').textContent = study.limit;
    document.querySelector('#study-source').href = base + (entry?.sourceLink || `examples/release/${study.source}`);
    document.querySelector('#study-status').textContent = `Showing ${study.title}, ${study.label.toLowerCase()}.`;
  });
}
const copyButton = document.querySelector('#copy-prompt');
copyButton.addEventListener('click', async () => {
  const prompt = document.querySelector('#prompt-text').textContent;
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(prompt);
    status.textContent = 'Prompt copied.';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#prompt-text'));
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = 'Prompt selected. Copy to continue.';
  }
});
