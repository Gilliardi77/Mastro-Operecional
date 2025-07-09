import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent re-initialization
if (!admin.apps.length) {
  try {
    // Prefer service account credentials if available (for local dev, etc.)
    // The service account JSON can be base64 encoded and stored in an env var.
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const serviceAccount = serviceAccountEnv
      ? JSON.parse(
          Buffer.from(serviceAccountEnv, 'base64').toString('utf-8')
        )
      : undefined;

    if (serviceAccount) {
      console.log('Initializing Firebase Admin SDK with Service Account...');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // Fallback to Application Default Credentials (for GCP environments)
      console.log('Initializing Firebase Admin SDK with Application Default Credentials...');
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
    console.log(`Firebase Admin SDK initialized for project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.`);
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
  }
}

// Export the initialized services. Using a ternary operator to prevent
// errors if initialization failed.
export const adminAuth = admin.apps.length ? admin.auth() : undefined;
export const adminDb = admin.apps.length ? admin.firestore() : undefined;
export const adminApp = admin.apps.length ? admin.apps[0] : undefined;
