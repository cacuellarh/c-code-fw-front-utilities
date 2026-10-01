import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Plan, PlanCategory, PlanFilter } from '../models/plan.models';
import { GalleryImage } from '../models/ui.models';
import { ButtonComponent } from './button/button.component';
import { FaqItemComponent } from './faq-item/faq-item.component';
import { FaqComponent } from './faq/faq.component';
import { GalleryComponent, numberedImages } from './gallery/gallery.component';
import { LightboxComponent } from './lightbox/lightbox.component';
import { LoaderComponent } from './loader/loader.component';
import { NoticeComponent } from './notice/notice.component';
import { PlanCardComponent } from './plan-card/plan-card.component';
import { defaultPlanMeta, PlanCardTemplateDirective, PlanCatalogComponent } from './plan-catalog/plan-catalog.component';
import { PlanDetailsComponent } from './plan-details/plan-details.component';
import { PlanFilterFormComponent } from './plan-filter-form/plan-filter-form.component';
import { PromoModalComponent } from './promo-modal/promo-modal.component';
import { SectionHeadingComponent } from './section-heading/section-heading.component';
import { WhatsappButtonComponent } from './whatsapp-button/whatsapp-button.component';

const jacuzzi = { id: 101, iconPath: 'j.png', name: 'Jacuzzi' };

const PLANS: Plan[] = [
  { id: 1, name: 'Plan Solo', description: 'Uno', duration: '1 Hora', price: 90000, cuantity: 1, imgPath: 's.jpg', category: PlanCategory.Individual, additionalServicesId: [101], additionalServices: [jacuzzi] },
  { id: 2, name: 'Plan Gardenia', description: 'Dos', duration: '2 horas', price: 259900, cuantity: 2, imgPath: 'g.jpg', category: PlanCategory.Couple, additionalServicesId: [], additionalServices: [] },
  { id: 3, name: 'Plan Rosa', description: 'Tres', duration: '2 horas', price: 150000, cuantity: 2, imgPath: 'r.jpg', category: PlanCategory.Couple, additionalServicesId: [101], additionalServices: [jacuzzi] },
];

/** Text content with collapsed whitespace (Intl uses a non-breaking space in prices). */
function text(fixture: ComponentFixture<unknown>, selector: string): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>).map((el) =>
    el.textContent!.replace(/\s+/g, ' ').trim()
  );
}

function click(fixture: ComponentFixture<unknown>, selector: string): void {
  (fixture.nativeElement.querySelector(selector) as HTMLElement).click();
  fixture.detectChanges();
}

describe('ButtonComponent', () => {
  @Component({
    imports: [ButtonComponent],
    template: `<a ccButton href="/x">A</a><button ccButton variant="secondary" size="sm" block type="button">B</button>`,
  })
  class Host {}

  it('applies variant, size and block classes to the host element', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const [a, b] = fixture.nativeElement.querySelectorAll('.cc-btn');
    expect(a.tagName).toBe('A');
    expect(b.classList).toContain('cc-btn--secondary');
    expect(b.classList).toContain('cc-btn--sm');
    expect(b.classList).toContain('cc-btn--block');
  });
});

describe('PlanCardComponent', () => {
  it('shows price, meta and a link covering the card', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PlanCardComponent);
    fixture.componentRef.setInput('name', 'Plan Rosa');
    fixture.componentRef.setInput('imageSrc', 'r.jpg');
    fixture.componentRef.setInput('price', 150000);
    fixture.componentRef.setInput('meta', '2 horas · 2 personas');
    fixture.componentRef.setInput('link', ['/planes', 'plan-rosa']);
    fixture.detectChanges();
    expect(text(fixture, '.cc-card__price')).toEqual(['$ 150.000']);
    expect(text(fixture, '.cc-card__meta')).toEqual(['2 horas · 2 personas']);
    expect(fixture.nativeElement.querySelector('.cc-card__cta').getAttribute('href')).toBe('/planes/plan-rosa');
  });

  it('renders a skeleton', () => {
    const fixture = TestBed.createComponent(PlanCardComponent);
    fixture.componentRef.setInput('skeleton', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cc-card__shimmer')).not.toBeNull();
    expect(fixture.nativeElement.getAttribute('aria-busy')).toBe('true');
  });
});

