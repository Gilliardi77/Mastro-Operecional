// src/lib/example-client-side-profile-reader.ts
/**
 * @fileOverview Exemplo de como ler dados do perfil de usuário
 * a partir do Firestore no lado do cliente.
 * Este código é um exemplo para ser adaptado e usado em OUTROS aplicativos
 * do ecossistema Gestor Maestro.
 */

import { firebaseApp } from './firebase'; // Supondo que seus outros apps tenham uma config similar
import { getFirestore, doc, getDoc, Timestamp } from 'firebase/firestore';

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
  if (!firebaseApp) {
    console.error("[ExampleProfileReader] Firebase App não inicializado.");
    return null;
  }
  if (!userId) {
    console.error("[ExampleProfileReader] UserID é obrigatório.");
    return null;
  }

  const db = getFirestore(firebaseApp);
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
        // se você for passá-los entre Server/Client Components no Next.js,
        // ou para uso geral no cliente.
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      };
      // Remover campos undefined para limpeza
      Object.keys(profileData).forEach(key => {
        if (profileData[key as keyof UserProfileClientData] === undefined) {
          delete profileData[key as keyof UserProfileClientData];
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

/*
// Exemplo de uso em um componente React (em outro aplicativo):

import React, { useEffect, useState } from 'react';
import { useAuth } from './path-to-your-auth-hook'; // Adapte o caminho
import { getClientSideUserProfile } from './example-client-side-profile-reader';

function UserCompanyProfileDisplay() {
  const { user } = useAuth(); // Supondo um hook de autenticação similar
  const [profile, setProfile] = useState<UserProfileClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      getClientSideUserProfile(user.uid)
        .then(setProfile)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) return <p>Carregando perfil da empresa...</p>;
  if (!profile) return <p>Perfil da empresa não encontrado ou não preenchido.</p>;

  return (
    <div>
      <h2>Perfil da Empresa</h2>
      <p>Nome: {profile.companyName || 'N/A'}</p>
      <p>CNPJ: {profile.companyCnpj || 'N/A'}</p>
      <p>Tipo: {profile.businessType || 'N/A'}</p>
      {/* ... outros campos ... *\/}
    </div>
  );
}
*/
