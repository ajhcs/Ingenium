const image = document.querySelector('.stage-figure img');
const status = document.querySelector('#image-status');
if (image && status) {
  status.textContent = 'Loading stage image…';
  const loaded = () => { status.textContent = image.naturalWidth ? 'Stage image loaded.' : 'Image unavailable. Use View stage source below.'; };
  image.addEventListener('load', loaded);
  image.addEventListener('error', () => { status.textContent = 'Image unavailable. Use View stage source below.'; });
  if (image.complete) loaded();
}
