import { slugify } from '@cc/ui-domain';
import { CollectionData, contextOf, dirtyCollections, orderFields, serialize, SiteContent } from './content';
import { DEFAULT_JSON_STYLE, detectJsonStyle, formatJson } from './json-format';
import { suggestManifest } from './manifest';
import { ContentRepository, NewSite, Publisher, SiteFiles, SiteSummary, StoredSite } from './ports';
import { CollectionDef, Entry, MANIFEST_FILE, ScopeDef, SiteManifest } from './schema';
import { findScope } from './scopes';
import { EMPTY_THEME, extractTheme, SiteTheme } from './theme';

export interface OpenedSite {
  summary: SiteSummary;
  scope: ScopeDef;
  content: SiteContent;
  theme: SiteTheme;
}

/** Someone else saved these collections after they were opened. */
export class ConflictError extends Error {
  /** `collections` are ids; `labels`, the names to show ("Planes"). */
  constructor(
    readonly collections: string[],
    labels: string[] = collections
  ) {
    super(`Alguien más guardó cambios en ${labels.join(', ')} mientras editabas.`);
    this.name = 'ConflictError';
  }
}

/** The site has no way to publish yet (for example, no Deploy Hook). */
export class PublishNotConfiguredError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'PublishNotConfiguredError';
  }
}

/** The collections a site has: the scope's, with the manifest's overrides. */
export function collectionsOf(scope: ScopeDef, manifest: SiteManifest): { def: CollectionDef; path: string; explicit: boolean }[] {
  return scope.collections.flatMap((def) => {
    const override = manifest.collections?.[def.id];
    if (override === false) return [];
    return [{ def, path: override || def.file, explicit: !!override }];
  });
}

export function requireScope(id: string): ScopeDef {
  const scope = findScope(id);
  if (!scope) throw new Error(`El scope "${id}" no existe en este CMS.`);
  return scope;
}

/** Loads a site from the repository, ready to edit. */
export async function openSite(repo: ContentRepository, siteId: string): Promise<OpenedSite> {
  const stored = await repo.loadSite(siteId);
  if (!stored) throw new Error(`El sitio "${siteId}" no existe.`);
  return fromStored(stored);
}

export function fromStored(stored: StoredSite): OpenedSite {
  const scope = requireScope(stored.manifest.scope);
  const byId = new Map(stored.collections.map((c) => [c.id, c]));
  const collections: CollectionData[] = collectionsOf(scope, stored.manifest)
    .filter(({ def }) => byId.has(def.id) || !def.optional)
    .map(({ def, path }) => {
      const saved = byId.get(def.id);
      const items = saved?.items ?? [];
      return { def, path, items, baseline: serialize(items), version: saved?.version ?? 0, updatedAt: saved?.updatedAt };
    });
  const { manifest, theme, collections: _, ...summary } = stored;
  return { summary, scope, theme: theme ?? EMPTY_THEME, content: { manifest, collections } };
}

export interface SaveResult {
  content: SiteContent;
  /** Labels of the saved collections. */
  saved: string[];
}

/** Saves the changed collections. The repository throws `ConflictError` if someone saved first. */
export async function saveSite(repo: ContentRepository, siteId: string, content: SiteContent, author: string): Promise<SaveResult> {
  const changed = dirtyCollections(content);
  if (changed.length === 0) return { content, saved: [] };
  const result = await repo
    .saveCollections(
      siteId,
      changed.map((c) => ({ id: c.def.id, items: c.items, expectedVersion: c.version })),
      author
    )
    .catch((e: unknown) => {
      if (!(e instanceof ConflictError)) throw e;
      const label = (id: string) => content.collections.find((c) => c.def.id === id)?.def.label ?? id;
      throw new ConflictError(e.collections, e.collections.map(label));
    });
  const versions = new Map(result.map((r) => [r.id, r]));
  return {
    saved: changed.map((c) => c.def.label),
    content: {
      ...content,
      collections: content.collections.map((c) => {
        const r = versions.get(c.def.id);
        return r ? { ...c, baseline: serialize(c.items), version: r.version, updatedAt: r.updatedAt } : c;
      }),
    },
  };
}

/**
 * Reads a site from its folder, to import it: `cms.json` (or a suggested one), the collection
 * files and the theme. Missing optional files are skipped.
 */
