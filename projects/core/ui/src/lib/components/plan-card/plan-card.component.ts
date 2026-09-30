import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LinkTarget } from '../../models/ui.models';

/**
 * Plan card: image, name and a button.
 * With `link` the button navigates with the router; without it, it emits `ctaClick`.
 *
 * ```html
 * <cc-plan-card [name]="plan.name" [imageSrc]="plan.imgPath" [link]="['/planes', slug]" />
 * ```
 */
@Component({
  selector: 'cc-plan-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-card.component.html',
  styleUrl: './plan-card.component.css',
})
export class PlanCardComponent {
  readonly name = input.required<string>();
  readonly imageSrc = input.required<string>();
  /** Defaults to `name`. */
  readonly imageAlt = input<string>('');
  /** Optional line under the name, for example the formatted price. */
  readonly subtitle = input<string>('');
  readonly link = input<LinkTarget | null>(null);
  readonly ctaLabel = input<string>('Saber más');
  readonly ctaClick = output<void>();
}
