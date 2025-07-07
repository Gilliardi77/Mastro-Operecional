import {
  CustoFixoConfiguradoSchema,
  CustoFixoConfiguradoCreateSchema,
  CustoFixoConfiguradoUpdateSchema,
  type CustoFixoConfigurado,
  type CustoFixoConfiguradoCreateData,
  type CustoFixoConfiguradoUpdateData,
} from '@/schemas/custoFixoConfiguradoSchema';
import {
  createDocument,
  getDocumentById,
  getAllDocumentsByUserId,
  updateDocument,
  deleteDocument,
  queryDocuments,
} from './firestoreService';
import type { QueryConstraint } from 'firebase/firestore';


const COLLECTION_NAME = 'custosFixosConfigurados';

/**
 * Cria um novo Custo Fixo Configurado.
 */
export async function createCustoFixoConfigurado(userId: string, data: CustoFixoConfiguradoCreateData): Promise<CustoFixoConfigurado> {
  return createDocument(COLLECTION_NAME, userId, CustoFixoConfiguradoCreateSchema, CustoFixoConfiguradoSchema, data);
}

/**
 * Obtém um Custo Fixo Configurado pelo seu ID.
 */
export async function getCustoFixoConfiguradoById(id: string): Promise<CustoFixoConfigurado | null> {
  return getDocumentById(COLLECTION_NAME, id, CustoFixoConfiguradoSchema);
}

/**
 * Obtém todos os Custos Fixos Configurados de um usuário.
 */
export async function getAllCustosFixosConfigurados(
  userId: string,
  ativos: boolean = true // por padrão, busca apenas os ativos
): Promise<CustoFixoConfigurado[]> {
  if (ativos) {
    const { where } = await import('firebase/firestore');
    const constraints: QueryConstraint[] = [
      where("userId", "==", userId),
      where("ativo", "==", true)
    ];
    return queryDocuments(COLLECTION_NAME, constraints, CustoFixoConfiguradoSchema);
  } else {
    return getAllDocumentsByUserId(COLLECTION_NAME, userId, CustoFixoConfiguradoSchema, 'nome', 'asc');
  }
}

/**
 * Atualiza um Custo Fixo Configurado.
 */
export async function updateCustoFixoConfigurado(id: string, data: CustoFixoConfiguradoUpdateData): Promise<CustoFixoConfigurado> {
  const updatedDoc = await updateDocument(COLLECTION_NAME, id, data, CustoFixoConfiguradoUpdateSchema, CustoFixoConfiguradoSchema);
  if (!updatedDoc) {
    throw new Error(`Custo Fixo Configurado com ID ${id} não encontrado após a atualização.`);
  }
  return updatedDoc;
}

/**
 * Exclui um Custo Fixo Configurado.
 */
export async function deleteCustoFixoConfigurado(id: string): Promise<void> {
  return deleteDocument(COLLECTION_NAME, id);
}
