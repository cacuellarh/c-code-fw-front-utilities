import { inject, Injectable, signal } from '@angular/core';
import { NewSite, SiteSummary } from '../../domain/ports';
import { readSiteFolder } from '../../domain/site';
import { FsSiteFiles } from '../adapters/fs-site-files';
import { AuthService } from './auth.service';
import { CONTENT_REPOSITORY } from './ports.tokens';

/** The client sites stored in Firestore, and importing new ones from their folder. */
@Injectable({ providedIn: 'root' })
export class SitesService {
  private repo = inject(CONTENT_REPOSITORY);
  private auth = inject(AuthService);
  private readonly _sites = signal<SiteSummary[]>([]);
  readonly sites = this._sites.asReadonly();

  async load(): Promise<void> {
    this._sites.set(await this.repo.listSites());
  }

  /** Reads a site's folder (its `cms.json`, JSON files and theme) without saving anything yet. */
  readFolder(handle: FileSystemDirectoryHandle): Promise<Omit<NewSite, 'id'>> {
    return readSiteFolder(new FsSiteFiles(handle));
  }

  /** Creates the site in Firestore; the signed-in user becomes its first editor. */
  async create(site: NewSite): Promise<void> {
    await this.repo.createSite(site, this.auth.email());
    await this.load();
  }
}
