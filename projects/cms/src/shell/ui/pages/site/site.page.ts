import { ChangeDetectionStrategy, Component, computed, HostListener, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { isDirty } from '../../../../domain/content';
import { ConflictError, PublishNotConfiguredError } from '../../../../domain/site';
import { AuthService } from '../../../state/auth.service';
import { DialogService } from '../../../state/dialog.service';
import { EditorService } from '../../../state/editor.service';
import { SitesService } from '../../../state/sites.service';
import { ToastService } from '../../../state/toast.service';
import { IconComponent } from '../../icon/icon.component';
import { LogoComponent } from '../../logo/logo.component';
import { errorMessage, fullDate, relativeDate } from '../../messages';

/** Layout of an open site: sections menu, the top bar with its state and Publicar, and the save bar. */
@Component({
  selector: 'cms-site-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.menu-open]': 'menuOpen()' },
  templateUrl: './site.page.html',
  styleUrl: './site.page.css',
})
export class SitePage implements OnInit {
  protected editor = inject(EditorService);
  protected auth = inject(AuthService);
  private sites = inject(SitesService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly siteId = input.required<string>();

  protected readonly error = signal('');
  protected readonly conflict = signal(false);
  /** Mobile: the sections menu is open over the content. */
  protected readonly menuOpen = signal(false);
  protected readonly isDirty = isDirty;
  protected readonly ready = computed(() => this.editor.site()?.id === this.siteId());
  /** Clients with one site have nowhere to go back to (the list would bring them here again). */
  protected readonly canGoBack = computed(() => this.auth.isAdmin() || this.sites.sites().length > 1);
  protected readonly issueCount = computed(() => this.editor.issues().length);
  protected readonly issuesBy = computed(() => {
    const counts = new Map<string, number>();
    for (const issue of this.editor.issues()) counts.set(issue.collection, (counts.get(issue.collection) ?? 0) + 1);
    return counts;
  });
  protected readonly status = computed(() => {
    const site = this.editor.site();
    if (this.editor.unpublished()) return { label: 'Sin publicar', tone: 'warning', title: '' };
    if (site?.publishedAt) return { label: `Publicado ${relativeDate(site.publishedAt)}`, tone: 'success', title: fullDate(site.publishedAt) };
    return { label: 'Aún sin publicar', tone: '', title: '' };
  });

  async ngOnInit(): Promise<void> {
    if (!this.ready()) {
      try {
        await this.editor.open(this.siteId());
      } catch (e) {
        this.error.set(errorMessage(e, this.auth.isAdmin()));
        return;
      }
    }
    const first = this.editor.collections()[0];
    if (first && !this.router.url.split('?')[0].split('/')[3]) {
      await this.router.navigate(['/sitio', this.siteId(), first.def.id], { replaceUrl: true });
    }
  }

  /** Saves; returns false (and shows why) if it could not. */
  protected async save(): Promise<boolean> {
    this.error.set('');
    this.conflict.set(false);
    try {
      const saved = await this.editor.save();
      if (saved.length) this.toast.show('Guardado. Publica cuando quieras que se vea en tu sitio.');
      return true;
    } catch (e) {
      this.conflict.set(e instanceof ConflictError);
      this.error.set(e instanceof ConflictError ? e.message : `No se pudo guardar. ${errorMessage(e, this.auth.isAdmin())}`);
      return false;
    }
  }

  /** Publishes what is saved; with unsaved changes it saves them first. */
  protected async publish(): Promise<void> {
    if (this.editor.dirty().length && !(await this.save())) return;
    this.error.set('');
    try {
      const warning = await this.editor.publishWarning();
      if (warning) {
        if (!this.auth.isAdmin()) {
          await this.dialogs.alert({
            title: 'Tu sitio necesita una actualización',
            body: 'Antes de publicar imágenes nuevas hay que actualizar tu sitio. Escríbenos y lo resolvemos.',
          });
          return;
        }
        const go = await this.dialogs.confirm({ title: '¿Publicar de todas formas?', body: warning, confirm: 'Publicar', tone: 'danger' });
        if (!go) return;
      }
      await this.editor.publish();
      this.toast.show('Publicando… tu sitio se actualiza en 1–2 minutos.', 'info');
    } catch (e) {
      if (e instanceof PublishNotConfiguredError && this.auth.isAdmin()) {
        const go = await this.dialogs.confirm({
          title: 'Falta el enlace de publicación',
          body: 'Guarda el Deploy Hook de Vercel en Configuración › Publicación.',
          confirm: 'Ir a Configuración',
        });
        if (go) await this.router.navigate(['/sitio', this.siteId(), 'configuracion']);
        return;
      }
      if (e instanceof PublishNotConfiguredError) {
        await this.dialogs.alert({ title: 'No se pudo publicar', body: errorMessage(e, false) });
        return;
      }
      this.error.set(`No se pudo publicar. ${errorMessage(e, this.auth.isAdmin())}`);
    }
  }

  protected async discard(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: '¿Descartar los cambios?',
      body: 'Vuelves a lo que está guardado.',
      confirm: 'Descartar',
      tone: 'danger',
    });
    if (ok) this.editor.discard();
  }

  /** After a conflict: loads what the other person saved (losing the changes here). */
  protected async reload(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: '¿Cargar lo último guardado?',
      body: 'Se perderán tus cambios sin guardar. Si los necesitas, cópialos antes.',
      confirm: 'Cargar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.editor.open(this.siteId());
      this.dismiss();
    } catch (e) {
      this.error.set(errorMessage(e, this.auth.isAdmin()));
    }
  }

  protected async leave(): Promise<void> {
    if (this.editor.dirty().length) {
      const ok = await this.dialogs.confirm({
        title: '¿Salir sin guardar?',
        body: 'Perderás los cambios sin guardar.',
        confirm: 'Salir',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.editor.close();
    await this.router.navigate(['/']);
  }

  protected async signOut(): Promise<void> {
    if (this.editor.dirty().length) {
      const ok = await this.dialogs.confirm({ title: '¿Salir sin guardar?', body: 'Perderás los cambios sin guardar.', confirm: 'Salir', tone: 'danger' });
      if (!ok) return;
    }
    this.editor.close();
    await this.auth.signOut();
    await this.router.navigate(['/entrar']);
  }

  protected dismiss(): void {
    this.error.set('');
    this.conflict.set(false);
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.editor.dirty().length) event.preventDefault();
  }

  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
