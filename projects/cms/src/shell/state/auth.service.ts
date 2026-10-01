import { inject, Injectable, signal } from '@angular/core';
import { getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, User } from 'firebase/auth';
import { ACCESS, FIREBASE } from './ports.tokens';

/**
 * The signed-in user (Google) and whether they are an admin. Admins see the configuration of
 * the sites; Firestore rules enforce what each user can change.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private firebase = inject(FIREBASE);
  private auth = this.firebase.auth;
  private access = inject(ACCESS);
  readonly user = signal<User | null>(null);
  readonly isAdmin = signal(false);
  /** Error code of a sign-in by redirect that failed, read when coming back from Google. */
  readonly redirectError = signal('');
  /** Resolves once Firebase knows whether there is a session from before, and its role. */
  readonly ready: Promise<void>;

  constructor() {
    getRedirectResult(this.auth).catch((e: { code?: string }) => this.redirectError.set(e.code ?? 'unknown'));
    this.ready = new Promise((resolve) =>
      onAuthStateChanged(this.auth, async (user) => {
        this.isAdmin.set(user ? await this.access.isAdmin() : false);
        this.user.set(user);
        resolve();
      })
    );
  }

  /** Online it leaves the page for Google and comes back signed in; locally it opens a popup. */
  async signIn(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    if (this.firebase.redirectSignIn) return signInWithRedirect(this.auth, provider);
    await signInWithPopup(this.auth, provider);
    this.isAdmin.set(await this.access.isAdmin());
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }

  /** Email of the user, stored as the author of each save. */
  email(): string {
    return this.user()?.email ?? 'desconocido';
  }
}
