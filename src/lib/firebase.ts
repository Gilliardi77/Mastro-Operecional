
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signOut as firebaseSignOut, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
      try {
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
          console.error("Firebase config is missing API Key or Project ID. Initialization skipped.");
          return;
        }
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
      } catch (error) {
        console.error("Firebase client initialization error (new app instance):", error);
      }
    } else {
      try {
        app = getApp();
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
      } catch (error) {
         console.error("Firebase error retrieving instances from existing app:", error);
      }
    }
  }
}

initializeFirebase();

const getFirebaseInstances = () => {
  if (!app && typeof window !== 'undefined') {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("getFirebaseInstances: Critical Firebase config is missing. Cannot initialize.");
    } else {
        initializeFirebase();
    }
  }
  return { app, auth, db, storage };
};

export { app, auth, db, storage, getFirebaseInstances, firebaseSignOut as signOut };
