import { SCOPES } from './scopes';
import { formatJson } from './json-format';
import { DEFAULT_ASSETS, MANIFEST_FILE, SiteManifest } from './schema';
import { SiteFiles } from './ports';

/**
 * Proposes a `cms.json` for a folder that does not have one: the first scope whose required
 * files exist, the site address from its sitemap and its global stylesheet.
 */
export async function suggestManifest(files: SiteFiles): Promise<SiteManifest> {
  let scope = SCOPES[0];
  for (const candidate of SCOPES) {
    const required = candidate.collections.filter((c) => !c.optional);
    const found = await Promise.all(required.map((c) => files.exists(c.file)));
    if (found.every(Boolean)) {
      scope = candidate;
      break;
    }
  }
  const sitemap = (await files.read('public/sitemap.xml')) ?? (await files.read('src/sitemap.xml'));
  const siteUrl = sitemap ? /<loc>\s*(https?:\/\/[^/<\s]+)/.exec(sitemap.text)?.[1] : undefined;
  const theme = (await files.exists('src/styles.css')) ? 'src/styles.css' : undefined;
  return {
    scope: scope.id,
    name: files.name,
    siteUrl,
    assets: DEFAULT_ASSETS,
    theme,
    options: scope.defaultOptions,
  };
}

export async function writeManifest(files: SiteFiles, manifest: SiteManifest): Promise<void> {
  await files.write(MANIFEST_FILE, formatJson(manifest));
}
