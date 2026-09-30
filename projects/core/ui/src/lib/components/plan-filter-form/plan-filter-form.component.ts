import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AdditionalService, PlanFilter, PriceRange } from '../../models/plan.models';
import { ButtonComponent } from '../button/button.component';

/**
 * Filter by included service and price range. The options come in as inputs,
 * so the form does not load data by itself.
 *
 * `mode`:
 * - `instant` (default): emits `filterChange` as soon as an option changes.
 * - `submit`: emits when the user presses the submit button.
 *
 * ```html
 * <cc-plan-filter-form [services]="services" [priceRanges]="ranges" (filterChange)="apply($event)" />
 * ```
 *
 * Tokens: --cc-filter-field-bg, --cc-filter-field-border, --cc-filter-label-color.
 */
@Component({
  selector: 'cc-plan-filter-form',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-filter-form.component.html',
  styleUrls: ['../../theme/component-base.css', './plan-filter-form.component.css'],
})
export class PlanFilterFormComponent {
  readonly services = input<AdditionalService[]>([]);
  readonly priceRanges = input<PriceRange[]>([]);
  readonly mode = input<'instant' | 'submit'>('instant');
  readonly serviceLabel = input<string>('Servicio incluido');
  readonly priceLabel = input<string>('Rango de precio');
  readonly anyLabel = input<string>('Todos');
  readonly submitLabel = input<string>('Filtrar');
  readonly resetLabel = input<string>('Limpiar filtros');
  /** Emits the current filter, and an empty filter on reset. */
  readonly filterChange = output<PlanFilter>();

  protected readonly serviceIndex = signal(-1);
  protected readonly rangeIndex = signal(-1);
  protected readonly hasSelection = computed(() => this.serviceIndex() !== -1 || this.rangeIndex() !== -1);

  protected onServiceChange(event: Event): void {
    this.serviceIndex.set(this.toIndex(event));
    if (this.mode() === 'instant') this.submit();
  }

  protected onRangeChange(event: Event): void {
    this.rangeIndex.set(this.toIndex(event));
    if (this.mode() === 'instant') this.submit();
  }

  submit(): void {
    this.filterChange.emit({
      service: this.services()[this.serviceIndex()] ?? null,
      priceRange: this.priceRanges()[this.rangeIndex()] ?? null,
    });
  }

  reset(): void {
    this.serviceIndex.set(-1);
    this.rangeIndex.set(-1);
    this.filterChange.emit({ service: null, priceRange: null });
  }

  private toIndex(event: Event): number {
    return Number((event.target as HTMLSelectElement).value);
  }
}
