
'use server';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { UserProfileDataSchema, type UserProfileData, type UserProfileUpsertData } from '@/schemas/userProfileSchema';
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
): Promise<Omit<UserProfileData, 'createdAt' | 'updatedAt' | 'id' | 'userId'> | null> {
  const uid = await getVerifiedUid(idToken);
  if (!adminDb) {
    throw new Error("Serviço de banco de dados do servidor indisponível.");
  }

  try {
    const docRef = adminDb.collection('usuarios').doc(uid);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const rawData = docSnap.data();
      const dataWithIds = { ...rawData, id: uid, userId: uid };
      
      const convertedData: any = { ...dataWithIds };
      if (convertedData.createdAt instanceof Timestamp) {
        convertedData.createdAt = convertedData.createdAt.toDate();
      } else {
        convertedData.createdAt = new Date(0); // Padrão se ausente
      }
      if (convertedData.updatedAt instanceof Timestamp) {
        convertedData.updatedAt = convertedData.updatedAt.toDate();
      } else {
        convertedData.updatedAt = new Date(0); // Padrão se ausente
      }

      const validatedProfile = UserProfileDataSchema.parse(convertedData);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, userId, createdAt, updatedAt, ...clientSafeProfile } = validatedProfile;
      return clientSafeProfile;
    }
    return null;
  } catch (error: any) {
    console.error(`Erro ao buscar perfil do usuário (admin) para ${uid}:`, error);
    if (error.name === 'ZodError') {
      throw new Error(`Dados de perfil inválidos no Firestore: ${error.errors.map((e: any) => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
    }
    throw new Error(`Falha ao buscar perfil no servidor: ${error.message}`);
  }
}

// Atualiza os dados da empresa do usuário autenticado
export async function saveCompanyProfileServerAction(
  idToken: string | undefined | null,
  companyData: UserProfileUpsertData
): Promise<{ success: boolean; message?: string }> {
  const uid = await getVerifiedUid(idToken);
  if (!adminDb) {
    throw new Error("Serviço de banco de dados do servidor indisponível.");
  }

  const validationResult = CompanyInfoFormSchema.safeParse(companyData);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.flatten().formErrors.join(', ');
    console.error("[ProfileActions] Erro de validação Zod:", errorMessages);
    throw new Error(`Dados da empresa inválidos: ${errorMessages}`);
  }

  try {
    const docRef = adminDb.collection('usuarios').doc(uid);
    const dataToSet = {
      ...validationResult.data,
      updatedAt: Timestamp.now(),
    };
    await docRef.set(dataToSet, { merge: true });
    return { success: true, message: "Perfil da empresa atualizado com sucesso." };
  } catch (error: any) {
    console.error("[ProfileActions] Erro ao salvar perfil da empresa (admin):", error);
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
    const errorMessages = validationResult.error.flatten().formErrors.join(', ');
    console.error("[ProfileActions] Erro de validação do nome pessoal:", errorMessages);
    throw new Error(`Nome inválido: ${errorMessages}`);
  }
  
  if (!adminAuth) {
    throw new Error("Serviço de autenticação do servidor não disponível.");
  }

  try {
    await adminAuth.updateUser(uid, {
      displayName: validationResult.data.displayName,
    });
    return { success: true, message: "Nome de exibição atualizado." };
  } catch (error: any) {
    console.error("[ProfileActions] Falha ao atualizar nome no Auth:", error);
    throw error;
  }
}
