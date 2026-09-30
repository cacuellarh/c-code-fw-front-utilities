import * as content from './content';
import { freeFileName, saveImage } from './images';
import { detectJsonStyle, formatJson } from './json-format';
import { suggestManifest } from './manifest';
import { diskPath } from './paths';
import { ImageField, MANIFEST_FILE, SiteManifest } from './schema';
import { SPA_SCOPE } from './scopes/spa/spa.scope';
import { ConflictError, needsPublish, openSite, readSiteFolder, renameSite, saveSite, siteIdFor, writeSiteFolder } from './site';
import { MemoryContentRepository } from './testing/memory-content-repository';
import { MemorySiteFiles } from './testing/memory-site-files';
import { extractTheme } from './theme';

const PLANS = 'src/assets/data/plans.json';
const ADDITIONALS = 'src/assets/data/additionals.json';
const SITEMAP = 'public/sitemap.xml';
const ROUTES = 'prerender-routes.txt';

const manifest: SiteManifest = {
  scope: 'spa',
  name: 'Spa de prueba',
  siteUrl: 'https://spa.test',
  theme: 'src/styles.css',
  options: { planRoute: '/planes/' },
};

const plan = (id: number, name: string, services: number[] = [101]) => ({
  id,
  description: 'Descripción',
  duration: '1 hora',
  price: 100000,
  name,
  cuantity: 2,
  imgPath: `/assets/images/${id}.jpeg`,
  category: 1,
  additionalServicesId: services,
});

function spaFolder(): MemorySiteFiles {
  return new MemorySiteFiles('spa', {
    [MANIFEST_FILE]: JSON.stringify(manifest),
    [PLANS]: formatJson([plan(1, 'PLAN ROSA', [101, 102]), plan(2, 'PLAN LIRIO', [102])], detectJsonStyle('[\n    1\n]\n')),
    [ADDITIONALS]: formatJson([
      { id: 101, iconPath: '/assets/icons/a.png', name: 'Jacuzzi' },
      { id: 102, iconPath: '/assets/icons/b.png', name: 'Masaje' },
    ], detectJsonStyle('[\n    1\n]\n')),
    [ROUTES]: '/\r\n/planes\r\n/galeria\r\n/planes/plan-rosa\r\n/planes/plan-lirio\r\n',
    [SITEMAP]: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset>',
      '  <url>',
      '    <loc>https://spa.test/</loc>',
      '    <lastmod>2025-06-01</lastmod>',
      '  </url>',
      '  <url>',
      '    <loc>https://spa.test/planes/plan-rosa</loc>',
      '    <lastmod>2025-06-01</lastmod>',
      '  </url>',
      '  <url>',
      '    <loc>https://spa.test/planes/plan-lirio</loc>',
      '    <lastmod>2025-06-01</lastmod>',
      '  </url>',
      '</urlset>',
      '',
    ].join('\n'),
    'src/styles.css': "@import url('https://fonts.googleapis.com/css2?family=Quicksand');\n:root { --cc-accent: #dda0a0; /* rosa */ --x: 1rem; }\nbody { color: red; }",
  });
}

/** A repository with the test site imported from its folder, as the CMS import does. */
async function importedRepo(): Promise<MemoryContentRepository> {
  const repo = new MemoryContentRepository();
  await repo.createSite({ id: 'spa', ...(await readSiteFolder(spaFolder())) }, 'yo@test');
  return repo;
}

describe('json-format', () => {
  it('keeps arrays of primitives on one line and uses the detected indent', () => {
    const style = detectJsonStyle('[\r\n    {\r\n        "a": 1\r\n    }\r\n]');
    expect(style).toEqual({ indent: '    ', eol: '\r\n', finalNewline: false });
    expect(formatJson([{ a: [1, 2], b: 'x' }], style)).toBe('[\r\n    {\r\n        "a": [1, 2],\r\n        "b": "x"\r\n    }\r\n]');
  });

  it('formats back to the same text', () => {
    const text = formatJson([plan(1, 'PLAN ROSA')]);
    expect(formatJson(JSON.parse(text), detectJsonStyle(text))).toBe(text);
  });
});

