
'use server';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { UserProfileDataSchema, type UserProfileData, type UserProfileUpsertData } from '@/schemas/userProfileSchema';
import { PersonalInfoFormSchema, CompanyInfoFormSchema } from './schemas';
import { cookies } from 'next/headers';

// UID seguro a partir do cookie da sessão
async function getVerifiedUid(): Promise<string> {
  if (!adminAuth) {
    console.error("[ProfileActions] ERRO CRÍTICO: Firebase Admin Auth (adminAuth) não está inicializado.");
    throw new Error("Serviço de autenticação do servidor indisponível. Tente novamente mais tarde.");
  }
  
  const sessionCookie = (await cookies()).get('__session')?.value;
  if (!sessionCookie) {
    throw new Error("Cookie de sessão ('__session') não encontrado. O navegador pode não ter enviado a autenticação para o servidor. Por favor, faça login novamente.");
  }

  try {
    // checkRevoked = true é importante para segurança
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken.uid;
  } catch (error: any) {
    console.error(`[ProfileActions] Falha na verificação do cookie de sessão. Código: ${error.code}. Mensagem: ${error.message}`);
    if (error.code === 'auth/session-cookie-expired') {
        throw new Error("Sua sessão expirou. Por favor, faça login novamente.");
    }
    if (error.code === 'auth/session-cookie-revoked') {
        throw new Error("Sua sessão foi revogada. Por favor, faça login novamente.");
    }
    // Adiciona o erro original para mais detalhes na depuração
    throw new Error(`Não foi possível verificar sua identidade. Detalhe: ${error.message}. Por favor, faça login novamente.`);
  }
}

function convertDocTimestampsToDates(docData: any): any {
    if (!docData) return null;
    const dataWithDates = { ...docData };
    for (const key in dataWithDates) {
      if (dataWithDates[key] instanceof Timestamp) {
        (dataWithDates as any)[key] = (dataWithDates[key] as Timestamp).toDate();
      }
    }
    if (!dataWithDates.createdAt) {
      dataWithDates.createdAt = new Date(0);
    }
    if (!dataWithDates.updatedAt) {
      dataWithDates.updatedAt = new Date(0);
    }
    return dataWithDates;
}

// Busca perfil do usuário autenticado
export async function fetchUserProfileServerAction(): Promise<Partial<UserProfileData> | null> {
  const uid = await getVerifiedUid();
  if (!adminDb) {
    throw new Error("Serviço de banco de dados do servidor indisponível.");
  }

  try {
    const docRef = adminDb.collection('usuarios').doc(uid);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const rawData = docSnap.data();
      const dataWithId = { ...rawData, id: uid, userId: uid };
      const dataWithDates = convertDocTimestampsToDates(dataWithId);
      const validatedProfile = UserProfileDataSchema.parse(dataWithDates);
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
  companyData: UserProfileUpsertData
): Promise<{ success: boolean; message?: string }> {
  const uid = await getVerifiedUid();
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
  personalData: { displayName: string }
): Promise<{ success: boolean; message?: string }> {
  const uid = await getVerifiedUid();

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
