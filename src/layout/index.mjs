/** Small, pure, axis-aligned layout constructions. All coordinates use authored units. */
class LayoutError extends Error {
  constructor(rule, message, details = {}) { super(message); this.rule = rule; Object.assign(this, details); }
}
const fail = (rule, message, details) => { throw new LayoutError(rule, message, details); };
function number(value, name, { min = -Infinity, positive = false } = {}) {
  if (!Number.isFinite(value) || value < min || (positive && value <= 0)) fail('layout.input', `${name} must be a finite ${positive ? 'positive' : min === 0 ? 'nonnegative' : ''} number`);
  return value;
}
function box(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('layout.input', 'A box must have x, y, width and height');
  const result = { x: number(value.x, 'x'), y: number(value.y, 'y'), width: number(value.width, 'width', { min: 0 }), height: number(value.height, 'height', { min: 0 }) };
  if (!Number.isFinite(result.x + result.width) || !Number.isFinite(result.y + result.height)) fail('layout.input', 'Box edges must be finite');
  return result;
}
function denseArray(value, name) {
  if (!Array.isArray(value)) fail('layout.input', `${name} must be an array`);
  if (Object.keys(value).length !== value.length || Array.from({ length: value.length }, (_, index) => !Object.hasOwn(value, index)).some(Boolean)) fail('layout.input', `${name} must be a dense array without extra properties`);
  return value;
}
function axisValue(axis) { if (axis !== 'x' && axis !== 'y') fail('layout.input', 'axis must be x or y'); return axis; }
function alignment(value) { if (!['start', 'center', 'end'].includes(value)) fail('layout.input', 'alignment must be start, center or end'); return value; }
function insets(value) {
  const result = typeof value === 'number' ? { top: value, right: value, bottom: value, left: value } : { top: 0, right: 0, bottom: 0, left: 0, ...value };
  if (value === null || (typeof value !== 'number' && (typeof value !== 'object' || Array.isArray(value)))) fail('layout.input', 'insets must be a number or edge object');
  for (const key of Object.keys(result)) {
    if (!['top', 'right', 'bottom', 'left'].includes(key)) fail('layout.input', `Unknown inset ${key}`);
    number(result[key], key, { min: 0 });
  }
  return result;
}
export function insetBox(input, value) {
  const b = box(input), i = insets(value);
  const width = b.width - i.left - i.right, height = b.height - i.top - i.bottom;
  if (width < 0 || height < 0) fail('layout.range', 'Insets exceed box dimensions', { measurement: { width, height } });
  return box({ x: b.x + i.left, y: b.y + i.top, width, height });
}
export function columns(input, { count, gutter = 0 } = {}) {
  const b = box(input); number(gutter, 'gutter', { min: 0 });
  if (!Number.isSafeInteger(count) || count < 1 || count > 1000) fail('layout.range', 'count must be an integer from 1 to 1000');
  const width = (b.width - gutter * (count - 1)) / count;
  if (width < 0) fail('layout.range', 'Gutters exceed available width', { measurement: { width } });
  return Array.from({ length: count }, (_, index) => box({ x: b.x + index * (width + gutter), y: b.y, width, height: b.height }));
}
export function spanColumns(input, start, span = 1) {
  if (!Array.isArray(input) || !Number.isInteger(start) || !Number.isInteger(span) || start < 0 || span < 1 || start + span > input.length) fail('layout.range', 'Column span is outside available columns (start is zero-based)');
  const selected = input.slice(start, start + span).map(box), first = selected[0], last = selected.at(-1);
  for (let index = 1; index < selected.length; index++) {
    const prior = selected[index - 1], next = selected[index];
    if (next.y !== first.y || next.height !== first.height || next.x < prior.x + prior.width) fail('layout.conflict', 'Spanning requires ordered, nonoverlapping columns with shared y and height');
  }
  return box({ ...first, width: last.x + last.width - first.x });
}
export function stack(input, items, { axis = 'y', gap = 0, align = 'start' } = {}) {
  const b = box(input); axisValue(axis); alignment(align); number(gap, 'gap', { min: 0 });
  denseArray(items, 'items');
  if (items.length > 1000) fail('layout.input', 'items must be an array of at most 1000 sizes or width/height objects');
  let cursor = b[axis];
  return items.map(item => {
    const main = axis === 'x' ? 'width' : 'height', cross = axis === 'x' ? 'height' : 'width', crossAxis = axis === 'x' ? 'y' : 'x';
    const sizes = typeof item === 'number' ? { [main]: item, [cross]: b[cross] } : item;
    if (!sizes || typeof sizes !== 'object') fail('layout.input', 'Stack item needs dimensions');
    const width = number(sizes.width, 'item width', { min: 0 }), height = number(sizes.height, 'item height', { min: 0 });
    const result = box({ x: b.x, y: b.y, width, height, [axis]: cursor, [crossAxis]: b[crossAxis] + (b[cross] - sizes[cross]) * ({ start: 0, center: 0.5, end: 1 }[align]) });
    cursor += sizes[main] + gap;
    return result;
  });
}
export function alignBox(input, reference, { x, y } = {}) {
  const b = box(input), r = box(reference), result = { ...b };
  for (const [axis, value, size] of [['x', x, 'width'], ['y', y, 'height']]) if (value !== undefined) result[axis] = r[axis] + (r[size] - b[size]) * ({ start: 0, center: 0.5, end: 1 }[alignment(value)]);
  return box(result);
}
export function baselineGrid(input, { step, offset = 0 } = {}) {
  const b = box(input); number(step, 'step', { positive: true }); number(offset, 'offset', { min: 0 });
  if (offset > b.height) fail('layout.range', 'Baseline offset exceeds box height');
  const count = Math.floor((b.height - offset) / step) + 1;
  if (count > 10000) fail('layout.range', 'Baseline grid exceeds 10000 lines');
  return Array.from({ length: count }, (_, index) => ({ axis: 'y', value: b.y + offset + index * step, start: b.x, end: b.x + b.width }));
}
export function ratioSplit(input, { ratio = 'golden', axis = 'x', gap = 0 } = {}) {
  const b = box(input); axisValue(axis); number(gap, 'gap', { min: 0 });
  const resolved = ratio === 'golden' ? (1 + Math.sqrt(5)) / 2 : ratio === 'equal' ? 1 : ratio;
  number(resolved, 'ratio', { positive: true });
  const dimension = axis === 'x' ? 'width' : 'height', available = b[dimension] - gap;
  if (available < 0) fail('layout.range', 'Split gap exceeds available dimension');
  // This form avoids overflow from available * ratio. No claim that any ratio improves taste.
  const first = available / (1 + 1 / resolved), second = available - first;
  return [box({ ...b, [dimension]: first }), box({ ...b, [axis]: b[axis] + first + gap, [dimension]: second })];
}
const keys = {
  box: ['x', 'y', 'width', 'height', 'right', 'bottom'], inset: ['from', 'insets'], columns: ['from', 'count', 'gutter'],
  span: ['from', 'start', 'span'], stack: ['from', 'items', 'axis', 'gap', 'align'], align: ['from', 'to', 'x', 'y'],
  baselines: ['from', 'step', 'offset'], split: ['from', 'ratio', 'axis', 'gap']
};
function resolveTokens(value, tokens) {
  if (typeof value === 'string' && value.startsWith('$')) {
    const key = value.slice(1);
    if (!Object.hasOwn(tokens, key)) fail('layout.input', `Unknown numeric token ${value}`);
    return tokens[key];
  }
  if (Array.isArray(value)) return denseArray(value, 'Layout values').map(item => resolveTokens(item, tokens));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTokens(item, tokens)]));
  return value;
}
function boxGuides(value, target) {
  return [
    { id: `${target}:left`, target, axis: 'x', value: value.x, start: value.y, end: value.y + value.height },
    { id: `${target}:right`, target, axis: 'x', value: value.x + value.width, start: value.y, end: value.y + value.height },
    { id: `${target}:top`, target, axis: 'y', value: value.y, start: value.x, end: value.x + value.width },
    { id: `${target}:bottom`, target, axis: 'y', value: value.y + value.height, start: value.x, end: value.x + value.width }
  ];
}
/**
 * v1 record: {version:1,canvas:{width,height},tokens?:{name:number},nodes:[...],exceptions?:[...]}.
 * Node {id,op,...}; references are node IDs or '$canvas'. Arrays are consumed only by span.
 * Numeric fields can reference '$token'. Box nodes require x/y plus width/height or right/bottom.
 * An optional optical exception {target,rule:'layout.bounds',reason,kind:'optical'} records
 * intentional authored-layout overflow as review-needed; no alternate exception scope or
 * extra fields are supported, and it cannot waive invalid/cyclic constraints.
 * Resolution never mutates the record. Geometry does not establish semantic or visual quality.
 */
