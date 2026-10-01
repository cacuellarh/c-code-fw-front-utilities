import { computed, inject, Injectable, signal } from '@angular/core';
import { deleteMedia, importSiteImages, ImportReport, legacyImages, mediaIdOf, uploadMedia } from '../../domain/media';
import { FsSiteFiles } from '../adapters/fs-site-files';
import { MediaItem, MediaKind, MediaVariant } from '../../domain/ports';
import { EditorService } from './editor.service';
import { IMAGE_ENCODER, MEDIA_STORE } from './ports.tokens';

/** One file of an upload, with its progress for the UI. */
export interface UploadStatus {
  name: string;
  state: 'waiting' | 'working' | 'done' | 'error';
  message?: string;
}

/**
 * The image library of the open site, as signals. The rules (formats, sizes, what can be
 * deleted) are in `domain/media.ts`; this service keeps the list and makes object URLs.
 */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private store = inject(MEDIA_STORE);
  private encoder = inject(IMAGE_ENCODER);
  private editor = inject(EditorService);

  readonly items = signal<MediaItem[]>([]);
  readonly loading = signal(false);
  readonly uploads = signal<UploadStatus[]>([]);
  readonly uploading = computed(() => this.uploads().some((u) => u.state === 'waiting' || u.state === 'working'));
  private loadedFor: string | null = null;
  private urls = new Map<string, Promise<string | null>>();
  private syncUrls = new Map<string, string>();

  /** Loads the library of the open site, once per site. */
  async ensureLoaded(): Promise<void> {
    const siteId = this.siteId();
    if (this.loadedFor === siteId) return;
    this.clearUrls();
    this.items.set([]);
    this.loading.set(true);
    try {
      this.items.set(await this.store.list(siteId));
      this.loadedFor = siteId;
    } finally {
      this.loading.set(false);
    }
  }

  /** Converts and uploads several files, one after the other. Returns the ones that worked. */
  async upload(files: File[], kind: MediaKind): Promise<MediaItem[]> {
    const siteId = this.siteId();
    const statuses: UploadStatus[] = files.map((f) => ({ name: f.name, state: 'waiting' }));
    this.uploads.set(statuses);
    const added: MediaItem[] = [];
    for (const [i, file] of files.entries()) {
      this.setStatus(i, { state: 'working' });
      try {
        const item = await uploadMedia(this.store, this.encoder, siteId, { name: file.name, type: file.type, data: file }, kind, this.items());
        this.items.update((items) => [item, ...items]);
        added.push(item);
        this.setStatus(i, { state: 'done' });
      } catch (e) {
        this.setStatus(i, { state: 'error', message: (e as Error).message });
      }
    }
    return added;
  }

  /** Progress of "Importar imágenes del sitio": images done and total. */
  readonly importing = signal<{ done: number; total: number; path: string } | null>(null);

  /** How many images the open site still uses from its own files. */
  legacyCount(): number {
    const content = this.editor.content();
    return content ? legacyImages(content).length : 0;
  }

  /**
   * Brings the images the site uses from its folder into the library and points the entries
   * to them, as unsaved changes. Returns what happened.
   */
  async importFromSite(handle: FileSystemDirectoryHandle): Promise<ImportReport> {
    await this.ensureLoaded();
    const content = this.editor.content();
    if (!content) throw new Error('No hay un sitio abierto.');
    this.importing.set({ done: 0, total: 0, path: '' });
    try {
      const result = await importSiteImages(new FsSiteFiles(handle), this.store, this.encoder, this.siteId(), content, this.items(), (done, total, path) =>
        this.importing.set({ done, total, path })
      );
      this.items.update((items) => [...result.added, ...items]);
      this.editor.applyContent(result.content);
      return result.report;
    } finally {
      this.importing.set(null);
    }
  }

  clearUploads(): void {
    if (!this.uploading()) this.uploads.set([]);
  }

  /** Deletes an image; throws `MediaError` if an entry uses it. */
  async remove(item: MediaItem): Promise<void> {
    const content = this.editor.content();
    if (!content) return;
    await deleteMedia(this.store, this.siteId(), content, item);
    this.items.update((items) => items.filter((m) => m.id !== item.id));
  }

  find(id: string): MediaItem | undefined {
    return this.items().find((m) => m.id === id);
  }

  /** Object URL of the small preview, for grids. */
  previewUrl(item: MediaItem): string {
    const key = `preview/${item.id}`;
    let url = this.syncUrls.get(key);
    if (!url) {
      url = URL.createObjectURL(new Blob([item.preview as BlobPart], { type: 'image/webp' }));
      this.syncUrls.set(key, url);
    }
    return url;
  }

  /** Object URL of a variant, read from the store the first time. Null if it does not exist. */
  variantUrl(id: string, variant: MediaVariant = 'full'): Promise<string | null> {
    const key = `${this.siteId()}/${id}/${variant}`;
    let url = this.urls.get(key);
    if (!url) {
      url = this.store
        .read(this.siteId(), id, variant)
        .then((data) => (data ? URL.createObjectURL(new Blob([data as BlobPart], { type: variant === 'og' ? 'image/jpeg' : 'image/webp' })) : null))
        .catch(() => null);
      this.urls.set(key, url);
    }
    return url;
  }

  /** URL to show any image path of the JSON: library images from the store, older ones from the public site. */
  urlFor(path: string): Promise<string | null> {
    const media = mediaIdOf(path);
    return media ? this.variantUrl(media.id, media.variant) : this.editor.imageUrl(path);
  }

  private clearUrls(): void {
    for (const url of this.urls.values()) url.then((u) => u && URL.revokeObjectURL(u));
    for (const url of this.syncUrls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
    this.syncUrls.clear();
    this.loadedFor = null;
  }

  private setStatus(index: number, patch: Partial<UploadStatus>): void {
    this.uploads.update((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  private siteId(): string {
    const site = this.editor.site();
    if (!site) throw new Error('No hay un sitio abierto.');
    return site.id;
  }
}
