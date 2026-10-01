import { MEDIA_MARKER, MEDIA_URL } from '../../domain/media';
import { PublicSite } from '../../domain/ports';

/**
 * `PublicSite` that checks whether the published site serves the build's marker file.
 *
 * It asks with a normal request first (the sites answer with `Access-Control-Allow-Origin: *`).
 * Only if that request cannot be made does it load the marker as an image, which works across
 * origins without CORS. The image alone is not enough: ad blockers drop tiny cross-site images
 * with a cache-busting query, because they look like tracking pixels.
 */
export class ImageProbePublicSite implements PublicSite {
  constructor(private timeoutMs = 8000) {}

  async downloadsMedia(siteUrl: string): Promise<boolean> {
    const url = new URL(`${MEDIA_URL}${MEDIA_MARKER}`, siteUrl).href;
    const answer = await this.request(url);
    return answer ?? this.image(`${url}?t=${Date.now()}`);
  }

  /** True or false when the site answered; null when the request could not be made. */
  private async request(url: string): Promise<boolean | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      return response.ok && (response.headers.get('content-type') ?? '').startsWith('image/');
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private image(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => done(false), this.timeoutMs);
      const done = (ok: boolean) => {
        clearTimeout(timer);
        img.onload = img.onerror = null;
        resolve(ok);
      };
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = url;
    });
  }
}