export async function readSiteFolder(files: SiteFiles): Promise<Omit<NewSite, 'id'>> {
  const manifestFile = await files.read(MANIFEST_FILE);
  const manifest = manifestFile ? (JSON.parse(manifestFile.text) as SiteManifest) : await suggestManifest(files);
  const scope = requireScope(manifest.scope);
  const collections: { id: string; items: Entry[] }[] = [];
  for (const { def, path, explicit } of collectionsOf(scope, manifest)) {
    const file = await files.read(path);
    if (!file) {
      if (def.optional && !explicit) continue;
      throw new Error(`No se encontró ${path}.`);
    }
    const items = itemsOfFile(def, JSON.parse(file.text), path);
    collections.push({ id: def.id, items });
  }
  const css = manifest.theme ? await files.read(manifest.theme) : null;
  return { manifest, theme: css ? extractTheme(css.text) : undefined, collections };
}

/**
 * Writes a site's content into its folder: one JSON file per collection (keeping each file's
 * current formatting) and the scope's generated files. Used by the build. Returns the
 * paths that changed.
 */
export async function writeSiteFolder(files: SiteFiles, stored: StoredSite): Promise<string[]> {
  const { scope, content } = fromStored(stored);
  const written: string[] = [];
  const write = async (path: string, text: string, current: string | null) => {
    if (text === current) return;
    await files.write(path, text);
    written.push(path);
  };
  const ctx = contextOf(content);
  for (const c of content.collections) {
    const current = (await files.read(c.path))?.text ?? null;
    const style = current === null ? { ...DEFAULT_JSON_STYLE, indent: '    ' } : detectJsonStyle(current);
    const items = c.items.map((item) => orderFields(c.def, item, ctx));
    // A single-entry collection is one object in its file (the first entry, or a new one).
    const data = c.def.single ? (items[0] ?? orderFields(c.def, c.def.create(ctx), ctx)) : items;
    await write(c.path, formatJson(data, style), current);
  }
  for (const generator of scope.generators ?? []) {
    const path = generator.file(ctx);
    const current = (await files.read(path))?.text ?? null;
    const next = generator.generate(current, ctx);
    if (next !== null) await write(path, next, current);
  }
  return written;
}

