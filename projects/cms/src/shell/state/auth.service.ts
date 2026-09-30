import { inject, Injectable, signal } from '@angular/core';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { FIREBASE } from './ports.tokens';

/** The signed-in user (Google). Firestore rules decide what each user can edit. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(FIREBASE).auth;
  readonly user = signal<User | null>(null);
  /** Resolves once Firebase knows whether there is a session from before. */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = new Promise((resolve) =>
      onAuthStateChanged(this.auth, (user) => {
        this.user.set(user);
        resolve();
      })
    );
  }

  async signIn(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }

  /** Email of the user, stored as the author of each save. */
  email(): string {
    return this.user()?.email ?? 'desconocido';
  }
}
