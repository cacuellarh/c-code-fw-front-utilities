import { InjectionToken } from '@angular/core';
import { ImageEncoder, SiteStore } from '../../domain/ports';

/** Implementations of the domain ports, chosen in app.config.ts. */
export const SITE_STORE = new InjectionToken<SiteStore<FileSystemDirectoryHandle>>('SITE_STORE');
export const IMAGE_ENCODER = new InjectionToken<ImageEncoder>('IMAGE_ENCODER');
