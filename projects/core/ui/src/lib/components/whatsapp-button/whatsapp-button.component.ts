import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Floating WhatsApp button, fixed to a corner of the screen.
 *
 * `variant`:
 * - `icon` (default): round button with the logo.
 * - `extended`: pill with the logo and `label` as visible text.
 *
 * ```html
 * <cc-whatsapp-button [href]="whatsappLink" />
 * <cc-whatsapp-button [href]="whatsappLink" variant="extended" label="Reservar" position="left" />
 * ```
 *
 * Tokens: --cc-whatsapp, --cc-whatsapp-hover, --cc-whatsapp-size, --cc-whatsapp-offset-x,
 * --cc-whatsapp-offset-y.
 */
@Component({
  selector: 'cc-whatsapp-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.cc-wa--left]': "position() === 'left'",
    '[class.cc-wa--extended]': "variant() === 'extended'",
    '[class.cc-wa--sm]': "size() === 'sm'",
  },
  templateUrl: './whatsapp-button.component.html',
  styleUrls: ['../../theme/component-base.css', './whatsapp-button.component.css'],
})
export class WhatsappButtonComponent {
  /** WhatsApp link. Build it with `whatsappUrl(phone, message)`. */
  readonly href = input.required<string>();
  /** Custom icon. Without it, the WhatsApp logo is drawn as SVG. */
  readonly iconSrc = input<string>('');
  /** Accessible name, and the visible text in the `extended` variant. */
  readonly label = input<string>('Escríbenos por WhatsApp');
  readonly variant = input<'icon' | 'extended'>('icon');
  readonly size = input<'sm' | 'md'>('md');
  readonly position = input<'right' | 'left'>('right');
}
