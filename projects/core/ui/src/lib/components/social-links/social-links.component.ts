import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SocialLink } from '../../models/ui.models';

/**
 * Row of social network icons that open in a new tab.
 *
 * ```html
 * <cc-social-links [links]="socials" size="1.25rem" />
 * ```
 */
@Component({
  selector: 'cc-social-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './social-links.component.html',
  styleUrl: './social-links.component.css',
})
export class SocialLinksComponent {
  readonly links = input.required<SocialLink[]>();
  /** Icon width, any CSS length. */
  readonly size = input<string>('1rem');
  readonly gap = input<string>('1.25rem');
}
