// Serialized by Playwright. Keep this function self-contained and read-only.
export function capturePageInventory() {
  const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const link = value => {
    const url = new URL(value || location.href, location.href);
    return url.origin === location.origin ? url.pathname + url.search + url.hash : url.href;
  };
  const items = [];
  const visible = el => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  };
  const name = el => normalize(el.getAttribute('aria-label') ||
    (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ') ||
    [...(el.labels ?? [])].map(label => label.textContent).join(' ') || el.innerText || el.getAttribute('alt'));
  for (const el of document.querySelectorAll('a[href],form,input,select,textarea,button,h1,h2,h3,h4,h5,h6,p,li,dt,dd,figcaption,[data-preserve]')) {
    if (!visible(el) || el.matches('input[type=hidden]')) continue;
    const tag = el.tagName.toLowerCase(), label = name(el);
    let kind = 'content';
    if (tag === 'a') kind = 'link';
    else if (tag === 'form') kind = 'form';
    else if (['input', 'select', 'textarea', 'button'].includes(tag)) kind = 'control';
    else if (/^h[1-6]$/.test(tag)) kind = 'heading';
    const attributes = { tag, label };
    for (const attr of ['name', 'type', 'required', 'disabled', 'readonly', 'multiple', 'role', 'aria-required']) {
      if (el.hasAttribute(attr)) attributes[attr] = el.getAttribute(attr);
    }
    if (kind === 'link') attributes.href = link(el.getAttribute('href'));
    if (kind === 'form') { attributes.action = link(el.getAttribute('action')); attributes.method = el.method; }
    if (kind === 'control' && el.form) { attributes.formAction = link(el.form.getAttribute('action')); attributes.formMethod = el.form.method; }
    if (tag === 'select') attributes.options = [...el.options].map(option => ({ value: option.value, label: normalize(option.text), disabled: option.disabled }));
    // Inline attributes are observable; framework listeners and backend effects are not.
    for (const attr of ['onclick', 'onsubmit', 'onchange', 'oninput']) if (el.hasAttribute(attr)) attributes[attr] = el.getAttribute(attr);
    if (kind === 'content' && !label) continue;
    const key = el.id ? `#${el.id}` : el.getAttribute('data-preserve') || el.getAttribute('name') ||
      (kind === 'form' ? attributes.action : kind === 'link' ? attributes.href + ' ' + label : tag + ' ' + label);
    items.push({ kind, key, attributes });
    if (items.length > 10000) throw new Error('Rendered inventory exceeds 10000 items; narrow the target');
  }
  return { version: 1, items };
}
