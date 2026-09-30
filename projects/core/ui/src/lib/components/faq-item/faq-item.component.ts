import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * One question of `cc-faq`. The answer is projected, so it can contain links.
 *
 * ```html
 * <cc-faq title="Preguntas frecuentes">
 *   <cc-faq-item question="¿Qué planes tienen?">
 *     Míralos todos en <a routerLink="/planes">planes</a>.
 *   </cc-faq-item>
 * </cc-faq>
 * ```
 *
 * Tokens: --cc-faq-bg, --cc-faq-question-color, --cc-faq-answer-color.
 */
@Component({
  selector: 'cc-faq-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './faq-item.component.html',
  styleUrls: ['../../theme/component-base.css', './faq-item.component.css'],
})
export class FaqItemComponent {
  readonly question = input.required<string>();
  /** Starts expanded. */
  readonly open = input<boolean>(false);
}
