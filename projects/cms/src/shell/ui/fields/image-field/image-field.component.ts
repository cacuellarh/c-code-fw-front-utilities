import { ChangeDetectionStrategy, Component, computed, inject, input, output, resource, signal } from '@angular/core';
import { mediaIdOf } from '../../../../domain/media';
import { ImageField } from '../../../../domain/schema';
import { MediaItem } from '../../../../domain/ports';
import { MediaService } from '../../../state/media.service';
import { MediaPickerComponent } from '../../media/media-picker/media-picker.component';

/**
 * Image of an entry, chosen from the site's library: no paths to type. Emits the chosen
 * image; the entry editor applies it (and the thumbnail, for galleries).
 */
@Component({
  selector: 'cms-image-field',
  imports: [MediaPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-field.component.html',
  styleUrl: './image-field.component.css',
})
export class ImageFieldComponent {
  private media = inject(MediaService);
  readonly field = input.required<ImageField>();
  readonly inputId = input<string>('');
  readonly value = input<string>('');
  readonly picked = output<MediaItem | null>();

  protected readonly pickerOpen = signal(false);
  protected readonly broken = signal(false);
  protected readonly libraryId = computed(() => mediaIdOf(this.value())?.id ?? null);
  /** A path from before the library (not imported yet). */
  protected readonly legacy = computed(() => !!this.value() && !this.libraryId());
  protected readonly name = computed(() => {
    const id = this.libraryId();
    return id ? (this.media.find(id)?.name ?? id) : '';
  });
  protected readonly preview = resource({
    request: () => this.value(),
    loader: ({ request }) => this.media.urlFor(request),
  });

  constructor() {
    this.media.ensureLoaded().catch(() => undefined);
  }

  protected choose(item: MediaItem): void {
    this.broken.set(false);
    this.picked.emit(item);
  }
}
