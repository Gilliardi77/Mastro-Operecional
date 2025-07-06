// src/lib/firebase-admin.ts
import admin from 'firebase-admin';
import type { App as AdminApp } from 'firebase-admin/app';
import type { Auth as AdminAuth } from 'firebase-admin/auth';
import type { Firestore as AdminFirestore } from 'firebase-admin/firestore';

// Variáveis de ambiente esperadas (configure-as no seu ambiente de servidor)
// Estes valores são exemplos e DEVEM ser substituídos pelos seus valores reais
// configurados no seu ambiente de hospedagem (Vercel, Netlify, etc.) ou .env.local.
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

let adminApp: AdminApp | undefined;
let adminAuth: AdminAuth | undefined;
let adminDb: AdminFirestore | undefined;

if (projectId && clientEmail && privateKey) {
  if (!admin.apps.length) {
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('[firebase-admin.ts] Firebase Admin SDK inicializado com sucesso.');
    } catch (error: any) {
      console.error('[firebase-admin.ts] ERRO AO INICIALIZAR Firebase Admin SDK:', error.message);
      console.error('Verifique se as variáveis de ambiente FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY estão configuradas corretamente no servidor.');
      adminApp = undefined; // Garante que app permaneça undefined em caso de falha
    }
  } else {
    adminApp = admin.app();
    console.log('[firebase-admin.ts] Firebase Admin SDK já inicializado. Usando instância existente.');
  }

  if (adminApp) {
    try {
      adminAuth = admin.auth(adminApp);
      adminDb = admin.firestore(adminApp);
      console.log('[firebase-admin.ts] Instâncias do Auth (Admin) e Firestore (Admin) obtidas com sucesso.');
    } catch (error: any) {
        console.error('[firebase-admin.ts] ERRO AO OBTER Auth/Firestore (Admin):', error.message);
        adminAuth = undefined;
        adminDb = undefined;
    }
  }
} else {
  let missingVars = [];
  if (!projectId) missingVars.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missingVars.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKey) missingVars.push("FIREBASE_PRIVATE_KEY");

  console.warn(
    `[firebase-admin.ts] AVISO: As seguintes variáveis de ambiente para Firebase Admin SDK não estão completamente definidas: ${missingVars.join(', ')}. O Admin SDK não será inicializado.`
  );
  if (!privateKey && process.env.FIREBASE_PRIVATE_KEY) {
    console.warn("[firebase-admin.ts] AVISO: FIREBASE_PRIVATE_KEY foi encontrada, mas pode estar malformada (ex: problemas com newlines). Certifique-se que está corretamente formatada no seu ambiente.");
  }
}

export { adminApp, adminAuth, adminDb, admin };
