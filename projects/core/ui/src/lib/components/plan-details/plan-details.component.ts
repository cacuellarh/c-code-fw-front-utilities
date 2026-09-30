import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Plan } from '../../models/plan.models';
import { LinkTarget } from '../../models/ui.models';
import { PageBannerComponent } from '../page-banner/page-banner.component';

/**
 * Plan detail view: title with a back link, photo, price, description, duration,
 * number of people, included services, and a gift box with the booking button.
 * It only renders; the page loads the plan and handles SEO.
 *
 * ```html
 * <cc-plan-details [plan]="plan" [bookingUrl]="whatsappLink" imageAltSuffix=" en Laurel Spa Medellín" />
 * ```
 */
@Component({
  selector: 'cc-plan-details',
  imports: [CurrencyPipe, PageBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-details.component.html',
  styleUrl: './plan-details.component.css',
})
export class PlanDetailsComponent {
  readonly plan = input.required<Plan>();
  /** Link of the booking button, usually WhatsApp. */
  readonly bookingUrl = input.required<string>();
  readonly bookingLabel = input<string>('¡RESERVAR AHORA!');

  readonly showBanner = input<boolean>(true);
  readonly backLink = input<LinkTarget | null>('/planes');
  readonly backLabel = input<string>('Volver a los planes');
  readonly backIconSrc = input<string>('');
  readonly titleIconSrc = input<string>('');
  /** Added after the plan name in the photo's alt text. */
  readonly imageAltSuffix = input<string>('');

  /** Arguments of Angular's `currency` pipe. */
  readonly currencyCode = input<string>('COP');
  readonly currencyDisplay = input<string>('COP$ ');
  readonly currencyDigits = input<string>('1.0-0');

  readonly durationIconSrc = input<string>('');
  readonly personIconSrc = input<string>('');
  readonly peopleIconSrc = input<string>('');
  readonly personLabel = input<string>('persona');
  readonly peopleLabel = input<string>('Personas');
  readonly includesLabel = input<string>('Incluye:');

  /** Gift box. It is hidden when `perks` is empty. */
  readonly perksTitle = input<string>('Recibe con nuestro plan');
  readonly perks = input<string[]>([
    'Gift Card de invitación en PDF para regalo.',
    'Decoración según la ocasión que celebres.',
  ]);
  readonly perksImageSrc = input<string>('');
  readonly perksImageAlt = input<string>('Gift card de regalo');

  protected readonly people = computed(() => Math.max(this.plan().cuantity || 1, 1));
  protected readonly services = computed(() => this.plan().additionalServices ?? []);
}
