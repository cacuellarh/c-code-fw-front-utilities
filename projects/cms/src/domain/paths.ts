import { DEFAULT_ASSETS, SiteManifest } from './schema';

/** Joins path parts with "/": joinPath('src/assets/', '/images/a.jpg') -> 'src/assets/images/a.jpg'. */
export function joinPath(...parts: string[]): string {
  return parts
    .map((p, i) => (i === 0 ? p.replace(/\/+$/, '') : p.replace(/^\/+|\/+$/g, '')))
    .filter(Boolean)
    .join('/');
}

/** Path parts, refusing paths that leave the site folder. */
export function splitPath(path: string): string[] {
  const parts = path.split(/[\\/]+/).filter((p) => p && p !== '.');
  if (parts.includes('..')) throw new Error(`La ruta no puede salir de la carpeta del sitio: "${path}"`);
  return parts;
}

export function assetsOf(manifest: SiteManifest | null | undefined) {
  return manifest?.assets ?? DEFAULT_ASSETS;
}

/**
 * Where an image path of the JSON is on disk: "/assets/images/8.jpeg" or "assets/images/8.jpeg"
 * -> "src/assets/images/8.jpeg". Other paths are looked up in "public/".
 */
export function diskPath(manifest: SiteManifest, sitePath: string): string {
  const { url, dir } = assetsOf(manifest);
  const clean = '/' + sitePath.replace(/^\/+/, '').split(/[?#]/)[0];
  const prefix = '/' + url.replace(/^\/+/, '');
  return clean.startsWith(prefix) ? joinPath(dir, clean.slice(prefix.length)) : joinPath('public', clean);
}

/**
 * Address on the public site of a file of the site folder, the inverse of `diskPath`:
 * "src/assets/images/8.jpeg" -> "https://site.com/assets/images/8.jpeg"; "public/x.png" -> "/x.png".
 */
export function publicUrl(manifest: SiteManifest, path: string): string | null {
  if (!manifest.siteUrl) return null;
  const { url, dir } = assetsOf(manifest);
  const clean = splitPath(path).join('/');
  const assetsDir = splitPath(dir).join('/') + '/';
  const sitePath = clean.startsWith(assetsDir)
    ? joinPath('/' + url, clean.slice(assetsDir.length))
    : clean.startsWith('public/')
      ? '/' + clean.slice('public/'.length)
      : null;
  if (!sitePath) return null;
  try {
    return new URL(sitePath.replace(/^\/*/, '/'), manifest.siteUrl).href;
  } catch {
    return null;
  }
}
