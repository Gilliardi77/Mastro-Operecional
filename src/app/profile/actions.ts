
'use server';

import { adminAuth } from '@/lib/firebase-admin'; // adminApp é usado implicitamente por adminAuth
import {
  getUserProfile as serviceGetUserProfile,
  upsertUserProfile as serviceUpsertUserProfile,
} from '@/services/userProfileService';
import type {
  UserProfileFirestore,
  UserProfileFirestoreData,
} from '@/schemas/userProfileSchema';

import { PersonalInfoFormSchema, CompanyInfoFormSchema } from './schemas';

// UID seguro a partir do token de autenticação
async function getVerifiedUid(idToken: string | undefined | null): Promise<string> {
  if (!adminAuth) {
    console.error("[ProfileActions] ERRO CRÍTICO: Firebase Admin Auth (adminAuth) não está inicializado.");
    throw new Error("Serviço de autenticação indisponível. Tente novamente mais tarde.");
  }
  
  if (!idToken) {
    console.error("[ProfileActions] Tentativa de verificar UID com token nulo ou indefinido.");
    throw new Error("Sessão inválida. Por favor, faça login novamente.");
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);
    return decodedToken.uid;
  } catch (error: any) {
    console.error(`[ProfileActions] Falha na verificação do token de ID. Código: ${error.code}. Mensagem: ${error.message}`);
    
    switch (error.code) {
      case 'auth/id-token-revoked':
        throw new Error("Sua sessão foi revogada. Por favor, faça login novamente.");
      case 'auth/id-token-expired':
        throw new Error("Sua sessão expirou. Por favor, faça login novamente.");
      case 'auth/argument-error':
        throw new Error("Ocorreu um erro com sua autenticação (token inválido). Por favor, saia e entre novamente.");
      default:
        throw new Error("Não foi possível verificar sua identidade. Por favor, faça login novamente.");
    }
  }
}

// Busca perfil do usuário autenticado e retorna dados seguros para o cliente
export async function fetchUserProfileServerAction(
  idToken: string | undefined | null
): Promise<Omit<UserProfileFirestore, 'createdAt' | 'updatedAt'> | null> {
  const uid = await getVerifiedUid(idToken);

  try {
    const profile = await serviceGetUserProfile(uid);
    if (profile) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, updatedAt, ...clientSafeProfile } = profile;
      return clientSafeProfile;
    }
    return null;
  } catch (error: any) {
    // Não logar o erro aqui se já foi logado em serviceGetUserProfile
    // Apenas relançar para ser tratado pelo chamador (ProfilePage)
    if (error.message?.includes("Dados inválidos no perfil") || error.message?.includes("Falha ao buscar perfil")) {
       console.error("[ProfileActions] Erro ao buscar perfil (relançando):", error.message);
    } else if (error.message?.includes("não encontrado")) {
        // Se o serviço retorna null explicitamente para "não encontrado", podemos lidar com isso
        return null;
    } else {
        console.error("[ProfileActions] Erro inesperado ao buscar perfil:", error);
    }
    throw error; // Relança o erro para que o cliente possa lidar com ele
  }
}

// Atualiza os dados da empresa do usuário autenticado
export async function saveCompanyProfileServerAction(
  idToken: string | undefined | null,
  companyData: UserProfileFirestoreData
): Promise<{ success: boolean; message?: string }> {
  const uid = await getVerifiedUid(idToken);

  // Validar os dados com o schema antes de passar para o serviço
  const validationResult = CompanyInfoFormSchema.safeParse(companyData);
  if (!validationResult.success) {
    console.error("[ProfileActions] Erro de validação Zod em saveCompanyProfileServerAction:", validationResult.error.flatten());
    throw new Error("Dados da empresa inválidos: " + validationResult.error.flatten().formErrors.join(', '));
  }

  try {
    await serviceUpsertUserProfile(uid, validationResult.data);
    return { success: true, message: "Perfil da empresa atualizado com sucesso." };
  } catch (error: any) {
    console.error("[ProfileActions] Erro ao salvar perfil da empresa:", error);
    // Relançar o erro original para fornecer mais detalhes ao cliente, se necessário
    throw error;
  }
}

// Atualiza apenas o displayName do Auth
export async function savePersonalDisplayNameServerAction(
  idToken: string | undefined | null,
  personalData: { displayName: string }
): Promise<{ success: boolean; message?: string }> {
  const uid = await getVerifiedUid(idToken);

  const validationResult = PersonalInfoFormSchema.safeParse(personalData);
  if (!validationResult.success) {
    console.error("[ProfileActions] Erro de validação do nome pessoal:", validationResult.error.flatten());
    throw new Error("Nome inválido: " + validationResult.error.flatten().formErrors.join(', '));
  }
  
  if (!adminAuth) {
      console.error("[ProfileActions] ERRO CRÍTICO: Firebase Admin Auth (adminAuth) não está inicializado para savePersonalDisplayNameServerAction.");
      throw new Error("Serviço de autenticação do servidor não disponível.");
  }

  try {
    await adminAuth.updateUser(uid, {
      displayName: validationResult.data.displayName,
    });
    // Opcionalmente, você também pode querer salvar o displayName no documento 'usuarios' no Firestore aqui,
    // chamando serviceUpsertUserProfile, se esse for o comportamento desejado.
    // await serviceUpsertUserProfile(uid, { displayName: validationResult.data.displayName });
    return { success: true, message: "Nome de exibição atualizado." };
  } catch (error: any) {
    console.error("[ProfileActions] Falha ao atualizar nome no Auth:", error);
    throw error;
  }
}
