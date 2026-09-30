import { Plan, PlanCategory } from '../models/plan.models';
import {
  filterPlans,
  filterPlansByCategory,
  findPlanBySlug,
  joinAdditionalServices,
  planSlug,
  searchPlansByName,
  withCategoryCounts,
} from './plan.utils';
import { formatPrice, slugify, titleCase, truncateText, whatsappUrl } from './text.utils';

const jacuzzi = { id: 101, iconPath: 'j.png', name: 'Jacuzzi' };
const masaje = { id: 103, iconPath: 'm.png', name: 'Masaje' };

function plan(partial: Partial<Plan>): Plan {
  return {
    id: 1,
    name: 'PLAN',
    description: '',
    duration: '1 hora',
    price: 100000,
    cuantity: 1,
    imgPath: '',
    category: PlanCategory.Individual,
    additionalServicesId: [],
    ...partial,
  };
}

describe('text utils', () => {
  it('slugify removes accents and symbols', () => {
    expect(slugify('PLAN FLOR DE LOTTO 3')).toBe('plan-flor-de-lotto-3');
    expect(slugify('  Jacuzzi Mágico & Más! ')).toBe('jacuzzi-magico-mas');
    expect(slugify('Año Nuevo')).toBe('ano-nuevo');
  });

  it('titleCase capitalizes each word', () => {
    expect(titleCase('PLAN GARDENIA')).toBe('Plan Gardenia');
  });

  it('truncateText cuts on a word boundary', () => {
    expect(truncateText('corto', 160)).toBe('corto');
    expect(truncateText('uno dos tres cuatro', 10)).toBe('uno dos…');
    expect(truncateText('palabralarguisima', 5)).toBe('pala…');
  });

  it('whatsappUrl keeps only digits and encodes the message', () => {
    const url = new URL(whatsappUrl('+57 310 494 8884', 'Hola Laurel Spa. Más info'));
    expect(url.searchParams.get('phone')).toBe('573104948884');
    expect(url.searchParams.get('text')).toBe('Hola Laurel Spa. Más info');
    expect(whatsappUrl('573104948884')).not.toContain('text=');
  });
});

describe('plan utils', () => {
  const plans = joinAdditionalServices(
    [
      plan({ id: 1, name: 'PLAN GARDENIA', category: PlanCategory.Couple, price: 259900, additionalServicesId: [101, 103] }),
      plan({ id: 2, name: 'Plan Rosa', category: PlanCategory.Couple, price: 150000, additionalServicesId: [103, 999] }),
      plan({ id: 3, name: 'Plan Solo', category: PlanCategory.Individual, price: 90000, additionalServicesId: [101] }),
    ],
    [jacuzzi, masaje, { id: 101, iconPath: 'dup.png', name: 'Duplicado' }]
  );

  it('joins services, skips unknown ids and keeps the first repeated id', () => {
    expect(plans[0].additionalServices).toEqual([jacuzzi, masaje]);
    expect(plans[1].additionalServices).toEqual([masaje]);
  });

  it('does not mutate the input plans', () => {
    const input = [plan({ additionalServicesId: [101] })];
    joinAdditionalServices(input, [jacuzzi]);
    expect(input[0].additionalServices).toBeUndefined();
  });

  it('finds a plan by slug', () => {
    expect(planSlug(plans[0])).toBe('plan-gardenia');
    expect(findPlanBySlug(plans, 'plan-rosa')?.id).toBe(2);
    expect(findPlanBySlug(plans, 'nope')).toBeUndefined();
  });

  it('filters by category', () => {
    expect(filterPlansByCategory(plans, PlanCategory.Couple).map((p) => p.id)).toEqual([1, 2]);
  });

  it('searches by name ignoring case and accents', () => {
    expect(searchPlansByName(plans, 'gardénia').map((p) => p.id)).toEqual([1]);
    expect(searchPlansByName(plans, '  ').length).toBe(3);
  });

  it('filters by service and price range', () => {
    expect(filterPlans(plans, { service: jacuzzi }).map((p) => p.id)).toEqual([1, 3]);
    expect(filterPlans(plans, { priceRange: { description: '', min: 100000, max: 199999 } }).map((p) => p.id)).toEqual([2]);
    expect(filterPlans(plans, { service: masaje, priceRange: { description: '', min: 200000, max: 300000 } }).map((p) => p.id)).toEqual([1]);
    expect(filterPlans(plans, {}).length).toBe(3);
  });

  it('counts plans per category', () => {
    const counts = withCategoryCounts(
      [
        { value: PlanCategory.Individual, label: 'Individual' },
        { value: PlanCategory.Couple, label: 'Pareja' },
        { value: PlanCategory.Group, label: 'Grupal' },
      ],
      plans
    );
    expect(counts.map((c) => c.count)).toEqual([1, 2, 0]);
  });
});

describe('formatPrice', () => {
  it('formats Colombian pesos by default and accepts other locales', () => {
    expect(formatPrice(259900).replace(/\s/g, ' ')).toBe('$ 259.900');
    expect(formatPrice(1234.5, { locale: 'en-US', currency: 'USD', digits: 2 })).toBe('$1,234.50');
  });
});
