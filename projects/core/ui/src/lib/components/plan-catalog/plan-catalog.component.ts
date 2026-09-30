import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  input,
  model,
  signal,
  TemplateRef,
  viewChild,
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
import { PriceFormat } from '../../utils/text.utils';
import { ButtonComponent, ButtonVariant } from '../button/button.component';
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

/** Default detail line of a card: "2 horas 20 minutos · 2 personas". */
export function defaultPlanMeta(plan: Plan): string {
  const people = Math.max(plan.cuantity || 1, 1);
  const duration = plan.duration ? plan.duration.toLowerCase() : '';
  return [duration, `${people} ${people > 1 ? 'personas' : 'persona'}`].filter(Boolean).join(' · ');
}

/**
 * Full plan list page: title, name search, category menu, filter and card grid.
 * It only needs the plans; the rest has Spanish defaults you can override.
 *
 * - `plans` set to `null` means "loading" and shows placeholder cards.
 * - `[(category)]` is two-way, so a page can keep it in the URL (`?categoria=pareja`).
 * - Selecting a category shows its plans. Searching by name or filtering looks across
 *   every category; clearing the search goes back to the selected category.
 *
 * ```html
 * <cc-plan-catalog [plans]="plans()" [services]="services()" [priceRanges]="ranges()" [(category)]="category" />
 * ```
 *
 * Tokens: --cc-catalog-panel-bg, --cc-catalog-sidebar-width, --cc-catalog-column-min,
 * --cc-catalog-gap.
 */
@Component({
  selector: 'cc-plan-catalog',
  imports: [
    NgTemplateOutlet,
    ButtonComponent,
    PageBannerComponent,
    SearchBoxComponent,
    CategoryMenuComponent,
    PlanFilterFormComponent,
    PlanCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-catalog.component.html',
  styleUrls: ['../../theme/component-base.css', './plan-catalog.component.css'],
})
export class PlanCatalogComponent {
  /** The plans, or `null` while they load. */
  readonly plans = input.required<Plan[] | null>();
  readonly categories = input<CategoryOption[]>(DEFAULT_PLAN_CATEGORIES);
  /** Selected category. Use `[(category)]` to bind it; `null` means `initialCategory`. */
  readonly category = model<PlanCategory | number | null>(null);
  readonly initialCategory = input<PlanCategory | number>(PlanCategory.Individual);
  /** Shows how many plans each category has, counted from `plans`. */
  readonly showCounts = input<boolean>(true);
  /** Options for the filter form. The filter is hidden when both are empty. */
  readonly services = input<AdditionalService[]>([]);
  readonly priceRanges = input<PriceRange[]>([]);
  /** Where each card links to. Defaults to `/planes/<slug>`. */
  readonly detailsLink = input<(plan: Plan) => LinkTarget>((plan) => ['/planes', planSlug(plan)]);

  // Cards
  readonly showPrice = input<boolean>(true);
  readonly priceLabel = input<string>('');
  readonly priceFormat = input<PriceFormat>({});
  /** Detail line of each card. Defaults to duration and number of people. */
  readonly planMeta = input<(plan: Plan) => string>(defaultPlanMeta);
  readonly cardAppearance = input<'filled' | 'outlined' | 'plain'>('filled');
  readonly ctaLabel = input<string>('Ver plan');
  readonly ctaVariant = input<ButtonVariant>('primary');
  /** Added after the plan name in each image's alt text. */
  readonly imageAltSuffix = input<string>('');
  readonly skeletonCount = input<number>(6);

  // Texts and layout
  readonly showBanner = input<boolean>(true);
  readonly showSearch = input<boolean>(true);
  readonly titlePrefix = input<string>('Reserva tu plan');
  readonly resultsTitle = input<string>('Resultados');
  readonly categoriesTitle = input<string>('Categorías');
  readonly categoriesLayout = input<'auto' | 'list' | 'chips'>('auto');
  readonly searchPlaceholder = input<string>('Buscar plan');
  readonly searchIconSrc = input<string>('');
  readonly filterTitle = input<string>('Filtrar');
  readonly filterIconSrc = input<string>('');
  readonly emptyMessage = input<string>('No encontramos planes con esos criterios.');
  readonly emptyActionLabel = input<string>('Ver todos los planes');
  /** Optional contact link shown in the empty state, for example WhatsApp. */
  readonly contactHref = input<string>('');
  readonly contactLabel = input<string>('Pregúntanos por WhatsApp');

  protected readonly cardTemplate = contentChild(PlanCardTemplateDirective, { read: TemplateRef });
  private readonly filterForm = viewChild(PlanFilterFormComponent);

  protected readonly query = signal('');
  protected readonly filter = signal<PlanFilter | null>(null);
  protected readonly filterOpen = signal(false);
  /** Set when the user searched or filtered; results then cover every category. */
  protected readonly searching = signal(false);

  protected readonly loading = computed(() => this.plans() === null);
  protected readonly skeletons = computed(() => Array.from({ length: this.skeletonCount() }, (_, i) => i));

  /** Category shown in the menu: none while searching. */
  protected readonly activeCategory = computed(() =>
    this.searching() ? null : (this.category() ?? this.initialCategory())
  );

  protected readonly categoryOptions = computed(() =>
    this.showCounts() ? withCategoryCounts(this.categories(), this.plans() ?? []) : this.categories()
  );

  protected readonly hasFilter = computed(
    () => this.services().length > 0 || this.priceRanges().length > 0
  );

  protected readonly visiblePlans = computed(() => {
    const plans = this.plans() ?? [];
    if (!this.searching()) {
      return filterPlansByCategory(plans, this.category() ?? this.initialCategory());
    }
    const byName = searchPlansByName(plans, this.query());
    const filter = this.filter();
    return filter ? filterPlans(byName, filter) : byName;
  });

  protected readonly title = computed(() => {
    if (this.searching()) return `${this.titlePrefix()} - ${this.resultsTitle()}`;
    const option = this.categories().find((c) => c.value === this.activeCategory());
    return option ? `${this.titlePrefix()} - ${option.label}` : this.titlePrefix();
  });

  protected selectCategory(value: PlanCategory | number | null): void {
    if (value === null) return;
    this.clearSearch();
    this.category.set(value);
  }

  protected onSearch(query: string): void {
    this.query.set(query);
    this.updateSearching();
  }

  protected onFilter(filter: PlanFilter): void {
    const empty = !filter.service && !filter.priceRange;
    this.filter.set(empty ? null : filter);
    this.updateSearching();
  }

  /** Clears search and filter and shows the selected category again. */
  protected showAll(): void {
    this.filterForm()?.reset();
    this.clearSearch();
  }

  protected linkFor(plan: Plan): LinkTarget {
    return this.detailsLink()(plan);
  }

  protected metaFor(plan: Plan): string {
    return this.planMeta()(plan);
  }

  private clearSearch(): void {
    this.query.set('');
    this.filter.set(null);
    this.searching.set(false);
  }

  private updateSearching(): void {
    this.searching.set(!!this.query().trim() || !!this.filter());
  }
}
