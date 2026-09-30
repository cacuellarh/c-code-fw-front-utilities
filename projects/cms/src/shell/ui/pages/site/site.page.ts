import { ChangeDetectionStrategy, Component, computed, HostListener, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { isDirty } from '../../../../domain/content';
import { ConflictError } from '../../../../domain/site';
import { EditorService } from '../../../state/editor.service';
import { SitesService } from '../../../state/sites.service';

/** Layout of an open site: collections menu, unsaved changes and the save bar. */
@Component({
  selector: 'cms-site-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site.page.html',
  styleUrl: './site.page.css',
})
export class SitePage implements OnInit {
  protected editor = inject(EditorService);
  private sites = inject(SitesService);
  private router = inject(Router);

  readonly siteId = input.required<string>();

  /** The site is remembered but the browser needs a click to grant access again. */
  protected readonly needsPermission = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal<string[] | null>(null);
  protected readonly isDirty = isDirty;
  protected readonly ready = computed(() => this.editor.site()?.id === this.siteId());
  protected readonly issueCount = computed(() => this.editor.issues().length);
  protected readonly issuesBy = computed(() => {
    const counts = new Map<string, number>();
    for (const issue of this.editor.issues()) counts.set(issue.collection, (counts.get(issue.collection) ?? 0) + 1);
    return counts;
  });

  async ngOnInit(): Promise<void> {
    if (this.ready()) return this.openFirst();
    await this.sites.load();
    const site = this.sites.get(this.siteId());
    if (!site) {
      await this.router.navigate(['/']);
      return;
    }
    if ((await site.ref.queryPermission({ mode: 'readwrite' })) === 'granted') await this.open();
    else this.needsPermission.set(true);
  }

  /** Opens the site from a click, so the browser can show its permission prompt. */
  protected async open(): Promise<void> {
    const site = this.sites.get(this.siteId());
    if (!site) return;
    this.error.set('');
    try {
      await this.editor.open(site);
      this.needsPermission.set(false);
      this.openFirst();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  protected async save(): Promise<void> {
    this.error.set('');
    this.saved.set(null);
    try {
      this.saved.set(await this.editor.save());
    } catch (e) {
      if (e instanceof ConflictError) {
        const overwrite = confirm(
          `${e.message}.\n\n¿Guardar de todas formas? Se perderán los cambios hechos fuera del CMS en esos archivos.`
        );
        if (overwrite) this.saved.set(await this.editor.save(true));
      } else {
        this.error.set(`No se pudo guardar: ${(e as Error).message}`);
      }
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

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.editor.dirty().length) event.preventDefault();
  }

  private openFirst(): void {
    const first = this.editor.collections()[0];
    const child = this.router.url.split('/')[3];
    if (first && !child) this.router.navigate(['/sitio', this.siteId(), first.def.id], { replaceUrl: true });
  }
}
