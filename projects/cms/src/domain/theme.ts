/**
 * Colors and fonts of a site, read from its stylesheet so the previews look like the real site.
 * Only the custom properties declared in `:root` and the Google Fonts imports are used;
 * Tailwind directives and other rules are ignored.
 */
export interface SiteTheme {
  /** Custom properties, ready for a `style` attribute: "--cc-accent: #dda0a0; …". */
  style: string;
  fontUrls: string[];
}

export const EMPTY_THEME: SiteTheme = { style: '', fontUrls: [] };

export function extractTheme(css: string): SiteTheme {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations: string[] = [];
  for (const block of clean.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const match of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
      declarations.push(`${match[1]}: ${match[2].trim()}`);
    }
  }
  const fontUrls = [...clean.matchAll(/@import\s+url\(\s*['"]?(https:\/\/fonts\.googleapis\.com\/[^'")]+)['"]?\s*\)/g)].map(
    (m) => m[1]
  );
  return { style: declarations.join('; '), fontUrls };
}
