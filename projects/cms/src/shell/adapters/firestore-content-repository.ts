import {
  collection,
  doc,
  Firestore,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  CollectionChange,
  ContentRepository,
  NewSite,
  SavedCollection,
  SiteSummary,
  StoredCollection,
  StoredSite,
} from '../../domain/ports';
import { Entry, SiteManifest } from '../../domain/schema';
import { ConflictError } from '../../domain/site';
import { SiteTheme } from '../../domain/theme';

/*
 * Layout in Firestore:
 *   sites/{siteId}                    name, scope, manifest, theme, updatedAt, publishedAt
 *   sites/{siteId}/collections/{id}   items, version, updatedAt
 *   sites/{siteId}/history/{auto}     at, author, collections: { [id]: items }
 *   sites/{siteId}/private/access     editors: [emails]   (only editors can read it)
 *   sites/{siteId}/private/config     deployHookUrl       (only editors can read it)
 */
interface SiteDoc {
  name: string;
  scope: string;
  manifest: SiteManifest;
  theme?: SiteTheme;
  updatedAt?: string;
  publishedAt?: string;
}

interface CollectionDoc {
  items: Entry[];
  version: number;
  updatedAt?: string;
}

/** `ContentRepository` over Cloud Firestore. */
export class FirestoreContentRepository implements ContentRepository {
  constructor(private db: Firestore) {}

  async listSites(): Promise<SiteSummary[]> {
    const snapshot = await getDocs(collection(this.db, 'sites'));
    return snapshot.docs
      .map((d) => {
        const { name, scope, updatedAt, publishedAt } = d.data() as SiteDoc;
        return { id: d.id, name, scope, updatedAt, publishedAt };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async loadSite(siteId: string): Promise<StoredSite | null> {
    const site = await getDoc(doc(this.db, 'sites', siteId));
    if (!site.exists()) return null;
    const data = site.data() as SiteDoc;
    const collections = await getDocs(collection(this.db, 'sites', siteId, 'collections'));
    return {
      id: siteId,
      ...data,
      collections: collections.docs.map((d): StoredCollection => ({ id: d.id, ...(d.data() as CollectionDoc) })),
    };
  }

  async saveCollections(siteId: string, changes: CollectionChange[], author: string): Promise<SavedCollection[]> {
    const updatedAt = new Date().toISOString();
    return runTransaction(this.db, async (tx) => {
      const refs = changes.map((c) => doc(this.db, 'sites', siteId, 'collections', c.id));
      const current = await Promise.all(refs.map((ref) => tx.get(ref)));
      const conflicts = changes
        .filter((change, i) => ((current[i].data() as CollectionDoc | undefined)?.version ?? 0) !== change.expectedVersion)
        .map((change) => change.id);
      if (conflicts.length) throw new ConflictError(conflicts);

      const saved = changes.map((change, i) => {
        const version = change.expectedVersion + 1;
        tx.set(refs[i], { items: change.items, version, updatedAt } satisfies CollectionDoc);
        return { id: change.id, version, updatedAt };
      });
      tx.update(doc(this.db, 'sites', siteId), { updatedAt });
      tx.set(doc(collection(this.db, 'sites', siteId, 'history')), {
        at: updatedAt,
        author,
        collections: Object.fromEntries(changes.map((c) => [c.id, c.items])),
      });
      return saved;
    });
  }

  async createSite(site: NewSite, author: string): Promise<void> {
    const updatedAt = new Date().toISOString();
    await runTransaction(this.db, async (tx) => {
      const ref = doc(this.db, 'sites', site.id);
      if ((await tx.get(ref)).exists()) throw new Error(`Ya existe un sitio con el id "${site.id}".`);
      const data: SiteDoc = { name: site.manifest.name, scope: site.manifest.scope, manifest: site.manifest, updatedAt };
      if (site.theme) data.theme = site.theme;
      tx.set(ref, data);
      for (const c of site.collections) {
        tx.set(doc(this.db, 'sites', site.id, 'collections', c.id), { items: c.items, version: 1, updatedAt } satisfies CollectionDoc);
      }
      tx.set(doc(this.db, 'sites', site.id, 'private', 'access'), { editors: [author] });
    });
  }

  async markPublished(siteId: string, at: string): Promise<void> {
    await updateDoc(doc(this.db, 'sites', siteId), { publishedAt: at });
  }

  async removeCollection(siteId: string, collectionId: string, author: string): Promise<void> {
    const at = new Date().toISOString();
    await runTransaction(this.db, async (tx) => {
      const ref = doc(this.db, 'sites', siteId, 'collections', collectionId);
      const current = await tx.get(ref);
      // Keep the last content in the history before deleting it.
      if (current.exists()) {
        tx.set(doc(collection(this.db, 'sites', siteId, 'history')), {
          at,
          author,
          removed: collectionId,
          collections: { [collectionId]: (current.data() as CollectionDoc).items },
        });
        tx.delete(ref);
      }
      tx.update(doc(this.db, 'sites', siteId), { [`manifest.collections.${collectionId}`]: false, updatedAt: at });
    });
  }

  async hideCollection(siteId: string, collectionId: string): Promise<void> {
    await updateDoc(doc(this.db, 'sites', siteId), { [`manifest.collections.${collectionId}`]: false });
  }

  async addCollections(siteId: string, collections: { id: string; items: Entry[] }[], author: string): Promise<void> {
    const updatedAt = new Date().toISOString();
    await runTransaction(this.db, async (tx) => {
      const refs = collections.map((c) => doc(this.db, 'sites', siteId, 'collections', c.id));
      const existing = await Promise.all(refs.map((ref) => tx.get(ref)));
      const taken = collections.filter((_, i) => existing[i].exists()).map((c) => c.id);
      if (taken.length) throw new Error(`Ya existen: ${taken.join(', ')}.`);
      collections.forEach((c, i) => tx.set(refs[i], { items: c.items, version: 1, updatedAt } satisfies CollectionDoc));
      tx.update(doc(this.db, 'sites', siteId), { updatedAt });
      tx.set(doc(collection(this.db, 'sites', siteId, 'history')), {
        at: updatedAt,
        author,
        collections: Object.fromEntries(collections.map((c) => [c.id, c.items])),
      });
    });
  }

  async renameSite(siteId: string, name: string): Promise<void> {
    await updateDoc(doc(this.db, 'sites', siteId), { name, 'manifest.name': name });
  }

  /** Deploy Hook of the site, kept where only editors can read it. */
  async getDeployHook(siteId: string): Promise<string> {
    const config = await getDoc(doc(this.db, 'sites', siteId, 'private', 'config'));
    return (config.data()?.['deployHookUrl'] as string | undefined) ?? '';
  }

  async setDeployHook(siteId: string, url: string): Promise<void> {
    await setDoc(doc(this.db, 'sites', siteId, 'private', 'config'), { deployHookUrl: url }, { merge: true });
  }
}
