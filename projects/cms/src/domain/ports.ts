/*
 * What the domain needs from the outside world. The shell implements these interfaces
 * (Firestore, Vercel, File System Access, canvas); the domain never knows how.
 */
import { Entry, SiteManifest } from './schema';
import { SiteTheme } from './theme';

/** Where the content lives: the single source of truth that the CMS edits and the builds read. */
export interface ContentRepository {
  listSites(): Promise<SiteSummary[]>;
  /** The site with all its collections, or null if it does not exist. */
  loadSite(siteId: string): Promise<StoredSite | null>;
  /**
   * Saves collections only if nobody saved them since they were read (`expectedVersion`).
   * Throws `ConflictError` otherwise. Returns the new versions.
   */
  saveCollections(siteId: string, changes: CollectionChange[], author: string): Promise<SavedCollection[]>;
  /** Creates a site with its content; `author` becomes its first editor. Fails if the id is taken. */
  createSite(site: NewSite, author: string): Promise<void>;
  /** Records that the site was published. */
  markPublished(siteId: string, at: string): Promise<void>;
  /** Changes the name shown in the CMS (and the manifest's name). The id stays the same. */
  renameSite(siteId: string, name: string): Promise<void>;
}

export interface SiteSummary {
  id: string;
  name: string;
  scope: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface StoredSite extends SiteSummary {
  manifest: SiteManifest;
  theme?: SiteTheme;
  collections: StoredCollection[];
}

export interface StoredCollection {
  id: string;
  items: Entry[];
  /** Increases on every save; used to detect concurrent edits. */
  version: number;
  updatedAt?: string;
}

export interface CollectionChange {
  id: string;
  items: Entry[];
  expectedVersion: number;
}

export interface SavedCollection {
  id: string;
  version: number;
  updatedAt: string;
}

export interface NewSite {
  id: string;
  manifest: SiteManifest;
  theme?: SiteTheme;
  collections: { id: string; items: Entry[] }[];
}

/** Rebuilds and deploys the public site after the content changed. */
export interface Publisher {
  publish(siteId: string): Promise<void>;
}

/** A site's folder, by paths relative to its root: "src/assets/data/plans.json". */
export interface SiteFiles {
  readonly name: string;
  /** The file's text, or null if it does not exist. */
  read(path: string): Promise<FileText | null>;
  exists(path: string): Promise<boolean>;
  /** Writes the file, creating missing folders. */
  write(path: string, content: string | Blob): Promise<void>;
  /** Names of the files directly inside a folder; empty if it does not exist. */
  list(dir: string): Promise<string[]>;
}

export interface FileText {
  text: string;
  lastModified: number;
}

/** Encodes images in the browser (canvas) or wherever the shell can. */
export interface ImageEncoder {
  /** Scales the image so its longest side is at most `maxSize` and encodes it. */
  encode(image: Blob, options: EncodeOptions): Promise<EncodedImage>;
}

export interface EncodeOptions {
  format: 'webp' | 'jpeg';
  maxSize: number;
  /** 0–1. */
  quality: number;
}

export interface EncodedImage {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * Where a site's images live. Each image has a small metadata record (listed quickly, with a
 * tiny preview) and its files by variant: the full WebP, the gallery thumbnail and the JPEG
 * copy for link previews.
 */
export interface MediaStore {
  list(siteId: string): Promise<MediaItem[]>;
  /** The bytes of one variant, or null if the image or the variant does not exist. */
  read(siteId: string, id: string, variant: MediaVariant): Promise<Uint8Array | null>;
  save(siteId: string, upload: MediaUpload): Promise<void>;
  remove(siteId: string, item: MediaItem): Promise<void>;
}

export type MediaKind = 'photo' | 'icon';
export type MediaVariant = 'full' | 'thumb' | 'og';

export interface MediaItem {
  id: string;
  /** Name shown in the CMS, from the original file: "Jacuzzi con espuma". */
  name: string;
  kind: MediaKind;
  width: number;
  height: number;
  /** Size of the full WebP, in bytes. */
  bytes: number;
  variants: MediaVariant[];
  /** Tiny WebP (about 160 px) for the library grid, stored with the metadata. */
  preview: Uint8Array;
  createdAt: string;
}

export interface MediaUpload {
  item: MediaItem;
  files: Partial<Record<MediaVariant, Uint8Array>>;
}

/** Questions about the published site. */
export interface PublicSite {
  /** True when the site's build already downloads the image library (it serves the marker file). */
  downloadsMedia(siteUrl: string): Promise<boolean>;
}
