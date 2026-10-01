import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { splitPath } from '../domain/paths';
import { FileText, SiteFiles } from '../domain/ports';

/** `SiteFiles` over a folder on disk, for the build of a site. */
export class NodeSiteFiles implements SiteFiles {
  readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  get name(): string {
    return basename(this.root);
  }

  async read(path: string): Promise<FileText | null> {
    try {
      const full = this.full(path);
      const [text, info] = await Promise.all([readFile(full, 'utf8'), stat(full)]);
      return { text, lastModified: info.mtimeMs };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async readBytes(path: string): Promise<Blob | null> {
    try {
      return new Blob([await readFile(this.full(path))]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    return (await this.read(path)) !== null;
  }

  async write(path: string, content: string | Blob): Promise<void> {
    const full = this.full(path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, typeof content === 'string' ? content : Buffer.from(await content.arrayBuffer()));
  }

  async list(dir: string): Promise<string[]> {
    try {
      const entries = await readdir(this.full(dir), { withFileTypes: true });
      return entries.filter((e) => e.isFile()).map((e) => e.name).sort();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private full(path: string): string {
    return join(this.root, ...splitPath(path));
  }
}
