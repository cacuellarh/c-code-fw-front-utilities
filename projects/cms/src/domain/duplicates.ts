/*
 * Repeated entries in a site's content: two entries with the same id, or two entries of a
 * collection that others point to (services) with the same name. Fixing them keeps what the
 * public site shows: the sites take the FIRST entry of a repeated id (`joinAdditionalServices`).
 */
import { CollectionData, SiteContent, titleOf } from './content';
import { Entry, RelationField } from './schema';

export interface DuplicateReport {
  /** Hidden copies that got a new id: "Masaje estimulante (Servicios): 144 → 158". */
  renumbered: { collection: string; title: string; from: unknown; to: number }[];
  /** Entries with a repeated name merged into the one most used. */
  merged: { collection: string; title: string; removed: unknown; kept: unknown; moved: string[] }[];
}

/** How many repeated ids and names the content has (for a notice), without changing anything. */
export function countDuplicates(content: SiteContent): number {
  const { report } = fixDuplicates(content);
  return report.renumbered.length + report.merged.length;
}

/**
 * Fixes repeated entries, as unsaved changes:
 * 1. A repeated id: the later entries (the ones the site never shows) get the next free id.
 * 2. A repeated name in a collection that others point to: the entry pointed to by more entries
 *    stays (the first one on a tie); the others are removed and what pointed to them points to it.
 */
export function fixDuplicates(content: SiteContent): { content: SiteContent; report: DuplicateReport } {
  const report: DuplicateReport = { renumbered: [], merged: [] };
  let collections = content.collections;

  // 1. Repeated ids.
  collections = collections.map((collection) => {
    const { idKey } = collection.def;
    if (!idKey || collection.error) return collection;
    let next = collection.items.reduce((max, item) => Math.max(max, Number(item[idKey]) || 0), 0);
    const seen = new Set<unknown>();
    const items = collection.items.map((item) => {
      const id = item[idKey];
      if (!seen.has(id)) {
        seen.add(id);
        return item;
      }
      next += 1;
      report.renumbered.push({ collection: collection.def.label, title: titleOf(collection, item), from: id, to: next });
      return { ...item, [idKey]: next };
    });
    return items === collection.items ? collection : { ...collection, items };
  });

  // 2. Repeated names in collections that others point to.
  for (const target of collections) {
    const { idKey, titleKey } = target.def;
    const pointers = relationFields(collections, target.def.id);
    if (!idKey || target.error || !pointers.length) continue;
    const uses = (id: unknown) =>
      pointers.reduce((n, { collection, field }) => n + collection.items.filter((e) => asIds(e[field.key]).includes(id)).length, 0);
    const groups = new Map<string, Entry[]>();
    for (const item of target.items) {
      const name = normalize(item[titleKey]);
      if (name) groups.set(name, [...(groups.get(name) ?? []), item]);
    }
    const replace = new Map<unknown, unknown>();
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const keep = group.reduce((best, item) => (uses(item[idKey]) > uses(best[idKey]) ? item : best));
      for (const item of group) {
        if (item === keep) continue;
        replace.set(item[idKey], keep[idKey]);
        const moved = pointers.flatMap(({ collection, field }) =>
          collection.items.filter((e) => asIds(e[field.key]).includes(item[idKey])).map((e) => titleOf(collection, e))
        );
        report.merged.push({ collection: target.def.label, title: titleOf(target, item), removed: item[idKey], kept: keep[idKey], moved });
      }
    }
    if (!replace.size) continue;
    collections = collections.map((collection) => {
      const fields = collection.def.fields.filter((f): f is RelationField => f.type === 'relation' && f.collection === target.def.id);
      let items = collection.items;
      if (collection.def.id === target.def.id) items = items.filter((item) => !replace.has(item[idKey]));
      if (fields.length) {
        items = items.map((item) => {
          let changed = item;
          for (const field of fields) {
            const ids = asIds(item[field.key]);
            if (!ids.some((id) => replace.has(id))) continue;
            const next = [...new Set(ids.map((id) => (replace.has(id) ? replace.get(id) : id)))];
            changed = { ...changed, [field.key]: next };
          }
          return changed;
        });
      }
      return items === collection.items ? collection : { ...collection, items };
    });
  }

  return { content: { ...content, collections }, report };
}

function relationFields(collections: CollectionData[], targetId: string): { collection: CollectionData; field: RelationField }[] {
  return collections.flatMap((collection) =>
    collection.def.fields
      .filter((f): f is RelationField => f.type === 'relation' && f.collection === targetId)
      .map((field) => ({ collection, field }))
  );
}

function asIds(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}
