import { Bytes, collection, doc, Firestore, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { MediaItem, MediaStore, MediaUpload, MediaVariant } from '../../domain/ports';

/*
 * Images stored in Firestore, so the whole CMS stays on the free plan:
 *   sites/{siteId}/media/{id}                  metadata + tiny preview (listed at once)
 *   sites/{siteId}/media/{id}/data/{variant}   { bytes } for full, thumb and og (≤ 1 MiB each)
 * Swap this adapter for a Cloud Storage one when a site needs more space.
 */
type MediaDoc = Omit<MediaItem, 'id' | 'preview'> & { preview: Bytes };

export class FirestoreMediaStore implements MediaStore {
  constructor(private db: Firestore) {}

  async list(siteId: string): Promise<MediaItem[]> {
    const snapshot = await getDocs(collection(this.db, 'sites', siteId, 'media'));
    return snapshot.docs
      .map((d) => {
        const data = d.data() as MediaDoc;
        return { ...data, id: d.id, preview: data.preview.toUint8Array() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async read(siteId: string, id: string, variant: MediaVariant): Promise<Uint8Array | null> {
    const snapshot = await getDoc(doc(this.db, 'sites', siteId, 'media', id, 'data', variant));
    const bytes = snapshot.data()?.['bytes'] as Bytes | undefined;
    return bytes ? bytes.toUint8Array() : null;
  }

  async save(siteId: string, upload: MediaUpload): Promise<void> {
    const { id, preview, ...meta } = upload.item;
    const batch = writeBatch(this.db);
    for (const [variant, data] of Object.entries(upload.files)) {
      batch.set(doc(this.db, 'sites', siteId, 'media', id, 'data', variant), { bytes: Bytes.fromUint8Array(data!) });
    }
    batch.set(doc(this.db, 'sites', siteId, 'media', id), { ...meta, preview: Bytes.fromUint8Array(preview) } satisfies MediaDoc);
    await batch.commit();
  }

  async remove(siteId: string, item: MediaItem): Promise<void> {
    const batch = writeBatch(this.db);
    for (const variant of item.variants) batch.delete(doc(this.db, 'sites', siteId, 'media', item.id, 'data', variant));
    batch.delete(doc(this.db, 'sites', siteId, 'media', item.id));
    await batch.commit();
  }
}
