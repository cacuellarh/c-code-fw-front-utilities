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

/** Converts a photo for the web. */
export interface ImageEncoder {
  toWebp(image: Blob, maxSize: number): Promise<Blob>;
}
