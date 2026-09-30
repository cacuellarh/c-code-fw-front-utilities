import { ChangeDetectionStrategy, Component, computed, HostListener, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { isDirty } from '../../../../domain/content';
import { ConflictError } from '../../../../domain/site';
import { EditorService } from '../../../state/editor.service';

/** Layout of an open site: collections menu, publishing, unsaved changes and the save bar. */
@Component({
  selector: 'cms-site-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site.page.html',
  styleUrl: './site.page.css',
})
export class SitePage implements OnInit {
  protected editor = inject(EditorService);
  private router = inject(Router);

  readonly siteId = input.required<string>();

  protected readonly error = signal('');
  protected readonly saved = signal<string[] | null>(null);
  protected readonly published = signal(false);
  protected readonly settingsOpen = signal(false);
  protected readonly hook = signal('');
  protected readonly hookSaved = signal(false);
  protected readonly name = signal('');
  protected readonly nameSaved = signal(false);
  protected readonly isDirty = isDirty;
  protected readonly ready = computed(() => this.editor.site()?.id === this.siteId());
  protected readonly issueCount = computed(() => this.editor.issues().length);
  protected readonly issuesBy = computed(() => {
    const counts = new Map<string, number>();
    for (const issue of this.editor.issues()) counts.set(issue.collection, (counts.get(issue.collection) ?? 0) + 1);
    return counts;
  });

  async ngOnInit(): Promise<void> {
    if (!this.ready()) {
      try {
        await this.editor.open(this.siteId());
      } catch (e) {
        this.error.set(messageOf(e));
        return;
      }
    }
    const first = this.editor.collections()[0];
    if (first && !this.router.url.split('?')[0].split('/')[3]) {
      await this.router.navigate(['/sitio', this.siteId(), first.def.id], { replaceUrl: true });
    }
  }

  protected async save(): Promise<void> {
    this.error.set('');
    this.saved.set(null);
    this.published.set(false);
    try {
      this.saved.set(await this.editor.save());
    } catch (e) {
      this.error.set(
        e instanceof ConflictError
          ? `${e.message}. Copia tus cambios, recarga la página y vuelve a aplicarlos.`
          : `No se pudo guardar: ${messageOf(e)}`
      );
    }
  }

  protected async publish(): Promise<void> {
    this.error.set('');
    this.saved.set(null);
    if (this.editor.dirty().length) {
      this.error.set('Guarda los cambios antes de publicar: se publica lo que está guardado.');
      return;
    }
    try {
      await this.editor.publish();
      this.published.set(true);
    } catch (e) {
      this.error.set(`No se pudo publicar: ${messageOf(e)}`);
      if (/Deploy Hook/.test(messageOf(e))) await this.toggleSettings(true);
    }
  }

  protected async toggleSettings(open = !this.settingsOpen()): Promise<void> {
    this.settingsOpen.set(open);
    this.hookSaved.set(false);
    this.nameSaved.set(false);
    this.name.set(this.editor.site()?.name ?? '');
    if (open) this.hook.set(await this.editor.getDeployHook().catch(() => ''));
  }

  protected async saveHook(): Promise<void> {
    try {
      await this.editor.setDeployHook(this.hook());
      this.hookSaved.set(true);
    } catch (e) {
      this.error.set(`No se pudo guardar el Deploy Hook: ${messageOf(e)}`);
    }
  }

  protected async saveName(): Promise<void> {
    try {
      await this.editor.rename(this.name());
      this.nameSaved.set(true);
    } catch (e) {
      this.error.set(`No se pudo cambiar el nombre: ${messageOf(e)}`);
    }
  }

  protected discard(): void {
    if (confirm('¿Descartar todos los cambios sin guardar?')) this.editor.discard();
  }

  protected async leave(): Promise<void> {
    if (this.editor.dirty().length && !confirm('Hay cambios sin guardar. ¿Salir y perderlos?')) return;
    this.editor.close();
    await this.router.navigate(['/']);
  }

  protected dismiss(): void {
    this.saved.set(null);
    this.published.set(false);
    this.error.set('');
  }

  protected date(iso?: string): string {
    return iso ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : 'nunca';
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.editor.dirty().length) event.preventDefault();
  }
}

function messageOf(error: unknown): string {
  const code = (error as { code?: string }).code;
  if (code === 'permission-denied') return 'tu usuario no tiene permiso para este sitio (reglas de Firestore)';
  return error instanceof Error ? error.message : String(error);
}
