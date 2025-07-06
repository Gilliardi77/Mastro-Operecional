
'use server';
/**
 * Serviço para gerenciar perfis de usuário no Firestore.
 * Utiliza o Firebase Admin SDK para operações do lado do servidor.
 */

import { adminDb, admin } from '@/lib/firebase-admin';
import {
  UserProfileFirestoreSchema,
  type UserProfileFirestore,
  UserProfileFirestoreDataSchema, 
  type UserProfileFirestoreData
} from '@/schemas/userProfileSchema';
import { ZodError } from 'zod';

const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;
const COLLECTION_NAME = "usuarios";

// ===================
// GET USER PROFILE
// ===================
export async function getUserProfile(userId: string): Promise<UserProfileFirestore | null> {
  if (!adminDb) {
    console.error("[UserProfileService SERVER - ADMIN] ERRO CRÍTICO: Firestore (adminDb) não está inicializado.");
    throw new Error("Firestore Admin não inicializado.");
  }
  if (!userId) {
    console.error("[UserProfileService SERVER - ADMIN] ERRO: userId não fornecido para getUserProfile.");
    throw new Error("userId obrigatório.");
  }

  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(userId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const rawData = docSnap.data();
    const parsed = UserProfileFirestoreSchema.parse(rawData);
    return parsed;
  } catch (err: any) {
    if (err instanceof ZodError) {
      console.error(`[UserProfileService SERVER - ADMIN] [getUserProfile] Falha de validação Zod para userId ${userId}:`, err.flatten());
      throw new Error("Dados inválidos no perfil do usuário no banco de dados.");
    }
    console.error(`[UserProfileService SERVER - ADMIN] [getUserProfile] Erro inesperado ao buscar perfil para userId ${userId}:`, err.message, err.code, err.stack);
    throw new Error("Falha ao buscar perfil do usuário: " + err.message);
  }
}

// ===================
// UPSERT USER PROFILE
// ===================
export async function upsertUserProfile(userId: string, data: UserProfileFirestoreData): Promise<UserProfileFirestore> {
  if (!adminDb) {
    console.error("[UserProfileService SERVER - ADMIN] ERRO CRÍTICO: Firestore (adminDb) não está inicializado.");
    throw new Error("Firestore Admin não inicializado.");
  }
  if (!userId) {
    console.error("[UserProfileService SERVER - ADMIN] ERRO: userId não fornecido para upsertUserProfile.");
    throw new Error("userId obrigatório.");
  }

  const result = UserProfileFirestoreDataSchema.safeParse(data);
  if (!result.success) {
    console.error(`[UserProfileService SERVER - ADMIN] [upsertUserProfile] Erro de validação Zod para dados de entrada do userId ${userId}:`, result.error.flatten());
    throw new ZodError(result.error.issues);
  }

  const validated = result.data;
  const docRef = adminDb.collection(COLLECTION_NAME).doc(userId);

  try {
    let createdAtValue: admin.firestore.FieldValue | typeof Timestamp | undefined = undefined;
    let isNewDocument = true;

    // Verifica se o documento já existe para preservar o createdAt
    try {
      const currentDocSnap = await docRef.get();
      if (currentDocSnap.exists) {
        isNewDocument = false;
        const existingData = currentDocSnap.data();
        if (existingData?.createdAt instanceof Timestamp) {
          createdAtValue = existingData.createdAt;
        } else if (existingData?.createdAt) {
           console.warn(`[UserProfileService SERVER - ADMIN] Documento ${userId} existente, mas 'createdAt' não é um Timestamp Firestore. Será sobrescrito se for novo, ou mantido se não for definido no payload.`);
        }
      }
    } catch (readError: any) {
      // Este erro é crítico, pois não saber se o doc existe pode levar à perda de createdAt
      console.error(`[UserProfileService SERVER - ADMIN] ERRO CRÍTICO ao verificar existência do documento ${userId} antes do upsert:`, readError.message, readError.code);
      throw new Error(`Falha ao verificar estado do perfil antes de salvar: ${readError.message}`);
    }

    const dataToSet: Record<string, any> = {
      ...validated,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isNewDocument) {
      dataToSet.createdAt = FieldValue.serverTimestamp();
    } else if (createdAtValue) { // Se é existente E tem um createdAt válido
      dataToSet.createdAt = createdAtValue;
    }
    
    await docRef.set(dataToSet, { merge: true });

    const finalSnap = await docRef.get();
    if (!finalSnap.exists) { // Checagem de segurança
      console.error(`[UserProfileService SERVER - ADMIN] ERRO INESPERADO: Documento ${userId} não encontrado após a operação de set/merge.`);
      throw new Error("Documento não encontrado após salvar. Operação pode ter falhado silenciosamente.");
    }

    const finalData = finalSnap.data();
    if (!finalData) { // Outra checagem de segurança
        console.error(`[UserProfileService SERVER - ADMIN] ERRO INESPERADO: Documento ${userId} existe, mas data() retornou undefined após set/merge.`);
        throw new Error("Dados do documento não puderam ser lidos após salvar.");
    }
    
    return UserProfileFirestoreSchema.parse(finalData); // Validar os dados lidos

  } catch (err: any) {
    if (err instanceof ZodError) { // Se o parse do finalData falhar
        console.error(`[UserProfileService SERVER - ADMIN] [upsertUserProfile] Falha de validação Zod nos dados finais do perfil ${userId}:`, err.flatten());
        throw new Error("Os dados salvos no perfil do usuário estão inválidos.");
    }
    if (err.code === 'permission-denied' || (err.code === 7 && err.message?.toUpperCase().includes('PERMISSION_DENIED'))) {
      console.warn(`[UserProfileService SERVER - ADMIN] [upsertUserProfile] PERMISSION_DENIED ao salvar perfil para ${userId}. Verifique as permissões da conta de serviço no IAM do Google Cloud (ex: 'Cloud Datastore User' ou 'Firebase Rules System') e as regras de segurança do Firestore (embora o Admin SDK geralmente as ignore). Path: ${COLLECTION_NAME}/${userId}. Detalhes do erro: ${err.message} (Código: ${err.code})`);
    }
    console.error(`[UserProfileService SERVER - ADMIN] [upsertUserProfile] Erro geral ao salvar perfil para ${userId}:`, err.message, err.code, err.stack);
    throw new Error("Erro ao salvar perfil do usuário: " + err.message);
  }
}
