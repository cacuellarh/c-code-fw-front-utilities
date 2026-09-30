import { initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, initializeFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../firebase.config';

export interface FirebaseServices {
  auth: Auth;
  db: Firestore;
}

/** Starts the Firebase app of the CMS. Undefined fields are dropped instead of failing the write. */
export function startFirebase(): FirebaseServices {
  const app = initializeApp(FIREBASE_CONFIG);
  return { auth: getAuth(app), db: initializeFirestore(app, { ignoreUndefinedProperties: true }) };
}
