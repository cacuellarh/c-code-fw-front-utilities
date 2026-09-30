import { SavedSite, SiteStore } from '../../domain/ports';

const DB_NAME = 'c-code-cms';
const STORE = 'sites';

/** `SiteStore` in IndexedDB. The folder handle is stored as `ref`, so the site reopens next time. */
export class IdbSiteStore implements SiteStore<FileSystemDirectoryHandle> {
  private db?: Promise<IDBDatabase>;

  all(): Promise<SavedSite<FileSystemDirectoryHandle>[]> {
    return this.request((store) => store.getAll(), 'readonly');
  }

  async put(site: SavedSite<FileSystemDirectoryHandle>): Promise<void> {
    await this.request((store) => store.put(site), 'readwrite');
  }

  async remove(id: string): Promise<void> {
    await this.request((store) => store.delete(id), 'readwrite');
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }

  private async request<T>(run: (store: IDBObjectStore) => IDBRequest, mode: IDBTransactionMode): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }
}
