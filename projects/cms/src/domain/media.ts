import { slugify } from '@cc/ui-domain';
import { CollectionData, SiteContent, titleOf } from './content';
import { EncodedImage, ImageEncoder, MediaItem, MediaKind, MediaStore, MediaUpload, MediaVariant } from './ports';
import { Entry, ImageField } from './schema';

/*
 * Rules of the image library. Every image is stored as WebP; photos also get a gallery
 * thumbnail and a JPEG copy for link previews (WhatsApp and others do not always show WebP).
 */

interface Profile {
  maxSize: number;
  quality: number;
}

export const MEDIA_PROFILES: Record<MediaKind, { full: Profile; thumb?: Profile; og?: Profile }> = {
  photo: { full: { maxSize: 1600, quality: 0.82 }, thumb: { maxSize: 600, quality: 0.78 }, og: { maxSize: 1200, quality: 0.82 } },
  icon: { full: { maxSize: 256, quality: 0.9 } },
};

const PREVIEW: Profile = { maxSize: 160, quality: 0.6 };

/**
 * Largest file of one variant. Each variant is one Firestore document, limited to 1 MiB;
 * this leaves room for the other fields.
 */
export const MAX_VARIANT_BYTES = 900_000;

/** Folder of the site where the build writes the library, and its public path. */
export const MEDIA_DIR = 'src/assets/cms';
export const MEDIA_URL = '/assets/cms/';

/** Formats the browser can decode. HEIC (iPhone) is not one of them. */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp'];

export class MediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaError';
  }
}

/** A file the user chose to upload. */
export interface MediaSource {
  name: string;
  type: string;
  data: Blob;
}

/**
 * Converts an uploaded file into the library's variants, all WebP except the link-preview
 * JPEG. Lowers the quality if a variant is too heavy, and fails if it still is.
 */
export async function prepareMedia(
  encoder: ImageEncoder,
  source: MediaSource,
  kind: MediaKind,
  taken: string[],
  now = new Date().toISOString()
): Promise<MediaUpload> {
  if (source.type && !ACCEPTED_TYPES.includes(source.type.toLowerCase())) {
    throw new MediaError(`«${source.name}» no es una imagen que el navegador pueda convertir. Usa JPG, PNG o WebP.`);
  }
  const profile = MEDIA_PROFILES[kind];
  const full = await encodeWithin(encoder, source.data, 'webp', profile.full, source.name);
  const files: Partial<Record<MediaVariant, Uint8Array>> = { full: full.data };
  if (profile.thumb) files.thumb = (await encodeWithin(encoder, source.data, 'webp', profile.thumb, source.name)).data;
  if (profile.og) files.og = (await encodeWithin(encoder, source.data, 'jpeg', profile.og, source.name)).data;
  const preview = await encoder.encode(source.data, { format: 'webp', ...PREVIEW });

  const item: MediaItem = {
    id: mediaId(source.name, taken),
    name: displayName(source.name),
    kind,
    width: full.width,
    height: full.height,
    bytes: full.data.byteLength,
    variants: Object.keys(files) as MediaVariant[],
    preview: preview.data,
    createdAt: now,
  };
  return { item, files };
}

async function encodeWithin(
  encoder: ImageEncoder,
  data: Blob,
  format: 'webp' | 'jpeg',
  profile: Profile,
  name: string
): Promise<EncodedImage> {
  let result: EncodedImage | null = null;
  for (const quality of [profile.quality, profile.quality - 0.12, profile.quality - 0.24]) {
    result = await encoder.encode(data, { format, maxSize: profile.maxSize, quality });
    if (result.data.byteLength <= MAX_VARIANT_BYTES) return result;
  }
  throw new MediaError(`«${name}» sigue pesando demasiado después de comprimirla (${kb(result!.data.byteLength)}).`);
}

/** Id for a new image, from its file name and unique in the library: "foto-spa", "foto-spa-2"… */
export function mediaId(fileName: string, taken: string[]): string {
  const base = slugify(fileName.replace(/\.[^.]+$/, '')).slice(0, 60) || 'imagen';
  const ids = new Set(taken);
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** "jacuzzi_con-espuma.JPG" -> "Jacuzzi con espuma". */
export function displayName(fileName: string): string {
  const text = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : 'Imagen';
}

/** File name of a variant inside the media folder. */
export function mediaFileName(id: string, variant: MediaVariant): string {
  return variant === 'full' ? `${id}.webp` : variant === 'thumb' ? `${id}-thumb.webp` : `${id}.jpg`;
}

/** Path the site uses for a variant: "/assets/cms/foto-spa.webp". */
export function mediaPath(id: string, variant: MediaVariant = 'full'): string {
  return MEDIA_URL + mediaFileName(id, variant);
}

/** The library image a path points to, or null for older paths (`/assets/images/8.jpeg`). */
export function mediaIdOf(path: string): { id: string; variant: MediaVariant } | null {
  const match = /^\/?assets\/cms\/([a-z0-9-]+?)(-thumb)?\.(webp|jpg)$/.exec(path.split(/[?#]/)[0]);
  if (!match) return null;
  return { id: match[1], variant: match[2] ? 'thumb' : match[3] === 'jpg' ? 'og' : 'full' };
}

/** Sets an image in an entry: its field and, for galleries, the thumbnail field. */
export function applyImage(field: ImageField, item: Entry, media: MediaItem | null): Entry {
  const next: Entry = { ...item, [field.key]: media ? mediaPath(media.id) : '' };
  if (field.thumbKey) next[field.thumbKey] = media?.variants.includes('thumb') ? mediaPath(media.id, 'thumb') : next[field.key];
  return next;
}

/**
 * Entries that use a library image, to warn before deleting it. Looks at the unsaved changes
 * and at the saved content, so discarding changes can never bring back a deleted image.
 */
export function mediaUsages(content: SiteContent, id: string): { collection: string; title: string }[] {
  const uses = new Map<string, { collection: string; title: string }>();
  for (const collection of content.collections) {
    const keys = imageKeys(collection);
    const saved = collection.error ? [] : (JSON.parse(collection.baseline) as Entry[]);
    for (const item of [...collection.items, ...saved]) {
      if (keys.some((key) => mediaIdOf(String(item[key] ?? ''))?.id === id)) {
        const use = { collection: collection.def.label, title: titleOf(collection, item) };
        uses.set(`${use.collection}\n${use.title}`, use);
      }
    }
  }
  return [...uses.values()];
}

function imageKeys(collection: CollectionData): string[] {
  return collection.def.fields.flatMap((f) => (f.type === 'image' ? [f.key, ...(f.thumbKey ? [f.thumbKey] : [])] : []));
}

/** Uploads a file to the library. Returns the new item. */
export async function uploadMedia(
  store: MediaStore,
  encoder: ImageEncoder,
  siteId: string,
  source: MediaSource,
  kind: MediaKind,
  existing: MediaItem[]
): Promise<MediaItem> {
  const upload = await prepareMedia(encoder, source, kind, existing.map((m) => m.id));
  await store.save(siteId, upload);
  return upload.item;
}

/** Deletes an image, unless an entry still uses it (saved or unsaved). */
export async function deleteMedia(store: MediaStore, siteId: string, content: SiteContent, item: MediaItem): Promise<void> {
  const uses = mediaUsages(content, item.id);
  if (uses.length) {
    const list = uses.slice(0, 5).map((u) => `${u.title} (${u.collection})`).join(', ');
    throw new MediaError(`«${item.name}» se usa en ${list}${uses.length > 5 ? '…' : ''}. Cámbiala ahí antes de borrarla.`);
  }
  await store.remove(siteId, item);
}

export function kb(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}