describe('import from a folder', () => {
  it('reads the manifest, the collections that exist and the theme', async () => {
    const site = await readSiteFolder(spaFolder());
    expect(site.manifest.name).toBe('Spa de prueba');
    expect(site.collections.map((c) => c.id)).toEqual(['plans', 'additionals']);
    expect(site.theme?.style).toBe('--cc-accent: #dda0a0; --x: 1rem');
    expect(site.theme?.fontUrls).toEqual(['https://fonts.googleapis.com/css2?family=Quicksand']);
  });

  it('suggests a manifest when the folder has no cms.json', async () => {
    const folder = spaFolder();
    folder.files.delete(MANIFEST_FILE);
    expect(await suggestManifest(folder)).toEqual(
      jasmine.objectContaining({ scope: 'spa', name: 'spa', siteUrl: 'https://spa.test', theme: 'src/styles.css' })
    );
    expect((await readSiteFolder(folder)).manifest.scope).toBe('spa');
  });
});

describe('open and save in the repository', () => {
  it('opens the site with its versions and saves only the changed collections', async () => {
    const repo = await importedRepo();
    const opened = await openSite(repo, 'spa');
    expect(opened.content.collections.map((c) => [c.def.id, c.version])).toEqual([['plans', 1], ['additionals', 1]]);
    expect(content.dirtyCollections(opened.content)).toEqual([]);

    const edited = content.updateItem(opened.content, 'plans', 0, { ...plan(1, 'PLAN ROSA'), price: 1 });
    const result = await saveSite(repo, 'spa', edited, 'yo@test');
    expect(result.saved).toEqual(['Planes']);
    expect(content.dirtyCollections(result.content)).toEqual([]);
    expect(content.findCollection(result.content, 'plans')!.version).toBe(2);
    expect(repo.history).toEqual([{ siteId: 'spa', author: 'yo@test', collections: ['plans'] }]);
    expect(needsPublish((await repo.listSites())[0])).toBeTrue();
  });

  it('refuses to save over changes someone else saved after opening', async () => {
    const repo = await importedRepo();
    const mine = await openSite(repo, 'spa');
    const theirs = await openSite(repo, 'spa');
    await saveSite(repo, 'spa', content.updateItem(theirs.content, 'plans', 0, { ...plan(1, 'PLAN A') }), 'otro');
    const edit = content.updateItem(mine.content, 'plans', 0, { ...plan(1, 'PLAN B') });
    await expectAsync(saveSite(repo, 'spa', edit, 'yo')).toBeRejectedWithError(ConflictError);
  });
});

describe('write the site folder (build)', () => {
  it('writes the JSON with the file format and rebuilds routes and sitemap', async () => {
    const repo = await importedRepo();
    const opened = await openSite(repo, 'spa');
    const added = content.addItem(opened.content, 'plans');
    const edited = content.updateItem(added.content, 'plans', added.index, { ...plan(3, 'PLAN JAZMÍN') });
    await saveSite(repo, 'spa', edited, 'yo');

    const folder = spaFolder();
    const written = await writeSiteFolder(folder, (await repo.loadSite('spa'))!);
    expect(written).toEqual([PLANS, ROUTES, SITEMAP]);
    expect(folder.text(PLANS)).toContain('    {\n        "id": 3,');
    expect(folder.text(ROUTES)).toBe('/\r\n/planes\r\n/galeria\r\n/planes/plan-rosa\r\n/planes/plan-lirio\r\n/planes/plan-jazmin\r\n');
    const sitemap = folder.text(SITEMAP);
    expect(sitemap).toContain('<loc>https://spa.test/planes/plan-jazmin</loc>\n    <lastmod>2026-01-01</lastmod>');
    expect(sitemap).toContain('<loc>https://spa.test/</loc>\n    <lastmod>2025-06-01</lastmod>');
    expect(await writeSiteFolder(folder, (await repo.loadSite('spa'))!)).toEqual([]);
  });

  it('writes the same content it imported, so the first build changes no data', async () => {
    const folder = spaFolder();
    const repo = new MemoryContentRepository();
    await repo.createSite({ id: 'spa', ...(await readSiteFolder(folder)) }, 'yo@test');
    const written = await writeSiteFolder(folder, (await repo.loadSite('spa'))!);
    expect(written).not.toContain(PLANS);
    expect(written).not.toContain(ADDITIONALS);
  });
});

describe('field order', () => {
  it('writes the same file whatever order the repository returns the fields in', async () => {
    const repo = await importedRepo();
    const site = (await repo.loadSite('spa'))!;
    const shuffled = structuredClone(site);
    for (const c of shuffled.collections) c.items = c.items.map((item) => Object.fromEntries(Object.entries(item).reverse()));
    const a = spaFolder();
    const b = spaFolder();
    await writeSiteFolder(a, site);
    await writeSiteFolder(b, shuffled);
    expect(b.text(PLANS)).toBe(a.text(PLANS));
    expect(b.text(PLANS)).toBe(spaFolder().text(PLANS));
  });
});

