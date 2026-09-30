import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';

/**
 * Modal over the page, for example a promotion shown when the site opens.
 * Shows `imageSrc`, or the projected content when there is no image.
 * Closes with the ✕ button, a backdrop click or the Escape key.
 *
 * ```html
 * <cc-promo-modal [(open)]="showPromo" imageSrc="assets/images/pop.jpeg" imageAlt="Promoción" />
 * ```
 */
@Component({
  selector: 'cc-promo-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'open() && close()' },
  templateUrl: './promo-modal.component.html',
  styleUrl: './promo-modal.component.css',
})
export class PromoModalComponent {
  /** Whether the modal is visible. Use `[(open)]` to bind both ways. */
  readonly open = model<boolean>(true);
  readonly imageSrc = input<string>('');
  readonly imageAlt = input<string>('');
  /** Makes the image a link, for example to WhatsApp. */
  readonly link = input<string>('');
  readonly closeOnBackdrop = input<boolean>(true);
  readonly closeLabel = input<string>('Cerrar');
  readonly closed = output<void>();

  close(): void {
    this.open.set(false);
    this.closed.emit();
  }
}
