import { PromoConfig, promoState, PromoState } from '@cc/ui-domain';
import { CollectionDef, Entry, FieldProblem } from '../../schema';

/** How each state reads in the CMS. */
export const PROMO_STATE_LABELS: Record<PromoState, string> = {
  off: 'Apagado',
  incomplete: 'Falta la imagen',
  scheduled: 'Programado',
  running: 'Se muestra',
  ended: 'Terminado',
};

/**
 * Promotional popup: one entry (the site's `promo.json`). Reusable by any kind of site; the
 * site shows it with `cc-promo-modal` and decides when with `promoState()` from the library.
 */
export function promoCollection(options: { file?: string } = {}): CollectionDef {
  return {
    id: 'promo',
    label: 'Popup de promoción',
    singular: 'popup',
    icon: 'megaphone',
    description: 'Imagen que aparece sola al entrar al sitio, con fechas y frecuencia.',
    file: options.file ?? 'src/assets/data/promo.json',
    optional: true,
    single: true,
    titleKey: 'imageAlt',
    imageKey: 'imageSrc',
    subtitle: (promo) => PROMO_STATE_LABELS[promoState(promo as unknown as PromoConfig)],
    preview: 'shared.promo',
    fields: [
      { key: 'active', label: 'Mostrar el popup', type: 'boolean' },
      { key: 'imageSrc', label: 'Imagen', type: 'image', kind: 'photo', required: true },
      {
        key: 'imageAlt',
        label: 'Descripción de la imagen',
        type: 'textarea',
        rows: 2,
        required: true,
        maxLength: 250,
        placeholder: 'Promoción Amor y Amistad: Plan Chocolate por $149.900',
        help: 'Escribe lo que dice la imagen.',
      },
      { key: 'ctaLabel', label: 'Texto del botón', type: 'text', placeholder: 'Quiero esta promoción', width: 'half', help: 'Opcional.' },
      {
        key: 'message',
        label: 'Mensaje de WhatsApp',
        type: 'text',
        width: 'half',
        placeholder: 'Hola, quiero la promoción de Amor y Amistad',
        help: 'Llega ya escrito al abrir el chat.',
      },
      { key: 'delaySeconds', label: 'Aparece después de', type: 'number', min: 0, max: 120, step: 1, unit: 'segundos', width: 'half' },
      {
        key: 'repeatDays',
        label: 'Se repite cada',
        type: 'number',
        min: 0,
        max: 365,
        step: 1,
        unit: 'días',
        width: 'half',
        help: '0: en cada visita.',
      },
      { key: 'startDate', label: 'Desde', type: 'date', width: 'half', emptyLabel: 'Desde hoy' },
      { key: 'endDate', label: 'Hasta (incluido)', type: 'date', width: 'half', emptyLabel: 'Sin fecha de fin' },
    ],
    create: (): Entry => ({ ...DEFAULT_PROMO }),
    validate: (promo) => {
      const p = promo as unknown as PromoConfig;
      const issues: FieldProblem[] = [];
      if (p.startDate && p.endDate && p.endDate < p.startDate) issues.push({ field: 'endDate', message: 'Es anterior a «Desde».' });
      if (p.active && promoState(p) === 'ended') issues.push({ field: 'endDate', message: 'Ya pasó: el popup no se mostrará.' });
      return issues;
    },
  };
}

export const DEFAULT_PROMO: PromoConfig = {
  active: false,
  imageSrc: '',
  imageAlt: '',
  ctaLabel: 'Quiero esta promoción',
  message: '',
  delaySeconds: 6,
  repeatDays: 7,
  startDate: '',
  endDate: '',
};

/** When the popup shows, in short, for the CMS: "A los 6 s · del 1 al 14 de febrero · se repite cada 7 días". */
export function describePromoSchedule(promo: PromoConfig): string {
  const date = (iso: string) =>
    new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00`));
  const range =
    promo.startDate && promo.endDate
      ? `del ${date(promo.startDate)} al ${date(promo.endDate)}`
      : promo.startDate
        ? `desde el ${date(promo.startDate)}`
        : promo.endDate
          ? `hasta el ${date(promo.endDate)}`
          : 'sin fecha de fin';
  const delay = promo.delaySeconds > 0 ? `A los ${promo.delaySeconds} s` : 'Al entrar';
  const repeat =
    promo.repeatDays > 0
      ? `se repite cada ${promo.repeatDays === 1 ? 'día' : `${promo.repeatDays} días`}`
      : 'en cada visita';
  return [delay, range, repeat].join(' · ');
}
