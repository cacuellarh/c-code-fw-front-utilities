import { computed, inject, Injectable, signal } from '@angular/core';
import * as content from '../../domain/content';
import { SiteContent } from '../../domain/content';
import { SiteSummary } from '../../domain/ports';
import { Entry, ScopeDef } from '../../domain/schema';
import { needsPublish, openSite, publishSite, saveSite } from '../../domain/site';
import { EMPTY_THEME, SiteTheme } from '../../domain/theme';
import { loadFonts } from '../adapters/fonts';
import { AuthService } from './auth.service';
import { CONTENT_REPOSITORY, PUBLISHER } from './ports.tokens';

/**
 * The site being edited, as signals for the UI. Every rule lives in the domain; this service
 * only keeps the current snapshot and connects it with Firestore and Vercel.
 */
@Injectable({ providedIn: 'root' })
export class EditorService {
  private repo = inject(CONTENT_REPOSITORY);
  private publisher = inject(PUBLISHER);
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
