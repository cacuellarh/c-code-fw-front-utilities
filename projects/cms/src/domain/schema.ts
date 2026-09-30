/**
 * A scope is a kind of site (spa, restaurant…). It declares which JSON files the site has,
 * what fields each entry has and which files are derived from the content (routes, sitemap).
 * The CMS renders every editor from this description, so a new kind of site only needs a
 * new scope definition in `scopes/`.
 */
export interface ScopeDef {
  id: string;
  label: string;
  description: string;
  collections: CollectionDef[];
  /** Files rebuilt from the content every time the site is saved. */
  generators?: GeneratorDef[];
  /** Values written into a new `cms.json` for this scope. */
  defaultOptions?: Record<string, unknown>;
}

/** A JSON file that holds an array of entries. */
export interface CollectionDef {
  id: string;
  /** Plural, for the menu: "Planes". */
  label: string;
  /** Singular, for buttons: "plan". */
  singular: string;
  description?: string;
  /** Path of the JSON file from the site root. `cms.json` can override it. */
  file: string;
  /** When the file does not exist in a site, the collection is hidden instead of failing. */
  optional?: boolean;
  /** Numeric id field. New entries get the highest id + 1. */
  idKey?: string;
  /** Field shown as the entry's name in the list. */
  titleKey: string;
  /** Second line in the list. */
  subtitle?: (item: Entry, ctx: ScopeContext) => string;
  /** Image field shown as the list thumbnail. */
  imageKey?: string;
  fields: FieldDef[];
  /** Values of a new entry. */
  create: (ctx: ScopeContext) => Entry;
  /** Problems of one entry. `all` is the whole collection, for uniqueness checks. */
  validate?: (item: Entry, all: Entry[], ctx: ScopeContext) => string[];
  /** Key of a live preview next to the form ("spa.plan"). The shell draws it; the domain only names it. */
  preview?: string;
}

export type Entry = Record<string, unknown>;

interface BaseField {
  key: string;
  label: string;
  help?: string;
  required?: boolean;
  /** `half` puts two fields in one row on wide screens. */
  width?: 'full' | 'half';
}

export interface TextField extends BaseField {
  type: 'text';
  placeholder?: string;
  maxLength?: number;
  /** Stores the value in capitals, as the existing files do with plan names. */
  uppercase?: boolean;
}

export interface TextareaField extends BaseField {
  type: 'textarea';
  rows?: number;
  maxLength?: number;
}

export interface NumberField extends BaseField {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  /** Shows the value formatted as a price next to the input. */
  format?: 'price';
}

export interface SelectField extends BaseField {
  type: 'select';
  options: { value: string | number; label: string }[];
}

/** Ids of entries of another collection, for example the services a plan includes. */
export interface RelationField extends BaseField {
  type: 'relation';
  collection: string;
}

/**
 * Image of an entry, chosen from the site's image library. The JSON stores the path the site
 * uses: `/assets/cms/<id>.webp` for library images, or an older path such as
 * `/assets/images/8.jpeg` until it is imported into the library.
 */
export interface ImageField extends BaseField {
  type: 'image';
  /** `photo`: up to 1600 px, with thumbnail and link-preview copy. `icon`: up to 256 px. */
  kind?: 'photo' | 'icon';
  /** Field that receives the thumbnail's path too (for galleries). */
  thumbKey?: string;
}

export type FieldDef = TextField | TextareaField | NumberField | SelectField | RelationField | ImageField;

/** A file rebuilt from the content, such as the prerender routes or the sitemap. */
export interface GeneratorDef {
  file: (ctx: ScopeContext) => string;
  label: string;
  /**
   * Returns the new content from the current one, or null to leave the file alone
   * (for example when the site does not have it).
   */
  generate: (current: string | null, ctx: ScopeContext) => string | null;
}

/** What scope callbacks can read: the site manifest and the current content. */
export interface ScopeContext {
  manifest: SiteManifest;
  data: (collectionId: string) => Entry[];
  /** When the collection was last saved (ISO date), if known. */
  updatedAt?: (collectionId: string) => string | undefined;
}

/** `cms.json` at the root of each site. It tells the CMS how the site is organized. */
export interface SiteManifest {
  /** Id of the scope: "spa". */
  scope: string;
  /** Name shown in the CMS. */
  name: string;
  /** Public address, used by the sitemap: "https://ixoraspabucaramanga.com". */
  siteUrl?: string;
  /** How image paths in the JSON map to folders: `/assets/x.jpg` is `src/assets/x.jpg`. */
  assets?: { url: string; dir: string };
  /** CSS file with the site's colors and fonts, for the previews. */
  theme?: string;
  /** Per collection: another file path, or false to hide it. */
  collections?: Record<string, string | false>;
  /** Settings that only the scope reads. */
  options?: Record<string, unknown>;
}

export const MANIFEST_FILE = 'cms.json';

export const DEFAULT_ASSETS = { url: '/assets/', dir: 'src/assets/' };
