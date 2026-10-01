import { InjectionToken } from '@angular/core';
import { Access, ImageEncoder, MediaStore, PublicSite, Publisher } from '../../domain/ports';
import { FirebaseServices } from '../adapters/firebase';
import { FirestoreContentRepository } from '../adapters/firestore-content-repository';

/** Implementations of the domain ports, chosen in app.config.ts. */
export const FIREBASE = new InjectionToken<FirebaseServices>('FIREBASE');
export const CONTENT_REPOSITORY = new InjectionToken<FirestoreContentRepository>('CONTENT_REPOSITORY');
export const PUBLISHER = new InjectionToken<Publisher>('PUBLISHER');
export const IMAGE_ENCODER = new InjectionToken<ImageEncoder>('IMAGE_ENCODER');
export const MEDIA_STORE = new InjectionToken<MediaStore>('MEDIA_STORE');
export const PUBLIC_SITE = new InjectionToken<PublicSite>('PUBLIC_SITE');
export const ACCESS = new InjectionToken<Access>('ACCESS');

