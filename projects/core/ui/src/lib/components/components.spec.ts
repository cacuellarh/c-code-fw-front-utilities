import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Plan, PlanCategory, PlanFilter } from '../models/plan.models';
import { GalleryImage } from '../models/ui.models';
import { GalleryComponent, numberedImages } from './gallery/gallery.component';
import { LightboxComponent } from './lightbox/lightbox.component';
import { PlanCardTemplateDirective, PlanCatalogComponent } from './plan-catalog/plan-catalog.component';
import { PlanDetailsComponent } from './plan-details/plan-details.component';
import { PlanFilterFormComponent } from './plan-filter-form/plan-filter-form.component';
import { PromoModalComponent } from './promo-modal/promo-modal.component';
import { WhatsappButtonComponent } from './whatsapp-button/whatsapp-button.component';

const jacuzzi = { id: 101, iconPath: 'j.png', name: 'Jacuzzi' };

const PLANS: Plan[] = [
  { id: 1, name: 'Plan Solo', description: 'Uno', duration: '1 hora', price: 90000, cuantity: 1, imgPath: 's.jpg', category: PlanCategory.Individual, additionalServicesId: [101], additionalServices: [jacuzzi] },
  { id: 2, name: 'Plan Gardenia', description: 'Dos', duration: '2 horas', price: 259900, cuantity: 2, imgPath: 'g.jpg', category: PlanCategory.Couple, additionalServicesId: [], additionalServices: [] },
  { id: 3, name: 'Plan Rosa', description: 'Tres', duration: '2 horas', price: 150000, cuantity: 2, imgPath: 'r.jpg', category: PlanCategory.Couple, additionalServicesId: [101], additionalServices: [jacuzzi] },
];

function text(fixture: ComponentFixture<unknown>, selector: string): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>).map((el) =>
    el.textContent!.trim()
  );
}

function click(fixture: ComponentFixture<unknown>, selector: string): void {
  (fixture.nativeElement.querySelector(selector) as HTMLElement).click();
  fixture.detectChanges();
}

describe('PlanCatalogComponent', () => {
  let fixture: ComponentFixture<PlanCatalogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(PlanCatalogComponent);
    fixture.componentRef.setInput('plans', PLANS);
    fixture.componentRef.setInput('services', [jacuzzi]);
    fixture.detectChanges();
  });

  it('starts on the initial category with counts and slug links', () => {
    expect(text(fixture, 'h1')).toEqual(['Reserva tu plan - Individual']);
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Solo']);
    expect(text(fixture, '.cc-cat__item small')).toEqual(['1', '2', '0']);
    expect(fixture.nativeElement.querySelector('.cc-card__cta').getAttribute('href')).toBe('/planes/plan-solo');
  });

  it('switches category on click', () => {
    const items = fixture.nativeElement.querySelectorAll('.cc-cat__item');
    items[1].click();
    fixture.detectChanges();
    expect(text(fixture, 'h1')).toEqual(['Reserva tu plan - Pareja']);
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Gardenia', 'Plan Rosa']);
    expect(items[1].classList).toContain('cc-cat__item--active');
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

  it('opens the filter and applies it', () => {
    click(fixture, '.cc-catalog__filter-toggle');
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('cc-plan-filter-form select');
    select.value = '0';
    select.dispatchEvent(new Event('change'));
    click(fixture, '.cc-filter__submit');
    expect(text(fixture, '.cc-card__name')).toEqual(['Plan Solo', 'Plan Rosa']);
  });

  it('shows the empty message', () => {
    fixture.componentRef.setInput('initialCategory', PlanCategory.Group);
    fixture.detectChanges();
    expect(text(fixture, '.cc-catalog__empty')).toEqual(['No encontramos planes con esos criterios.']);
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
  it('emits the selected options and an empty filter on reset', () => {
    const fixture = TestBed.createComponent(PlanFilterFormComponent);
    const ranges = [{ description: 'Barato', min: 0, max: 100000 }];
    fixture.componentRef.setInput('services', [jacuzzi]);
    fixture.componentRef.setInput('priceRanges', ranges);
    fixture.detectChanges();

    const emitted: PlanFilter[] = [];
    fixture.componentInstance.filterChange.subscribe((f) => emitted.push(f));

    const selects = fixture.nativeElement.querySelectorAll('select');
    selects[1].value = '0';
    selects[1].dispatchEvent(new Event('change'));
    click(fixture, '.cc-filter__submit');
    click(fixture, '.cc-filter__reset');

    expect(emitted).toEqual([
      { service: null, priceRange: ranges[0] },
      { service: null, priceRange: null },
    ]);
  });
});

describe('PlanDetailsComponent', () => {
  let fixture: ComponentFixture<PlanDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(PlanDetailsComponent);
    fixture.componentRef.setInput('bookingUrl', 'https://wa.test');
  });

  it('renders price, people, services and booking link', () => {
    fixture.componentRef.setInput('plan', PLANS[2]);
    fixture.detectChanges();
    expect(text(fixture, 'h1')).toEqual(['Plan Rosa']);
    expect(text(fixture, '.cc-details__price p')[0]).toBe('COP$ 150,000');
    expect(text(fixture, '.cc-details__fact small')).toEqual(['2 horas', '2 Personas']);
    expect(text(fixture, '.cc-details__services small')).toEqual(['Jacuzzi']);
    expect(fixture.nativeElement.querySelector('.cc-details__cta').getAttribute('href')).toBe('https://wa.test');
    expect(fixture.nativeElement.querySelector('.cc-banner__back').getAttribute('href')).toBe('/planes');
  });

  it('hides the includes list and gift box when empty', () => {
    fixture.componentRef.setInput('plan', PLANS[1]);
    fixture.componentRef.setInput('perks', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cc-details__includes')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cc-details__perks')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cc-details__cta')).not.toBeNull();
  });
});

describe('LightboxComponent and GalleryComponent', () => {
  const images: GalleryImage[] = numberedImages(3, (n) => `img/${n}.jpg`, (n) => `Foto ${n}`);

  it('numberedImages builds the list', () => {
    expect(images[2]).toEqual({ src: 'img/3.jpg', caption: 'Foto 3' });
  });

  it('opens from the grid, wraps around and closes with Escape', () => {
    const fixture = TestBed.createComponent(GalleryComponent);
    fixture.componentRef.setInput('images', images);
    fixture.detectChanges();

    (fixture.nativeElement.querySelectorAll('.cc-gallery__item')[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(text(fixture, '.cc-lb__caption')).toEqual(['Foto 3']);
    expect(document.body.style.overflow).toBe('hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(text(fixture, '.cc-lb__caption')).toEqual(['Foto 1']);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cc-lb')).toBeNull();
    expect(document.body.style.overflow).toBe('');
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
  template: `<cc-promo-modal [(open)]="open" imageSrc="promo.jpg" imageAlt="Promo" />`,
})
class ModalHost {
  open = signal(true);
}

describe('PromoModalComponent', () => {
  it('closes with the button and updates the two-way binding', () => {
    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cc-modal__img')).not.toBeNull();
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
});

describe('WhatsappButtonComponent', () => {
  it('uses the SVG logo unless an icon is given', () => {
    const fixture = TestBed.createComponent(WhatsappButtonComponent);
    fixture.componentRef.setInput('href', 'https://wa.test');
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.href).toBe('https://wa.test/');
    expect(link.querySelector('svg')).not.toBeNull();

    fixture.componentRef.setInput('iconSrc', 'wa.png');
    fixture.detectChanges();
    expect(link.querySelector('img')?.getAttribute('src')).toBe('wa.png');
  });
});
