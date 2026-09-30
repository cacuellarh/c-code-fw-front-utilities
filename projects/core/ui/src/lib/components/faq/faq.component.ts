import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FaqItem } from '../../models/ui.models';
import { FaqItemComponent } from '../faq-item/faq-item.component';

/**
 * Frequently asked questions as native `<details>` elements, so the answers stay in
 * the prerendered HTML for search engines. Pass plain `items`, or project
 * `<cc-faq-item>` elements when an answer needs links.
 *
 * ```html
 * <cc-faq title="Preguntas frecuentes" [items]="faq" />
 * <cc-faq title="Preguntas frecuentes">
 *   <cc-faq-item question="¿Qué planes tienen?">Míralos en <a routerLink="/planes">planes</a>.</cc-faq-item>
 * </cc-faq>
 * ```
 *
 * Tokens: --cc-faq-title-color, --cc-faq-gap, plus the ones of `cc-faq-item`.
 */
@Component({
  selector: 'cc-faq',
  imports: [FaqItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './faq.component.html',
  styleUrls: ['../../theme/component-base.css', './faq.component.css'],
})
export class FaqComponent {
  readonly items = input<FaqItem[]>([]);
  readonly title = input<string>('');
  readonly headingLevel = input<'h2' | 'h3'>('h2');
}
