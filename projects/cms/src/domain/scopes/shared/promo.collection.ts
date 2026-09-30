import { PromoConfig, promoState, PromoState } from '@cc/ui-domain';
import { CollectionDef, Entry } from '../../schema';

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
    description: 'La imagen que aparece sola al entrar al sitio, y cuándo aparece.',
    file: options.file ?? 'src/assets/data/promo.json',
    optional: true,
    single: true,
    titleKey: 'imageAlt',
    imageKey: 'imageSrc',
    subtitle: (promo) => PROMO_STATE_LABELS[promoState(promo as unknown as PromoConfig)],
    preview: 'shared.promo',
    fields: [
      { key: 'active', label: 'Estado', type: 'boolean', onLabel: 'Mostrar el popup en el sitio' },
      { key: 'imageSrc', label: 'Imagen', type: 'image', kind: 'photo', required: true },
      {
        key: 'imageAlt',
        label: 'Descripción de la imagen',
        type: 'textarea',
        rows: 2,
        required: true,
        maxLength: 250,
        help: 'Lo que dice la imagen, para quien no puede verla y para buscadores: «Promoción Amor y Amistad: Plan Chocolate por $149.900».',
      },
      { key: 'ctaLabel', label: 'Texto del botón', type: 'text', placeholder: 'Quiero esta promoción', width: 'half', help: 'Vacío oculta el botón.' },
      {
        key: 'message',
        label: 'Mensaje de WhatsApp',
        type: 'text',
        width: 'half',
        placeholder: 'Hola, quiero la promoción de Amor y Amistad',
        help: 'Lo que ya aparece escrito al abrir el chat.',
      },
      { key: 'delaySeconds', label: 'Aparece después de', type: 'number', min: 0, max: 120, step: 1, unit: 'segundos', width: 'half' },
      {
        key: 'repeatDays',
        label: 'Vuelve a aparecer',
        type: 'number',
        min: 0,
        max: 365,
        step: 1,
        unit: 'días después de cerrarlo',
        width: 'half',
        help: '0 = en cada visita.',
      },
      { key: 'startDate', label: 'Desde', type: 'date', width: 'half', help: 'Vacío: desde ya.' },
      { key: 'endDate', label: 'Hasta (incluido)', type: 'date', width: 'half', help: 'Vacío: sin fecha de fin.' },
    ],
    create: (): Entry => ({ ...DEFAULT_PROMO }),
    validate: (promo) => {
      const p = promo as unknown as PromoConfig;
      const issues: string[] = [];
      if (p.startDate && p.endDate && p.endDate < p.startDate) issues.push('«Hasta» es anterior a «Desde».');
      if (p.active && promoState(p) === 'ended') issues.push('Está encendido pero la fecha de fin ya pasó: no se mostrará.');
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

/** When the popup shows, in words, for the CMS: "Aparece a los 6 s de entrar, del 1 al 14 de febrero…". */
export function describePromoSchedule(promo: PromoConfig): string {
  const date = (iso: string) =>
    new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));
  const range =
    promo.startDate && promo.endDate
      ? `del ${date(promo.startDate)} al ${date(promo.endDate)}`
      : promo.startDate
        ? `desde el ${date(promo.startDate)}`
        : promo.endDate
          ? `hasta el ${date(promo.endDate)}`
          : 'sin fecha de fin';
  const delay = promo.delaySeconds > 0 ? `a los ${promo.delaySeconds} s de entrar` : 'apenas se entra';
  const repeat =
    promo.repeatDays > 0
      ? `y, si la persona lo cierra, vuelve a aparecer después de ${promo.repeatDays} ${promo.repeatDays === 1 ? 'día' : 'días'}`
      : 'en cada visita';
  return `Aparece ${delay}, ${range}, ${repeat}.`;
}
