import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent re-initialization
if (!admin.apps.length) {
  try {
    // Uses Application Default Credentials, which are automatically
    // available in Firebase and Google Cloud environments.
    // No need to manually manage service account keys in code.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('Firebase Admin SDK initialized.');
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.stack);
    // This is a critical server error, you might want to handle it more gracefully
    // depending on your application's needs.
  }
}

// Export the initialized services. Using a ternary operator to prevent
// errors if initialization failed, although in a real scenario, the
// app might not even start if the Admin SDK fails to initialize.
export const adminAuth = admin.apps.length ? admin.auth() : undefined;
export const adminDb = admin.apps.length ? admin.firestore() : undefined;
export const adminApp = admin.apps.length ? admin.apps[0] : undefined;
