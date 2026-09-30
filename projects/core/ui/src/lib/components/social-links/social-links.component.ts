import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SocialLink } from '../../models/ui.models';

/**
 * Row of social network icons that open in a new tab. Each link has a 44px tap area
 * even when the icon is smaller.
 *
 * ```html
 * <cc-social-links [links]="socials" size="sm" tone="inverse" />
 * ```
 *
 * Tokens: --cc-social-icon-size, --cc-social-gap.
 */
@Component({
  selector: 'cc-social-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.cc-social--sm]': "size() === 'sm'",
    '[class.cc-social--lg]': "size() === 'lg'",
    '[class.cc-social--inverse]': "tone() === 'inverse'",
  },
  templateUrl: './social-links.component.html',
  styleUrls: ['../../theme/component-base.css', './social-links.component.css'],
})
export class SocialLinksComponent {
  readonly links = input.required<SocialLink[]>();
  /** Icon size: `sm` 1rem, `md` 1.5rem, `lg` 2.5rem. */
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** `inverse` for dark backgrounds: changes the hover and focus colors. */
  readonly tone = input<'default' | 'inverse'>('default');
}
