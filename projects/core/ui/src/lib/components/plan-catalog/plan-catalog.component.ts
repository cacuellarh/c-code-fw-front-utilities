import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  effect,
  input,
  output,
  signal,
  TemplateRef,
  untracked,
} from '@angular/core';
import {
  AdditionalService,
  CategoryOption,
  DEFAULT_PLAN_CATEGORIES,
  Plan,
  PlanCategory,
  PlanFilter,
  PriceRange,
} from '../../models/plan.models';
import { LinkTarget } from '../../models/ui.models';
import {
  filterPlans,
  filterPlansByCategory,
  planSlug,
  searchPlansByName,
  withCategoryCounts,
} from '../../utils/plan.utils';
import { CategoryMenuComponent } from '../category-menu/category-menu.component';
import { PageBannerComponent } from '../page-banner/page-banner.component';
import { PlanCardComponent } from '../plan-card/plan-card.component';
import { PlanFilterFormComponent } from '../plan-filter-form/plan-filter-form.component';
import { SearchBoxComponent } from '../search-box/search-box.component';

/** Context of a custom card template: `<ng-template ccPlanCard let-plan let-link="link">`. */
export interface PlanCardContext {
  $implicit: Plan;
  link: LinkTarget;
}

/** Marks an `<ng-template>` inside `cc-plan-catalog` as the card to render for each plan. */
@Directive({ selector: 'ng-template[ccPlanCard]' })
export class PlanCardTemplateDirective {
  static ngTemplateContextGuard(_dir: PlanCardTemplateDirective, ctx: unknown): ctx is PlanCardContext {
    return true;
  }
}

/**
 * Full plan list page: title, name search, category menu, filter and card grid.
 * It only needs the plans; the rest has Spanish defaults you can override.
 *
 * Selecting a category shows its plans. Searching by name or applying the filter
 * looks across every category, as the sites already did.
 *
 * ```html
 * <cc-plan-catalog
 *   [plans]="plans()"
 *   [services]="services()"
 *   [priceRanges]="ranges()"
 *   imageAltSuffix=" - Laurel Spa Medellín"
 * />
 * ```
 */
@Component({
  selector: 'cc-plan-catalog',
  imports: [
    NgTemplateOutlet,
    PageBannerComponent,
    SearchBoxComponent,
    CategoryMenuComponent,
    PlanFilterFormComponent,
    PlanCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-catalog.component.html',
  styleUrl: './plan-catalog.component.css',
})
export class PlanCatalogComponent {
  readonly plans = input.required<Plan[]>();
  readonly categories = input<CategoryOption[]>(DEFAULT_PLAN_CATEGORIES);
  readonly initialCategory = input<PlanCategory | number>(PlanCategory.Individual);
  /** Shows how many plans each category has, counted from `plans`. */
  readonly showCounts = input<boolean>(true);
  /** Options for the filter form. The filter is hidden when both are empty. */
  readonly services = input<AdditionalService[]>([]);
  readonly priceRanges = input<PriceRange[]>([]);
  /** Where each card links to. Defaults to `/planes/<slug>`. */
  readonly detailsLink = input<(plan: Plan) => LinkTarget>((plan) => ['/planes', planSlug(plan)]);

  readonly showBanner = input<boolean>(true);
  readonly showSearch = input<boolean>(true);
  readonly titlePrefix = input<string>('Reserva tu plan');
  readonly resultsTitle = input<string>('Resultados');
  readonly categoriesTitle = input<string>('CATEGORÍA DE PLANES');
  readonly searchPlaceholder = input<string>('Buscar plan');
  readonly searchIconSrc = input<string>('');
  readonly filterTitle = input<string>('Filtrar');
  readonly filterIconSrc = input<string>('');
  readonly ctaLabel = input<string>('Saber más');
  /** Added after the plan name in each image's alt text. */
  readonly imageAltSuffix = input<string>('');
  readonly emptyMessage = input<string>('No encontramos planes con esos criterios.');

  readonly categoryChange = output<PlanCategory | number>();

  protected readonly cardTemplate = contentChild(PlanCardTemplateDirective, { read: TemplateRef });

  protected readonly category = signal<PlanCategory | number | null>(null);
  protected readonly query = signal('');
  protected readonly filter = signal<PlanFilter | null>(null);
  protected readonly filterOpen = signal(false);
  /** Set when the user searched or filtered; results then cover every category. */
  protected readonly searching = signal(false);
  /** Category that was open before searching, to return to it when the search is cleared. */
  private lastCategory: PlanCategory | number | null = null;

  constructor() {
    // Apply `initialCategory` until the user picks one.
    effect(() => {
      const initial = this.initialCategory();
      untracked(() => {
        if (!this.searching()) this.category.set(initial);
      });
    });
  }

  protected readonly categoryOptions = computed(() =>
    this.showCounts() ? withCategoryCounts(this.categories(), this.plans()) : this.categories()
  );

  protected readonly hasFilter = computed(
    () => this.services().length > 0 || this.priceRanges().length > 0
  );

  protected readonly visiblePlans = computed(() => {
    const plans = this.plans();
    if (!this.searching()) {
      const category = this.category();
      return category === null ? plans : filterPlansByCategory(plans, category);
    }
    const byName = searchPlansByName(plans, this.query());
    const filter = this.filter();
    return filter ? filterPlans(byName, filter) : byName;
  });

  protected readonly title = computed(() => {
    if (this.searching()) return `${this.titlePrefix()} - ${this.resultsTitle()}`;
    const option = this.categories().find((c) => c.value === this.category());
    return option ? `${this.titlePrefix()} - ${option.label}` : this.titlePrefix();
  });

  protected selectCategory(value: PlanCategory | number | null): void {
    if (value === null) return;
    this.searching.set(false);
    this.query.set('');
    this.filter.set(null);
    this.category.set(value);
    this.categoryChange.emit(value);
  }

  protected onSearch(query: string): void {
    this.query.set(query);
    if (!query.trim() && !this.filter()) {
      this.selectCategory(this.lastCategory ?? this.initialCategory());
      return;
    }
    this.startSearch();
  }

  protected onFilter(filter: PlanFilter): void {
    const empty = !filter.service && !filter.priceRange;
    this.filter.set(empty ? null : filter);
    if (empty && !this.query().trim()) {
      this.selectCategory(this.lastCategory ?? this.initialCategory());
      return;
    }
    this.startSearch();
  }

  protected linkFor(plan: Plan): LinkTarget {
    return this.detailsLink()(plan);
  }

  private startSearch(): void {
    if (!this.searching()) this.lastCategory = this.category();
    this.searching.set(true);
    this.category.set(null);
  }
}
