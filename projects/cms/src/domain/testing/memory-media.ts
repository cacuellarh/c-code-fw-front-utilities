import { EncodedImage, EncodeOptions, ImageEncoder, MediaItem, MediaStore, MediaUpload, MediaVariant } from '../ports';

/** `MediaStore` in memory, for tests. */
export class MemoryMediaStore implements MediaStore {
  readonly items = new Map<string, MediaItem>();
  readonly files = new Map<string, Uint8Array>();

  async list(siteId: string): Promise<MediaItem[]> {
    return [...this.items.entries()].filter(([key]) => key.startsWith(siteId + '/')).map(([, item]) => item);
  }

  async read(siteId: string, id: string, variant: MediaVariant): Promise<Uint8Array | null> {
    return this.files.get(`${siteId}/${id}/${variant}`) ?? null;
  }

  async save(siteId: string, upload: MediaUpload): Promise<void> {
    this.items.set(`${siteId}/${upload.item.id}`, upload.item);
    for (const [variant, data] of Object.entries(upload.files)) this.files.set(`${siteId}/${upload.item.id}/${variant}`, data!);
  }

  async remove(siteId: string, item: MediaItem): Promise<void> {
    this.items.delete(`${siteId}/${item.id}`);
    for (const variant of item.variants) this.files.delete(`${siteId}/${item.id}/${variant}`);
  }
}

/**
 * `ImageEncoder` for tests: pretends the source is `width`×`height` and produces files whose
 * size is `bytesPerPixel × quality × pixels`, so tests can exercise the size limit.
 */
export class FakeImageEncoder implements ImageEncoder {
  readonly calls: EncodeOptions[] = [];

  constructor(private width = 4000, private height = 3000, private bytesPerPixel = 0.3) {}

  async encode(_image: Blob, options: EncodeOptions): Promise<EncodedImage> {
    this.calls.push(options);
    const scale = Math.min(1, options.maxSize / Math.max(this.width, this.height));
    const width = Math.round(this.width * scale);
    const height = Math.round(this.height * scale);
    const size = Math.round(width * height * this.bytesPerPixel * options.quality);
    return { data: new Uint8Array(size), width, height };
  }
}