describe('PlanCatalogComponent', () => {
  let fixture: ComponentFixture<PlanCatalogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(PlanCatalogComponent);
    fixture.componentRef.setInput('plans', PLANS);
    fixture.componentRef.setInput('services', [jacuzzi]);
    fixture.detectChanges();
  });

  it('starts on the initial category with counts, prices and slug links', () => {
    expect(text(fixture, 'h1')).toEqual(['Reserva tu plan - Individual']);
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Solo']);
    expect(text(fixture, '.cc-cat__count')).toEqual(['(1 planes)', '(2 planes)', '(0 planes)']);
    expect(text(fixture, '.cc-card__price')).toEqual(['$ 90.000']);
    expect(fixture.nativeElement.querySelector('.cc-card__cta').getAttribute('href')).toBe('/planes/plan-solo');
  });

  it('switches category on click and exposes it through the category model', () => {
    const changes: unknown[] = [];
    fixture.componentInstance.category.subscribe((c) => changes.push(c));
    const items = fixture.nativeElement.querySelectorAll('.cc-cat__item');
    items[1].click();
    fixture.detectChanges();
    expect(text(fixture, 'h1')).toEqual(['Reserva tu plan - Pareja']);
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Gardenia', 'Plan Rosa']);
    expect(items[1].getAttribute('aria-pressed')).toBe('true');
    expect(changes).toEqual([PlanCategory.Couple]);
  });

  it('follows the category input', () => {
    fixture.componentRef.setInput('category', PlanCategory.Couple);
    fixture.detectChanges();
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Gardenia', 'Plan Rosa']);
  });

  it('searches across categories and returns to the category when cleared', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=search]');
    input.value = 'rosa';
    input.dispatchEvent(new Event('input'));
    input.form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Rosa']);
    expect(text(fixture, 'h1')).toEqual(['Reserva tu plan - Resultados']);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Solo']);
  });

  it('applies the filter as soon as an option changes', () => {
    click(fixture, '.cc-catalog__filter-toggle');
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('cc-plan-filter-form select');
    select.value = '0';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Solo', 'Plan Rosa']);
  });

  it('shows skeletons while plans are null', () => {
    fixture.componentRef.setInput('plans', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('cc-plan-card.cc-card--skeleton').length).toBe(6);
    expect(fixture.nativeElement.querySelector('.cc-catalog__empty')).toBeNull();
  });

  it('shows the empty state with a reset action and a contact link', () => {
    fixture.componentRef.setInput('contactHref', 'https://wa.test');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=search]');
    input.value = 'nada';
    input.dispatchEvent(new Event('input'));
    input.form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(text(fixture, '.cc-catalog__empty p')).toEqual(['No encontramos planes con esos criterios.']);
    expect(fixture.nativeElement.querySelector('.cc-catalog__empty a').getAttribute('href')).toBe('https://wa.test');

    click(fixture, '.cc-catalog__empty button');
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Solo']);
  });

  it('builds the default card meta', () => {
    expect(defaultPlanMeta(PLANS[0])).toBe('1 hora · 1 persona');
    expect(defaultPlanMeta(PLANS[1])).toBe('2 horas · 2 personas');
  });
});

@Component({
  imports: [PlanCatalogComponent, PlanCardTemplateDirective],
  template: `
    <cc-plan-catalog [plans]="plans" [showBanner]="false">
      <ng-template ccPlanCard let-plan let-link="link">
        <p class="custom">{{ plan.name }}|{{ link.join('/') }}</p>
      </ng-template>
    </cc-plan-catalog>
  `,
})
class CustomCardHost {
  plans = PLANS;
}

describe('PlanCatalogComponent custom card', () => {
  it('renders the projected template', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CustomCardHost);
    fixture.detectChanges();
    expect(text(fixture, '.custom')).toEqual(['Plan Solo|/planes/plan-solo']);
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
  });
});

