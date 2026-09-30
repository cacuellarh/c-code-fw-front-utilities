import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NewSite } from '../../../../domain/ports';
import { SCOPES } from '../../../../domain/scopes';
import { needsPublish, siteIdFor } from '../../../../domain/site';
import { canPickFolders } from '../../../adapters/fs-site-files';
import { AuthService } from '../../../state/auth.service';
import { SitesService } from '../../../state/sites.service';

/** Home: the client sites grouped by scope, and importing a new one from its folder. */
@Component({
  selector: 'cms-sites-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sites.page.html',
  styleUrl: './sites.page.css',
})
export class SitesPage implements OnInit {
  private sites = inject(SitesService);
  private router = inject(Router);
  protected auth = inject(AuthService);

  protected readonly canImport = canPickFolders();
  protected readonly scopes = SCOPES;
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  /** A folder read and waiting for confirmation before it is saved in Firestore. */
  protected readonly pending = signal<NewSite | null>(null);
  protected readonly needsPublish = needsPublish;
  protected readonly groups = computed(() =>
    SCOPES.map((scope) => ({ scope, sites: this.sites.sites().filter((s) => s.scope === scope.id) })).filter(
      (g) => g.sites.length > 0
    )
  );
  protected readonly unknown = computed(() => this.sites.sites().filter((s) => !SCOPES.some((sc) => sc.id === s.scope)));
  protected readonly empty = computed(() => this.sites.sites().length === 0);

  async ngOnInit(): Promise<void> {
    try {
      await this.sites.load();
    } catch (e) {
      this.error.set(`No se pudieron cargar los sitios: ${message(e)}`);
    } finally {
      this.loading.set(false);
    }
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
      this.error.set(`${handle.name}: ${message(e)}`);
    }
  }

  protected updatePending(patch: { id?: string; name?: string; siteUrl?: string }): void {
    const current = this.pending();
    if (!current) return;
    const { id, ...manifest } = patch;
    this.pending.set({ ...current, id: id ?? current.id, manifest: { ...current.manifest, ...manifest } });
  }

  protected async confirmImport(): Promise<void> {
    const site = this.pending();
    if (!site) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const manifest = { ...site.manifest, siteUrl: site.manifest.siteUrl?.trim() || undefined };
      await this.sites.create({ ...site, id: site.id.trim(), manifest });
      this.pending.set(null);
      await this.router.navigate(['/sitio', site.id]);
    } catch (e) {
      this.error.set(`No se pudo importar: ${message(e)}`);
    } finally {
      this.busy.set(false);
    }
  }

  protected countItems(site: NewSite): string {
    return site.collections.map((c) => `${c.items.length} ${SCOPES.flatMap((s) => s.collections).find((d) => d.id === c.id)?.label.toLowerCase() ?? c.id}`).join(', ');
  }

  protected date(iso?: string): string {
    return iso ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/entrar']);
  }
}

function message(error: unknown): string {
  const code = (error as { code?: string }).code;
  if (code === 'permission-denied') return 'tu usuario no tiene permiso (revisa las reglas de Firestore).';
  return error instanceof Error ? error.message : String(error);
}
