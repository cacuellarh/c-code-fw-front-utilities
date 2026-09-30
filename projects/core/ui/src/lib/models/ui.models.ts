/** Image for `cc-gallery` and `cc-lightbox`. */
export interface GalleryImage {
  src: string;
  /** Smaller version for the grid. Defaults to `src`. */
  thumb?: string;
  /** Alternative text. Defaults to `caption`. */
  alt?: string;
  /** Text shown under the image in the lightbox. */
  caption?: string;
}

/** Link for `cc-social-links`. */
export interface SocialLink {
  href: string;
  iconSrc: string;
  /** Accessible name, for example "Instagram de Laurel Spa". */
  label: string;
}

/** Question for `cc-faq`. */
export interface FaqItem {
  question: string;
  answer: string;
}

/** Router link accepted by the components: a path string or a commands array. */
export type LinkTarget = string | any[];
