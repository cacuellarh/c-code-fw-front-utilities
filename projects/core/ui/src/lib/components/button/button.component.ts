import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'whatsapp' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Shared button look for links and buttons. Every component in the library uses it,
 * so all calls to action share size, focus and colors.
 *
 * ```html
 * <a ccButton [href]="whatsapp" target="_blank">Reservar</a>
 * <button ccButton variant="secondary" size="sm" type="button">Limpiar</button>
 * ```
 *
 * Tokens: --cc-btn-bg, --cc-btn-color, --cc-btn-hover-bg, --cc-btn-hover-color,
 * --cc-btn-border, --cc-btn-radius, --cc-btn-padding-x, --cc-btn-font-weight,
 * --cc-btn-letter-spacing, --cc-btn-text-transform.
 */
@Component({
  selector: 'a[ccButton], button[ccButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cc-btn',
    '[class.cc-btn--secondary]': "variant() === 'secondary'",
    '[class.cc-btn--ghost]': "variant() === 'ghost'",
    '[class.cc-btn--whatsapp]': "variant() === 'whatsapp'",
    '[class.cc-btn--inverse]': "variant() === 'inverse'",
    '[class.cc-btn--sm]': "size() === 'sm'",
    '[class.cc-btn--lg]': "size() === 'lg'",
    '[class.cc-btn--block]': 'block()',
  },
  templateUrl: './button.component.html',
  styleUrls: ['../../theme/component-base.css', './button.component.css'],
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  /** Full width. */
  readonly block = input(false, { transform: booleanAttribute });
}
