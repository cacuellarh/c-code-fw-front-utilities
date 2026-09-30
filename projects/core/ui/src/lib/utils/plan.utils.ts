import {
  AdditionalService,
  CategoryOption,
  Plan,
  PlanCategory,
  PlanFilter,
} from '../models/plan.models';
import { slugify } from './text.utils';

/** Fills `plan.additionalServices` from `additionalServicesId`. Unknown ids are skipped. */
export function joinAdditionalServices(
  plans: Plan[],
  additionals: AdditionalService[]
): Plan[] {
  const byId = new Map<number, AdditionalService>();
  // First entry wins, so a repeated id in the JSON keeps the original behavior of `Array.find`.
  for (const service of additionals) {
    if (!byId.has(service.id)) byId.set(service.id, service);
  }
  return plans.map((plan) => ({
    ...plan,
    additionalServices: plan.additionalServicesId
      .map((id) => byId.get(id))
      .filter((s): s is AdditionalService => !!s),
  }));
}

/** URL slug of a plan, derived from its name. */
export function planSlug(plan: Plan | string): string {
  return slugify(typeof plan === 'string' ? plan : plan.name);
}

export function findPlanBySlug(plans: Plan[], slug: string): Plan | undefined {
  return plans.find((plan) => planSlug(plan) === slug);
}

export function filterPlansByCategory(
  plans: Plan[],
  category: PlanCategory | number
): Plan[] {
  return plans.filter((plan) => plan.category === category);
}

/** Case- and accent-insensitive search on the plan name. An empty query returns every plan. */
export function searchPlansByName(plans: Plan[], query: string): Plan[] {
  const q = slugify(query);
  if (!q) return plans;
  return plans.filter((plan) => planSlug(plan).includes(q));
}

/**
 * Applies a `PlanFilter`. Price uses `min < price <= max`, the same rule the sites had,
 * except that `min = 0` also includes free plans.
 */
export function filterPlans(plans: Plan[], filter: PlanFilter): Plan[] {
  const { service, priceRange } = filter;
  return plans.filter((plan) => {
    const matchesService =
      !service ||
      (plan.additionalServices ?? []).some((s) => s.id === service.id) ||
      plan.additionalServicesId.includes(service.id);
    const matchesPrice =
      !priceRange ||
      (plan.price <= priceRange.max &&
        (plan.price > priceRange.min || (priceRange.min === 0 && plan.price === 0)));
    return matchesService && matchesPrice;
  });
}

/** Returns the options with `count` set to the number of plans in each category. */
export function withCategoryCounts<T extends PlanCategory | number>(
  options: CategoryOption<T>[],
  plans: Plan[]
): CategoryOption<T>[] {
  return options.map((option) => ({
    ...option,
    count: plans.filter((plan) => plan.category === option.value).length,
  }));
}
