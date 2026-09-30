import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Routes } from '@angular/router';
import {
  FaqComponent,
  findPlanBySlug,
  GalleryComponent,
  InfoItemComponent,
  numberedImages,
  PlanCatalogComponent,
  PlanCatalogService,
  PlanDetailsComponent,
} from '@c-code/c-code-fw/ui';
import { WHATSAPP } from './app.component';

@Component({
  imports: [PlanCatalogComponent],
  template: `
    <cc-plan-catalog
      [plans]="plans()"
      [services]="services()"
      [priceRanges]="ranges()"
      imageAltSuffix=" - Laurel Spa Medellín"
    />
  `,
})
class CatalogPage {
  private catalog = inject(PlanCatalogService);
  plans = toSignal(this.catalog.getPlans(), { initialValue: [] });
  services = toSignal(this.catalog.getAdditionalServices(), { initialValue: [] });
  ranges = toSignal(this.catalog.getPriceRanges(), { initialValue: [] });
}

@Component({
  imports: [PlanDetailsComponent],
  template: `
    @if (plan(); as plan) {
      <cc-plan-details
        [plan]="plan"
        [bookingUrl]="whatsapp"
        titleIconSrc="assets/icons/hoja.png"
        backIconSrc="assets/icons/atras.png"
        durationIconSrc="assets/icons/reloj.png"
        personIconSrc="assets/icons/1persona.png"
        peopleIconSrc="assets/icons/2personas.png"
        perksImageSrc="assets/images/regalo.webp"
      />
    } @else {
      <p>Cargando…</p>
    }
  `,
})
class DetailsPage {
  readonly slug = input('');
  private plans = toSignal(inject(PlanCatalogService).getPlans(), { initialValue: [] });
  plan = computed(() => findPlanBySlug(this.plans(), this.slug()));
  whatsapp = WHATSAPP;
}

@Component({
  imports: [GalleryComponent],
  template: `<cc-gallery [images]="images" backgroundImage="assets/images/details_bg.png" />`,
})
class GalleryPage {
  images = numberedImages(18, (i) => `assets/images/galery/${i}.jpeg`, (i) => `Instalaciones - foto ${i}`);
}

@Component({
  imports: [InfoItemComponent, FaqComponent],
  template: `
    <div style="display:flex;flex-direction:column;gap:2.5rem">
      <cc-info-item title="Reservaciones" text="Recomendamos reservar su cita con anticipación." />
      <cc-info-item title="Bono Spa" text="Su Bono Spa tiene vigencia de 30 días a partir de su pago.">
        <ul style="margin:0"><li>Contenido proyectado dentro del item.</li></ul>
      </cc-info-item>
      <cc-faq
        title="PREGUNTAS FRECUENTES"
        [items]="[
          { question: '¿Cuál es el horario?', answer: 'Lunes a domingo de 8:00 a. m. a 9:00 p. m.' },
          { question: '¿Qué medios de pago aceptan?', answer: 'Bancolombia, Nequi, Daviplata y efectivo.' }
        ]"
      />
    </div>
  `,
})
class PoliciesPage {}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'planes' },
  { path: 'planes', component: CatalogPage },
  { path: 'planes/:slug', component: DetailsPage },
  { path: 'galeria', component: GalleryPage },
  { path: 'politicas', component: PoliciesPage },
];
