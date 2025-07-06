
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// A configuração do Firebase é normalmente injetada pelo ambiente de hospedagem.
// Deixar o objeto de configuração vazio ou populá-lo a partir de variáveis de ambiente
// é a prática recomendada para deploys via CLI.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


let app: FirebaseApp;
let db: Firestore;

// Evita a reinicialização do app no lado do cliente
if (!getApps().length) {
  // Verifica se a configuração mínima (projectId) está disponível para inicializar
  if (firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
  } else {
    console.warn(
      "[firebase.ts] AVISO: As variáveis de ambiente do Firebase não foram encontradas. " +
      "O App Hosting ou a configuração local devem fornecê-las para que o app funcione corretamente."
    );
    // Cria uma app "fantasma" para evitar quebrar o resto do código que depende de `app` e `db`.
    // Isso não vai funcionar, mas previne crashes de renderização imediatos.
    app = initializeApp({}); 
  }
} else {
  app = getApp();
}

try {
  db = getFirestore(app);
} catch (e) {
  console.error("[firebase.ts] FALHA AO OBTER FIRESTORE:", e);
  db = undefined as any; // Define como any para satisfazer o compilador, mas o erro foi logado.
}


export { app as firebaseApp, db };
