import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { GalleryImage } from '../../models/ui.models';
import { LightboxComponent } from '../lightbox/lightbox.component';

/**
 * Grid of square thumbnails that opens a lightbox on click.
 *
 * ```html
 * <cc-gallery [images]="images" [columns]="4" />
 * ```
 *
 * `numberedImages()` builds the list for folders named 1.jpeg, 2.jpeg, …
 *
 * Tokens: --cc-gallery-gap, --cc-gallery-radius, --cc-gallery-bg.
 */
@Component({
  selector: 'cc-gallery',
  imports: [LightboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--_gallery-columns]': 'columns()' },
  templateUrl: './gallery.component.html',
  styleUrls: ['../../theme/component-base.css', './gallery.component.css'],
})
export class GalleryComponent {
  readonly images = input.required<GalleryImage[]>();
  /** Columns from 1024px. Small screens use 2, tablets 3. */
  readonly columns = input<number>(4);
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
