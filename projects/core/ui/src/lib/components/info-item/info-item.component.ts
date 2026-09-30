import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Title with a paragraph, used for policy sections.
 * Extra content (lists, notes) can be projected under the text.
 *
 * ```html
 * <cc-info-item title="Pagos" text="Aceptamos Nequi, Daviplata y efectivo." />
 * <cc-info-item title="Reservaciones" [text]="texto">
 *   <ul><li>…</li></ul>
 * </cc-info-item>
 * ```
 */
@Component({
  selector: 'cc-info-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './info-item.component.html',
  styleUrl: './info-item.component.css',
})
export class InfoItemComponent {
  readonly title = input.required<string>();
  readonly text = input<string>('');
}
