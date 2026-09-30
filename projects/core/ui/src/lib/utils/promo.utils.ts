import { PromoConfig, PromoState } from '../models/promo.models';
import { slugify } from './text.utils';

/** Today's date as YYYY-MM-DD in the local time zone. */
export function localDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Where the promotion is on a given day:
 * - `off`: switched off.
 * - `incomplete`: on, but without an image.
 * - `scheduled`: before `startDate`.
 * - `ended`: after `endDate`.
 * - `running`: shows.
 */
export function promoState(promo: PromoConfig | null | undefined, now: Date = new Date()): PromoState {
  if (!promo || !promo.active) return 'off';
  if (!promo.imageSrc) return 'incomplete';
  const today = localDate(now);
  if (promo.startDate && today < promo.startDate) return 'scheduled';
  if (promo.endDate && today > promo.endDate) return 'ended';
  return 'running';
}

export function isPromoRunning(promo: PromoConfig | null | undefined, now: Date = new Date()): boolean {
  return promoState(promo, now) === 'running';
}

/**
 * localStorage key that remembers who closed the popup. It changes when the image or the
 * dates change, so a new promotion shows again to people who closed the previous one.
 */
export function promoRememberKey(promo: PromoConfig): string {
  return 'promo-' + slugify(`${promo.imageSrc} ${promo.startDate} ${promo.endDate}`).slice(0, 80);
}
