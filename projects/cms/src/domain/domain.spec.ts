import * as content from './content';
import { freeFileName, saveImage } from './images';
import { detectJsonStyle, formatJson } from './json-format';
import { suggestManifest } from './manifest';
import { diskPath } from './paths';
import { ImageField, MANIFEST_FILE, SiteManifest } from './schema';
import { SPA_SCOPE } from './scopes/spa/spa.scope';
import { ConflictError, openSite, saveSite } from './site';
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

function spaSite(): MemorySiteFiles {
  return new MemorySiteFiles('spa', {
    [MANIFEST_FILE]: JSON.stringify(manifest),
    [PLANS]: formatJson([plan(1, 'PLAN ROSA', [101, 102]), plan(2, 'PLAN LIRIO', [102])], detectJsonStyle('[\n    1\n]\n')),
    [ADDITIONALS]: JSON.stringify([
      { id: 101, iconPath: '/assets/icons/a.png', name: 'Jacuzzi' },
      { id: 102, iconPath: '/assets/icons/b.png', name: 'Masaje' },
    ]),
    [ROUTES]: '/\r\n/planes\r\n/galeria\r\n/planes/plan-rosa\r\n/planes/plan-lirio\r\n',
    [SITEMAP]: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset>',
      '  <url>',
      '    <loc>https://spa.test/</loc>',
      '    <lastmod>2026-01-01</lastmod>',
      '  </url>',
      '  <url>',
      '    <loc>https://spa.test/planes/plan-rosa</loc>',
      '    <lastmod>2026-01-01</lastmod>',
      '  </url>',
      '  <url>',
      '    <loc>https://spa.test/planes/plan-lirio</loc>',
      '    <lastmod>2026-01-01</lastmod>',
      '  </url>',
      '</urlset>',
      '',
    ].join('\n'),
    'src/styles.css': "@import url('https://fonts.googleapis.com/css2?family=Quicksand');\n:root { --cc-accent: #dda0a0; /* rosa */ --x: 1rem; }\nbody { color: red; }",
  });
}

describe('json-format', () => {
  it('keeps arrays of primitives on one line and uses the detected indent', () => {
    const style = detectJsonStyle('[\r\n    {\r\n        "a": 1\r\n    }\r\n]');
    expect(style).toEqual({ indent: '    ', eol: '\r\n', finalNewline: false });
    expect(formatJson([{ a: [1, 2], b: 'x' }], style)).toBe('[\r\n    {\r\n        "a": [1, 2],\r\n        "b": "x"\r\n    }\r\n]');
  });

  it('formats back to the same text, so an unchanged file is not dirty', () => {
    const text = formatJson([plan(1, 'PLAN ROSA')]);
    expect(formatJson(JSON.parse(text), detectJsonStyle(text))).toBe(text);
  });
});

describe('site: open and save', () => {
  it('opens the collections of the scope and hides optional files that do not exist', async () => {
    const { content: site, scope, theme } = await openSite(spaSite());
    expect(scope.id).toBe('spa');
    expect(site.collections.map((c) => c.def.id)).toEqual(['plans', 'additionals']);
    expect(content.dirtyCollections(site)).toEqual([]);
    expect(theme.style).toBe('--cc-accent: #dda0a0; --x: 1rem');
    expect(theme.fontUrls).toEqual(['https://fonts.googleapis.com/css2?family=Quicksand']);
  });

  it('writes only changed files and rebuilds routes and sitemap for a new plan', async () => {
    const files = spaSite();
    const opened = await openSite(files);
    const added = content.addItem(opened.content, 'plans');
    let site = content.updateItem(added.content, 'plans', added.index, { ...plan(0, 'PLAN JAZMÍN'), id: 3 });

    const result = await saveSite(files, opened.scope, site);
    expect(result.written).toEqual([PLANS, ROUTES, SITEMAP]);
    expect(files.text(PLANS)).toContain('    {\n        "id": 3,');
    expect(files.text(ROUTES)).toBe('/\r\n/planes\r\n/galeria\r\n/planes/plan-rosa\r\n/planes/plan-lirio\r\n/planes/plan-jazmin\r\n');
    const sitemap = files.text(SITEMAP);
    expect(sitemap).toContain('<loc>https://spa.test/planes/plan-jazmin</loc>');
    expect(sitemap.match(/2026-01-01/g)?.length).toBe(3); // untouched entries keep their date
    expect(sitemap).toMatch(/plan-jazmin<\/loc>\n    <lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    expect(content.dirtyCollections(result.content)).toEqual([]);

    site = result.content;
    expect((await saveSite(files, opened.scope, site)).written).toEqual([]);
  });

  it('refuses to overwrite a file that changed on disk after opening', async () => {
    const files = spaSite();
    const opened = await openSite(files);
    const site = content.updateItem(opened.content, 'plans', 0, { ...plan(1, 'PLAN ROSA'), price: 1 });
    await files.write(PLANS, '[]');
    await expectAsync(saveSite(files, opened.scope, site)).toBeRejectedWithError(ConflictError);
    expect((await saveSite(files, opened.scope, site, true)).written).toContain(PLANS);
  });
});

describe('content rules', () => {
  it('gives new entries the next id and removes deleted ids from the plans', async () => {
    const { content: site } = await openSite(spaSite());
    const added = content.addItem(site, 'additionals');
    expect(content.findCollection(added.content, 'additionals')!.items[added.index]['id']).toBe(103);

    expect(content.referencesTo(site, 'additionals', 1).map((r) => r.title)).toEqual(['PLAN ROSA', 'PLAN LIRIO']);
    const next = content.removeItem(site, 'additionals', 1);
    const plans = content.findCollection(next, 'plans')!.items;
    expect(plans.map((p) => p['additionalServicesId'])).toEqual([[101], []]);
  });

  it('reports required fields, missing references and the spa rules', async () => {
    const { content: site } = await openSite(spaSite());
    let broken = content.updateItem(site, 'plans', 1, { ...plan(2, 'PLAN ROSA', [999]), duration: '' });
    const messages = content.validateContent(broken).map((i) => i.message);
    expect(messages).toContain('Falta "Duración".');
    expect(messages).toContain('"Servicios incluidos" tiene ids que no existen: 999.');
    expect(messages).toContain('Otro plan ya usa la dirección /planes/plan-rosa.');
    broken = content.discardChanges(broken);
    expect(content.validateContent(broken)).toEqual([]);
  });

  it('knows the spa scope collections', () => {
    expect(SPA_SCOPE.collections.map((c) => c.id)).toEqual(['plans', 'additionals', 'priceRanges', 'services']);
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

describe('manifest', () => {
  it('suggests the scope, address and theme of a folder without cms.json', async () => {
    const files = spaSite();
    files.files.delete(MANIFEST_FILE);
    const suggested = await suggestManifest(files);
    expect(suggested).toEqual(jasmine.objectContaining({ scope: 'spa', name: 'spa', siteUrl: 'https://spa.test', theme: 'src/styles.css' }));
  });
});

describe('theme', () => {
  it('ignores comments and rules outside :root', () => {
    expect(extractTheme(':root{--a: 1px;} .x{--b: 2px}').style).toBe('--a: 1px');
  });
});
