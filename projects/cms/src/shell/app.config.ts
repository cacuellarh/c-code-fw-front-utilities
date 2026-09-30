import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { CanvasImageEncoder } from './adapters/canvas-image-encoder';
import { startFirebase } from './adapters/firebase';
import { FirestoreContentRepository } from './adapters/firestore-content-repository';
import { VercelDeployHookPublisher } from './adapters/vercel-deploy-hook-publisher';
import { routes } from './app.routes';
import { CONTENT_REPOSITORY, FIREBASE, IMAGE_ENCODER, PUBLISHER } from './state/ports.tokens';

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
    { provide: IMAGE_ENCODER, useFactory: () => new CanvasImageEncoder() },
  ],
};
