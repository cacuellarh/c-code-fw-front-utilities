import { inject, Injectable, signal } from '@angular/core';
import { SavedSite } from '../../domain/ports';
import { SITE_STORE } from './ports.tokens';

export type Site = SavedSite<FileSystemDirectoryHandle>;

/**
 * Client sites added to the CMS. Only this browser remembers them; the content always stays
 * in each site's folder.
 */
@Injectable({ providedIn: 'root' })
export class SitesService {
  private store = inject(SITE_STORE);
  private readonly _sites = signal<Site[]>([]);
  readonly sites = this._sites.asReadonly();

  async load(): Promise<void> {
    const all = await this.store.all();
    this._sites.set(all.sort((a, b) => b.lastOpened - a.lastOpened));
  }

  get(id: string): Site | undefined {
    return this._sites().find((site) => site.id === id);
  }

  /** Saves a site, reusing the entry of the same folder if it was already added. */
  async save(site: Omit<Site, 'id'> & { id?: string }): Promise<Site> {
    let id = site.id;
    for (const existing of this._sites()) {
      if (!id && (await existing.ref.isSameEntry(site.ref))) id = existing.id;
    }
    const saved: Site = { ...site, id: id ?? crypto.randomUUID() };
    await this.store.put(saved);
    await this.load();
    return saved;
  }

  async touch(site: Site): Promise<void> {
    await this.store.put({ ...site, lastOpened: Date.now() });
    await this.load();
  }

  async remove(id: string): Promise<void> {
    await this.store.remove(id);
    await this.load();
  }
}
