import { computed, inject, Injectable, signal } from '@angular/core';
import * as content from '../../domain/content';
import { SiteContent } from '../../domain/content';
import { SiteSummary } from '../../domain/ports';
import { Entry, ScopeDef } from '../../domain/schema';
import { addEmptyCollection, folderMismatch, hideCollection, importMissingCollections, missingCollections, needsPublish, openSite, publishSite, readSiteFolder, renameSite, replaceFromFolder, saveSite } from '../../domain/site';
import { CollectionDef } from '../../domain/schema';
import { NewSite } from '../../domain/ports';
import { FsSiteFiles } from '../adapters/fs-site-files';
import { EMPTY_THEME, SiteTheme } from '../../domain/theme';
import { checkBeforePublish } from '../../domain/media';
import { loadFonts } from '../adapters/fonts';
import { AuthService } from './auth.service';
import { CONTENT_REPOSITORY, PUBLIC_SITE, PUBLISHER } from './ports.tokens';

/**
 * The site being edited, as signals for the UI. Every rule lives in the domain; this service
 * only keeps the current snapshot and connects it with Firestore and Vercel.
 */
@Injectable({ providedIn: 'root' })
export class EditorService {
  private repo = inject(CONTENT_REPOSITORY);
  private publisher = inject(PUBLISHER);
  private publicSite = inject(PUBLIC_SITE);
  private auth = inject(AuthService);

  readonly site = signal<SiteSummary | null>(null);
  readonly scope = signal<ScopeDef | null>(null);
  readonly content = signal<SiteContent | null>(null);
  readonly theme = signal<SiteTheme>(EMPTY_THEME);
  readonly saving = signal(false);
  readonly publishing = signal(false);

  readonly collections = computed(() => this.content()?.collections ?? []);
  readonly ctx = computed(() => {
    const current = this.content();
    return current ? content.contextOf(current) : null;
  });
  readonly dirty = computed(() => {
    const current = this.content();
    return current ? content.dirtyCollections(current) : [];
  });
  readonly issues = computed(() => {
    const current = this.content();
    return current ? content.validateContent(current) : [];
  });
  /** Saved content that is not on the public site yet. */
  readonly unpublished = computed(() => {
    const site = this.site();
    return !!site && needsPublish(site);
  });

  collection(id: string) {
    return this.collections().find((c) => c.def.id === id);
  }

  async open(siteId: string): Promise<void> {
    const opened = await openSite(this.repo, siteId);
    loadFonts(opened.theme.fontUrls);
    this.site.set(opened.summary);
    this.scope.set(opened.scope);
    this.content.set(opened.content);
    this.theme.set(opened.theme);
  }

  close(): void {
    this.site.set(null);
    this.scope.set(null);
    this.content.set(null);
    this.theme.set(EMPTY_THEME);
  }

  updateItem(collection: string, index: number, item: Entry): void {
    this.change((c) => content.updateItem(c, collection, index, item));
  }

  addItem(collection: string, copyOf?: Entry): number {
    const result = content.addItem(this.requireContent(), collection, copyOf);
    this.content.set(result.content);
    return result.index;
  }

  moveItem(collection: string, from: number, to: number): void {
    this.change((c) => content.moveItem(c, collection, from, to));
  }

  referencesTo(collection: string, index: number) {
    return content.referencesTo(this.requireContent(), collection, index);
  }

  removeItem(collection: string, index: number): void {
    this.change((c) => content.removeItem(c, collection, index));
  }

  discard(): void {
    this.change(content.discardChanges);
  }

  /** Saves the changes in Firestore. Throws `ConflictError` if someone saved first. */
  async save(): Promise<string[]> {
    const site = this.requireSite();
    this.saving.set(true);
    try {
      const result = await saveSite(this.repo, site.id, this.requireContent(), this.auth.email());
      this.content.set(result.content);
      const updatedAt = result.content.collections.map((c) => c.updatedAt ?? '').sort().pop();
      if (result.saved.length) this.site.set({ ...site, updatedAt });
      return result.saved;
    } finally {
      this.saving.set(false);
    }
  }