describe('PlanFilterFormComponent', () => {
  const ranges = [{ description: 'Barato', min: 0, max: 100000 }];

  function create(mode: 'instant' | 'submit') {
    const fixture = TestBed.createComponent(PlanFilterFormComponent);
    fixture.componentRef.setInput('services', [jacuzzi]);
    fixture.componentRef.setInput('priceRanges', ranges);
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
    const emitted: PlanFilter[] = [];
    fixture.componentInstance.filterChange.subscribe((f) => emitted.push(f));
    return { fixture, emitted };
  }

  it('emits on change in instant mode and shows reset only with a selection', () => {
    const { fixture, emitted } = create('instant');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    const selects = fixture.nativeElement.querySelectorAll('select');
    selects[1].value = '0';
    selects[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    click(fixture, 'button');
    expect(emitted).toEqual([
      { service: null, priceRange: ranges[0] },
      { service: null, priceRange: null },
    ]);
  });

  it('waits for submit in submit mode', () => {
    const { fixture, emitted } = create('submit');
    const selects = fixture.nativeElement.querySelectorAll('select');
    selects[0].value = '0';
    selects[0].dispatchEvent(new Event('change'));
    expect(emitted).toEqual([]);
    click(fixture, 'button[type=submit]');
    expect(emitted).toEqual([{ service: jacuzzi, priceRange: null }]);
  });
});

describe('PlanDetailsComponent', () => {
  let fixture: ComponentFixture<PlanDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(PlanDetailsComponent);
    fixture.componentRef.setInput('bookingUrl', (plan: Plan) => `https://wa.test/?plan=${plan.id}`);
  });

  it('renders price, facts, services, and a booking link built from the plan', () => {
    fixture.componentRef.setInput('plan', PLANS[2]);
    fixture.detectChanges();
    expect(text(fixture, 'h1')).toEqual(['Plan Rosa']);
    expect(text(fixture, '.cc-details__price')).toEqual(['$ 150.000']);
    expect(text(fixture, '.cc-details__fact dd')).toEqual(['2 horas', '2 personas']);
    expect(text(fixture, '.cc-details__services span')).toEqual(['Jacuzzi']);
    const links = Array.from(fixture.nativeElement.querySelectorAll('a[target=_blank]') as NodeListOf<HTMLAnchorElement>);
    expect(links.length).toBe(3); // top, bottom and sticky bar
    expect(links.every((a) => a.getAttribute('href') === 'https://wa.test/?plan=3')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.cc-banner__back').getAttribute('href')).toBe('/planes');
  });

  it('accepts a plain booking string and hides empty sections', () => {
    fixture.componentRef.setInput('bookingUrl', 'https://wa.test');
    fixture.componentRef.setInput('plan', PLANS[1]);
    fixture.componentRef.setInput('perks', []);
    fixture.componentRef.setInput('stickyBar', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cc-details__services')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cc-details__gift')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cc-details__bar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cc-details__cta-top').getAttribute('href')).toBe('https://wa.test');
  });
});

describe('LightboxComponent and GalleryComponent', () => {
  const images: GalleryImage[] = numberedImages(3, (n) => `img/${n}.jpg`, (n) => `Foto ${n}`);

  it('numberedImages builds the list', () => {
    expect(images[2]).toEqual({ src: 'img/3.jpg', caption: 'Foto 3' });
  });

  it('opens from the grid, wraps around, closes with Escape and restores focus', async () => {
    const fixture = TestBed.createComponent(GalleryComponent);
    fixture.componentRef.setInput('images', images);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);

    const thumb = fixture.nativeElement.querySelectorAll('.cc-gallery__item')[2] as HTMLButtonElement;
    thumb.focus();
    thumb.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(text(fixture, '.cc-lb__caption')).toEqual(['Foto 3']);
    expect(text(fixture, '.cc-lb__counter')).toEqual(['3 de 3']);
    expect(document.body.style.overflow).toBe('hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(text(fixture, '.cc-lb__caption')).toEqual(['Foto 1']);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cc-lb')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(thumb);
    fixture.nativeElement.remove();
  });

  it('prev wraps to the last image', () => {
    const fixture = TestBed.createComponent(LightboxComponent);
    fixture.componentRef.setInput('images', images);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
    fixture.componentInstance.prev();
    expect(fixture.componentInstance.index()).toBe(2);
  });
});

@Component({
  imports: [PromoModalComponent],
  template: `<cc-promo-modal [(open)]="open" imageSrc="promo.jpg" imageAlt="Promo" ctaHref="https://wa.test" />`,
})
class ModalHost {
  open = signal(true);
}

describe('PromoModalComponent', () => {
  it('closes with the button and updates the two-way binding', () => {
    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cc-modal__img')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cc-modal__cta').getAttribute('href')).toBe('https://wa.test');
    click(fixture, '.cc-modal__close');
    expect(fixture.componentInstance.open()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.cc-modal')).toBeNull();
  });

  it('closes on backdrop click but not on the image', () => {
    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();
    click(fixture, '.cc-modal__img');
    expect(fixture.componentInstance.open()).toBeTrue();
    click(fixture, '.cc-modal');
    expect(fixture.componentInstance.open()).toBeFalse();
  });

  it('opens by itself after the delay and does not reopen once dismissed', async () => {
    localStorage.removeItem('cc-promo:test');
    const create = async () => {
      const fixture = TestBed.createComponent(PromoModalComponent);
      fixture.componentRef.setInput('autoOpen', true);
      fixture.componentRef.setInput('rememberKey', 'test');
      fixture.componentRef.setInput('imageSrc', 'promo.jpg');
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 20));
      fixture.detectChanges();
      return fixture;
    };
    const first = await create();
    expect(first.componentInstance.open()).toBeTrue();
    first.componentInstance.close();
    first.destroy();

    const second = await create();
    expect(second.componentInstance.open()).toBeFalse();
    localStorage.removeItem('cc-promo:test');
  });
});

