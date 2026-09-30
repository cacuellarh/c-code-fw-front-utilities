import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { CategoryOption } from '../../models/plan.models';

/**
 * Category selector with a single selected option. Each option is a toggle button
 * (`aria-pressed`), so it works with Tab and Enter/Space.
 *
 * `layout`:
 * - `list`: vertical list, for sidebars.
 * - `chips`: one scrollable row of pills, for small screens.
 * - `auto` (default): chips below 1024px, list from 1024px.
 *
 * ```html
 * <cc-category-menu [options]="categories" [(selected)]="category" />
 * ```
 *
 * Tokens: --cc-category-color, --cc-category-hover-bg, --cc-category-active-bg,
 * --cc-category-active-color, --cc-category-chip-border.
 */
@Component({
  selector: 'cc-category-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.cc-cat--list]': "layout() === 'list'",
    '[class.cc-cat--chips]': "layout() === 'chips'",
    '[class.cc-cat--auto]': "layout() === 'auto'",
  },
  templateUrl: './category-menu.component.html',
  styleUrls: ['../../theme/component-base.css', './category-menu.component.css'],
})
export class CategoryMenuComponent<T = unknown> {
  readonly options = input.required<CategoryOption<T>[]>();
  /** Selected value. Use `[(selected)]` to bind both ways. */
  readonly selected = model<T | null>(null);
  readonly title = input<string>('Categorías');
  readonly layout = input<'auto' | 'list' | 'chips'>('auto');

  select(value: T): void {
    this.selected.set(value);
  }
}