  /** Warning to show before publishing (for example, images the site cannot show yet), or null. */
  publishWarning(): Promise<string | null> {
    return checkBeforePublish(this.requireContent(), this.publicSite);
  }

  /** Starts the build of the public site with the saved content. */
  async publish(): Promise<void> {
    const site = this.requireSite();
    this.publishing.set(true);
    try {
      const publishedAt = await publishSite(this.repo, this.publisher, site.id);
      this.site.set({ ...site, publishedAt });
    } finally {
      this.publishing.set(false);
    }
  }

  async rename(name: string): Promise<void> {
    const site = this.requireSite();
    const clean = await renameSite(this.repo, site.id, name);
    this.site.set({ ...site, name: clean });
    this.content.update((c) => (c ? { ...c, manifest: { ...c.manifest, name: clean } } : c));
  }

  /** Optional sections (gallery, popup…) the open site does not have yet. */
  async missingSections(): Promise<CollectionDef[]> {
    const stored = await this.repo.loadSite(this.requireSite().id);
    const scope = this.scope();
    return stored && scope ? missingCollections(scope, stored) : [];
  }

  /** Adds an empty section and reopens the site to show it. */
  async addSection(def: CollectionDef): Promise<void> {
    const site = this.requireSite();
    await addEmptyCollection(this.repo, site.id, def, this.auth.email());
    await this.open(site.id);
  }

  /** Stops offering a section the site does not use. */
  async hideSection(def: CollectionDef): Promise<void> {
    const site = this.requireSite();
    await hideCollection(this.repo, site.id, def);
    await this.open(site.id);
  }

  /** Reads a site folder (JSON files, cms.json, theme) without changing anything. */
  readFolder(handle: FileSystemDirectoryHandle): Promise<Omit<NewSite, 'id'>> {
    return readSiteFolder(new FsSiteFiles(handle));
  }

  /** Warning when the folder seems to be another site's, or null. */
  folderWarning(folder: Omit<NewSite, 'id'>): string | null {
    return folderMismatch(this.requireContent().manifest, folder);
  }

  /** Puts a collection's entries from the folder as unsaved changes, to review and save. */
  replaceFromFolder(collectionId: string, folder: Omit<NewSite, 'id'>): { before: number; after: number } {
    const result = replaceFromFolder(this.requireContent(), collectionId, folder);
    this.content.set(result.content);
    return { before: result.before, after: result.after };
  }

  /** Imports, from the site's folder, the sections it does not have yet. Returns their labels. */
  async importSections(folder: Omit<NewSite, 'id'>): Promise<string[]> {
    const site = this.requireSite();
    const stored = await this.repo.loadSite(site.id);
    if (!stored) throw new Error('El sitio no existe.');
    const imported = await importMissingCollections(this.repo, stored, folder, this.auth.email());
    if (imported.length) await this.open(site.id);
    return imported;
  }

  getDeployHook(): Promise<string> {
    return this.repo.getDeployHook(this.requireSite().id);
  }

  setDeployHook(url: string): Promise<void> {
    return this.repo.setDeployHook(this.requireSite().id, url.trim());
  }

  /** Address of an image of the JSON on the public site, to show it. */
  imageUrl(path: string): Promise<string | null> {
    const siteUrl = this.content()?.manifest.siteUrl;
    if (!path || !siteUrl) return Promise.resolve(null);
    try {
      return Promise.resolve(new URL(path.replace(/^\/*/, '/'), siteUrl).href);
    } catch {
      return Promise.resolve(null);
    }
  }

  private change(update: (current: SiteContent) => SiteContent): void {
    if (this.saving()) return;
    const current = this.content();
    if (current) this.content.set(update(current));
  }

  private requireContent(): SiteContent {
    const current = this.content();
    if (!current) throw new Error('No hay un sitio abierto.');
    return current;
  }

  private requireSite(): SiteSummary {
    const site = this.site();
    if (!site) throw new Error('No hay un sitio abierto.');
    return site;
  }
}
