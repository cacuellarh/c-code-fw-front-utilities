import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  untracked,
  viewChild,
} from '@angular/core';
import { GalleryImage } from '../../models/ui.models';

/**
 * Full-screen image viewer. It is open while `index` is not null.
 * Arrow keys and swipe move between images; Escape and the backdrop close it.
 * Focus moves into the viewer on open, stays inside while open, and returns to the
 * element that opened it on close.
 *
 * ```html
 * <cc-lightbox [images]="images" [(index)]="openIndex" />
 * ```
 *
 * Tokens: --cc-lightbox-backdrop, --cc-lightbox-control-bg, --cc-lightbox-color.
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
  styleUrls: ['../../theme/component-base.css', './lightbox.component.css'],
})
export class LightboxComponent {
  readonly images = input.required<GalleryImage[]>();
  /** Index of the open image, or null when closed. Use `[(index)]`. */
  readonly index = model<number | null>(null);
  readonly closeLabel = input<string>('Cerrar');
  readonly prevLabel = input<string>('Imagen anterior');
  readonly nextLabel = input<string>('Imagen siguiente');
  /** Text of the position counter, for example "3 de 18". */
  readonly counterSeparator = input<string>('de');

  protected readonly current = computed(() => {
    const i = this.index();
    return i === null ? null : (this.images()[i] ?? null);
  });

  /** Changes only on open/close, not when moving between images. */
  private readonly isOpen = computed(() => this.current() !== null);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private touchStartX: number | null = null;

  constructor() {
    // Lock page scroll and manage focus while the viewer is open.
    effect((onCleanup) => {
      if (!this.isOpen()) return;
      untracked(() => {
        const body = this.document.body;
        const previousOverflow = body.style.overflow;
        const opener = this.document.activeElement as HTMLElement | null;
        body.style.overflow = 'hidden';
        queueMicrotask(() => this.closeButton()?.nativeElement.focus());
        onCleanup(() => {
          body.style.overflow = previousOverflow;
          opener?.focus?.();
        });
      });
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

  /** Keeps Tab and Shift+Tab inside the viewer. */
  protected trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = this.dialog()?.nativeElement.querySelectorAll<HTMLElement>('button');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0]?.clientX ?? null;
  }

  protected onTouchEnd(event: TouchEvent): void {
    if (this.touchStartX === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? this.touchStartX) - this.touchStartX;
    this.touchStartX = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) this.next();
    else this.prev();
  }
}
