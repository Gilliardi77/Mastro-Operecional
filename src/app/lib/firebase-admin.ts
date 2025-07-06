// src/lib/firebase-admin.ts
import admin from 'firebase-admin';
import { type App, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initializeAdminApp(): App {
  // Se já houver um app inicializado, retorna ele.
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  let firebaseAdminConfig: admin.AppOptions | undefined = undefined;

  // Tenta configurar com as variáveis de ambiente explícitas
  if (projectId && clientEmail && privateKey) {
    firebaseAdminConfig = {
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'), // Corrige quebras de linha
      }),
    };
  }

  try {
    // Inicializa o app. Se firebaseAdminConfig for undefined,
    // ele tenta usar as credenciais padrão do ambiente (GOOGLE_APPLICATION_CREDENTIALS).
    const app = initializeApp(firebaseAdminConfig);
    return app;
  } catch (error) {
    const errorMessage = `[Firebase Admin] CRITICAL: Failed to initialize Firebase Admin SDK. Please ensure Firebase environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) or GOOGLE_APPLICATION_CREDENTIALS are set correctly on the server.`;
    console.error(errorMessage, error);
    // Lançar um erro aqui irá parar a inicialização do servidor, o que é o comportamento
    // correto se a conexão com o banco de dados não puder ser estabelecida.
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
}

// Inicializa o app e exporta as instâncias. Se a inicialização falhar, o servidor não iniciará.
const adminApp = initializeAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb };
