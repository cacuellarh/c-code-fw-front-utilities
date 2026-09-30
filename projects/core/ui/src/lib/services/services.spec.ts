import { DOCUMENT } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { PlanCatalogService, providePlanCatalog } from './plan-catalog.service';
import { provideSeo, SeoService } from './seo.service';

describe('PlanCatalogService', () => {
  function setup(config?: Parameters<typeof providePlanCatalog>[0]) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(config ? [providePlanCatalog(config)] : []),
      ],
    });
    return {
      service: TestBed.inject(PlanCatalogService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads and joins plans once, then serves every query from cache', async () => {
    const { service, http } = setup();
    const plansPromise = firstValueFrom(service.getPlans());

    http.expectOne('assets/data/additionals.json').flush([{ id: 7, iconPath: 'a.png', name: 'Sauna' }]);
    http.expectOne('assets/data/plans.json').flush([
      { id: 1, name: 'Plan Uno', category: 1, price: 10, additionalServicesId: [7] },
    ]);

    const plans = await plansPromise;
    expect(plans[0].additionalServices?.[0].name).toBe('Sauna');

    const bySlug = await firstValueFrom(service.getPlanBySlug('plan-uno'));
    expect(bySlug?.id).toBe(1);
    expect((await firstValueFrom(service.getPlansByCategory(1))).length).toBe(1);
    http.expectNone('assets/data/plans.json');
  });

  it('uses custom URLs and returns no price ranges when disabled', async () => {
    const { service, http } = setup({ plansUrl: 'data/p.json', priceRangesUrl: null });
    expect(await firstValueFrom(service.getPriceRanges())).toEqual([]);

    const plansPromise = firstValueFrom(service.getPlans());
    http.expectOne('assets/data/additionals.json').flush([]);
    http.expectOne('data/p.json').flush([]);
    expect(await plansPromise).toEqual([]);
  });
});

describe('SeoService', () => {
  let seo: SeoService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideSeo({ siteUrl: 'https://spa.test/', defaultImage: 'assets/og.jpeg' })],
    });
    seo = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    doc.head.querySelector('link[rel="canonical"]')?.remove();
    seo.removeJsonLd('test-ld');
  });

  it('sets title, meta tags and canonical URL', () => {
    seo.update({ title: 'Planes', description: 'Desc', path: '/planes' });

    expect(TestBed.inject(Title).getTitle()).toBe('Planes');
    const meta = TestBed.inject(Meta);
    expect(meta.getTag('name="description"')?.content).toBe('Desc');
    expect(meta.getTag('property="og:url"')?.content).toBe('https://spa.test/planes');
    expect(meta.getTag('property="og:image"')?.content).toBe('https://spa.test/assets/og.jpeg');
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://spa.test/planes');
  });

  it('keeps absolute image URLs', () => {
    seo.update({ title: 't', description: 'd', path: '/', image: 'https://cdn.test/x.jpg' });
    expect(TestBed.inject(Meta).getTag('name="twitter:image"')?.content).toBe('https://cdn.test/x.jpg');
  });

  it('adds, replaces and removes JSON-LD', () => {
    seo.setJsonLd('test-ld', { a: 1 });
    seo.setJsonLd('test-ld', { a: 2 });
    const scripts = doc.querySelectorAll('#test-ld');
    expect(scripts.length).toBe(1);
    expect(JSON.parse(scripts[0].textContent!)).toEqual({ a: 2 });
    seo.removeJsonLd('test-ld');
    expect(doc.getElementById('test-ld')).toBeNull();
  });
});
