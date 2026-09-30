import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { CanvasImageEncoder } from './adapters/canvas-image-encoder';
import { IdbSiteStore } from './adapters/idb-site-store';
import { routes } from './app.routes';
import { IMAGE_ENCODER, SITE_STORE } from './state/ports.tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // Adapters of the domain ports: swap them here (for example, in tests).
    { provide: SITE_STORE, useFactory: () => new IdbSiteStore() },
    { provide: IMAGE_ENCODER, useFactory: () => new CanvasImageEncoder() },
  ],
};
