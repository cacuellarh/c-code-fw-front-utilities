import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LinkTarget } from '../../models/ui.models';

/**
 * Title strip at the top of a page, with an optional back link and icon.
 * Renders the page's `<h1>`.
 *
 * ```html
 * <cc-page-banner title="Reserva tu plan - Pareja" />
 * <cc-page-banner [title]="plan.name" backLink="/planes" iconSrc="assets/icons/hoja.png" size="lg" italic />
 * ```
 *
 * Tokens: --cc-banner-bg, --cc-banner-color, --cc-banner-padding.
 */
@Component({
  selector: 'cc-page-banner',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.cc-banner--plain]': "variant() === 'plain'",
    '[class.cc-banner--sm]': "size() === 'sm'",
    '[class.cc-banner--lg]': "size() === 'lg'",
    '[class.cc-banner--italic]': 'italic()',
    '[class.cc-banner--start]': "align() === 'start'",
  },
  templateUrl: './page-banner.component.html',
  styleUrls: ['../../theme/component-base.css', './page-banner.component.css'],
})
export class PageBannerComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  /** `band` draws a surface-colored strip; `plain` has no background. */
  readonly variant = input<'band' | 'plain'>('band');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly italic = input(false, { transform: booleanAttribute });
  readonly align = input<'center' | 'start'>('center');
  readonly iconSrc = input<string>('');
  /** Shows a back arrow that links here. */
  readonly backLink = input<LinkTarget | null>(null);
  readonly backIconSrc = input<string>('');
  readonly backLabel = input<string>('Volver');
}
