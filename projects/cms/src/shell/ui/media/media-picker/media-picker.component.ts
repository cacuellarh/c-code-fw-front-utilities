import { ChangeDetectionStrategy, Component, effect, ElementRef, input, model, output, viewChild } from '@angular/core';
import { MediaItem, MediaKind } from '../../../../domain/ports';
import { MediaLibraryComponent } from '../media-library/media-library.component';

/** Dialog to choose (or upload) an image from the library for a field. */
@Component({
  selector: 'cms-media-picker',
  imports: [MediaLibraryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './media-picker.component.html',
  styleUrl: './media-picker.component.css',
})
export class MediaPickerComponent {
  readonly open = model(false);
  readonly kind = input<MediaKind>('photo');
  readonly selectedId = input<string | null>(null);
  readonly title = input('Elegir imagen');
  readonly picked = output<MediaItem>();

  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) dialog.showModal();
      if (!this.open() && dialog.open) dialog.close();
    });
  }

  protected choose(item: MediaItem): void {
    this.picked.emit(item);
    this.open.set(false);
  }
}
