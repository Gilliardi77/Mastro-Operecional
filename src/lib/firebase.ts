
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signOut as firebaseSignOut, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

console.log("[FirebaseLib] Module loaded. typeof window:", typeof window);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("[FirebaseLib] Raw process.env values for API_KEY and PROJECT_ID:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
console.log("[FirebaseLib] Firebase Config being constructed:", firebaseConfig);


let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function initializeFirebase() {
  // Check if running on the client side
  if (typeof window !== 'undefined') {
    console.log("[FirebaseLib] Attempting to initialize Firebase on client...");
    if (!getApps().length) {
      try {
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey.trim() === "" || !firebaseConfig.projectId || firebaseConfig.projectId.trim() === "") {
          const deploymentEnv = process.env.NODE_ENV === 'production' ? 'apphosting.yaml' : '.env file';
          console.error(`🔴 [FirebaseLib] Firebase API Key or Project ID is missing or empty. Please check your ${deploymentEnv}. Firebase will not initialize correctly. Config used:`, firebaseConfig);
          return; // Stop initialization if config is critically missing
        }
        console.log("[FirebaseLib] Calling initializeApp with config:", firebaseConfig);
        app = initializeApp(firebaseConfig);
        console.log("[FirebaseLib] initializeApp successful. Initializing other Firebase services...");
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        console.log("✅ [FirebaseLib] Firebase initialized successfully (new app instance). Auth instance:", auth);
      } catch (error) {
        console.error("🔴 [FirebaseLib] Firebase client initialization error (new app instance):", error, "Using config:", firebaseConfig);
      }
    } else {
      try {
        console.log("[FirebaseLib] Firebase app already initialized. Getting existing app instance...");
        app = getApp();
        // Ensure instances are (re)initialized if app already exists
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        console.log("✅ [FirebaseLib] Firebase app instance retrieved and services (re)initialized successfully. Auth instance:", auth);
      } catch (error) {
         console.error("🔴 [FirebaseLib] Firebase error retrieving instances from existing app:", error);
      }
    }
  } else {
    console.warn("🟡 [FirebaseLib] initializeFirebase called on server-side. Firebase client instances will be undefined here.");
  }
}

// Call initialization (this runs when the module is first imported)
initializeFirebase();

// Export a function to get the initialized app, auth, db, storage instances
const getFirebaseInstances = () => {
  if (!app && typeof window !== 'undefined') {
    console.warn("🟡 [FirebaseLib] getFirebaseInstances called, but app is not initialized. Attempting re-initialization.");
    initializeFirebase();
  } else if (!app && typeof window === 'undefined') {
      console.warn("🟡 [FirebaseLib] getFirebaseInstances: Firebase instances accessed before initialization or in a server context where client-side init is expected.");
  }
  return { app, auth, db, storage };
};

export { app, auth, db, storage, getFirebaseInstances, firebaseSignOut as signOut };
