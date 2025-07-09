import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Check if the app is already initialized to prevent re-initialization
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'gestor-maestro-service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccountFileContent = fs.readFileSync(serviceAccountPath, 'utf8');
      if (serviceAccountFileContent.trim() && serviceAccountFileContent.trim() !== '{}' && !serviceAccountFileContent.includes("//")) {
        const serviceAccount = JSON.parse(serviceAccountFileContent);
        console.log('Initializing Firebase Admin SDK with Service Account file...');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        // File is a placeholder, so we don't try to initialize with it.
        // Fallback to Application Default Credentials which might be set in the environment.
        console.warn('Service Account file is a placeholder or not found. Falling back to Application Default Credentials...');
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    } else {
      console.warn('Service Account file not found. Falling back to Application Default Credentials...');
      // Fallback to Application Default Credentials (for GCP environments)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
    console.log(`Firebase Admin SDK initialized for project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.`);
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // If we fail, it's better to not export broken services.
    // The try/catch here prevents the app from crashing on start if config is missing.
  }
}

// Export the initialized services. Using a ternary operator to prevent
// errors if initialization failed.
export const adminAuth = admin.apps.length ? admin.auth() : undefined;
export const adminDb = admin.apps.length ? admin.firestore() : undefined;
export const adminApp = admin.apps.length ? admin.apps[0] : undefined;
