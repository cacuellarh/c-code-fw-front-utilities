import { publicUrl } from '../../domain/paths';
import { FileText, SiteFiles } from '../../domain/ports';
import { SiteManifest } from '../../domain/schema';

/**
 * Read-only `SiteFiles` over the published site: each file of the site folder is fetched from
 * its public address. Lets the CMS import the site's images without choosing its folder
 * (the sites answer with `Access-Control-Allow-Origin: *`).
 */
export class PublicSiteFiles implements SiteFiles {
  constructor(private manifest: SiteManifest) {}

  get name(): string {
    return this.manifest.siteUrl ?? 'sitio publicado';
  }

  async read(path: string): Promise<FileText | null> {
    const response = await this.fetch(path);
    return response ? { text: await response.text(), lastModified: 0 } : null;
  }

  async exists(path: string): Promise<boolean> {
    return (await this.fetch(path, 'HEAD')) !== null;
  }

  async readBytes(path: string): Promise<Blob | null> {
    const response = await this.fetch(path);
    if (!response) return null;
    const blob = await response.blob();
    // A missing file can come back as the site's index.html (SPA fallback): that is not an image.
    return blob.type.startsWith('image/') ? blob : null;
  }

  write(): Promise<void> {
    return Promise.reject(new Error('El sitio publicado es solo de lectura.'));
  }

  async list(): Promise<string[]> {
    return [];
  }

  private async fetch(path: string, method = 'GET'): Promise<Response | null> {
    const url = publicUrl(this.manifest, path);
    if (!url) return null;
    try {
      const response = await fetch(url, { method, cache: 'no-cache' });
      return response.ok ? response : null;
    } catch {
      return null;
    }
  }
}
