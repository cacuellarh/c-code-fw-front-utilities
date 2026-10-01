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
      return (await getDoc(doc(this.db, 'admins', email))).exists();
    } catch {
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
