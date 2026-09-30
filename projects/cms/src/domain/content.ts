import { CollectionDef, Entry, RelationField, ScopeContext, SiteManifest } from './schema';

/** One collection of the open site, with its unsaved changes. Immutable: every change returns a copy. */
export interface CollectionData {
  def: CollectionDef;
  /** Path of the JSON file inside the site, where the build writes it. */
  path: string;
  items: Entry[];
  /** Items as they are in the repository, serialized, to know if there are changes. */
  baseline: string;
  /** Version in the repository, checked on save to detect concurrent edits. */
  version: number;
  updatedAt?: string;
  /** Set when the collection could not be read; it is shown but cannot be edited. */
  error?: string;
}

/** Everything the CMS edits in a site. */
export interface SiteContent {
  manifest: SiteManifest;
  collections: CollectionData[];
}

export interface EntryIssue {
  collection: string;
  index: number;
  title: string;
  message: string;
}

export function findCollection(content: SiteContent, id: string): CollectionData | undefined {
  return content.collections.find((c) => c.def.id === id);
}

/** What scope callbacks read: the manifest and the current items. */
export function contextOf(content: SiteContent): ScopeContext {
  return {
    manifest: content.manifest,
    data: (id) => findCollection(content, id)?.items ?? [],
    updatedAt: (id) => findCollection(content, id)?.updatedAt,
  };
}

export function isDirty(collection: CollectionData): boolean {
  return !collection.error && serialize(collection.items) !== collection.baseline;
}

export function dirtyCollections(content: SiteContent): CollectionData[] {
  return content.collections.filter(isDirty);
}

export function titleOf(collection: CollectionData, item: Entry): string {
  return String(item[collection.def.titleKey] ?? '').trim() || `(sin ${collection.def.singular})`;
}

/** Problems in the content: missing required fields, broken references and the scope's rules. */
export function validateContent(content: SiteContent): EntryIssue[] {
  const ctx = contextOf(content);
  const issues: EntryIssue[] = [];
  for (const collection of content.collections) {
    if (collection.error) continue;
    collection.items.forEach((item, index) => {
      const add = (message: string) =>
        issues.push({ collection: collection.def.id, index, title: titleOf(collection, item), message });
      for (const field of collection.def.fields) {
        const value = item[field.key];
        if (field.required && (value === '' || value === null || value === undefined)) add(`Falta "${field.label}".`);
        if (field.type === 'relation') {
          const target = findCollection(content, field.collection);
          if (!target) continue;
          const ids = new Set(target.items.map((e) => e[target.def.idKey ?? 'id']));
          const missing = asArray(value).filter((id) => !ids.has(id));
          if (missing.length) add(`"${field.label}" tiene ids que no existen: ${missing.join(', ')}.`);
        }
      }
      collection.def.validate?.(item, collection.items, ctx).forEach(add);
    });
  }
  return issues;
}

/** Replaces the items of one collection. */
export function setItems(content: SiteContent, id: string, items: Entry[]): SiteContent {
  return {
    ...content,
    collections: content.collections.map((c) => (c.def.id === id ? { ...c, items } : c)),
  };
}

export function updateItem(content: SiteContent, id: string, index: number, item: Entry): SiteContent {
  const collection = require(content, id);
  return setItems(content, id, collection.items.map((e, i) => (i === index ? item : e)));
}

/** Adds an entry at the end (new, or a copy of `copyOf`) with the next free id. */
export function addItem(content: SiteContent, id: string, copyOf?: Entry): { content: SiteContent; index: number } {
  const collection = require(content, id);
  const { idKey, titleKey } = collection.def;
  const item: Entry = copyOf ? structuredClone(copyOf) : collection.def.create(contextOf(content));
  if (idKey) item[idKey] = nextId(collection.items, idKey);
  if (copyOf) item[titleKey] = `${copyOf[titleKey] ?? ''} (copia)`;
  return { content: setItems(content, id, [...collection.items, item]), index: collection.items.length };
}

export function moveItem(content: SiteContent, id: string, from: number, to: number): SiteContent {
  const items = [...require(content, id).items];
  if (to < 0 || to >= items.length) return content;
  items.splice(to, 0, ...items.splice(from, 1));
  return setItems(content, id, items);
}

/** Entries of other collections that point to this entry, for the delete confirmation. */
export function referencesTo(content: SiteContent, id: string, index: number): { collection: string; title: string }[] {
  const refId = idOf(content, id, index);
  if (refId === undefined) return [];
  return relationsTo(content, id).flatMap(({ collection, fields }) =>
    collection.items
      .filter((item) => fields.some((f) => asArray(item[f.key]).includes(refId)))
      .map((item) => ({ collection: collection.def.label, title: titleOf(collection, item) }))
  );
}

/** Deletes an entry and removes its id from the entries that referenced it. */
export function removeItem(content: SiteContent, id: string, index: number): SiteContent {
  const refId = idOf(content, id, index);
  let next = setItems(content, id, require(content, id).items.filter((_, i) => i !== index));
  if (refId === undefined) return next;
  for (const { collection, fields } of relationsTo(next, id)) {
    const items = collection.items.map((item) => {
      if (!fields.some((f) => asArray(item[f.key]).includes(refId))) return item;
      const copy = { ...item };
      for (const f of fields) copy[f.key] = asArray(item[f.key]).filter((ref) => ref !== refId);
      return copy;
    });
    next = setItems(next, collection.def.id, items);
  }
  return next;
}

/** Puts every changed collection back as it is on disk. */
export function discardChanges(content: SiteContent): SiteContent {
  return {
    ...content,
    collections: content.collections.map((c) => (isDirty(c) ? { ...c, items: JSON.parse(c.baseline) } : c)),
  };
}

function relationsTo(content: SiteContent, id: string): { collection: CollectionData; fields: RelationField[] }[] {
  return content.collections
    .map((collection) => ({
      collection,
      fields: collection.def.fields.filter((f): f is RelationField => f.type === 'relation' && f.collection === id),
    }))
    .filter((r) => r.fields.length > 0);
}

function idOf(content: SiteContent, id: string, index: number): unknown {
  const collection = require(content, id);
  return collection.def.idKey ? collection.items[index]?.[collection.def.idKey] : undefined;
}

function require(content: SiteContent, id: string): CollectionData {
  const collection = findCollection(content, id);
  if (!collection) throw new Error(`Colección desconocida: ${id}`);
  return collection;
}

function nextId(items: Entry[], key: string): number {
  return items.reduce((max, item) => Math.max(max, Number(item[key]) || 0), 0) + 1;
}

/** Canonical text of a collection's items, to compare them. */
export function serialize(items: Entry[]): string {
  return JSON.stringify(items);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * The entry with its fields in a fixed order: the order of the collection's new entry
 * (`create`), which is the order of the sites' files, then any other field alphabetically.
 * Firestore does not keep field order, so files are written in this order.
 */
export function orderFields(def: CollectionDef, item: Entry, ctx: ScopeContext): Entry {
  const template = Object.keys(def.create(ctx));
  const known = template.filter((key) => key in item);
  const others = Object.keys(item)
    .filter((key) => !template.includes(key))
    .sort();
  return Object.fromEntries([...known, ...others].map((key) => [key, item[key]]));
}
