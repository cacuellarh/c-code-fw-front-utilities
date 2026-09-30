import { PromoConfig } from '../models/promo.models';
import { isPromoRunning, localDate, promoRememberKey, promoState } from './promo.utils';

const promo = (patch: Partial<PromoConfig> = {}): PromoConfig => ({
  active: true,
  imageSrc: '/assets/cms/amor-y-amistad.webp',
  imageAlt: 'Promoción',
  ctaLabel: 'Quiero esta promoción',
  message: '',
  delaySeconds: 6,
  repeatDays: 7,
  startDate: '',
  endDate: '',
  ...patch,
});

describe('promo utils', () => {
  const day = (iso: string) => new Date(`${iso}T12:00:00`);

  it('runs when active, with an image and inside its dates (both days included)', () => {
    const p = promo({ startDate: '2026-09-01', endDate: '2026-09-30' });
    expect(promoState(p, day('2026-08-31'))).toBe('scheduled');
    expect(promoState(p, day('2026-09-01'))).toBe('running');
    expect(promoState(p, day('2026-09-30'))).toBe('running');
    expect(promoState(p, day('2026-10-01'))).toBe('ended');
    expect(isPromoRunning(promo(), day('2030-01-01'))).toBeTrue();
  });

  it('is off when switched off or missing, and incomplete without an image', () => {
    expect(promoState(promo({ active: false }))).toBe('off');
    expect(promoState(null)).toBe('off');
    expect(promoState(promo({ imageSrc: '' }))).toBe('incomplete');
  });

  it('changes the remember key when the image or the dates change', () => {
    const a = promoRememberKey(promo());
    expect(a).toMatch(/^promo-/);
    expect(promoRememberKey(promo({ delaySeconds: 1, ctaLabel: 'Otra' }))).toBe(a);
    expect(promoRememberKey(promo({ imageSrc: '/assets/cms/navidad.webp' }))).not.toBe(a);
    expect(promoRememberKey(promo({ endDate: '2026-12-31' }))).not.toBe(a);
  });

  it('formats local dates', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