describe('content rules', () => {
  it('gives new entries the next id and removes deleted ids from the plans', async () => {
    const { content: site } = await openSite(await importedRepo(), 'spa');
    const added = content.addItem(site, 'additionals');
    expect(content.findCollection(added.content, 'additionals')!.items[added.index]['id']).toBe(103);

    expect(content.referencesTo(site, 'additionals', 1).map((r) => r.title)).toEqual(['PLAN ROSA', 'PLAN LIRIO']);
    const next = content.removeItem(site, 'additionals', 1);
    expect(content.findCollection(next, 'plans')!.items.map((p) => p['additionalServicesId'])).toEqual([[101], []]);
  });

  it('reports required fields, missing references and the spa rules', async () => {
    const { content: site } = await openSite(await importedRepo(), 'spa');
    const broken = content.updateItem(site, 'plans', 1, { ...plan(2, 'PLAN ROSA', [999]), duration: '' });
    const messages = content.validateContent(broken).map((i) => i.message);
    expect(messages).toContain('Falta "Duración".');
    expect(messages).toContain('"Servicios incluidos" tiene ids que no existen: 999.');
    expect(messages).toContain('Otro plan ya usa la dirección /planes/plan-rosa.');
    expect(content.validateContent(content.discardChanges(broken))).toEqual([]);
  });

  it('knows the spa scope collections', () => {
    expect(SPA_SCOPE.collections.map((c) => c.id)).toEqual(['plans', 'additionals', 'priceRanges', 'services']);
  });
});

describe('site helpers', () => {
  it('makes free site ids and knows when a site needs publishing', () => {
    expect(siteIdFor('Ixora Spa Bucaramanga')).toBe('ixora-spa-bucaramanga');
    expect(siteIdFor('Laurel Spa', ['laurel-spa'])).toBe('laurel-spa-2');
    expect(needsPublish({ updatedAt: '2026-01-02', publishedAt: '2026-01-01' })).toBeTrue();
    expect(needsPublish({ updatedAt: '2026-01-01', publishedAt: '2026-01-02' })).toBeFalse();
  });
});

describe('rename', () => {
  it('cleans the name, keeps the id and refuses an empty name', async () => {
    const repo = await importedRepo();
    expect(await renameSite(repo, 'spa', '  Laurel   Spa Medellín ')).toBe('Laurel Spa Medellín');
    const site = (await repo.loadSite('spa'))!;
    expect([site.id, site.name, site.manifest.name]).toEqual(['spa', 'Laurel Spa Medellín', 'Laurel Spa Medellín']);
    await expectAsync(renameSite(repo, 'spa', '   ')).toBeRejectedWithError('El nombre no puede quedar vacío.');
  });
});

describe('images and paths', () => {
  const field: ImageField = { key: 'imgPath', label: 'Foto', type: 'image', uploadDir: 'images/planes' };

  it('maps JSON paths to files on disk', () => {
    expect(diskPath(manifest, '/assets/images/8.jpeg')).toBe('src/assets/images/8.jpeg');
    expect(diskPath(manifest, 'assets/icons/a.png')).toBe('src/assets/icons/a.png');
    expect(diskPath(manifest, '/logo.png')).toBe('public/logo.png');
  });

  it('saves photos as WebP with a free name and returns the site path', async () => {
    const files = new MemorySiteFiles('spa', { 'src/assets/images/planes/foto-spa.webp': 'x' });
    const encoder = { toWebp: async () => new Blob(['webp']) };
    const path = await saveImage(files, encoder, manifest, field, { name: 'Foto Spa.JPG', type: 'image/jpeg', data: new Blob(['jpg']) });
    expect(path).toBe('/assets/images/planes/foto-spa-2.webp');
    expect(await files.exists('src/assets/images/planes/foto-spa-2.webp')).toBeTrue();
    expect(freeFileName('Ícono.PNG', 'png', [])).toBe('icono.png');
  });
});

describe('theme', () => {
  it('ignores comments and rules outside :root', () => {
    expect(extractTheme(':root{--a: 1px;} .x{--b: 2px}').style).toBe('--a: 1px');
  });
});
