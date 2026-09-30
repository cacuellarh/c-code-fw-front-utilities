import { DOCUMENT } from '@angular/common';
import {
  EnvironmentProviders,
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoConfig {
  /** Production domain without a trailing slash: "https://www.laurelspamedellin.com". */
  siteUrl: string;
  /** Image used when a page does not set one. Relative paths are resolved against `siteUrl`. */
  defaultImage?: string;
}

export interface SeoData {
  title: string;
  description: string;
  /** Page path, for example "/planes". */
  path: string;
  /** Image for the share preview. Defaults to `SeoConfig.defaultImage`. */
  image?: string;
}

export const SEO_CONFIG = new InjectionToken<SeoConfig>('SEO_CONFIG');

/** Registers the site data `SeoService` needs. */
export function provideSeo(config: SeoConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SEO_CONFIG,
      useValue: { ...config, siteUrl: config.siteUrl.replace(/\/+$/, '') },
    },
  ]);
}

/**
 * Sets the title, description, canonical URL, Open Graph and Twitter tags, and JSON-LD blocks.
 * Works during SSR and prerendering. Requires `provideSeo()`.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private config = inject(SEO_CONFIG);

  get siteUrl(): string {
    return this.config.siteUrl;
  }

  /** Turns a site path or relative asset into an absolute URL. Absolute URLs are returned unchanged. */
  absoluteUrl(pathOrUrl: string): string {
    if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
    return this.config.siteUrl + (pathOrUrl.startsWith('/') ? pathOrUrl : '/' + pathOrUrl);
  }

  update({ title, description, path, image }: SeoData): void {
    const url = this.absoluteUrl(path);
    const imageSrc = image ?? this.config.defaultImage;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });

    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });

    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    if (imageSrc) {
      const imageUrl = this.absoluteUrl(imageSrc);
      this.meta.updateTag({ property: 'og:image', content: imageUrl });
      this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    }

    this.setCanonical(url);
  }

  /** Adds or replaces a `<script type="application/ld+json">` with the given id. */
  setJsonLd(id: string, data: object): void {
    let script = this.document.getElementById(id);
    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.setAttribute('type', 'application/ld+json');
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  removeJsonLd(id: string): void {
    this.document.getElementById(id)?.remove();
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
