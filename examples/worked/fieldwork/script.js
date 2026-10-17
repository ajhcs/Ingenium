'use strict';
const buttons = [...document.querySelectorAll('.project')];
buttons.forEach((button, index) => {
  button.setAttribute('aria-controls', 'scene');
  const preview = document.createElement('span');
  preview.className = 'project-preview';
  preview.setAttribute('aria-hidden', 'true');
  const source = document.querySelector(`.drawing.${button.dataset.name}`);
  const drawing = source.cloneNode(true);
  drawing.removeAttribute('class');
  drawing.querySelectorAll('[id]').forEach(node => {
    const oldId = node.id;
    node.id = `${oldId}-preview-${index}`;
    drawing.querySelectorAll('[fill]').forEach(shape => {
      if (shape.getAttribute('fill') === `url(#${oldId})`) shape.setAttribute('fill', `url(#${node.id})`);
    });
  });
  preview.append(drawing);
  button.append(preview);
  button.addEventListener('click', () => {
    buttons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.classList.toggle('is-open', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    document.getElementById('scene').dataset.project = button.dataset.name;
    document.getElementById('scene-title').textContent = button.querySelector('.project-title').textContent;
    document.getElementById('scene-count').textContent = `0${index + 1} / 03`;
  });
});
