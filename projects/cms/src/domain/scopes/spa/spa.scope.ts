import { formatPrice, PlanCategory, planSlug } from '@cc/ui-domain';
import { Entry, FieldProblem, ScopeContext, ScopeDef } from '../../schema';
import { galleryCollection } from '../shared/gallery.collection';
import { promoCollection } from '../shared/promo.collection';
import { generateRoutes, generateSitemap, planRoute } from './spa.generators';

const CATEGORY_OPTIONS = [
  { value: PlanCategory.Couple, label: 'Pareja' },
  { value: PlanCategory.Individual, label: 'Individual' },
  { value: PlanCategory.Group, label: 'Grupal' },
  { value: PlanCategory.None, label: 'Sin categoría' },
];

const categoryLabel = (value: unknown) => CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? 'Sin categoría';

/**
 * Spa sites (Laurel Spa, Ixora Spa…): plans, the services they include and, optionally,
 * price ranges for the filter and the services shown on the home page. Matches the models
 * of `@c-code/c-code-fw/ui` (`Plan`, `AdditionalService`, `PriceRange`).
 */
export const SPA_SCOPE: ScopeDef = {
  id: 'spa',
  label: 'Spa',
  description: 'Planes con precio, duración y servicios incluidos, reservados por WhatsApp.',
  defaultOptions: { planRoute: '/planes/', routesFile: 'prerender-routes.txt', sitemapFile: 'public/sitemap.xml' },
  collections: [
    {
      id: 'plans',
      label: 'Planes',
      singular: 'plan',
      icon: 'layout-list',
      description: 'Planes con precio, duración y servicios incluidos. Cada uno tiene su página.',
      file: 'src/assets/data/plans.json',
      idKey: 'id',
      titleKey: 'name',
      imageKey: 'imgPath',
      subtitle: (plan) =>
        [categoryLabel(plan['category']), formatPrice(Number(plan['price']) || 0), plan['duration']]
          .filter(Boolean)
          .join(' · '),
      fields: [
        {
          key: 'name',
          label: 'Nombre',
          type: 'text',
          required: true,
          uppercase: true,
          placeholder: 'PLAN GARDENIA',
          changedHelp: 'La dirección de la página cambiará: los enlaces que ya compartiste dejarán de funcionar.',
        },
        { key: 'category', label: 'Categoría', type: 'select', options: CATEGORY_OPTIONS, width: 'half' },
        { key: 'cuantity', label: 'Personas', type: 'number', min: 1, step: 1, required: true, width: 'half' },
        { key: 'price', label: 'Precio', type: 'number', min: 0, step: 100, format: 'price', required: true, width: 'half' },
        {
          key: 'duration',
          label: 'Duración',
          type: 'text',
          required: true,
          placeholder: '2 horas 20 minutos',
          width: 'half',
        },
        {
          key: 'imgPath',
          label: 'Foto',
          type: 'image',
          kind: 'photo',
          required: true,
          help: 'Horizontal o cuadrada.',
        },
        { key: 'description', label: 'Descripción', type: 'textarea', rows: 5, required: true },
        { key: 'additionalServicesId', label: 'Servicios incluidos', type: 'relation', collection: 'additionals' },
      ],
      create: () => ({
        id: 0,
        description: '',
        duration: '',
        price: 0,
        name: 'PLAN ',
        cuantity: 2,
        imgPath: '',
        category: PlanCategory.Couple,
        additionalServicesId: [],
      }),
      validate: (plan, all, ctx) => {
        const issues: FieldProblem[] = [];
        const slug = planSlug(String(plan['name'] ?? ''));
        if (!/^plan\b/i.test(String(plan['name'] ?? '').trim())) issues.push({ field: 'name', message: 'Debería empezar por «PLAN».' });
        if (slug && all.some((other) => other !== plan && planSlug(String(other['name'] ?? '')) === slug)) {
          issues.push({ field: 'name', message: `Ya hay un plan con este nombre (${planRoute(ctx)}${slug}).` });
        }
        if (Number(plan['price']) <= 0) issues.push({ field: 'price', message: 'Debe ser mayor que cero.' });
        if (!(plan['additionalServicesId'] as unknown[] | undefined)?.length) {
          issues.push({ field: 'additionalServicesId', message: 'Elige al menos un servicio.' });
        }
        return issues;
      },
      preview: 'spa.plan',
    },
    {
      id: 'additionals',
      label: 'Servicios',
      singular: 'servicio',
      icon: 'sparkles',
      description: 'Lo que incluyen los planes: masajes, jacuzzi, bebidas…',
      file: 'src/assets/data/additionals.json',
      idKey: 'id',
      titleKey: 'name',
      imageKey: 'iconPath',
      subtitle: (service, ctx) => usedIn(service, ctx),
      fields: [
        { key: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Masaje relajante' },
        { key: 'iconPath', label: 'Ícono', type: 'image', kind: 'icon', required: true },
      ],
      create: () => ({ id: 0, iconPath: '', name: '' }),
      validate: (service, all) =>
        all.some((other) => other !== service && norm(other['name']) === norm(service['name']))
          ? [{ field: 'name', message: 'Ya hay un servicio con este nombre.' }]
          : [],
    },
    {
      id: 'priceRanges',
      label: 'Rangos de precio',
      singular: 'rango',
      icon: 'sliders-horizontal',
      description: 'Opciones del filtro por precio en la lista de planes.',
      file: 'src/assets/data/priceRanges.json',
      optional: true,
      titleKey: 'description',
      subtitle: (range) => `${formatPrice(Number(range['min']) || 0)} – ${formatPrice(Number(range['max']) || 0)}`,
      fields: [
        { key: 'description', label: 'Texto de la opción', type: 'text', required: true, placeholder: '$100.000 – $149.999' },
        { key: 'min', label: 'Desde', type: 'number', min: 0, step: 1000, format: 'price', width: 'half' },
        { key: 'max', label: 'Hasta', type: 'number', min: 0, step: 1000, format: 'price', width: 'half' },
      ],
      create: () => ({ description: '', min: 0, max: 0 }),
      validate: (range) => (Number(range['min']) > Number(range['max']) ? [{ field: 'max', message: 'Es menor que «Desde».' }] : []),
    },
    {
      id: 'services',
      label: 'Destacados del inicio',
      singular: 'destacado',
      icon: 'star',
      description: 'Íconos de servicios que se muestran en la página de inicio.',
      file: 'src/assets/data/services.json',
      optional: true,
      titleKey: 'name',
      imageKey: 'route',
      fields: [
        { key: 'name', label: 'Nombre', type: 'text', required: true },
        { key: 'route', label: 'Ícono', type: 'image', kind: 'icon', required: true },
      ],
      create: () => ({ route: '', name: '' }),
    },
    galleryCollection(),
    promoCollection(),
  ],
  generators: [
    {
      label: 'Rutas del prerender',
      file: (ctx) => option(ctx, 'routesFile', 'prerender-routes.txt'),
      generate: generateRoutes,
    },
    {
      label: 'Sitemap',
      file: (ctx) => option(ctx, 'sitemapFile', 'public/sitemap.xml'),
      generate: (current, ctx) => generateSitemap(current, ctx),
    },
  ],
};

function usedIn(service: Entry, ctx: ScopeContext): string {
  const count = ctx.data('plans').filter((plan) => (plan['additionalServicesId'] as unknown[] | undefined)?.includes(service['id'])).length;
  return count === 0 ? 'Ningún plan lo incluye' : count === 1 ? 'En 1 plan' : `En ${count} planes`;
}

function option(ctx: ScopeContext, key: string, fallback: string): string {
  const value = ctx.manifest.options?.[key];
  return typeof value === 'string' ? value : fallback;
}

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();
