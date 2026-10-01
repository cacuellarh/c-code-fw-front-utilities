import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { CanvasImageEncoder } from './adapters/canvas-image-encoder';
import { startFirebase } from './adapters/firebase';
import { FirestoreAccess } from './adapters/firestore-access';
import { FirestoreContentRepository } from './adapters/firestore-content-repository';
import { FirestoreMediaStore } from './adapters/firestore-media-store';
import { ImageProbePublicSite } from './adapters/image-probe-public-site';
import { VercelDeployHookPublisher } from './adapters/vercel-deploy-hook-publisher';
import { routes } from './app.routes';
import { ACCESS, CONTENT_REPOSITORY, FIREBASE, IMAGE_ENCODER, MEDIA_STORE, PUBLIC_SITE, PUBLISHER } from './state/ports.tokens';

const firebase = startFirebase();
const repository = new FirestoreContentRepository(firebase.db);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // Adapters of the domain ports: swap them here (for example, in tests).
    { provide: FIREBASE, useValue: firebase },
    { provide: CONTENT_REPOSITORY, useValue: repository },
    { provide: PUBLISHER, useValue: new VercelDeployHookPublisher(repository) },
    { provide: MEDIA_STORE, useValue: new FirestoreMediaStore(firebase.db) },
    { provide: IMAGE_ENCODER, useFactory: () => new CanvasImageEncoder() },
    { provide: ACCESS, useValue: new FirestoreAccess(firebase.db, firebase.auth) },
    { provide: PUBLIC_SITE, useFactory: () => new ImageProbePublicSite() },
  ],
};