describe('WhatsappButtonComponent', () => {
  it('uses the SVG logo unless an icon is given, and shows the label when extended', () => {
    const fixture = TestBed.createComponent(WhatsappButtonComponent);
    fixture.componentRef.setInput('href', 'https://wa.test');
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.href).toBe('https://wa.test/');
    expect(link.querySelector('svg')).not.toBeNull();
    expect(link.getAttribute('aria-label')).toBe('Escríbenos por WhatsApp');

    fixture.componentRef.setInput('iconSrc', 'wa.png');
    fixture.componentRef.setInput('variant', 'extended');
    fixture.componentRef.setInput('label', 'Reservar');
    fixture.detectChanges();
    expect(link.querySelector('img')?.getAttribute('src')).toBe('wa.png');
    expect(text(fixture, '.cc-wa__label')).toEqual(['Reservar']);
    expect(link.getAttribute('aria-label')).toBeNull();
  });
});

describe('FaqComponent with projected items', () => {
  @Component({
    imports: [FaqComponent, FaqItemComponent],
    template: `
      <cc-faq title="Preguntas" [items]="[{ question: 'A', answer: 'Texto A' }]">
        <cc-faq-item question="B">Ver <a href="/planes">planes</a></cc-faq-item>
      </cc-faq>
    `,
  })
  class Host {}

  it('renders plain items and projected items with links', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(text(fixture, 'summary')).toEqual(['A', 'B']);
    expect(fixture.nativeElement.querySelector('.cc-faq-item__answer a').getAttribute('href')).toBe('/planes');
  });
});

describe('SectionHeadingComponent and NoticeComponent', () => {
  it('renders the chosen heading level and modifiers', () => {
    const fixture = TestBed.createComponent(SectionHeadingComponent);
    fixture.componentRef.setInput('title', 'Planes');
    fixture.componentRef.setInput('level', 'h3');
    fixture.componentRef.setInput('size', 'lg');
    fixture.componentRef.setInput('italic', true);
    fixture.detectChanges();
    expect(text(fixture, 'h3')).toEqual(['Planes']);
    expect(fixture.nativeElement.classList).toContain('cc-sh--lg');
    expect(fixture.nativeElement.classList).toContain('cc-sh--italic');
  });

  it('marks the notice tone', () => {
    const fixture = TestBed.createComponent(NoticeComponent);
    fixture.componentRef.setInput('tone', 'warning');
    fixture.componentRef.setInput('title', 'Importante');
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute('role')).toBe('note');
    expect(fixture.nativeElement.classList).toContain('cc-notice--warning');
    expect(text(fixture, '.cc-notice__title')).toEqual(['Importante']);
  });
});

describe('LoaderComponent', () => {
  it('announces its label to screen readers and hides it by default', () => {
    const fixture = TestBed.createComponent(LoaderComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-live')).toBe('polite');
    expect(text(fixture, '.cc-loader__label')).toEqual(['Cargando…']);
    expect(host.querySelector('.cc-loader__label')!.classList).toContain('cc-sr-only');
    expect(host.querySelector('.cc-loader__ring')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('maps size, tone, layout, visible label and delay to the host', () => {
    const fixture = TestBed.createComponent(LoaderComponent);
    fixture.componentRef.setInput('size', 'lg');
    fixture.componentRef.setInput('tone', 'current');
    fixture.componentRef.setInput('layout', 'overlay');
    fixture.componentRef.setInput('label', 'Buscando planes…');
    fixture.componentRef.setInput('showLabel', '');
    fixture.componentRef.setInput('delay', '300');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList).toContain('cc-loader--lg');
    expect(host.classList).toContain('cc-loader--current');
    expect(host.classList).toContain('cc-loader--overlay');
    expect(host.style.getPropertyValue('--_loader-delay')).toBe('300ms');
    expect(host.querySelector('.cc-loader__label')!.classList).not.toContain('cc-sr-only');
    expect(text(fixture, '.cc-loader__label')).toEqual(['Buscando planes…']);
  });
});
