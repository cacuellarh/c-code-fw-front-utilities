import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Title with a paragraph, used for policy sections.
 * Extra content (lists, notes) can be projected under the text.
 *
 * ```html
 * <cc-info-item title="Pagos" text="Aceptamos Nequi, Daviplata y efectivo." />
 * <cc-info-item title="Bonos Spa" [text]="texto" headingId="bonos">
 *   <ul><li>…</li></ul>
 * </cc-info-item>
 * ```
 *
 * Tokens: --cc-info-title-color, --cc-info-text-color, --cc-info-text-align, --cc-info-max-width.
 */
@Component({
  selector: 'cc-info-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.cc-info--neutral]': "tone() === 'neutral'",
    '[class.cc-info--sm]': "size() === 'sm'",
  },
  templateUrl: './info-item.component.html',
  styleUrls: ['../../theme/component-base.css', './info-item.component.css'],
})
export class InfoItemComponent {
  readonly title = input.required<string>();
  readonly text = input<string>('');
  /** `accent` colors the title with the accent text color, `neutral` with the heading color. */
  readonly tone = input<'accent' | 'neutral'>('accent');
  readonly size = input<'sm' | 'md'>('md');
  readonly headingLevel = input<'h2' | 'h3'>('h2');
  /** Id of the heading, for anchors from a table of contents. */
  readonly headingId = input<string | null>(null);
}
