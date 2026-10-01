import { CollectionChange, ContentRepository, NewSite, SavedCollection, SiteSummary, StoredSite } from '../ports';
import { Entry } from '../schema';
import { ConflictError } from '../site';

/** `ContentRepository` in memory, for tests. Behaves like Firestore: versions and conflicts. */
export class MemoryContentRepository implements ContentRepository {
  readonly sites = new Map<string, StoredSite>();
  readonly history: { siteId: string; author: string; collections: string[] }[] = [];
  private tick = 0;

  async listSites(): Promise<SiteSummary[]> {
    return [...this.sites.values()].map(({ id, name, scope, updatedAt, publishedAt }) => ({ id, name, scope, updatedAt, publishedAt }));
  }

  async loadSite(siteId: string): Promise<StoredSite | null> {
    const site = this.sites.get(siteId);
    return site ? structuredClone(site) : null;
  }

  async saveCollections(siteId: string, changes: CollectionChange[], author: string): Promise<SavedCollection[]> {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`El sitio "${siteId}" no existe.`);
    const current = (id: string) => site.collections.find((c) => c.id === id);
    const conflicts = changes.filter((c) => (current(c.id)?.version ?? 0) !== c.expectedVersion).map((c) => c.id);
    if (conflicts.length) throw new ConflictError(conflicts);

    const updatedAt = this.now();
    const saved = changes.map((change) => {
      const version = change.expectedVersion + 1;
      const next = { id: change.id, items: structuredClone(change.items), version, updatedAt };
      site.collections = [...site.collections.filter((c) => c.id !== change.id), next];
      return { id: change.id, version, updatedAt };
    });
    site.updatedAt = updatedAt;
    this.history.push({ siteId, author, collections: changes.map((c) => c.id) });
    return saved;
  }

  async createSite(site: NewSite, _author: string): Promise<void> {
    if (this.sites.has(site.id)) throw new Error(`Ya existe un sitio con el id "${site.id}".`);
    const updatedAt = this.now();
    this.sites.set(site.id, {
      id: site.id,
      name: site.manifest.name,
      scope: site.manifest.scope,
      manifest: site.manifest,
      theme: site.theme,
      updatedAt,
      collections: site.collections.map((c) => ({ ...c, version: 1, updatedAt })),
    });
  }

  readonly publications: { siteId: string; at: string; author: string }[] = [];

  async listPublications(siteId: string, limit: number): Promise<{ at: string; author: string }[]> {
    return this.publications
      .filter((p) => p.siteId === siteId)
      .map(({ at, author }) => ({ at, author }))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit);
  }

  async markPublished(siteId: string, at: string, author = ''): Promise<void> {
    this.publications.push({ siteId, at, author });
    const site = this.sites.get(siteId);
    if (site) site.publishedAt = at;
  }

  async removeCollection(siteId: string, collectionId: string, author: string): Promise<void> {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`El sitio "${siteId}" no existe.`);
    site.collections = site.collections.filter((c) => c.id !== collectionId);
    this.history.push({ siteId, author, collections: [collectionId] });
    await this.hideCollection(siteId, collectionId);
  }

  async hideCollection(siteId: string, collectionId: string): Promise<void> {
    const site = this.sites.get(siteId);
    if (site) site.manifest = { ...site.manifest, collections: { ...site.manifest.collections, [collectionId]: false } };
  }

  async showCollection(siteId: string, collectionId: string): Promise<void> {
    const site = this.sites.get(siteId);
    if (!site?.manifest.collections) return;
    const { [collectionId]: _, ...rest } = site.manifest.collections;
    site.manifest = { ...site.manifest, collections: rest };
  }

  async addCollections(siteId: string, collections: { id: string; items: Entry[] }[], _author: string): Promise<void> {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`El sitio "${siteId}" no existe.`);
    const taken = collections.filter((c) => site.collections.some((s) => s.id === c.id));
    if (taken.length) throw new Error(`Ya existen: ${taken.map((c) => c.id).join(', ')}.`);
    const updatedAt = this.now();
    site.collections = [...site.collections, ...collections.map((c) => ({ ...structuredClone(c), version: 1, updatedAt }))];
    site.updatedAt = updatedAt;
  }

  async renameSite(siteId: string, name: string): Promise<void> {
    const site = this.sites.get(siteId);
    if (site) this.sites.set(siteId, { ...site, name, manifest: { ...site.manifest, name } });
  }

  private now(): string {
    return new Date(Date.UTC(2026, 0, 1, 0, 0, this.tick++)).toISOString();
  }
}
