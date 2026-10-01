import * as content from './content';
import { applyImage, checkBeforePublish, deleteMedia, importSiteImages, legacyImages, MAX_VARIANT_BYTES, MediaError, mediaId, mediaIdOf, mediaPath, MediaSource, prepareMedia, uploadMedia, writeMediaFolder } from './media';
import { detectJsonStyle, formatJson } from './json-format';
import { suggestManifest } from './manifest';
import { diskPath, publicUrl } from './paths';
import { ImageField, MANIFEST_FILE, SiteManifest } from './schema';
import { SPA_SCOPE } from './scopes/spa/spa.scope';
import { addEmptyCollection, ConflictError, folderMismatch, hideCollection, importMissingCollections, missingCollections, needsPublish, offerCollection, openSite, readSiteFolder, removeCollection, renameSite, replaceFromFolder, saveSite, sectionStates, siteIdFor, writeSiteFolder } from './site';
import { countOf, emptyText, emptyTitle, newLabel, pickPrompt, pluralOf } from './labels';
import { galleryCollection } from './scopes/shared/gallery.collection';
import { DEFAULT_PROMO, describePromoSchedule, promoCollection } from './scopes/shared/promo.collection';
import { MemoryContentRepository } from './testing/memory-content-repository';
import { FakeImageEncoder, MemoryMediaStore } from './testing/memory-media';
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
    await expectAsync(saveSite(repo, 'spa', edit, 'yo')).toBeRejectedWithError(ConflictError, 'Alguien más guardó cambios en Planes mientras editabas.');
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
    const issues = content.validateContent(broken).map((i) => [i.field, i.message]);
    expect(issues).toContain(['duration', 'Falta «Duración».']);
    expect(issues).toContain(['additionalServicesId', 'Uno ya no existe: quítalos o vuelve a elegirlos.']);
    expect(issues).toContain(['name', 'Ya hay un plan con este nombre (/planes/plan-rosa).']);
    expect(content.validateContent(content.discardChanges(broken))).toEqual([]);
  });

  it('reports entries that share an id', async () => {
    const { content: site } = await openSite(await importedRepo(), 'spa');
    const services = content.findCollection(site, 'additionals')!;
    const twin = content.updateItem(site, 'additionals', 1, { ...services.items[1], id: services.items[0]['id'] });
    expect(content.validateContent(twin).filter((i) => i.code === 'duplicate-id').map((i) => i.index)).toEqual([0, 1]);
    const fixed = content.giveNewId(twin, 'additionals', 1);
    expect(content.findCollection(fixed, 'additionals')!.items[1]['id']).toBe(102);
    expect(content.validateContent(fixed).filter((i) => i.code === 'duplicate-id')).toEqual([]);
  });

  it('finds the saved version of an entry, to tell what changed', async () => {
    const { content: site } = await openSite(await importedRepo(), 'spa');
    const renamed = content.updateItem(site, 'plans', 0, { ...plan(1, 'PLAN NUEVO') });
    const moved = content.moveItem(renamed, 'plans', 0, 1);
    const plans = content.findCollection(moved, 'plans')!;
    expect(content.savedEntry(plans, 1)!['name']).toBe('PLAN ROSA');
    const added = content.addItem(moved, 'plans');
    expect(content.savedEntry(content.findCollection(added.content, 'plans')!, added.index)).toBeUndefined();
  });

  it('knows the spa scope collections', () => {
    expect(SPA_SCOPE.collections.map((c) => c.id)).toEqual(['plans', 'additionals', 'priceRanges', 'services', 'gallery', 'promo']);
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

describe('paths', () => {
  it('maps JSON paths to files on disk', () => {
    expect(diskPath(manifest, '/assets/images/8.jpeg')).toBe('src/assets/images/8.jpeg');
    expect(diskPath(manifest, 'assets/icons/a.png')).toBe('src/assets/icons/a.png');
    expect(diskPath(manifest, '/logo.png')).toBe('public/logo.png');
  });

  it('maps files of the site folder back to the public site', () => {
    expect(publicUrl(manifest, 'src/assets/images/8.jpeg')).toBe('https://spa.test/assets/images/8.jpeg');
    expect(publicUrl(manifest, 'public/logo.png')).toBe('https://spa.test/logo.png');
    expect(publicUrl(manifest, 'src/app/x.ts')).toBeNull();
    expect(publicUrl({ ...manifest, siteUrl: undefined }, 'src/assets/a.png')).toBeNull();
  });
});

describe('image library', () => {
  const photo = (name = 'Jacuzzi_con-espuma.JPG'): MediaSource => ({ name, type: 'image/jpeg', data: new Blob(['x']) });

  it('turns a photo into a WebP of at most 1600 px, a thumbnail and a JPEG for link previews', async () => {
    const encoder = new FakeImageEncoder(4000, 3000);
    const { item, files } = await prepareMedia(encoder, photo(), 'photo', [], '2026-01-01T00:00:00.000Z');
    expect(item).toEqual(jasmine.objectContaining({ id: 'jacuzzi-con-espuma', name: 'Jacuzzi con espuma', kind: 'photo', width: 1600, height: 1200 }));
    expect(item.variants).toEqual(['full', 'thumb', 'og']);
    expect(encoder.calls.map((c) => [c.format, c.maxSize])).toEqual([['webp', 1600], ['webp', 600], ['jpeg', 1200], ['webp', 160]]);
    expect(item.bytes).toBe(files.full!.byteLength);
    expect(Object.values(files).every((f) => f!.byteLength <= MAX_VARIANT_BYTES)).toBeTrue();
  });

  it('keeps icons small and without extra variants', async () => {
    const { item, files } = await prepareMedia(new FakeImageEncoder(512, 512), photo('masaje.png'), 'icon', []);
    expect([item.width, item.height, item.variants]).toEqual([256, 256, ['full']]);
    expect(Object.keys(files)).toEqual(['full']);
  });

  it('lowers the quality of heavy photos and refuses the ones that stay too heavy', async () => {
    const heavy = new FakeImageEncoder(4000, 3000, 0.6); // 1600×1200×0.6×0.82 ≈ 945 KB: too heavy at first
    await prepareMedia(heavy, photo(), 'photo', []);
    expect(heavy.calls.filter((c) => c.maxSize === 1600).length).toBeGreaterThan(1);
    await expectAsync(prepareMedia(new FakeImageEncoder(4000, 3000, 2), photo(), 'photo', [])).toBeRejectedWithError(MediaError);
  });

  it('refuses formats the browser cannot convert, such as HEIC', async () => {
    const heic = { name: 'IMG_0001.HEIC', type: 'image/heic', data: new Blob(['x']) };
    await expectAsync(prepareMedia(new FakeImageEncoder(), heic, 'photo', [])).toBeRejectedWithError(MediaError);
  });

  it('gives unique ids and maps them to the paths the site uses', () => {
    expect(mediaId('Foto Spa.jpg', ['foto-spa', 'foto-spa-2'])).toBe('foto-spa-3');
    expect(mediaPath('foto-spa')).toBe('/assets/cms/foto-spa.webp');
    expect(mediaPath('foto-spa', 'thumb')).toBe('/assets/cms/foto-spa-thumb.webp');
    expect(mediaIdOf('/assets/cms/foto-spa-thumb.webp')).toEqual({ id: 'foto-spa', variant: 'thumb' });
    expect(mediaIdOf('/assets/cms/foto-spa.jpg')).toEqual({ id: 'foto-spa', variant: 'og' });
    expect(mediaIdOf('/assets/images/8.jpeg')).toBeNull();
  });

  it('sets the image and the gallery thumbnail in an entry', async () => {
    const { item } = await prepareMedia(new FakeImageEncoder(), photo('sala.jpg'), 'photo', []);
    const field: ImageField = { key: 'src', label: 'Foto', type: 'image', kind: 'photo', thumbKey: 'thumb' };
    expect(applyImage(field, { caption: 'Sala' }, item)).toEqual({ caption: 'Sala', src: '/assets/cms/sala.webp', thumb: '/assets/cms/sala-thumb.webp' });
  });

  it('does not delete an image that a plan uses, even in unsaved changes', async () => {
    const repo = await importedRepo();
    const { content: site } = await openSite(repo, 'spa');
    const store = new MemoryMediaStore();
    const item = await uploadMedia(store, new FakeImageEncoder(), 'spa', photo('rosa.jpg'), 'photo', []);
    const edited = content.updateItem(site, 'plans', 0, { ...plan(1, 'PLAN ROSA'), imgPath: mediaPath(item.id) });
    await expectAsync(deleteMedia(store, 'spa', edited, item)).toBeRejectedWithError(MediaError, /PLAN ROSA/);
    expect(await store.list('spa')).toEqual([item]);
    await deleteMedia(store, 'spa', site, item);
    expect(await store.list('spa')).toEqual([]);
    expect(await store.read('spa', item.id, 'full')).toBeNull();
  });
});

describe('image library in the build and before publishing', () => {
  const upload = async (store: MemoryMediaStore, name: string, kind: 'photo' | 'icon') =>
    uploadMedia(store, new FakeImageEncoder(), 'spa', { name, type: 'image/jpeg', data: new Blob(['x']) }, kind, await store.list('spa'));

  it('writes every variant into src/assets/cms plus the marker the CMS probes', async () => {
    const store = new MemoryMediaStore();
    await upload(store, 'sala.jpg', 'photo');
    await upload(store, 'perfil.png', 'icon');
    const folder = new MemorySiteFiles('spa');
    expect(await writeMediaFolder(folder, store, 'spa')).toEqual({ images: 2, files: 4 });
    expect([...folder.files.keys()].sort()).toEqual([
      'src/assets/cms/c-code-content.webp',
      'src/assets/cms/perfil.webp',
      'src/assets/cms/sala-thumb.webp',
      'src/assets/cms/sala.jpg',
      'src/assets/cms/sala.webp',
    ]);
  });

  it('warns before publishing library images when the site cannot download them yet', async () => {
    const { content: site } = await openSite(await importedRepo(), 'spa');
    const probe = (answer: boolean) => ({ downloadsMedia: async () => answer });
    expect(await checkBeforePublish(site, probe(false))).toBeNull(); // no library images yet

    const withIcon = content.updateItem(site, 'additionals', 0, { id: 101, iconPath: mediaPath('perfil'), name: 'User' });
    expect(await checkBeforePublish(withIcon, probe(false))).toMatch(/User \(Servicios\).*@c-code\/content/);
    expect(await checkBeforePublish(withIcon, probe(true))).toBeNull();
  });
});

describe('gallery and popup (shared blocks)', () => {
  const GALLERY = 'src/assets/data/gallery.json';
  const PROMO = 'src/assets/data/promo.json';
  const promoFile = { ...DEFAULT_PROMO, active: true, imageSrc: '/assets/images/pop.jpeg', imageAlt: 'Promo', startDate: '2026-02-01', endDate: '2026-02-14' };

  it('offers the gallery and the popup as sections a site can add', async () => {
    const repo = await importedRepo();
    const stored = (await repo.loadSite('spa'))!;
    expect(missingCollections(SPA_SCOPE, stored).map((d) => d.id)).toEqual(['priceRanges', 'services', 'gallery', 'promo']);

    await hideCollection(repo, 'spa', SPA_SCOPE.collections.find((c) => c.id === 'priceRanges')!);
    expect(missingCollections(SPA_SCOPE, (await repo.loadSite('spa'))!).map((d) => d.id)).toEqual(['services', 'gallery', 'promo']);
    await expectAsync(hideCollection(repo, 'spa', SPA_SCOPE.collections[0])).toBeRejected();

    await addEmptyCollection(repo, 'spa', promoCollection(), 'yo');
    const { content: site } = await openSite(repo, 'spa');
    const promo = content.findCollection(site, 'promo')!;
    expect(promo.def.single).toBeTrue();
    expect(promo.items).toEqual([{ ...DEFAULT_PROMO }]);
  });

  it('imports the gallery and the popup from the site folder, the popup as one object', async () => {
    const repo = await importedRepo();
    const folder = spaFolder();
    await folder.write(GALLERY, JSON.stringify([{ src: '/assets/images/galery/1.webp', thumb: '/assets/images/galery/thumbs/1.webp', caption: 'Jacuzzi' }]));
    await folder.write(PROMO, JSON.stringify(promoFile));
    const imported = await importMissingCollections(repo, (await repo.loadSite('spa'))!, await readSiteFolder(folder), 'yo');
    expect(imported).toEqual(['Galería', 'Popup de promoción']);

    const out = spaFolder();
    await writeSiteFolder(out, (await repo.loadSite('spa'))!);
    expect(JSON.parse(out.text(PROMO))).toEqual(promoFile);
    expect(JSON.parse(out.text(GALLERY))[0].caption).toBe('Jacuzzi');
  });

  it('can import only one of the sections the folder has', async () => {
    const repo = await importedRepo();
    const folder = spaFolder();
    await folder.write(GALLERY, JSON.stringify([{ src: '/a.webp', thumb: '/a.webp', caption: 'Sauna' }]));
    await folder.write(PROMO, JSON.stringify(promoFile));
    const imported = await importMissingCollections(repo, (await repo.loadSite('spa'))!, await readSiteFolder(folder), 'yo', ['promo']);
    expect(imported).toEqual(['Popup de promoción']);
    expect((await repo.loadSite('spa'))!.collections.map((c) => c.id)).not.toContain('gallery');
  });

  it('refuses a popup file that is a list, and validates dates', async () => {
    const folder = spaFolder();
    await folder.write(PROMO, '[]');
    await expectAsync(readSiteFolder(folder)).toBeRejectedWithError(/debe ser un objeto/);

    const def = promoCollection();
    const bad = { ...promoFile, startDate: '2026-02-14', endDate: '2026-02-01' };
    expect(def.validate!(bad, [bad], {} as never)).toContain({ field: 'endDate', message: 'Es anterior a «Desde».' });
    const repo = await importedRepo();
    await addEmptyCollection(repo, 'spa', def, 'yo');
    const { content: site } = await openSite(repo, 'spa');
    const withBadDate = content.updateItem(site, 'promo', 0, { ...DEFAULT_PROMO, startDate: '14/02/2026' });
    expect(content.validateContent(withBadDate).map((i) => [i.field, i.message])).toContain(['startDate', 'No es una fecha válida.']);
  });

  it('fills the gallery thumbnail when a photo is chosen', async () => {
    const { item } = await prepareMedia(new FakeImageEncoder(), { name: 'sauna.jpg', type: 'image/jpeg', data: new Blob(['x']) }, 'photo', []);
    const field = galleryCollection().fields[0] as ImageField;
    expect(applyImage(field, { caption: 'Sauna' }, item)).toEqual({ caption: 'Sauna', src: '/assets/cms/sauna.webp', thumb: '/assets/cms/sauna-thumb.webp' });
  });
});

describe('fixing an import from the wrong folder', () => {
  const GALLERY = 'src/assets/data/gallery.json';

  it('warns when the folder belongs to another site', async () => {
    const other = spaFolder();
    await other.write(MANIFEST_FILE, JSON.stringify({ ...manifest, siteUrl: 'https://www.laurelspamedellin.com' }));
    const otherSite = await readSiteFolder(other);
    expect(folderMismatch({ ...manifest, siteUrl: 'https://ixoraspabucaramanga.com' }, otherSite)).toContain('laurelspamedellin.com');
    expect(folderMismatch({ ...manifest, siteUrl: 'https://spa.test' }, await readSiteFolder(spaFolder()))).toBeNull();
    expect(folderMismatch({ ...manifest, siteUrl: 'https://www.spa.test' }, await readSiteFolder(spaFolder()))).toBeNull();
  });

  it('replaces a collection with the folder as unsaved changes, so it can be discarded', async () => {
    const repo = await importedRepo();
    const wrong = spaFolder();
    await wrong.write(GALLERY, JSON.stringify([{ src: '/a.jpeg', thumb: '/a.jpeg', caption: 'De otro sitio' }]));
    await importMissingCollections(repo, (await repo.loadSite('spa'))!, await readSiteFolder(wrong), 'yo');

    const right = spaFolder();
    await right.write(GALLERY, JSON.stringify([{ src: '/b.webp', thumb: '/b.webp', caption: 'Uno' }, { src: '/c.webp', thumb: '/c.webp', caption: 'Dos' }]));
    const { content: site } = await openSite(repo, 'spa');
    const result = replaceFromFolder(site, 'gallery', await readSiteFolder(right));
    expect([result.before, result.after]).toEqual([1, 2]);
    expect(content.dirtyCollections(result.content).map((c) => c.def.id)).toEqual(['gallery']);
    expect(content.findCollection(content.discardChanges(result.content), 'gallery')!.items[0]['caption']).toBe('De otro sitio');
    const withoutGallery = await readSiteFolder(spaFolder());
    expect(() => replaceFromFolder(site, 'gallery', withoutGallery)).toThrowError(/no tiene el archivo/);
  });
});

describe('removing a section the site does not use', () => {
  it('deletes it, keeps it in the history and stops offering it', async () => {
    const repo = await importedRepo();
    const folder = spaFolder();
    await folder.write('src/assets/data/priceRanges.json', JSON.stringify([{ description: 'Menos de $100.000', min: 0, max: 100000 }]));
    await importMissingCollections(repo, (await repo.loadSite('spa'))!, await readSiteFolder(folder), 'yo');
    expect((await repo.loadSite('spa'))!.collections.map((c) => c.id)).toContain('priceRanges');

    const ranges = SPA_SCOPE.collections.find((c) => c.id === 'priceRanges')!;
    await removeCollection(repo, 'spa', ranges, 'yo');
    const stored = (await repo.loadSite('spa'))!;
    expect(stored.collections.map((c) => c.id)).not.toContain('priceRanges');
    expect(missingCollections(SPA_SCOPE, stored).map((d) => d.id)).not.toContain('priceRanges');
    expect(repo.history.at(-1)).toEqual({ siteId: 'spa', author: 'yo', collections: ['priceRanges'] });

    const out = spaFolder();
    expect(await writeSiteFolder(out, stored)).not.toContain('src/assets/data/priceRanges.json');
    await expectAsync(removeCollection(repo, 'spa', SPA_SCOPE.collections[0], 'yo')).toBeRejectedWithError(/no se puede quitar/);
  });

  it('lists every section with its state and can offer a hidden one again', async () => {
    const repo = await importedRepo();
    const ranges = SPA_SCOPE.collections.find((c) => c.id === 'priceRanges')!;
    await hideCollection(repo, 'spa', ranges);
    const states = () => repo.loadSite('spa').then((s) => Object.fromEntries(sectionStates(SPA_SCOPE, s!).map((x) => [x.def.id, x.state])));
    expect(await states()).toEqual(jasmine.objectContaining({ plans: 'active', additionals: 'active', priceRanges: 'hidden', gallery: 'available' }));
    await offerCollection(repo, 'spa', ranges);
    expect((await states())['priceRanges']).toBe('available');
  });
});

describe('labels', () => {
  const gallery = galleryCollection();
  const plans = SPA_SCOPE.collections[0];
  const promo = promoCollection();

  it('agree in gender and number with the section', () => {
    expect(newLabel(plans)).toBe('Nuevo plan');
    expect(newLabel(gallery)).toBe('Nueva foto');
    expect(pickPrompt(gallery)).toBe('Elige una foto para editarla.');
    expect(pickPrompt(plans)).toBe('Elige un plan para editarlo.');
    expect(emptyTitle(plans)).toBe('Aún no hay planes');
    expect(emptyText(gallery)).toBe('Crea la primera y aparecerá en tu sitio al publicar.');
    expect(pluralOf(promo)).toBe('popups');
    expect(countOf(gallery, 1)).toBe('1 foto');
    expect(countOf(gallery, 12)).toBe('12 fotos');
  });

  it('describe when the popup shows in a short line', () => {
    expect(describePromoSchedule({ ...DEFAULT_PROMO })).toBe('A los 6 s · sin fecha de fin · se repite cada 7 días');
    expect(describePromoSchedule({ ...DEFAULT_PROMO, delaySeconds: 0, repeatDays: 0, startDate: '2026-02-01', endDate: '2026-02-14' })).toBe(
      'Al entrar · del 1 de febrero al 14 de febrero · en cada visita'
    );
  });
});

describe('importing the site images into the library', () => {
  async function siteWithGallery() {
    const repo = await importedRepo();
    const folder = spaFolder();
    await folder.write('src/assets/data/gallery.json', JSON.stringify([{ src: '/assets/images/galery/1.webp', thumb: '/assets/images/galery/thumbs/1.webp', caption: 'Sala de masajes' }]));
    await importMissingCollections(repo, (await repo.loadSite('spa'))!, await readSiteFolder(folder), 'yo');
    // The image files the content points to (plans 1 and 2, two icons, one gallery photo).
    for (const path of ['images/1.jpeg', 'images/2.jpeg', 'icons/a.png', 'icons/b.png', 'images/galery/1.webp']) {
      await folder.write(`src/assets/${path}`, new Blob(['img']));
    }
    return { repo, folder, site: (await openSite(repo, 'spa')).content };
  }

  it('finds the images the content uses outside the library, photos and icons', async () => {
    const { site } = await siteWithGallery();
    expect(legacyImages(site).map((i) => [i.path, i.kind])).toEqual([
      ['/assets/images/1.jpeg', 'photo'],
      ['/assets/images/2.jpeg', 'photo'],
      ['/assets/icons/a.png', 'icon'],
      ['/assets/icons/b.png', 'icon'],
      ['/assets/images/galery/1.webp', 'photo'],
    ]);
  });

  it('uploads them, names them and points the entries to the library as unsaved changes', async () => {
    const { folder, site } = await siteWithGallery();
    const store = new MemoryMediaStore();
    const { content: next, added, report } = await importSiteImages(folder, store, new FakeImageEncoder(), 'spa', site, []);
    expect(report).toEqual({ imported: 5, reused: 0, failed: [], updatedEntries: 5 });
    expect(added.map((m) => [m.name, m.kind])).toEqual([
      ['PLAN ROSA', 'photo'],
      ['PLAN LIRIO', 'photo'],
      ['A', 'icon'],
      ['B', 'icon'],
      ['Sala de masajes', 'photo'],
    ]);
    expect(added[0].source).toBe('/assets/images/1.jpeg');
    const plans = content.findCollection(next, 'plans')!.items;
    expect(plans[0]['imgPath']).toBe(mediaPath(added[0].id));
    const photo = content.findCollection(next, 'gallery')!.items[0];
    expect([photo['src'], photo['thumb']]).toEqual([mediaPath(added[4].id), mediaPath(added[4].id, 'thumb')]);
    expect(content.dirtyCollections(next).map((c) => c.def.id).sort()).toEqual(['additionals', 'gallery', 'plans']);
    expect(legacyImages(next)).toEqual([]);
  });

  it('does not upload duplicates when run again, and reports missing files', async () => {
    const { folder, site } = await siteWithGallery();
    const store = new MemoryMediaStore();
    const first = await importSiteImages(folder, store, new FakeImageEncoder(), 'spa', site, []);
    const again = await importSiteImages(folder, store, new FakeImageEncoder(), 'spa', site, await store.list('spa'));
    expect([again.report.imported, again.report.reused, again.added.length]).toEqual([0, 5, 0]);
    expect((await store.list('spa')).length).toBe(first.added.length);

    folder.files.delete('src/assets/icons/b.png');
    const fresh = new MemoryMediaStore();
    const partial = await importSiteImages(folder, fresh, new FakeImageEncoder(), 'spa', site, []);
    expect(partial.report.failed).toEqual([{ path: '/assets/icons/b.png', reason: 'no está en la carpeta del sitio' }]);
    expect(legacyImages(partial.content).map((i) => i.path)).toEqual(['/assets/icons/b.png']);
  });
});

describe('theme', () => {
  it('ignores comments and rules outside :root', () => {
    expect(extractTheme(':root{--a: 1px;} .x{--b: 2px}').style).toBe('--a: 1px');
  });
});
