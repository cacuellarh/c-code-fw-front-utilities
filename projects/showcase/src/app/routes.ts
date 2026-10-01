import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Routes } from '@angular/router';
import {
  FaqComponent,
  findPlanBySlug,
  GalleryComponent,
  ButtonComponent,
  InfoItemComponent,
  LoaderComponent,
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

@Component({
  imports: [LoaderComponent, ButtonComponent],
  template: `
    <div style="display:grid;gap:2.5rem">
      <section>
        <h2>Tamaños</h2>
        <div style="display:flex;gap:2rem;align-items:center">
          <cc-loader size="sm" /><cc-loader /><cc-loader size="lg" />
        </div>
      </section>
      <section>
        <h2>Tonos y texto visible</h2>
        <div style="display:flex;gap:2rem;align-items:center;flex-wrap:wrap">
          <cc-loader showLabel />
          <cc-loader tone="inverse" showLabel label="Buscando planes…" />
          <span style="padding:1rem 1.5rem;background:#1c1917;color:#fff">
            <cc-loader tone="current" showLabel label="Sobre fondo oscuro" />
          </span>
        </div>
      </section>
      <section>
        <h2>Dentro de un botón</h2>
        <button ccButton type="button" disabled><cc-loader size="sm" tone="current" label="Guardando" /> Guardando…</button>
      </section>
      <section>
        <h2>Bloque</h2>
        <cc-loader layout="block" showLabel label="Cargando la galería…" />
      </section>
      <section>
        <h2>Superpuesto (aparece a los 300 ms)</h2>
        <div style="position:relative;max-width:28rem;padding:1.5rem;border:1px solid #d6d3d1">
          <p>Contenido de la tarjeta que se está actualizando. El loader lo cubre con un velo translúcido.</p>
          <p>Segunda línea de contenido.</p>
          <cc-loader layout="overlay" [delay]="300" />
        </div>
      </section>
    </div>
  `,
})
class LoaderPage {}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'planes' },
  { path: 'planes', component: CatalogPage },
  { path: 'planes/:slug', component: DetailsPage },
  { path: 'galeria', component: GalleryPage },
  { path: 'politicas', component: PoliciesPage },
  { path: 'loader', component: LoaderPage },
];
