import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LinkTarget } from '../../models/ui.models';
import { formatPrice, PriceFormat } from '../../utils/text.utils';
import { ButtonComponent, ButtonVariant } from '../button/button.component';

/**
 * Plan card: photo, name, details, price and a call to action.
 * With `link`, the whole card is clickable and navigates with the router; without it,
 * the button emits `ctaClick`. With `skeleton`, it renders a loading placeholder.
 *
 * ```html
 * <cc-plan-card [name]="plan.name" [imageSrc]="plan.imgPath" [price]="plan.price"
 *               meta="2 h · 2 personas" [link]="['/planes', slug]" />
 * ```
 *
 * Tokens: --cc-plan-card-bg, --cc-plan-card-color, --cc-plan-card-border,
 * --cc-plan-card-radius, --cc-plan-card-shadow, --cc-plan-card-image-ratio,
 * --cc-plan-card-price-color.
 */
@Component({
  selector: 'cc-plan-card',
  imports: [RouterLink, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.cc-card--outlined]': "appearance() === 'outlined'",
    '[class.cc-card--plain]': "appearance() === 'plain'",
    '[class.cc-card--skeleton]': 'skeleton()',
    '[attr.aria-busy]': 'skeleton() || null',
  },
  templateUrl: './plan-card.component.html',
  styleUrls: ['../../theme/component-base.css', './plan-card.component.css'],
})
export class PlanCardComponent {
  readonly name = input<string>('');
  readonly imageSrc = input<string>('');
  /** Defaults to `name`. */
  readonly imageAlt = input<string>('');
  /** Short line under the name, for example "2 h 20 min · 2 personas". */
  readonly meta = input<string>('');
  /** Price to show. Leave it null to hide it. */
  readonly price = input<number | null>(null);
  /** Text before the price, for example "Desde". */
  readonly priceLabel = input<string>('');
  readonly priceFormat = input<PriceFormat>({});
  readonly link = input<LinkTarget | null>(null);
  /** Query params of `link`, for example `{ categoria: 'pareja' }`. */
  readonly queryParams = input<Record<string, string> | null>(null);
  readonly ctaLabel = input<string>('Ver plan');
  readonly ctaVariant = input<ButtonVariant>('primary');
  /** `filled` uses the surface color, `outlined` a border on white, `plain` no box. */
  readonly appearance = input<'filled' | 'outlined' | 'plain'>('filled');
  /** Heading level of the name inside the page outline. */
  readonly headingLevel = input<'h2' | 'h3'>('h2');
  /** Renders a loading placeholder instead of the content. */
  readonly skeleton = input<boolean>(false);
  readonly ctaClick = output<void>();

  protected readonly formattedPrice = computed(() => {
    const price = this.price();
    return price === null ? '' : formatPrice(price, this.priceFormat());
  });
}
