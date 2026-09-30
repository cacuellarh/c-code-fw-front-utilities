/*
 * What the domain needs from the outside world. The shell implements these interfaces
 * (File System Access, IndexedDB, canvas); the domain never knows how.
 */

/** A site's folder, by paths relative to its root: "src/assets/data/plans.json". */
export interface SiteFiles {
  readonly name: string;
  /** The file's text, or null if it does not exist. */
  read(path: string): Promise<FileText | null>;
  /** Modification time, or null if the file does not exist. */
  lastModified(path: string): Promise<number | null>;
  exists(path: string): Promise<boolean>;
  /** Writes the file, creating missing folders. Returns the new modification time. */
  write(path: string, content: string | Blob): Promise<number>;
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

/** A client site the CMS remembers. `ref` is whatever the shell needs to reopen its folder. */
export interface SavedSite<Ref = unknown> {
  id: string;
  name: string;
  scope: string;
  ref: Ref;
  lastOpened: number;
}

export interface SiteStore<Ref = unknown> {
  all(): Promise<SavedSite<Ref>[]>;
  put(site: SavedSite<Ref>): Promise<void>;
  remove(id: string): Promise<void>;
}
