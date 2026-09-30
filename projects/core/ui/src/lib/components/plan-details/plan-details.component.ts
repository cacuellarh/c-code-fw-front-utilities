import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Plan } from '../../models/plan.models';
import { LinkTarget } from '../../models/ui.models';
import { formatPrice, PriceFormat } from '../../utils/text.utils';
import { ButtonComponent, ButtonVariant } from '../button/button.component';
import { PageBannerComponent } from '../page-banner/page-banner.component';

/**
 * Plan detail view: title with a back link, photo, price with an early booking button,
 * description, duration, number of people, included services and a gift box.
 * On screens below 1024px a bar with the price and the booking button stays fixed at
 * the bottom while the plan is on screen. It only renders; the page loads the plan and
 * handles SEO.
 *
 * ```html
 * <cc-plan-details [plan]="plan" [bookingUrl]="bookingFor" imageAltSuffix=" en Laurel Spa" />
 * ```
 *
 * Tokens: --cc-details-panel-bg, --cc-details-price-bg, --cc-details-price-color,
 * --cc-details-gift-border, --cc-details-bar-bg, --cc-details-image-ratio.
 */
@Component({
  selector: 'cc-plan-details',
  imports: [ButtonComponent, PageBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-details.component.html',
  styleUrls: ['../../theme/component-base.css', './plan-details.component.css'],
})
export class PlanDetailsComponent {
  readonly plan = input.required<Plan>();
  /** Booking link, usually WhatsApp. A function receives the plan, to mention it in the message. */
  readonly bookingUrl = input.required<string | ((plan: Plan) => string)>();
  readonly bookingLabel = input<string>('Reservar por WhatsApp');
  /** Shorter label for the bottom bar on small screens. */
  readonly barBookingLabel = input<string>('Reservar');
  readonly bookingVariant = input<ButtonVariant>('primary');
  /** Keeps a bar with price and booking button at the bottom on small screens. */
  readonly stickyBar = input<boolean>(true);

  readonly showBanner = input<boolean>(true);
  readonly backLink = input<LinkTarget | null>('/planes');
  readonly backLabel = input<string>('Volver a los planes');
  readonly backIconSrc = input<string>('');
  readonly titleIconSrc = input<string>('');
  /** Added after the plan name in the photo's alt text. */
  readonly imageAltSuffix = input<string>('');

  readonly priceFormat = input<PriceFormat>({});
  /** Small text under the price. Defaults to "Precio por plan". */
  readonly priceNote = input<string>('Precio por plan');

  readonly durationIconSrc = input<string>('');
  readonly personIconSrc = input<string>('');
  readonly peopleIconSrc = input<string>('');
  readonly durationLabel = input<string>('Duración');
  readonly peopleCaption = input<string>('Personas');
  readonly personLabel = input<string>('persona');
  readonly peopleLabel = input<string>('personas');
  readonly includesLabel = input<string>('Incluye');

  /** Gift box. It is hidden when `perks` is empty. */
  readonly perksTitle = input<string>('Recibe con tu plan');
  readonly perks = input<string[]>([
    'Gift Card de invitación en PDF para regalo.',
    'Decoración según la ocasión que celebres.',
  ]);
  readonly perksImageSrc = input<string>('');
  readonly perksImageAlt = input<string>('');

  protected readonly people = computed(() => Math.max(this.plan().cuantity || 1, 1));
  protected readonly services = computed(() => this.plan().additionalServices ?? []);
  protected readonly price = computed(() => formatPrice(this.plan().price, this.priceFormat()));
  protected readonly booking = computed(() => {
    const url = this.bookingUrl();
    return typeof url === 'function' ? url(this.plan()) : url;
  });
}
