import { hashIdentity } from '../checks/index.mjs';

function entries(inventory) {
  if (inventory?.version !== 1 || !Array.isArray(inventory.items) || inventory.items.length > 10000) throw new TypeError('Expected a version 1 rendered inventory of at most 10000 items');
  const result = new Map();
  for (const item of inventory.items) {
    if (!['link', 'form', 'control', 'heading', 'content'].includes(item?.kind) || typeof item.key !== 'string' || !item.attributes || typeof item.attributes !== 'object') throw new TypeError('Invalid inventory item');
    // Group by semantic identity and retain duplicate occurrences. CSS/order are absent.
    const id = hashIdentity({ kind: item.kind, key: item.key });
    const group = result.get(id) ?? [];
    group.push(item); result.set(id, group);
  }
  return result;
}

export function compareInventories(before, after) {
  const a = entries(before), b = entries(after), removed = [], changed = [], added = [];
  for (const [id, originals] of a) {
    const remaining = [...(b.get(id) ?? [])];
    const unmatched = originals.filter(item => {
      const index = remaining.findIndex(candidate => hashIdentity(candidate.attributes) === hashIdentity(item.attributes));
      if (index < 0) return true;
      remaining.splice(index, 1); return false;
    });
    for (const item of unmatched) {
      if (remaining.length) changed.push({ id, before: item, after: remaining.shift() });
      else removed.push({ id, before: item });
    }
    for (const item of remaining) added.push({ id, after: item });
  }
  for (const [id, items] of b) if (!a.has(id)) for (const item of items) added.push({ id, after: item });
  return { removed, changed, added };
}
