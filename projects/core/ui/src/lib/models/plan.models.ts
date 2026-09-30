/**
 * Plan category. The numeric values match the `category` field stored in the sites' `plans.json`.
 */
export enum PlanCategory {
  Individual = 0,
  Couple = 1,
  Group = 2,
  None = 3,
}

/** Add-on service that a plan includes (an entry in `additionals.json`). */
export interface AdditionalService {
  id: number;
  iconPath: string;
  name: string;
}

/** A spa plan (an entry in `plans.json`). */
export interface Plan {
  id: number;
  name: string;
  description: string;
  duration: string;
  price: number;
  /** Number of people the plan is for. The spelling matches the existing JSON files. */
  cuantity: number;
  imgPath: string;
  category: PlanCategory | number;
  additionalServicesId: number[];
  /** Filled in by `PlanCatalogService` by joining `additionalServicesId` with `additionals.json`. */
  additionalServices?: AdditionalService[];
}

/** Price range option for the filter form (an entry in `priceRanges.json`). */
export interface PriceRange {
  description: string;
  min: number;
  max: number;
}

/** Filter produced by `cc-plan-filter-form`. Empty fields are not applied. */
export interface PlanFilter {
  service?: AdditionalService | null;
  priceRange?: PriceRange | null;
}

/** Entry in `cc-category-menu`. */
export interface CategoryOption<T = PlanCategory | number> {
  value: T;
  label: string;
  /** Number shown next to the label. Leave it empty to hide it. */
  count?: number;
}

/** Default Spanish labels for the plan categories. */
export const DEFAULT_PLAN_CATEGORIES: CategoryOption[] = [
  { value: PlanCategory.Individual, label: 'Individual' },
  { value: PlanCategory.Couple, label: 'Pareja' },
  { value: PlanCategory.Group, label: 'Grupal' },
];