/** Id for a new site, from its name: "Ixora Spa Bucaramanga" -> "ixora-spa-bucaramanga". */
export function siteIdFor(name: string, taken: string[] = []): string {
  const base = slugify(name) || 'sitio';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** True when the content was saved after the last publish, so the public site is behind. */
export function needsPublish(site: Pick<SiteSummary, 'updatedAt' | 'publishedAt'>): boolean {
  return !!site.updatedAt && (!site.publishedAt || site.updatedAt > site.publishedAt);
}

/** Rebuilds the public site and records when and by whom. */
export async function publishSite(repo: ContentRepository, publisher: Publisher, siteId: string, author: string): Promise<string> {
  await publisher.publish(siteId);
  const at = new Date().toISOString();
  await repo.markPublished(siteId, at, author);
  return at;
}

/** Renames a site. The name only shows in the CMS; the id and the public site do not change. */
export async function renameSite(repo: ContentRepository, siteId: string, name: string): Promise<string> {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('El nombre no puede quedar vacío.');
  await repo.renameSite(siteId, clean);
  return clean;
}

/** The entries of a collection file: a list, or one object for single-entry collections. */
function itemsOfFile(def: CollectionDef, data: unknown, path: string): Entry[] {
  if (def.single) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${path} debe ser un objeto.`);
    return [data as Entry];
  }
  if (!Array.isArray(data)) throw new Error(`${path} no es una lista.`);
  return data;
}

/** Optional collections of the scope that the site does not have yet (gallery, popup…). */
export function missingCollections(scope: ScopeDef, stored: StoredSite): CollectionDef[] {
  const have = new Set(stored.collections.map((c) => c.id));
  return collectionsOf(scope, stored.manifest)
    .map(({ def }) => def)
    .filter((def) => def.optional && !have.has(def.id));
}

/** Adds an empty collection (a single-entry one starts with its default entry). */
export async function addEmptyCollection(repo: ContentRepository, siteId: string, def: CollectionDef, author: string): Promise<void> {
  const ctx = contextOf({ manifest: { scope: '', name: '' }, collections: [] });
  await repo.addCollections(siteId, [{ id: def.id, items: def.single ? [def.create(ctx)] : [] }], author);
}

/**
 * Imports, from the site's folder, the collections the site does not have in the repository
 * yet (all of them, or only the ids in `only`). Returns the labels of the imported ones (none
 * if the folder has none of them).
 */
export async function importMissingCollections(
  repo: ContentRepository,
  stored: StoredSite,
  folder: Omit<NewSite, 'id'>,
  author: string,
  only?: string[]
): Promise<string[]> {
  const scope = requireScope(stored.manifest.scope);
  const wanted = (def: CollectionDef) => !only || only.includes(def.id);
  const missing = new Map(missingCollections(scope, stored).filter(wanted).map((def) => [def.id, def]));
  const found = folder.collections.filter((c) => missing.has(c.id));
  if (found.length) await repo.addCollections(stored.id, found, author);
  return found.map((c) => missing.get(c.id)!.label);
}

/** Offers again an optional section that was marked as not used. */
export async function offerCollection(repo: ContentRepository, siteId: string, def: CollectionDef): Promise<void> {
  await repo.showCollection(siteId, def.id);
}

/**
 * State of every collection of the scope in a site, for configuring its sections: `active`
 * (the site has it), `hidden` (marked as not used) or `available` (optional, not added yet).
 */
export function sectionStates(scope: ScopeDef, stored: StoredSite): { def: CollectionDef; state: 'active' | 'hidden' | 'available' }[] {
  const have = new Set(stored.collections.map((c) => c.id));
  return scope.collections.map((def) => ({
    def,
    state: have.has(def.id) || !def.optional ? 'active' : stored.manifest.collections?.[def.id] === false ? 'hidden' : 'available',
  }));
}

/** Stops offering an optional section the site does not use (for example price ranges). */
export async function hideCollection(repo: ContentRepository, siteId: string, def: CollectionDef): Promise<void> {
  if (!def.optional) throw new Error(`«${def.label}» no se puede ocultar: el sitio la necesita.`);
  await repo.hideCollection(siteId, def.id);
}

/**
 * Warning when a folder seems to belong to another site: its public address (from its
 * `cms.json` or sitemap) differs from the site's. Null when they match or cannot be compared.
 */
export function folderMismatch(site: SiteManifest, folder: Omit<NewSite, 'id'>): string | null {
  const host = (url?: string) => {
    try {
      return url ? new URL(url).hostname.replace(/^www\./, '') : '';
    } catch {
      return '';
    }
  };
  const mine = host(site.siteUrl);
  const theirs = host(folder.manifest.siteUrl);
  return mine && theirs && mine !== theirs
    ? `La carpeta parece ser de otro sitio (${theirs}), no de ${mine}.`
    : null;
}

/**
 * Replaces the entries of one collection with the ones in the site's folder, as unsaved
 * changes: the user reviews them and saves, or discards. For fixing a wrong import.
 */
export function replaceFromFolder(
  content: SiteContent,
  collectionId: string,
  folder: Omit<NewSite, 'id'>
): { content: SiteContent; before: number; after: number } {
  const current = content.collections.find((c) => c.def.id === collectionId);
  if (!current) throw new Error(`Colección desconocida: ${collectionId}`);
  const found = folder.collections.find((c) => c.id === collectionId);
  if (!found) throw new Error(`La carpeta no tiene el archivo de «${current.def.label}» (${current.path}).`);
  return {
    content: { ...content, collections: content.collections.map((c) => (c === current ? { ...c, items: structuredClone(found.items) } : c)) },
    before: current.items.length,
    after: found.items.length,
  };
}

/**
 * Removes an optional section from a site (for example one imported by mistake). Its last
 * content goes to the history first, and the section is marked as not used, so the CMS does
 * not offer it again. Required sections (plans…) cannot be removed.
 */
export async function removeCollection(repo: ContentRepository, siteId: string, def: CollectionDef, author: string): Promise<void> {
  if (!def.optional) throw new Error(`«${def.label}» no se puede quitar: el sitio la necesita.`);
  await repo.removeCollection(siteId, def.id, author);
}
