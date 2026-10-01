import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { slugify } from '@c-code/c-code-fw/ui';
import { ACCEPTED_TYPES, kb } from '../../../../domain/media';
import { MediaItem, MediaKind } from '../../../../domain/ports';
import { DialogService } from '../../../state/dialog.service';
import { MediaService } from '../../../state/media.service';
import { ToastService } from '../../../state/toast.service';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { IconComponent } from '../../icon/icon.component';

/**
 * The site's image library: upload (button or drag and drop), search and a grid.
 * In `manage` mode images can be deleted; in `pick` mode clicking one emits `picked`.
 */
@Component({
  selector: 'cms-media-library',
  imports: [IconComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './media-library.component.html',
  styleUrl: './media-library.component.css',
})
export class MediaLibraryComponent implements OnInit {
  protected media = inject(MediaService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);

  readonly mode = input<'manage' | 'pick'>('manage');
  /** Only shows (and uploads) this kind. Without it, both kinds with a switch. */
  readonly kind = input<MediaKind | null>(null);
  /** Id of the image already chosen, highlighted in pick mode. */
  readonly selectedId = input<string | null>(null);
  readonly picked = output<MediaItem>();

  protected readonly tab = signal<MediaKind>('photo');
  protected readonly query = signal('');
  protected readonly dragging = signal(false);
  protected readonly error = signal('');
  protected readonly accept = ACCEPTED_TYPES.join(',');
  protected readonly kb = kb;

  protected readonly activeKind = computed(() => this.kind() ?? this.tab());
  protected readonly visible = computed(() => {
    const q = slugify(this.query());
    return this.media
      .items()
      .filter((m) => m.kind === this.activeKind())
      .filter((m) => !q || slugify(m.name).includes(q));
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.media.ensureLoaded();
    } catch (e) {
      this.error.set(`No se pudo cargar la biblioteca: ${(e as Error).message}`);
    }
  }

  protected async onFiles(list: FileList | null): Promise<void> {
    const files = [...(list ?? [])];
    if (!files.length) return;
    this.error.set('');
    const added = await this.media.upload(files, this.activeKind());
    // When everything worked the list is not needed: a notice is enough.
    if (added.length === files.length) {
      this.media.clearUploads();
      this.toast.show(added.length === 1 ? 'Imagen subida.' : added.length + ' imágenes subidas.');
    }
    // In pick mode, uploading a single image chooses it right away.
    if (this.mode() === 'pick' && files.length === 1 && added.length === 1) this.picked.emit(added[0]);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.onFiles(event.dataTransfer?.files ?? null);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected async remove(item: MediaItem): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `¿Borrar «${item.name}»?`,
      body: 'Se borra de la biblioteca de tu sitio.',
      confirm: 'Borrar',
      tone: 'danger',
    });
    if (!ok) return;
    this.error.set('');
    try {
      await this.media.remove(item);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  protected choose(item: MediaItem): void {
    if (this.mode() === 'pick') this.picked.emit(item);
  }
}
