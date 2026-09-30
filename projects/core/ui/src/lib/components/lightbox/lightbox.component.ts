import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
} from '@angular/core';
import { GalleryImage } from '../../models/ui.models';

/**
 * Full-screen image viewer. It is open while `index` is not null.
 * Arrow keys move between images and Escape closes it.
 *
 * ```html
 * <cc-lightbox [images]="images" [(index)]="openIndex" />
 * ```
 */
@Component({
  selector: 'cc-lightbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:keydown.arrowright)': 'next()',
    '(document:keydown.arrowleft)': 'prev()',
  },
  templateUrl: './lightbox.component.html',
  styleUrl: './lightbox.component.css',
})
export class LightboxComponent {
  readonly images = input.required<GalleryImage[]>();
  /** Index of the open image, or null when closed. Use `[(index)]`. */
  readonly index = model<number | null>(null);
  readonly closeLabel = input<string>('Cerrar');
  readonly prevLabel = input<string>('Imagen anterior');
  readonly nextLabel = input<string>('Imagen siguiente');

  protected readonly current = computed(() => {
    const i = this.index();
    return i === null ? null : (this.images()[i] ?? null);
  });

  private document = inject(DOCUMENT);

  constructor() {
    // Stop the page behind from scrolling while the viewer is open.
    effect((onCleanup) => {
      if (this.current() === null) return;
      const body = this.document.body;
      const previous = body.style.overflow;
      body.style.overflow = 'hidden';
      onCleanup(() => (body.style.overflow = previous));
    });
  }

  close(): void {
    if (this.index() !== null) this.index.set(null);
  }

  next(): void {
    const i = this.index();
    const total = this.images().length;
    if (i !== null && total) this.index.set((i + 1) % total);
  }

  prev(): void {
    const i = this.index();
    const total = this.images().length;
    if (i !== null && total) this.index.set((i - 1 + total) % total);
  }
}
