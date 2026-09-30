import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { GalleryImage } from '../../models/ui.models';
import { LightboxComponent } from '../lightbox/lightbox.component';

/**
 * Thumbnail grid that opens a lightbox on click.
 *
 * ```html
 * <cc-gallery [images]="images" />
 * ```
 *
 * `numberedImages()` builds the list for folders named 1.jpeg, 2.jpeg, …
 */
@Component({
  selector: 'cc-gallery',
  imports: [LightboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css',
})
export class GalleryComponent {
  readonly images = input.required<GalleryImage[]>();
  readonly backgroundImage = input<string>('');
  readonly openLabel = input<string>('Ver imagen');

  protected readonly open = signal<number | null>(null);
}

/**
 * Builds a gallery list for numbered files.
 *
 * ```ts
 * numberedImages(18, (i) => `assets/images/galery/${i}.jpeg`, (i) => `Instalaciones - foto ${i}`)
 * ```
 */
export function numberedImages(
  count: number,
  src: (n: number) => string,
  caption?: (n: number) => string
): GalleryImage[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return { src: src(n), caption: caption?.(n) };
  });
}
