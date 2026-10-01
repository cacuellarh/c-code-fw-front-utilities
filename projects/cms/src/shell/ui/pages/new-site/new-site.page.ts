import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { countOf } from '../../../../domain/labels';
import { NewSite } from '../../../../domain/ports';
import { SCOPES } from '../../../../domain/scopes';
import { siteIdFor } from '../../../../domain/site';
import { canPickFolders } from '../../../adapters/fs-site-files';
import { SitesService } from '../../../state/sites.service';
import { IconComponent } from '../../icon/icon.component';
import { LogoComponent } from '../../logo/logo.component';
import { errorMessage } from '../../messages';

/** Admin: creates a site from its project folder (its JSON files, cms.json and theme). Done once per site. */
@Component({
  selector: 'cms-new-site-page',
  imports: [RouterLink, LogoComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-site.page.html',
  styleUrl: './new-site.page.css',
})
export class NewSitePage implements OnInit {
  private sites = inject(SitesService);
  private router = inject(Router);

  protected readonly canPick = canPickFolders();
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  /** A folder read and waiting for confirmation before it is saved. */
  protected readonly pending = signal<NewSite | null>(null);

  async ngOnInit(): Promise<void> {
    // The list gives the ids already taken.
    await this.sites.load().catch(() => undefined);
  }

  protected async pickFolder(): Promise<void> {
    this.error.set('');
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({ id: 'cms-site', mode: 'read' });
    } catch {
      return; // The user closed the picker.
    }
    try {
      const site = await this.sites.readFolder(handle);
      const taken = this.sites.sites().map((s) => s.id);
      this.pending.set({ id: siteIdFor(site.manifest.name, taken), ...site });
    } catch (e) {
      this.error.set(`${handle.name}: ${errorMessage(e, true)}`);
    }
  }

  protected update(patch: { id?: string; name?: string; siteUrl?: string }): void {
    const current = this.pending();
    if (!current) return;
    const { id, ...manifest } = patch;
    this.pending.set({ ...current, id: id ?? current.id, manifest: { ...current.manifest, ...manifest } });
  }

  protected async create(): Promise<void> {
    const site = this.pending();
    if (!site) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const manifest = { ...site.manifest, siteUrl: site.manifest.siteUrl?.trim() || undefined };
      await this.sites.create({ ...site, id: site.id.trim(), manifest });
      await this.router.navigate(['/sitio', site.id.trim()]);
    } catch (e) {
      this.error.set(`No se pudo crear: ${errorMessage(e, true)}`);
    } finally {
      this.busy.set(false);
    }
  }

  /** "14 planes, 58 servicios, 33 fotos". */
  protected found(site: NewSite): string {
    const defs = SCOPES.flatMap((s) => s.collections);
    return site.collections
      .map((c) => {
        const def = defs.find((d) => d.id === c.id);
        return def ? (def.single ? def.label : countOf(def, c.items.length)) : `${c.items.length} ${c.id}`;
      })
      .join(', ');
  }

  protected scopeLabel(id: string): string {
    return SCOPES.find((s) => s.id === id)?.label ?? id;
  }
}
