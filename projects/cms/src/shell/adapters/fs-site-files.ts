import { splitPath } from '../../domain/paths';
import { FileText, SiteFiles } from '../../domain/ports';

/** `SiteFiles` over a folder chosen with the File System Access API (Chrome, Edge). */
export class FsSiteFiles implements SiteFiles {
  constructor(readonly handle: FileSystemDirectoryHandle) {}

  get name(): string {
    return this.handle.name;
  }

  async read(path: string): Promise<FileText | null> {
    const file = await this.file(path);
    return file ? { text: await file.text(), lastModified: file.lastModified } : null;
  }

  async lastModified(path: string): Promise<number | null> {
    return (await this.file(path))?.lastModified ?? null;
  }

  async exists(path: string): Promise<boolean> {
    return (await this.file(path)) !== null;
  }

  readBytes(path: string): Promise<Blob | null> {
    return this.file(path);
  }

  /** The file itself, for showing images. Null if it does not exist. */
  async file(path: string): Promise<File | null> {
    try {
      return await (await this.fileHandle(path, false)).getFile();
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async write(path: string, content: string | Blob): Promise<void> {
    const handle = await this.fileHandle(path, true);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async list(dir: string): Promise<string[]> {
    try {
      const folder = await this.dirHandle(dir, false);
      const names: string[] = [];
      for await (const [name, entry] of (folder as any).entries() as AsyncIterable<[string, FileSystemHandle]>) {
        if (entry.kind === 'file') names.push(name);
      }
      return names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
  }

  private async fileHandle(path: string, create: boolean): Promise<FileSystemFileHandle> {
    const parts = splitPath(path);
    const name = parts.pop();
    if (!name) throw new Error(`Ruta de archivo vacía: "${path}"`);
    let dir = this.handle;
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create });
    return dir.getFileHandle(name, { create });
  }

  private async dirHandle(path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
    let dir = this.handle;
    for (const part of splitPath(path)) dir = await dir.getDirectoryHandle(part, { create });
    return dir;
  }
}

/** Asks the browser for read/write access to a remembered folder. Needs a click when it prompts. */
export async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const mode = { mode: 'readwrite' as const };
  if ((await handle.queryPermission(mode)) === 'granted') return true;
  return (await handle.requestPermission(mode)) === 'granted';
}

export function canPickFolders(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'NotFoundError' || error.name === 'TypeMismatchError');
}
