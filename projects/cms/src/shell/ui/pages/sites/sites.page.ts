import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LoaderComponent } from '@c-code/c-code-fw/ui';
import { SiteSummary } from '../../../../domain/ports';
import { SCOPES } from '../../../../domain/scopes';
import { needsPublish } from '../../../../domain/site';
import { AuthService } from '../../../state/auth.service';
import { SitesService } from '../../../state/sites.service';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { IconComponent } from '../../icon/icon.component';
import { LogoComponent } from '../../logo/logo.component';
import { errorMessage, fullDate, relativeDate } from '../../messages';

/** Home: the sites the person can edit. Admins see them grouped by kind, and can add new ones. */
@Component({
  selector: 'cms-sites-page',
  imports: [RouterLink, LogoComponent, IconComponent, EmptyStateComponent, LoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sites.page.html',
  styleUrl: './sites.page.css',
})
export class SitesPage implements OnInit {
  private sites = inject(SitesService);
  private router = inject(Router);
  protected auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly groups = computed(() =>
    SCOPES.map((scope) => ({ scope, sites: this.sites.sites().filter((s) => s.scope === scope.id) })).filter((g) => g.sites.length > 0)
  );
  protected readonly unknown = computed(() => this.sites.sites().filter((s) => !SCOPES.some((sc) => sc.id === s.scope)));
  protected readonly empty = computed(() => this.sites.sites().length === 0);

  async ngOnInit(): Promise<void> {
    try {
      await this.sites.load();
      // A client with a single site goes straight to it.
      const list = this.sites.sites();
      if (!this.auth.isAdmin() && list.length === 1) await this.router.navigate(['/sitio', list[0].id], { replaceUrl: true });
    } catch (e) {
      this.error.set(errorMessage(e, this.auth.isAdmin()));
    } finally {
      this.loading.set(false);
    }
  }

  /** "Publicado hace 2 h"; with unsaved-to-site changes, "Sin publicar" and, on hover, the last time. */
  protected status(site: SiteSummary): { label: string; tone: 'success' | 'warning' | ''; title: string } {
    const last = site.publishedAt ? `Última publicación: ${fullDate(site.publishedAt)}` : 'Nunca se ha publicado';
    if (needsPublish(site)) return { label: 'Sin publicar', tone: 'warning', title: last };
    if (site.publishedAt) return { label: `Publicado ${relativeDate(site.publishedAt)}`, tone: 'success', title: last };
    return { label: 'Aún sin publicar', tone: '', title: last };
  }

  protected saved(site: SiteSummary): string {
    return site.updatedAt ? `Guardado ${relativeDate(site.updatedAt)}` : '';
  }

  protected ago(iso: string): string {
    return relativeDate(iso);
  }

  protected exact(iso?: string): string {
    return iso ? fullDate(iso) : '';
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/entrar']);
  }
}
