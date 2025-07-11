// src/lib/example-client-side-profile-reader.ts
/**
 * @fileOverview Exemplo de como ler dados do perfil de usuário
 * a partir do Firestore no lado do cliente.
 * Este código é um exemplo para ser adaptado e usado em OUTROS aplicativos
 * do ecossistema Gestor Maestro.
 */

import { getFirebaseInstances } from './firebase'; // Usando getFirebaseInstances para consistência
import { getFirestore, doc, getDoc, Timestamp, type Firestore } from 'firebase/firestore';

// Defina uma interface básica para os dados do perfil que você espera ler.
// Idealmente, compartilhe ou replique o UserProfileFirestore de schemas/userProfileSchema.ts,
// mas convertendo os Timestamps para Date ou string para uso no cliente.
interface UserProfileClientData {
  companyName?: string;
  companyCnpj?: string;
  businessType?: string;
  companyPhone?: string;
  companyEmail?: string;
  personalPhoneNumber?: string;
  createdAt?: string; // Convertido para string ISO, por exemplo
  updatedAt?: string; // Convertido para string ISO, por exemplo
  // Adicione outros campos que você espera ler
}

/**
 * Busca o perfil de um usuário do Firestore usando o SDK do cliente.
 *
 * @param userId O UID do usuário autenticado.
 * @returns Promise<UserProfileClientData | null> Os dados do perfil ou null se não encontrado/erro.
 */
export async function getClientSideUserProfile(userId: string): Promise<UserProfileClientData | null> {
  const { app: firebaseAppInstance, db: firestoreDbInstance } = getFirebaseInstances();

  if (!firebaseAppInstance) {
    console.error("[ExampleProfileReader] Firebase App não inicializado.");
    return null;
  }
  if (!firestoreDbInstance) {
    console.error("[ExampleProfileReader] Instância do Firestore não disponível.");
    return null;
  }
  if (!userId) {
    console.error("[ExampleProfileReader] UserID é obrigatório.");
    return null;
  }

  const db = firestoreDbInstance as Firestore; // Cast para tipo Firestore explícito
  const userProfileRef = doc(db, "usuarios", userId);

  try {
    const docSnap = await getDoc(userProfileRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const profileData: UserProfileClientData = {
        companyName: data.companyName,
        companyCnpj: data.companyCnpj,
        businessType: data.businessType,
        companyPhone: data.companyPhone,
        companyEmail: data.companyEmail,
        personalPhoneNumber: data.personalPhoneNumber,
        // Os Timestamps do Firestore precisam ser convertidos para um formato serializável
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      };
      // Remover campos undefined para limpeza
      Object.keys(profileData).forEach(keyStr => {
        const key = keyStr as keyof UserProfileClientData;
        if (profileData[key] === undefined) {
          delete profileData[key];
        }
      });
      return profileData;
    } else {
      console.log("[ExampleProfileReader] Perfil não encontrado para o usuário:", userId);
      return null;
    }
  } catch (error) {
    console.error("[ExampleProfileReader] Erro ao buscar perfil do usuário:", error);
    return null;
  }
}
