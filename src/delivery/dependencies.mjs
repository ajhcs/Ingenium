import path from 'node:path';
import { isBuiltin } from 'node:module';
import { safeDeliveryPath } from './schema.mjs';
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };

function stripComments(text, lineComments = false) {
  let result = '', quote = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) { result += char; if (char === '\\') result += text[++i] ?? ''; else if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; result += char; continue; }
    if (char === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) fail('UNSUPPORTED_SOURCE', 'Unclosed source comment');
      result += ' '; i = end + 1; continue;
    }
    if (lineComments && char === '/' && text[i + 1] === '/') {
      const end = text.indexOf('\n', i + 2); result += '\n'; i = end < 0 ? text.length : end; continue;
    }
    result += char;
  }
  return result;
}

function markupTags(text) {
  const tags = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '<' || !/[A-Za-z]/.test(text[i + 1] ?? '')) continue;
    const name = text.slice(i + 1, i + 129).match(/^[A-Za-z][\w:.-]*/)?.[0];
    if (!name) continue;
    i += name.length + 1;
    const attributes = [];
    while (i < text.length && text[i] !== '>') {
      if (/\s/.test(text[i]) || (text[i] === '/' && text[i + 1] === '>')) { i++; continue; }
      const attribute = text.slice(i, i + 129).match(/^[^\s=<>/]+/)?.[0];
      if (!attribute) fail('UNSUPPORTED_SOURCE', 'Unsupported markup attribute syntax');
      i += attribute.length;
      while (/\s/.test(text[i] ?? '')) i++;
      let value = null, quoted = true;
      if (text[i] === '=') {
        i++; while (/\s/.test(text[i] ?? '')) i++;
        if (text[i] === '"' || text[i] === "'") {
          const quote = text[i++], end = text.indexOf(quote, i);
          if (end < 0) fail('UNSUPPORTED_SOURCE', 'Unclosed markup attribute');
          value = text.slice(i, end); i = end + 1;
        } else {
          quoted = false; const start = i;
          while (i < text.length && !/[\s>]/.test(text[i])) i++;
          value = text.slice(start, i);
        }
      }
      attributes.push({ name: attribute.toLowerCase(), value, quoted });
    }
    if (i >= text.length) fail('UNSUPPORTED_SOURCE', 'Unclosed markup tag');
    tags.push({ name: name.toLowerCase().split(':').at(-1), attributes });
  }
  return tags;
}

