import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ImportReport } from '../../../../domain/media';
import { canPickFolders } from '../../../adapters/fs-site-files';
import { EditorService } from '../../../state/editor.service';
import { MediaService } from '../../../state/media.service';
import { MediaLibraryComponent } from '../../media/media-library/media-library.component';

/** "Imágenes": the site's library, to upload and delete photos and icons, and to import the site's own images. */
@Component({
  selector: 'cms-media-page',
  imports: [MediaLibraryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './media.page.html',
  styleUrl: './media.page.css',
})
export class MediaPage {
  protected media = inject(MediaService);
  private editor = inject(EditorService);

  protected readonly canImport = canPickFolders();
  /** Images the content still takes from the site's own files. */
  protected readonly legacy = computed(() => (this.editor.content() ? this.media.legacyCount() : 0));
  protected readonly report = signal<ImportReport | null>(null);
  protected readonly error = signal('');

  protected async importFromSite(): Promise<void> {
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({ id: 'cms-site', mode: 'read' });
    } catch {
      return; // The user closed the picker.
    }
    const folder = await this.editor.readFolder(handle).catch(() => null);
    const warning = folder ? this.editor.folderWarning(folder) : null;
    if (warning && !confirm(`${warning}\n\n¿Importar las imágenes de todas formas?`)) return;
    this.error.set('');
    this.report.set(null);
    try {
      this.report.set(await this.media.importFromSite(handle));
    } catch (e) {
      this.error.set(`No se pudieron importar las imágenes: ${(e as Error).message}`);
    }
  }
}
