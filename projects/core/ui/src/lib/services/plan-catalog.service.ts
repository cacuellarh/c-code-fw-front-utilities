import { HttpClient } from '@angular/common/http';
import {
  EnvironmentProviders,
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';
import { forkJoin, map, Observable, of, shareReplay } from 'rxjs';
import {
  AdditionalService,
  Plan,
  PlanCategory,
  PlanFilter,
  PriceRange,
} from '../models/plan.models';
import {
  filterPlans,
  filterPlansByCategory,
  findPlanBySlug,
  joinAdditionalServices,
  searchPlansByName,
} from '../utils/plan.utils';

/** Where `PlanCatalogService` loads the JSON files from. */
export interface PlanCatalogConfig {
  plansUrl: string;
  additionalsUrl: string;
  /** Leave it empty if the site has no `priceRanges.json`; `getPriceRanges()` then returns `[]`. */
  priceRangesUrl?: string | null;
}

export const DEFAULT_PLAN_CATALOG_CONFIG: PlanCatalogConfig = {
  plansUrl: 'assets/data/plans.json',
  additionalsUrl: 'assets/data/additionals.json',
  priceRangesUrl: 'assets/data/priceRanges.json',
};

export const PLAN_CATALOG_CONFIG = new InjectionToken<PlanCatalogConfig>(
  'PLAN_CATALOG_CONFIG',
  { providedIn: 'root', factory: () => DEFAULT_PLAN_CATALOG_CONFIG }
);

/**
 * Overrides the JSON locations. Without it, the service reads `assets/data/*.json`.
 *
 * ```ts
 * providers: [provideHttpClient(withFetch()), providePlanCatalog({ priceRangesUrl: null })]
 * ```
 */
export function providePlanCatalog(
  config: Partial<PlanCatalogConfig> = {}
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: PLAN_CATALOG_CONFIG,
      useValue: { ...DEFAULT_PLAN_CATALOG_CONFIG, ...config },
    },
  ]);
}

/**
 * Reads plans, add-on services and price ranges from static JSON.
 * Each file is requested once and cached; filtering happens in memory.
 * Needs `provideHttpClient()` in the app.
 */
@Injectable({ providedIn: 'root' })
export class PlanCatalogService {
  private http = inject(HttpClient);
  private config = inject(PLAN_CATALOG_CONFIG);

  private additionals$ = this.http
    .get<AdditionalService[]>(this.config.additionalsUrl)
    .pipe(shareReplay(1));

  private plans$ = forkJoin({
    plans: this.http.get<Plan[]>(this.config.plansUrl),
    additionals: this.additionals$,
  }).pipe(
    map(({ plans, additionals }) => joinAdditionalServices(plans, additionals)),
    shareReplay(1)
  );

  private priceRanges$ = (
    this.config.priceRangesUrl
      ? this.http.get<PriceRange[]>(this.config.priceRangesUrl)
      : of<PriceRange[]>([])
  ).pipe(shareReplay(1));

  /** Every plan, with `additionalServices` filled in. */
  getPlans(): Observable<Plan[]> {
    return this.plans$;
  }

  getAdditionalServices(): Observable<AdditionalService[]> {
    return this.additionals$;
  }

  getPriceRanges(): Observable<PriceRange[]> {
    return this.priceRanges$;
  }

  getPlansByCategory(category: PlanCategory | number): Observable<Plan[]> {
    return this.plans$.pipe(map((plans) => filterPlansByCategory(plans, category)));
  }

  getPlansByFilter(filter: PlanFilter): Observable<Plan[]> {
    return this.plans$.pipe(map((plans) => filterPlans(plans, filter)));
  }

  getPlansByName(name: string): Observable<Plan[]> {
    return this.plans$.pipe(map((plans) => searchPlansByName(plans, name)));
  }

  getPlanBySlug(slug: string): Observable<Plan | undefined> {
    return this.plans$.pipe(map((plans) => findPlanBySlug(plans, slug)));
  }
}
