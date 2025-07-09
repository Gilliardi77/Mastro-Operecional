import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Check if the app is already initialized to prevent re-initialization
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'gestor-maestro-service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        "Arquivo da conta de serviço 'gestor-maestro-service-account.json' não encontrado. " +
        "Por favor, baixe-o do seu Console do Firebase e coloque na raiz do projeto."
      );
    }
    
    const serviceAccountFileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    if (!serviceAccountFileContent.trim() || serviceAccountFileContent.trim() === '{}' || serviceAccountFileContent.includes("//")) {
      throw new Error(
        "O arquivo 'gestor-maestro-service-account.json' é um placeholder. " +
        "Por favor, preencha com as credenciais da sua conta de serviço do Firebase."
      );
    }

    const serviceAccount = JSON.parse(serviceAccountFileContent);
    
    // Verificação mínima para garantir que o JSON parece válido
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error("O conteúdo do arquivo 'gestor-maestro-service-account.json' parece inválido ou incompleto.");
    }
    
    console.log('Initializing Firebase Admin SDK with Service Account file...');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    
    console.log(`Firebase Admin SDK initialized for project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.`);
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // Propagate the specific error instead of a generic one.
    // This allows the application to fail fast with a clear message.
    // We will still export undefined services, and checks elsewhere will handle this.
  }
}

// Export the initialized services. Using a ternary operator to prevent
// errors if initialization failed.
export const adminAuth = admin.apps.length ? admin.auth() : undefined;
export const adminDb = admin.apps.length ? admin.firestore() : undefined;
export const adminApp = admin.apps.length ? admin.apps[0] : undefined;
