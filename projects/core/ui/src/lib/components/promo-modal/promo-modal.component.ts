import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { ButtonComponent, ButtonVariant } from '../button/button.component';

/**
 * Modal over the page, for example a promotion. Shows `imageSrc`, or the projected
 * content when there is no image, plus an optional call to action.
 *
 * It decides by itself when to open:
 * - `autoOpen` opens it in the browser after `delayMs` (never during SSR, so it is not
 *   part of the prerendered page).
 * - `rememberKey` stores the dismissal in localStorage for `rememberDays` days, so it
 *   does not reopen on every visit.
 *
 * Closes with the ✕ button, a backdrop click or Escape. Focus moves into the modal,
 * stays inside while open and returns to the previous element on close.
 *
 * ```html
 * <cc-promo-modal imageSrc="assets/images/pop.jpeg" imageAlt="Promoción" [delayMs]="6000"
 *                 rememberKey="promo-octubre" ctaLabel="Reservar la promo" [ctaHref]="whatsapp" />
 * ```
 *
 * Tokens: --cc-modal-backdrop, --cc-modal-radius, --cc-modal-close-bg, --cc-modal-close-color.
 */
@Component({
  selector: 'cc-promo-modal',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'open() && close()' },
  templateUrl: './promo-modal.component.html',
  styleUrls: ['../../theme/component-base.css', './promo-modal.component.css'],
})
export class PromoModalComponent {
  /** Whether the modal is visible. Use `[(open)]` to control it from outside. */
  readonly open = model<boolean>(false);
  /** Opens the modal by itself in the browser after `delayMs`. */
  readonly autoOpen = input<boolean>(false);
  readonly delayMs = input<number>(0);
  /** localStorage key to remember the dismissal. Change it for each new promotion. */
  readonly rememberKey = input<string>('');
  readonly rememberDays = input<number>(7);

  readonly imageSrc = input<string>('');
  readonly imageAlt = input<string>('');
  /** Makes the image a link. */
  readonly link = input<string>('');
  /** Button under the image. Hidden when `ctaHref` is empty. */
  readonly ctaLabel = input<string>('Quiero esta promoción');
  readonly ctaHref = input<string>('');
  readonly ctaVariant = input<ButtonVariant>('primary');
  readonly closeOnBackdrop = input<boolean>(true);
  readonly closeLabel = input<string>('Cerrar');
  readonly closed = output<void>();

  private readonly document = inject(DOCUMENT);
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly isOpen = computed(() => this.open());

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!this.autoOpen() || this.wasDismissed()) return;
      const timer = setTimeout(() => this.open.set(true), Math.max(this.delayMs(), 0));
      destroyRef.onDestroy(() => clearTimeout(timer));
    });

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
    this.open.set(false);
    this.remember();
    this.closed.emit();
  }

  /** Keeps Tab and Shift+Tab inside the modal. */
  protected trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = this.box()?.nativeElement.querySelectorAll<HTMLElement>('a[href], button');
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

  private storage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private wasDismissed(): boolean {
    const key = this.rememberKey();
    if (!key) return false;
    try {
      const until = Number(this.storage()?.getItem(`cc-promo:${key}`) ?? 0);
      return until > Date.now();
    } catch {
      return false;
    }
  }

  private remember(): void {
    const key = this.rememberKey();
    if (!key) return;
    try {
      const until = Date.now() + this.rememberDays() * 24 * 60 * 60 * 1000;
      this.storage()?.setItem(`cc-promo:${key}`, String(until));
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); the modal still works.
    }
  }
}
