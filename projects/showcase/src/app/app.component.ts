import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PromoModalComponent, SocialLinksComponent, WhatsappButtonComponent, whatsappUrl } from '@c-code/c-code-fw/ui';

export const WHATSAPP = whatsappUrl('573104948884', 'Hola, necesito más información');

/** Dev-only playground for @c-code/c-code-fw/ui. Uses the Medellín site's data and images. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, WhatsappButtonComponent, PromoModalComponent, SocialLinksComponent],
  template: `
    <div [class.theme-laurel]="theme() === 'laurel'" [class.theme-xora]="theme() === 'xora'">
      <header class="bar">
        <strong>c-code-fw/ui</strong>
        <nav>
          <a routerLink="/planes" routerLinkActive="on">Catálogo</a>
          <a routerLink="/planes/plan-gardenia" routerLinkActive="on">Detalle</a>
          <a routerLink="/galeria" routerLinkActive="on">Galería</a>
          <a routerLink="/politicas" routerLinkActive="on">Políticas / FAQ</a>
        </nav>
        <cc-social-links
          [links]="[
            { href: 'https://instagram.com', iconSrc: 'assets/images/ig.png', label: 'Instagram' },
            { href: 'https://facebook.com', iconSrc: 'assets/images/face.png', label: 'Facebook' }
          ]"
        />
        <button (click)="nextTheme()">Tema: {{ theme() }}</button>
        <button (click)="promo.set(true)">Abrir modal</button>
      </header>
      <main class="page"><router-outlet /></main>
      <cc-whatsapp-button [href]="whatsapp" />
      <cc-promo-modal [(open)]="promo" imageSrc="assets/images/pop.jpeg" imageAlt="Promoción" />
    </div>
  `,
  styles: `
    .bar { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: center; padding: 0.75rem 1.5rem; background: #1c1917; color: #fff; }
    .bar nav { display: flex; gap: 1rem; flex-wrap: wrap; }
    .bar a { color: #fff; }
    .bar a.on { font-weight: 700; text-decoration: none; }
    .page { padding: 2.5rem; }
    @media (min-width: 1024px) { .page { padding: 2.5rem 6rem; } }
  `,
})
export class AppComponent {
  readonly theme = signal<'neutral' | 'laurel' | 'xora'>(
    (new URLSearchParams(location.search).get('theme') as 'laurel' | 'xora' | null) ?? 'neutral'
  );

  nextTheme(): void {
    const order = ['neutral', 'laurel', 'xora'] as const;
    this.theme.set(order[(order.indexOf(this.theme()) + 1) % order.length]);
  }
  readonly promo = signal(false);
  readonly whatsapp = WHATSAPP;
}
