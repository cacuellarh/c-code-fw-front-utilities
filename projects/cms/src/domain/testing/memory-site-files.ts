import { FileText, SiteFiles } from '../ports';

/** `SiteFiles` in memory, for tests: a map of path → content. */
export class MemorySiteFiles implements SiteFiles {
  readonly files = new Map<string, { content: string | Blob; lastModified: number }>();
  private clock = 1;

  constructor(readonly name = 'site', initial: Record<string, string> = {}) {
    for (const [path, text] of Object.entries(initial)) this.files.set(path, { content: text, lastModified: this.clock++ });
  }

  async read(path: string): Promise<FileText | null> {
    const file = this.files.get(path);
    if (!file) return null;
    const text = typeof file.content === 'string' ? file.content : await file.content.text();
    return { text, lastModified: file.lastModified };
  }

  async lastModified(path: string): Promise<number | null> {
    return this.files.get(path)?.lastModified ?? null;
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async write(path: string, content: string | Blob): Promise<void> {
    const lastModified = this.clock++;
    this.files.set(path, { content, lastModified });
  }

  async list(dir: string): Promise<string[]> {
    const prefix = dir.replace(/\/+$/, '') + '/';
    return [...this.files.keys()]
      .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      .map((path) => path.slice(prefix.length))
      .sort();
  }

  /** Text of a file, for assertions. */
  text(path: string): string {
    const file = this.files.get(path);
    return typeof file?.content === 'string' ? file.content : '';
  }
}
