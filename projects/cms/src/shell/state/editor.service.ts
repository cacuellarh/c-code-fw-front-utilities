import { computed, inject, Injectable, signal } from '@angular/core';
import * as content from '../../domain/content';
import { SiteContent } from '../../domain/content';
import { listImages, saveImage, UploadedImage } from '../../domain/images';
import { diskPath } from '../../domain/paths';
import { Entry, ImageField, ScopeDef } from '../../domain/schema';
import { openSite, saveSite } from '../../domain/site';
import { EMPTY_THEME, SiteTheme } from '../../domain/theme';
import { ensurePermission, FsSiteFiles } from '../adapters/fs-site-files';
import { loadFonts } from '../adapters/fonts';
import { IMAGE_ENCODER } from './ports.tokens';
import { Site } from './sites.service';

/**
 * The site being edited, as signals for the UI. Every rule lives in the domain; this service
 * only keeps the current snapshot and connects it with the browser.
 */
@Injectable({ providedIn: 'root' })
export class EditorService {
  private encoder = inject(IMAGE_ENCODER);
  private files: FsSiteFiles | null = null;
  private imageCache = new Map<string, Promise<string | null>>();

  readonly site = signal<Site | null>(null);
  readonly scope = signal<ScopeDef | null>(null);
  readonly content = signal<SiteContent | null>(null);
  readonly theme = signal<SiteTheme>(EMPTY_THEME);
  readonly saving = signal(false);

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

  collection(id: string) {
    return this.collections().find((c) => c.def.id === id);
  }

  /** Opens a remembered site. The browser may ask for permission, so call it from a click. */
  async open(site: Site): Promise<void> {
    if (!(await ensurePermission(site.ref))) throw new Error('Sin permiso para leer y escribir la carpeta del sitio.');
    const files = new FsSiteFiles(site.ref);
    const opened = await openSite(files);
    this.close();
    this.files = files;
    loadFonts(opened.theme.fontUrls);
    this.site.set(site);
    this.scope.set(opened.scope);
    this.content.set(opened.content);
    this.theme.set(opened.theme);
  }

  close(): void {
    for (const url of this.imageCache.values()) url.then((u) => u && URL.revokeObjectURL(u));
    this.imageCache.clear();
    this.files = null;
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

  /** Writes the changes to disk. Throws `ConflictError` if a file changed outside the CMS. */
  async save(force = false): Promise<string[]> {
    const scope = this.scope();
    if (!scope || !this.files) throw new Error('No hay un sitio abierto.');
    this.saving.set(true);
    try {
      const result = await saveSite(this.files, scope, this.requireContent(), force);
      this.content.set(result.content);
      return result.written;
    } finally {
      this.saving.set(false);
    }
  }

  /** Object URL of an image of the site, from its path in the JSON. Null if it does not exist. */
  imageUrl(path: string): Promise<string | null> {
    const files = this.files;
    const current = this.content();
    if (!path || !files || !current) return Promise.resolve(null);
    let url = this.imageCache.get(path);
    if (!url) {
      url = files
        .file(diskPath(current.manifest, path))
        .then((file) => (file ? URL.createObjectURL(file) : null))
        .catch(() => null);
      this.imageCache.set(path, url);
    }
    return url;
  }

  listImages(field: ImageField): Promise<string[]> {
    return this.files ? listImages(this.files, this.requireContent().manifest, field) : Promise.resolve([]);
  }

  uploadImage(field: ImageField, file: File): Promise<string> {
    if (!this.files) throw new Error('No hay un sitio abierto.');
    const image: UploadedImage = { name: file.name, type: file.type, data: file };
    return saveImage(this.files, this.encoder, this.requireContent().manifest, field, image);
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
}
