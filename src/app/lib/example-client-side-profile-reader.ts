
// src/lib/example-client-side-profile-reader.ts
/**
 * @fileOverview Exemplo de como ler dados do perfil de usuário
 * a partir do Firestore no lado do cliente.
 * Este código é um exemplo para ser adaptado e usado em OUTROS aplicativos
 * do ecossistema Gestor Maestro.
 */

import { app as firebaseApp } from './firebase'; // Usa a config do app atual para o exemplo
import { getFirestore, doc, getDoc, type Timestamp } from 'firebase/firestore';

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
  // Adicione outros campos que você espera ler do schema UserProfileFirestore
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
      // Mapeia os campos do UserProfileFirestore para UserProfileClientData
      // com conversão de Timestamp.
      const profileData: UserProfileClientData = {
        companyName: data.companyName,
        companyCnpj: data.companyCnpj,
        businessType: data.businessType,
        companyPhone: data.companyPhone,
        companyEmail: data.companyEmail,
        personalPhoneNumber: data.personalPhoneNumber,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
      };
      
      // Remover campos undefined para limpeza, garantindo que apenas campos preenchidos sejam retornados.
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

/*
// Exemplo de uso em um componente React (em outro aplicativo):

import React, { useEffect, useState } from 'react';
// Supondo que o outro app tenha um hook useAuth similar
// import { useAuth } from './path-to-their-auth-hook'; 
// import { getClientSideUserProfile } from './example-client-side-profile-reader';

// Defina UserProfileClientData no app consumidor ou compartilhe o tipo.
// interface UserProfileClientData {
//   companyName?: string;
//   companyCnpj?: string;
//   // ... outros campos
// }

function UserCompanyProfileDisplay() {
  // const { user } = useAuth(); 
  const [profile, setProfile] = useState<UserProfileClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // Exemplo: obter UID

  useEffect(() => {
    // Simular obtenção do UID do usuário logado no app consumidor
    // Ex: firebase.auth().onAuthStateChanged(user => setCurrentUserId(user?.uid || null));
    const exampleUid = "some-user-uid-from-consumer-app"; // Substitua pela lógica real do app consumidor
    setCurrentUserId(exampleUid); 
  }, []);

  useEffect(() => {
    if (currentUserId) {
      setLoading(true);
      getClientSideUserProfile(currentUserId)
        .then(setProfile)
        .finally(() => setLoading(false));
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [currentUserId]);

  if (loading) return <p>Carregando perfil da empresa...</p>;
  if (!profile) return <p>Perfil da empresa não encontrado ou não preenchido.</p>;

  return (
    <div>
      <h2>Perfil da Empresa (Lido de 'usuarios')</h2>
      <p>Nome: {profile.companyName || 'N/A'}</p>
      <p>CNPJ: {profile.companyCnpj || 'N/A'}</p>
      <p>Tipo: {profile.businessType || 'N/A'}</p>
      <p>Telefone Empresa: {profile.companyPhone || 'N/A'}</p>
      <p>Email Empresa: {profile.companyEmail || 'N/A'}</p>
      <p>Telefone Pessoal: {profile.personalPhoneNumber || 'N/A'}</p>
      <p>Criado em: {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</p>
      <p>Atualizado em: {profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'N/A'}</p>
    </div>
  );
}

export default UserCompanyProfileDisplay; // Para exemplo, se fosse um componente
*/
