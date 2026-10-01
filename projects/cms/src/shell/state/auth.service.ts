import { inject, Injectable, signal } from '@angular/core';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { ACCESS, FIREBASE } from './ports.tokens';

/**
 * The signed-in user (Google) and whether they are an admin. Admins see the configuration of
 * the sites; Firestore rules enforce what each user can change.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(FIREBASE).auth;
  private access = inject(ACCESS);
  readonly user = signal<User | null>(null);
  readonly isAdmin = signal(false);
  /** Resolves once Firebase knows whether there is a session from before, and its role. */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = new Promise((resolve) =>
      onAuthStateChanged(this.auth, async (user) => {
        this.isAdmin.set(user ? await this.access.isAdmin() : false);
        this.user.set(user);
        resolve();
      })
    );
  }

  async signIn(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
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
