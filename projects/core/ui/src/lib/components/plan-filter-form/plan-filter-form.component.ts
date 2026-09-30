import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { AdditionalService, PlanFilter, PriceRange } from '../../models/plan.models';

/**
 * Filter by included service and price range. The options come in as inputs,
 * so the form does not load data by itself.
 *
 * ```html
 * <cc-plan-filter-form [services]="services" [priceRanges]="ranges" (filterChange)="apply($event)" />
 * ```
 */
@Component({
  selector: 'cc-plan-filter-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-filter-form.component.html',
  styleUrl: './plan-filter-form.component.css',
})
export class PlanFilterFormComponent {
  readonly services = input<AdditionalService[]>([]);
  readonly priceRanges = input<PriceRange[]>([]);
  readonly serviceLabel = input<string>('Servicio incluido');
  readonly priceLabel = input<string>('Rango de precio');
  readonly anyLabel = input<string>('Todos');
  readonly submitLabel = input<string>('Filtrar');
  readonly resetLabel = input<string>('Limpiar');
  /** Emits on submit, and with an empty filter on reset. */
  readonly filterChange = output<PlanFilter>();

  protected serviceIndex = signal(-1);
  protected rangeIndex = signal(-1);

  protected toIndex(event: Event): number {
    return Number((event.target as HTMLSelectElement).value);
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
}
