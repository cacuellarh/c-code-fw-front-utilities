import { Publisher } from '../../domain/ports';
import { FirestoreContentRepository } from './firestore-content-repository';

/**
 * `Publisher` with a Vercel Deploy Hook: a POST to the hook URL starts a new build of the site,
 * which reads the content from Firestore. The URL is stored per site in `private/config`.
 */
export class VercelDeployHookPublisher implements Publisher {
  constructor(private repo: FirestoreContentRepository) {}

  async publish(siteId: string): Promise<void> {
    const url = await this.repo.getDeployHook(siteId);
    if (!url) throw new Error('Este sitio no tiene configurado el Deploy Hook de Vercel.');
    // Vercel does not send CORS headers; the request still reaches it, the answer is just not readable.
    await fetch(url, { method: 'POST', mode: 'no-cors' });
  }
}
