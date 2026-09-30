import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Floating WhatsApp button, fixed to a corner of the screen.
 *
 * ```html
 * <cc-whatsapp-button [href]="whatsappLink" />
 * <cc-whatsapp-button [href]="whatsappLink" iconSrc="assets/icons/whatsapp.png" position="left" />
 * ```
 */
@Component({
  selector: 'cc-whatsapp-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './whatsapp-button.component.html',
  styleUrl: './whatsapp-button.component.css',
})
export class WhatsappButtonComponent {
  /** WhatsApp link. Build it with `whatsappUrl(phone, message)`. */
  readonly href = input.required<string>();
  /** Custom icon. Without it, the WhatsApp logo is drawn as SVG. */
  readonly iconSrc = input<string>('');
  readonly label = input<string>('Escríbenos por WhatsApp');
  readonly position = input<'right' | 'left'>('right');
}
