import { Auth } from 'firebase/auth';
import { doc, Firestore, getDoc } from 'firebase/firestore';
import { Access } from '../../domain/ports';

/**
 * `Access` from Firestore: an admin has a document `admins/{email}`; an editor of a site can
 * read its `private/access`. The rules enforce both, so a refused read means "no".
 */
export class FirestoreAccess implements Access {
  constructor(
    private db: Firestore,
    private auth: Auth
  ) {}

  async isAdmin(): Promise<boolean> {
    const email = this.auth.currentUser?.email;
    if (!email) return false;
    try {
      const admin = (await getDoc(doc(this.db, 'admins', email))).exists();
      // Shown in the browser console, to tell a missing document from rules that refuse the read.
      if (!admin) console.warn(`CMS: no existe el documento admins/${email}.`);
      return admin;
    } catch (e) {
      console.warn(`CMS: Firestore no deja leer admins/${email} (${(e as { code?: string }).code ?? e}). Revisa que las reglas publicadas tengan el bloque match /admins/{email}.`);
      return false;
    }
  }

  async canEdit(siteId: string): Promise<boolean> {
    try {
      await getDoc(doc(this.db, 'sites', siteId, 'private', 'access'));
      return true;
    } catch {
      return false;
    }
  }
}
