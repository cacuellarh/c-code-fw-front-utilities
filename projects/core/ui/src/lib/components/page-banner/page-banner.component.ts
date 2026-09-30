import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LinkTarget } from '../../models/ui.models';

/**
 * Title strip at the top of a page, with an optional back link and icon.
 * Renders the page's `<h1>`.
 *
 * ```html
 * <cc-page-banner title="Reserva tu plan - Pareja" />
 * <cc-page-banner [title]="plan.name" backLink="/planes" iconSrc="assets/icons/hoja.png" variant="plain" />
 * ```
 */
@Component({
  selector: 'cc-page-banner',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-banner.component.html',
  styleUrl: './page-banner.component.css',
})
export class PageBannerComponent {
  readonly title = input.required<string>();
  /** `band` uses the surface color; `plain` uses the page background. */
  readonly variant = input<'band' | 'plain'>('band');
  readonly iconSrc = input<string>('');
  /** Shows a back arrow that links here. */
  readonly backLink = input<LinkTarget | null>(null);
  readonly backIconSrc = input<string>('');
  readonly backLabel = input<string>('Volver');
}
