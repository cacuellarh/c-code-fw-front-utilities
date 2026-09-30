import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FaqItem } from '../../models/ui.models';

/**
 * Frequently asked questions as native `<details>` elements, so the answers
 * stay in the prerendered HTML for search engines.
 *
 * ```html
 * <cc-faq title="PREGUNTAS FRECUENTES" [items]="faq" />
 * ```
 */
@Component({
  selector: 'cc-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.css',
})
export class FaqComponent {
  readonly items = input.required<FaqItem[]>();
  readonly title = input<string>('');
}
