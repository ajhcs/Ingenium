import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
const names = ['circle', 'ellipse', 'rectangle', 'triangle', 'hexagon', 'star'];
const hash = value => createHash('sha256').update(value).digest('hex');
const paint = value => value === 'none' || /^#[a-f0-9]{6}$/i.test(value);
const keys = ['id', 'width', 'height', 'fill', 'stroke', 'strokeWidth', 'cornerRadius', 'starPoints'];
export function discoverShapes() { return names.map(id => ({ id, source: 'Original parametric implementation of standard geometric primitives', editable: ['geometry', 'fill', 'stroke'], license: 'MIT', template: false })); }
export function createShape(input) {
  if (!input || typeof input !== 'object' || !Object.hasOwn(input, 'id') || Object.keys(input).some(k => !keys.includes(k)) || !names.includes(input.id)) throw new Error('Expected a supported shape and declared parameters');
  const p = { width: 160, height: 160, fill: '#38706b', stroke: '#17283a', strokeWidth: 2, cornerRadius: 0, starPoints: 5, ...input };
  if (!['width', 'height'].every(k => Number.isFinite(p[k]) && p[k] >= 8 && p[k] <= 2048) || !paint(p.fill) || !paint(p.stroke) || !Number.isFinite(p.strokeWidth) || p.strokeWidth < 0 || p.strokeWidth > Math.min(p.width, p.height) / 4 || !Number.isFinite(p.cornerRadius) || p.cornerRadius < 0 || p.cornerRadius > Math.min(p.width, p.height) / 2 || !Number.isInteger(p.starPoints) || p.starPoints < 3 || p.starPoints > 12) throw new Error('Shape geometry/paint outside supported bounds');
  const n = value => Number(value.toFixed(5));
  if (p.cornerRadius > (Math.min(p.width, p.height) - p.strokeWidth) / 2) throw new Error('Corner radius must fit the stroked geometry');
  const { width: w, height: h } = p, pad = p.strokeWidth / 2, cx = w / 2, cy = h / 2, rx = cx - pad, ry = cy - pad;
  let body;
  if (p.id === 'circle') body = `<circle cx="${cx}" cy="${cy}" r="${Math.min(rx, ry)}"/>`;
  else if (p.id === 'ellipse') body = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  else if (p.id === 'rectangle') body = `<rect x="${pad}" y="${pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" rx="${p.cornerRadius}"/>`;
  else {
    const count = p.id === 'triangle' ? 3 : p.id === 'hexagon' ? 6 : p.starPoints * 2;
    const points = Array.from({ length: count }, (_, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / count, scale = p.id === 'star' && i % 2 ? 0.45 : 1;
      return `${n(cx + rx * scale * Math.cos(a))},${n(cy + ry * scale * Math.sin(a))}`;
    }).join(' ');
    body = `<polygon points="${points}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"><title>${p.id}</title><g fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linejoin="round">${body}</g></svg>`;
  return { schemaVersion: 1, parameters: p, svg, sha256: hash(svg), source: 'Original standard-geometry constructor; no external shape catalog', license: 'MIT' };
}
export function customizeShape(shape, changes) {
  if (!shape || shape.schemaVersion !== 1 || shape.sha256 !== hash(shape.svg) || createShape(shape.parameters).svg !== shape.svg || !changes || Object.keys(changes).some(k => !keys.includes(k))) throw new Error('Expected intact original shape and supported changes');
  return { ...createShape({ ...shape.parameters, ...changes }), derivedFrom: shape.sha256 };
}
export async function exportShape({ shape, outputDir }) {
  if (!shape || createShape(shape.parameters).svg !== shape.svg || shape.sha256 !== hash(shape.svg) || typeof outputDir !== 'string' || !outputDir.trim()) throw new Error('Expected intact shape and new output directory');
  const out = resolve(outputDir);
  if (await realpath(dirname(out)) !== dirname(out)) throw new Error('Output parent must be canonical');
  await mkdir(out);
  await writeFile(join(out, 'shape.svg'), shape.svg, { flag: 'wx' });
  const { svg, ...record } = shape;
  await writeFile(join(out, 'shape.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  return { outputDir: out, sha256: shape.sha256, parameters: shape.parameters };
}
