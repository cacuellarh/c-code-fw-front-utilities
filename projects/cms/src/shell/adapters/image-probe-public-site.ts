import { MEDIA_MARKER, MEDIA_URL } from '../../domain/media';
import { PublicSite } from '../../domain/ports';

/**
 * `PublicSite` that loads the build's marker file as an image. Images load across origins
 * without CORS, so this works from the CMS against any site.
 */
export class ImageProbePublicSite implements PublicSite {
  constructor(private timeoutMs = 8000) {}

  downloadsMedia(siteUrl: string): Promise<boolean> {
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
      img.src = new URL(`${MEDIA_URL}${MEDIA_MARKER}?t=${Date.now()}`, siteUrl).href;
    });
  }
}
