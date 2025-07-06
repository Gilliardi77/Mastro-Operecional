// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Esta função lida com a inicialização e deve ser chamada uma vez no lado do cliente.
function initializeFirebaseClient() {
  // Se já inicializado (por exemplo, por Fast Refresh do Next.js), retorna as instâncias existentes.
  if (getApps().length > 0) {
    const app = getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    return { app, auth, db };
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const requiredKeys: Array<keyof typeof firebaseConfig> = ["apiKey", "authDomain", "projectId"];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

  if (missingKeys.length > 0) {
    const errorMessage = `CRITICAL ERROR: The application cannot start because the following Firebase environment variables are missing: ${missingKeys.join(", ")}. Please check your .env or hosting configuration.`;
    
    // No cliente, podemos exibir um erro visível que interrompe o app.
    if (typeof window !== 'undefined') {
        document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem; background-color: #ffebee; color: #b71c1c; border: 2px solid #b71c1c; margin: 1rem; border-radius: 8px;"><h1>Configuration Error</h1><p>${errorMessage}</p></div>`;
    }
    
    // Lança um erro para interromper a execução do script.
    throw new Error(errorMessage);
  }

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    return { app, auth, db };
  } catch (error) {
    console.error("VCF Firebase: CRITICAL - Firebase client initialization failed.", error);
    throw new Error("Could not initialize Firebase client. Check console for details.");
  }
}

// Criamos um "container" para nossas instâncias.
// Verificamos por `window` para garantir que isso só rode no cliente, prevenindo execução no servidor.
let instances: { app: FirebaseApp; auth: Auth; db: Firestore; } | undefined = undefined;
if (typeof window !== 'undefined') {
    try {
        instances = initializeFirebaseClient();
    } catch(e) {
        // O erro já foi logado e mostrado na tela pela função de inicialização.
    }
}

// Para não quebrar importações em todo o app, exportamos as instâncias diretamente.
// Se este módulo for importado no servidor, elas serão `undefined`,
// e por isso código de servidor deve SEMPRE usar `firebase-admin`.
const app = instances?.app;
const auth = instances?.auth;
const db = instances?.db;

// Esta função é mantida por compatibilidade, mas a inicialização principal agora é direta.
const getFirebaseInstances = () => {
    if (!app || !auth || !db) {
        throw new Error("Firebase client instances are not available. This indicates a server-side import or a failed client-side initialization.");
    }
    return { app, auth, db };
};

export { app, auth, db, getFirebaseInstances };
