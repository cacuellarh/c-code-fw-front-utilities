import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { suggestManifest, writeManifest } from '../../../../domain/manifest';
import { MANIFEST_FILE, SiteManifest } from '../../../../domain/schema';
import { SCOPES } from '../../../../domain/scopes';
import { canPickFolders, FsSiteFiles } from '../../../adapters/fs-site-files';
import { EditorService } from '../../../state/editor.service';
import { Site, SitesService } from '../../../state/sites.service';

/** A folder that has no `cms.json` yet, waiting for the user to confirm its settings. */
interface PendingSetup {
  handle: FileSystemDirectoryHandle;
  manifest: SiteManifest;
}

/** Home: the client sites grouped by scope, and adding a new one. */
@Component({
  selector: 'cms-sites-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sites.page.html',
  styleUrl: './sites.page.css',
})
export class SitesPage implements OnInit {
  private sites = inject(SitesService);
  private editor = inject(EditorService);
  private router = inject(Router);

  protected readonly supported = canPickFolders();
  protected readonly scopes = SCOPES;
  protected readonly manifestFile = MANIFEST_FILE;
  protected readonly error = signal('');
  protected readonly busy = signal<string | null>(null);
  protected readonly setup = signal<PendingSetup | null>(null);
  protected readonly groups = computed(() =>
    SCOPES.map((scope) => ({ scope, sites: this.sites.sites().filter((s) => s.scope === scope.id) })).filter(
      (g) => g.sites.length > 0
    )
  );
  protected readonly unknown = computed(() => this.sites.sites().filter((s) => !SCOPES.some((sc) => sc.id === s.scope)));

  ngOnInit(): void {
    this.sites.load().catch((e) => this.error.set(message(e)));
  }

  protected async add(): Promise<void> {
    this.error.set('');
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({ id: 'cms-site', mode: 'readwrite' });
    } catch {
      return; // The user closed the picker.
    }
    try {
      const files = new FsSiteFiles(handle);
      const existing = await files.read(MANIFEST_FILE);
      if (existing) await this.register(handle, JSON.parse(existing.text) as SiteManifest);
      else this.setup.set({ handle, manifest: await suggestManifest(files) });
    } catch (e) {
      this.error.set(message(e));
    }
  }

  protected updateSetup(patch: Partial<SiteManifest>): void {
    const current = this.setup();
    if (!current) return;
    const options = patch.scope ? SCOPES.find((s) => s.id === patch.scope)?.defaultOptions : current.manifest.options;
    this.setup.set({ ...current, manifest: { ...current.manifest, ...patch, options } });
  }

  protected async confirmSetup(): Promise<void> {
    const pending = this.setup();
    if (!pending) return;
    try {
      const manifest = { ...pending.manifest, siteUrl: pending.manifest.siteUrl?.trim() || undefined };
      await writeManifest(new FsSiteFiles(pending.handle), manifest);
      this.setup.set(null);
      await this.register(pending.handle, manifest);
    } catch (e) {
      this.error.set(message(e));
    }
  }

  protected async open(site: Site): Promise<void> {
    this.error.set('');
    this.busy.set(site.id);
    try {
      await this.editor.open(site);
      await this.sites.touch(site);
      await this.router.navigate(['/sitio', site.id]);
    } catch (e) {
      this.error.set(`${site.name}: ${message(e)}`);
    } finally {
      this.busy.set(null);
    }
  }

  protected async remove(site: Site): Promise<void> {
    if (confirm(`¿Quitar "${site.name}" de la lista? Los archivos del sitio no se borran.`)) await this.sites.remove(site.id);
  }

  protected date(time: number): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(time);
  }

  private async register(handle: FileSystemDirectoryHandle, manifest: SiteManifest): Promise<void> {
    const site = await this.sites.save({ name: manifest.name, scope: manifest.scope, ref: handle, lastOpened: Date.now() });
    await this.open(site);
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
