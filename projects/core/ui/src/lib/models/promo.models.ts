/**
 * The site's promotional popup, as the CMS stores it (`promo.json`). The site passes it to
 * `cc-promo-modal`; `promoState()` and `promoRememberKey()` decide when it shows.
 */
export interface PromoConfig {
  /** Off hides the popup whatever the dates say. */
  active: boolean;
  imageSrc: string;
  /** Describes the image for screen readers and search engines. */
  imageAlt: string;
  /** Call to action. Empty hides the button. */
  ctaLabel: string;
  /** WhatsApp message the button opens. Empty makes the button open the general chat. */
  message: string;
  /** Seconds after the page loads before the popup opens. */
  delaySeconds: number;
  /** Days before it shows again to someone who closed it. 0 shows it on every visit. */
  repeatDays: number;
  /** First day it shows (YYYY-MM-DD, site's local time). Empty: from now on. */
  startDate: string;
  /** Last day it shows, included (YYYY-MM-DD). Empty: no end. */
  endDate: string;
}

/** Where a promotion is in its life, for the CMS and for the site. */
export type PromoState = 'off' | 'scheduled' | 'running' | 'ended' | 'incomplete';
