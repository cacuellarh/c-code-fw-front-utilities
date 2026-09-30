import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

/**
 * Text field with a search button. Emits `search` on Enter or on the button.
 *
 * ```html
 * <cc-search-box placeholder="Buscar plan" [(value)]="query" (search)="onSearch($event)" />
 * ```
 */
@Component({
  selector: 'cc-search-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-box.component.html',
  styleUrl: './search-box.component.css',
})
export class SearchBoxComponent {
  readonly value = model<string>('');
  readonly placeholder = input<string>('Buscar plan');
  readonly buttonLabel = input<string>('Buscar');
  readonly iconSrc = input<string>('');
  readonly search = output<string>();

  onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