export function resolveLayout(record) {
  const boxes = Object.create(null), guides = [], issues = [], states = new Map(), nodes = new Map();
  let exceptions = [], tokens = {}, canvas;
  const issue = (rule, target, status, message, details = {}) => issues.push({ rule, target, status, scope: { kind: 'layout', profile: 'authored' }, message, ...details });
  const result = () => ({ status: issues.some(item => item.status === 'fail') ? 'fail' : issues.some(item => item.status === 'review-needed') ? 'review-needed' : 'pass', boxes, guides, tokens: { ...tokens }, exceptions, issues });
  try {
    if (!record || record.version !== 1 || !Array.isArray(record.nodes) || record.nodes.length > 1000) fail('layout.input', 'Expected version 1 record with at most 1000 nodes');
    if (Object.keys(record).some(key => !['version', 'canvas', 'tokens', 'nodes', 'exceptions'].includes(key))) fail('layout.input', 'Unsupported top-level layout property');
    if (!record.canvas || Object.keys(record.canvas).some(key => !['x', 'y', 'width', 'height'].includes(key))) fail('layout.input', 'Canvas supports only x, y, width and height');
    canvas = box({ x: 0, y: 0, ...record.canvas });
    if (canvas.x !== 0 || canvas.y !== 0 || canvas.width <= 0 || canvas.height <= 0) fail('layout.input', 'Canvas must have origin 0,0 and positive dimensions');
    if (record.tokens !== undefined && (!record.tokens || typeof record.tokens !== 'object' || Array.isArray(record.tokens))) fail('layout.input', 'tokens must be a numeric object');
    tokens = { ...(record.tokens ?? {}) };
    for (const [key, value] of Object.entries(tokens)) { if (!key || key.startsWith('$')) fail('layout.input', 'Token names must be nonempty and omit $'); number(value, `token ${key}`); }
    if (record.exceptions !== undefined && !Array.isArray(record.exceptions)) fail('layout.input', 'exceptions must be an array');
    exceptions = structuredClone(record.exceptions ?? []);
    for (const exception of exceptions) if (!exception || Object.keys(exception).some(key => !['target', 'rule', 'kind', 'reason'].includes(key)) || typeof exception.target !== 'string' || exception.rule !== 'layout.bounds' || exception.kind !== 'optical' || typeof exception.reason !== 'string' || !exception.reason.trim()) fail('layout.input', 'Authored-layout optical exceptions support only target, layout.bounds rule, optical kind and a reason');
    if (new Set(exceptions.map(exception => exception.target)).size !== exceptions.length) fail('layout.conflict', 'Duplicate optical exception target');
    for (const node of record.nodes) {
      if (!node || typeof node.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_.-]*$/.test(node.id) || nodes.has(node.id)) fail('layout.conflict', 'Node IDs must be unique identifiers (letter, then letters, numbers, _, . or -)');
      nodes.set(node.id, node);
    }
  } catch (error) { issue(error.rule ?? 'layout.input', '$record', 'fail', error.message); return result(); }
  const read = id => {
    if (id === '$canvas') return canvas;
    if (typeof id !== 'string' || !nodes.has(id)) fail('layout.reference', `Unknown layout reference ${String(id)}`);
    if (states.get(id) === 'visiting') fail('layout.cycle', `Cyclic layout dependency at ${id}`);
    if (states.get(id) === 'failed') fail('layout.reference', `Dependency ${id} did not resolve`);
    if (states.get(id) === 'done') return boxes[id];
    states.set(id, 'visiting');
    const node = nodes.get(id);
    try {
      if (!Object.hasOwn(keys, node.op)) fail('layout.input', `Unsupported layout operation ${String(node.op)}`);
      for (const key of Object.keys(node)) if (!['id', 'op', ...keys[node.op]].includes(key)) fail('layout.conflict', `Unsupported or conflicting property ${key}`);
      const fields = Object.fromEntries(Object.entries(node).filter(([key]) => !['id', 'op', 'from', 'to'].includes(key)));
      const n = resolveTokens(fields, tokens);
      let value, container;
      const nodeGuides = [];
      if (node.op === 'box') {
        number(n.x, 'x'); number(n.y, 'y');
        const width = Object.hasOwn(n, 'width') ? n.width : number(n.right, 'right') - n.x, height = Object.hasOwn(n, 'height') ? n.height : number(n.bottom, 'bottom') - n.y;
        value = box({ x: n.x, y: n.y, width, height });
        for (const [edge, actual] of [['right', value.x + value.width], ['bottom', value.y + value.height]]) if (n[edge] !== undefined && number(n[edge], edge) !== actual) fail('layout.conflict', `${edge} conflicts with box coordinates`, { measurement: { authored: n[edge], resolved: actual }, residual: actual - n[edge] });
      } else {
        const input = read(node.from);
        if (node.op === 'inset') value = insetBox(input, n.insets);
        if (node.op === 'columns') value = columns(input, n);
        if (node.op === 'span') value = spanColumns(input, n.start, n.span);
        if (node.op === 'stack') { value = stack(input, n.items, n); container = box(input); }
        if (node.op === 'align') value = alignBox(input, read(node.to), n);
        if (node.op === 'split') value = ratioSplit(input, n);
        if (node.op === 'baselines') {
          const lines = baselineGrid(input, n);
          if (guides.length + nodeGuides.length + lines.length > 20000) fail('layout.range', 'Layout exceeds 20000 guides');
          nodeGuides.push(...lines.map((line, index) => ({ id: `${id}:baseline:${index}`, target: id, ...line })));
          value = box(input);
        }
      }
      boxes[id] = value;
      const values = Array.isArray(value) ? value : [value];
      values.forEach((b, index) => {
        const target = Array.isArray(value) ? `${id}[${index}]` : id;
        if (guides.length + nodeGuides.length + 4 > 20000) fail('layout.range', 'Layout exceeds 20000 guides');
        nodeGuides.push(...boxGuides(b, target));
        const canvasResidual = Math.max(0, -b.x, -b.y, b.x + b.width - canvas.width, b.y + b.height - canvas.height);
        const containerResidual = container ? Math.max(0, container.x - b.x, container.y - b.y, b.x + b.width - container.x - container.width, b.y + b.height - container.y - container.height) : 0;
        const residual = Math.max(canvasResidual, containerResidual);
        if (residual > 0) {
          const exception = exceptions.find(item => item.target === target && item.rule === 'layout.bounds');
          issue('layout.bounds', target, exception ? 'review-needed' : 'fail', exception ? 'Authored optical overflow needs visual review' : 'Box exceeds authored canvas or stack container', { measurement: { ...b, canvas: { ...canvas }, ...(container ? { container } : {}) }, residual, ...(exception ? { exception: structuredClone(exception) } : {}) });
        }
      });
      guides.push(...nodeGuides);
      states.set(id, 'done');
      return value;
    } catch (error) {
      delete boxes[id];
      states.set(id, 'failed');
      issue(error.rule ?? 'layout.input', id, 'fail', error.message, { ...(error.measurement ? { measurement: error.measurement } : {}), ...(error.residual !== undefined ? { residual: error.residual } : {}) });
      throw new LayoutError('layout.reference', `Dependency ${id} did not resolve`);
    }
  };
  for (const id of nodes.keys()) { if (!states.has(id)) try { read(id); } catch { /* scoped issues retained above */ } }
  for (const exception of exceptions) if (!Object.hasOwn(boxes, exception.target) && !Object.keys(boxes).some(id => Array.isArray(boxes[id]) && boxes[id].some((_, index) => `${id}[${index}]` === exception.target))) issue('layout.exception', exception.target, 'fail', 'Exception target did not resolve');
  return result();
}