function markdownReferences(text, artifactPath) {
  // Admit a finite CommonMark-compatible subset. Complex nested/escaped link
  // syntax is refused rather than silently treated as dependency-free text.
  const refs = [], definitions = new Map(), normalize = label => label.trim().replace(/\s+/g, ' ').toLowerCase();
  let fence = null;
  text = text.split('\n').map(line => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker && !fence) { fence = marker[1]; return ''; }
    if (fence) { if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = null; return ''; }
    return line;
  }).join('\n');
  text = text.replace(/(`+)[^`\n]*\1/g, '');
  if (/\\|`/.test(text)) fail('UNSUPPORTED_MARKDOWN', `Escaped/complex inline Markdown needs a supported explicit source route: ${artifactPath}`);
  text = text.replace(/^ {0,3}\[([^\]\n]+)\]:[ \t]*(?:<([^>\s]+)>|([^\s]+))(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^\)\n]*\)))?[ \t]*$/gm, (_all, label, angle, plain) => {
    const key = normalize(label);
    if (definitions.has(key)) fail('UNSUPPORTED_MARKDOWN', `Duplicate Markdown reference definition: ${artifactPath}`);
    definitions.set(key, angle ?? plain); return '';
  });
  if (/^ {0,3}\[[^\]\n]*\]:/m.test(text)) fail('UNSUPPORTED_MARKDOWN', `Unsupported Markdown reference definition: ${artifactPath}`);
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '[') continue;
    const image = i > 0 && text[i - 1] === '!';
    const end = text.indexOf(']', i + 1);
    if (end < 0) { if (image) fail('UNSUPPORTED_MARKDOWN', `Unclosed Markdown image: ${artifactPath}`); continue; }
    const label = text.slice(i + 1, end);
    if (label.includes('[')) fail('UNSUPPORTED_MARKDOWN', `Nested Markdown link labels are unsupported: ${artifactPath}`);
    let value, consumed = end;
    if (text[end + 1] === '(') {
      const close = text.indexOf(')', end + 2);
      if (close < 0) fail('UNSUPPORTED_MARKDOWN', `Unclosed Markdown link destination: ${artifactPath}`);
      const destination = text.slice(end + 2, close).trim();
      const match = destination.match(/^(?:<([^<>\s()]+)>|([^<>\s()]+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'))?$/);
      if (!match) fail('UNSUPPORTED_MARKDOWN', `Unsupported Markdown link destination: ${artifactPath}`);
      value = match[1] ?? match[2]; consumed = close;
    } else if (text[end + 1] === '[') {
      const close = text.indexOf(']', end + 2);
      if (close < 0) fail('UNSUPPORTED_MARKDOWN', `Unclosed Markdown link reference: ${artifactPath}`);
      const key = normalize(text.slice(end + 2, close) || label);
      if (!definitions.has(key)) fail('UNRESOLVED_MARKDOWN', `Missing Markdown reference definition: ${artifactPath}`);
      value = definitions.get(key); consumed = close;
    } else if (definitions.has(normalize(label))) value = definitions.get(normalize(label));
    else if (image) fail('UNRESOLVED_MARKDOWN', `Missing Markdown image reference definition: ${artifactPath}`);
    if (/^\s+[\[(]/.test(text.slice(end + 1)) && consumed === end) fail('UNSUPPORTED_MARKDOWN', `Separated Markdown link syntax requires an explicit supported form: ${artifactPath}`);
    if (value !== undefined && (image || !/^[A-Za-z][A-Za-z0-9+.-]*:|^\/\//.test(value))) refs.push(value);
    i = consumed;
  }
  return { refs, text };
}

export function extractDeliveryDependencies(artifact, bytes) {
  const ext = path.posix.extname(artifact.path).slice(1).toLowerCase();
  const textual = ['svg', 'html', 'htm', 'css', 'js', 'mjs', 'json', 'md', 'txt'];
  if (artifact.role === 'source' && ![...textual, 'png', 'jpg', 'jpeg', 'webp', 'woff', 'woff2', 'ttf', 'otf'].includes(ext)) fail('UNSUPPORTED_SOURCE', `Dependency inspection unsupported for source format: ${artifact.path}; retain the original and use a supported explicit source route.`);
  if (!textual.includes(ext)) return [];
  if (bytes.byteLength > 1048576) fail('SOURCE_BOUND', `Dependency-inspected text exceeds 1 MiB: ${artifact.path}`);
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('UNSUPPORTED_ENCODING', `Text source must use valid UTF-8: ${artifact.path}`); }
  if (['svg', 'html', 'htm', 'md'].includes(ext)) text = text.replace(/<!--[\s\S]*?-->/g, '');
  const refs = [];
  if (ext === 'md') { const markdown = markdownReferences(text, artifact.path); refs.push(...markdown.refs); text = markdown.text; }
  if (['svg', 'html', 'htm', 'md'].includes(ext)) {
    if (/<!DOCTYPE\s+[^>]*\[|<!ENTITY/i.test(text)) fail('UNSUPPORTED_SOURCE', `Unsupported entity declarations: ${artifact.path}`);
    for (const tag of markupTags(text)) {
      if (['base', 'iframe', 'object', 'embed', 'foreignobject'].includes(tag.name) || (ext === 'svg' && tag.name === 'script')) fail('UNSUPPORTED_SOURCE', `Unsupported embedded/executable markup: ${artifact.path}`);
      if (tag.name === 'script' && !tag.attributes.some(a => a.name === 'src' && a.value)) fail('UNSUPPORTED_SOURCE', `Inline script dependencies require a separate supported static source: ${artifact.path}`);
      for (const attr of tag.attributes) {
        if (/^on[a-z]/.test(attr.name) || ['srcset', 'srcdoc', 'manifest'].includes(attr.name)) fail('UNSUPPORTED_SOURCE', `Unsupported markup indirection/event handler: ${artifact.path}`);
        const href = ['href', 'xlink:href'].includes(attr.name);
        const resource = ['src', 'poster', 'background', 'action', 'formaction'].includes(attr.name) || (href && (ext === 'svg' || ['link', 'image', 'use', 'feimage'].includes(tag.name)));
        const navigation = href && tag.name === 'a';
        if (resource || navigation) {
          if (!attr.quoted || attr.value === null) fail('UNSUPPORTED_SOURCE', `Resource attributes must use quoted literal paths: ${artifact.path}`);
          if (resource || !/^[A-Za-z][A-Za-z0-9+.-]*:|^\/\//.test(attr.value)) refs.push(attr.value);
        }
      }
    }
  }
  if (['css', 'svg', 'html', 'htm', 'md'].includes(ext)) {
    const cssText = stripComments(text);
    if (/\\|@import\s+(?!["']|url\()/i.test(cssText)) fail('UNSUPPORTED_SOURCE', `Unsupported escaped/dynamic CSS references: ${artifact.path}`);
    if (/\b(?:-webkit-)?(?:image-set|image|cross-fade|paint)\s*\(/i.test(cssText)) fail('UNSUPPORTED_SOURCE', `Unsupported indirect CSS image construction: ${artifact.path}`);
    const urls = [...cssText.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)];
    if ([...cssText.matchAll(/\burl\s*\(/gi)].length !== urls.length) fail('UNSUPPORTED_SOURCE', `Unsupported CSS URL syntax: ${artifact.path}`);
    refs.push(...urls.map(match => match[1]));
    for (const match of cssText.matchAll(/@import\s+["']([^"']+)["']/gi)) refs.push(match[1]);
  }
  if (['js', 'mjs'].includes(ext)) {
    const jsText = stripComments(text, true);
    if (/\b(?:import\s*\(|require\s*\(|fetch\s*\(|WebSocket\s*\(|eval\s*\(|new\s+URL\s*\()/m.test(jsText)) fail('UNSUPPORTED_SOURCE', `Runtime-computed dependencies are unsupported: ${artifact.path}`);
    for (const match of jsText.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?["']([^"']+)["']/g)) refs.push(match[1]);
    for (let i = refs.length - 1; i >= 0; i--) {
      const specifier = refs[i];
      // Built-ins are supplied by an explicitly required Node runtime, never
      // fabricated as copied files or dynamically loaded during inspection.
      if (specifier.startsWith('node:') && isBuiltin(specifier)) refs.splice(i, 1);
      else if (!specifier.startsWith('.')) fail('UNSUPPORTED_SOURCE', `Only relative imports and actual explicit node: built-ins are supported: ${artifact.path}`);
    }
  }
  return refs.filter(Boolean).flatMap(ref => {
    ref = ref.replace(/&amp;/g, '&');
    if (ref.startsWith('#') || ref.startsWith('data:')) return [];
    if (/^[A-Za-z][A-Za-z0-9+.-]*:|^\/\//.test(ref)) fail('EXTERNAL_DEPENDENCY', `External resource cannot establish an offline complete handoff: ${artifact.path}`);
    ref = ref.split('#')[0];
    if (!ref || /[&%?\\\x00-\x1f]/.test(ref) || ref.startsWith('/')) fail('UNSUPPORTED_REFERENCE', `Unsupported resource reference in ${artifact.path}`);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(artifact.path), ref));
    if (!safeDeliveryPath(resolved)) fail('PATH_ESCAPE', `Dependency escapes delivery: ${artifact.path}`);
    return [resolved];
  });
}
