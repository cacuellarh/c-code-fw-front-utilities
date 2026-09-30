import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { CategoryOption } from '../../models/plan.models';

/**
 * Vertical category list with a single selected option.
 * Replaces the `appElementActive` markup the sites used for plan categories.
 *
 * ```html
 * <cc-category-menu [options]="categories" [(selected)]="category" />
 * ```
 */
@Component({
  selector: 'cc-category-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-menu.component.html',
  styleUrl: './category-menu.component.css',
})
export class CategoryMenuComponent<T = unknown> {
  readonly options = input.required<CategoryOption<T>[]>();
  /** Selected value. Use `[(selected)]` to bind both ways. */
  readonly selected = model<T | null>(null);
  readonly title = input<string>('CATEGORÍA DE PLANES');

  select(value: T): void {
    this.selected.set(value);
  }
}
