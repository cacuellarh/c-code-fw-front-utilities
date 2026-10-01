import { initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, initializeFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../firebase.config';

export interface FirebaseServices {
  auth: Auth;
  db: Firestore;
  /** Sign in by redirect (same tab) instead of a popup: everywhere except on localhost. */
  redirectSignIn: boolean;
}

/** Starts the Firebase app of the CMS. Undefined fields are dropped instead of failing the write. */
export function startFirebase(): FirebaseServices {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  // Online, the sign-in page is served from the CMS's own domain (vercel.json proxies /__/auth to
  // firebaseapp.com), so browsers that block third-party storage (Safari, mobile) keep the session.
  const app = initializeApp({ ...FIREBASE_CONFIG, authDomain: local ? FIREBASE_CONFIG.authDomain : location.host });
  return { auth: getAuth(app), db: initializeFirestore(app, { ignoreUndefinedProperties: true }), redirectSignIn: !local };
}
