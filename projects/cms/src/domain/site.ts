import { CollectionData, contextOf, dirtyCollections, SiteContent } from './content';
import { detectJsonStyle, formatJson } from './json-format';
import { SiteFiles } from './ports';
import { MANIFEST_FILE, ScopeDef, SiteManifest } from './schema';
import { findScope } from './scopes';
import { EMPTY_THEME, extractTheme, SiteTheme } from './theme';

export interface OpenedSite {
  scope: ScopeDef;
  content: SiteContent;
  theme: SiteTheme;
}

/** A file changed on disk after the CMS read it (edited by hand or by git). */
export class ConflictError extends Error {
  constructor(readonly files: string[]) {
    super(`Estos archivos cambiaron fuera del CMS: ${files.join(', ')}`);
    this.name = 'ConflictError';
  }
}

/** Reads `cms.json`, its scope and every collection file of the site. */
export async function openSite(files: SiteFiles): Promise<OpenedSite> {
  const manifestFile = await files.read(MANIFEST_FILE);
  if (!manifestFile) throw new Error(`La carpeta no tiene ${MANIFEST_FILE}.`);
  const manifest = JSON.parse(manifestFile.text) as SiteManifest;
  const scope = findScope(manifest.scope);
  if (!scope) throw new Error(`El scope "${manifest.scope}" no existe en este CMS.`);

  const collections: CollectionData[] = [];
  for (const def of scope.collections) {
    const override = manifest.collections?.[def.id];
    if (override === false) continue;
    const path = override || def.file;
    const file = await files.read(path);
    if (!file && def.optional && !override) continue;
    collections.push(readCollection(def, path, file?.text ?? null, file?.lastModified ?? 0));
  }

  const css = manifest.theme ? await files.read(manifest.theme) : null;
  return { scope, content: { manifest, collections }, theme: css ? extractTheme(css.text) : EMPTY_THEME };
}

function readCollection(def: CollectionData['def'], path: string, text: string | null, lastModified: number): CollectionData {
  const base = { def, path, items: [], baseline: '[]', style: detectJsonStyle(text ?? ''), lastModified };
  if (text === null) return { ...base, error: `No se encontró ${path}.` };
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('el archivo no es una lista');
    return { ...base, items: data, baseline: formatJson(data, base.style) };
  } catch (error) {
    return { ...base, error: `No se pudo leer ${path}: ${(error as Error).message}.` };
  }
}

export interface SaveResult {
  content: SiteContent;
  written: string[];
}

/**
 * Writes the changed JSON files and rebuilds the scope's generated files. Refuses to overwrite
 * a file that changed on disk after it was read, unless `force` is set.
 */
export async function saveSite(files: SiteFiles, scope: ScopeDef, content: SiteContent, force = false): Promise<SaveResult> {
  const changed = dirtyCollections(content);
  if (changed.length === 0) return { content, written: [] };

  if (!force) {
    const conflicts: string[] = [];
    for (const c of changed) {
      const modified = await files.lastModified(c.path);
      if (modified !== null && modified !== c.lastModified) conflicts.push(c.path);
    }
    if (conflicts.length) throw new ConflictError(conflicts);
  }

  // Generated files are computed before writing: they compare the content with what is on disk.
  const ctx = contextOf(content);
  const generated: { path: string; text: string }[] = [];
  for (const generator of scope.generators ?? []) {
    const path = generator.file(ctx);
    const current = (await files.read(path))?.text ?? null;
    const next = generator.generate(current, ctx);
    if (next !== null && next !== current) generated.push({ path, text: next });
  }

  const written: string[] = [];
  const saved = new Map<string, CollectionData>();
  for (const c of changed) {
    const text = formatJson(c.items, c.style);
    const lastModified = await files.write(c.path, text);
    saved.set(c.def.id, { ...c, baseline: text, lastModified });
    written.push(c.path);
  }
  for (const file of generated) {
    await files.write(file.path, file.text);
    written.push(file.path);
  }
  return {
    content: { ...content, collections: content.collections.map((c) => saved.get(c.def.id) ?? c) },
    written,
  };
}
