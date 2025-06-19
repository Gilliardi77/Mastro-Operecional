
import {
  VendaSchema,
  VendaCreateSchema,
  VendaUpdateSchema,
  type Venda,
  type VendaCreateData,
  type VendaUpdateData,
} from '@/schemas/vendaSchema';
import {
  createDocument,
  getDocumentById,
  getAllDocumentsByUserId,
  updateDocument,
  deleteDocument,
  queryDocuments,
} from './firestoreService';
import type { QueryConstraint } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp


/**
 * Nome da coleção no Firestore para vendas.
 * Definido conforme DATA_SYNC_CONFIG.json.
 */
const COLLECTION_NAME = 'vendas';

/**
 * Cria uma nova venda.
 * @param userId O ID do usuário proprietário.
 * @param data Os dados para a nova venda.
 * @returns A venda criada.
 */
export async function createVenda(userId: string, data: VendaCreateData): Promise<Venda> {
  return createDocument(COLLECTION_NAME, userId, VendaCreateSchema, VendaSchema, data);
}

/**
 * Obtém uma venda pelo seu ID.
 * @param id O ID da venda.
 * @returns A venda, ou null se não encontrada.
 */
export async function getVendaById(id: string): Promise<Venda | null> {
  return getDocumentById(COLLECTION_NAME, id, VendaSchema);
}

/**
 * Obtém todas as vendas de um usuário específico.
 * @param userId O ID do usuário.
 * @param orderByField Campo para ordenação (opcional, padrão 'dataVenda').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'desc').
 * @returns Uma lista de vendas.
 */
export async function getAllVendasByUserId(
  userId: string,
  orderByField: keyof Venda & string = 'dataVenda',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<Venda[]> {
  return getAllDocumentsByUserId(COLLECTION_NAME, userId, VendaSchema, orderByField, orderDirection);
}

/**
 * Obtém vendas de um usuário dentro de um intervalo de datas.
 * @param userId O ID do usuário.
 * @param startDate Data de início do intervalo.
 * @param endDate Data de fim do intervalo.
 * @param orderByField Campo para ordenação (opcional, padrão 'dataVenda').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'desc').
 * @returns Uma lista de vendas.
 */
export async function getVendasByUserIdAndDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
  orderByField: keyof Venda & string = 'dataVenda',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<Venda[]> {
  const { where, orderBy } = await import('firebase/firestore');
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    where("dataVenda", ">=", Timestamp.fromDate(startDate)),
    where("dataVenda", "<=", Timestamp.fromDate(endDate)),
    orderBy(orderByField, orderDirection)
  ];
  
  if (orderByField !== 'dataVenda') {
      console.warn(`Querying vendas by date range and ordering by ${orderByField}. Ensure composite index (userId, dataVenda, ${orderByField}) exists.`);
  }

  return queryDocuments(COLLECTION_NAME, constraints, VendaSchema);
}

/**
 * Atualiza uma venda existente.
 * @param id O ID da venda a ser atualizada.
 * @param data Os dados para atualizar a venda.
 * @returns A venda atualizada.
 */
export async function updateVenda(id: string, data: VendaUpdateData): Promise<Venda> {
  const updatedVenda = await updateDocument(COLLECTION_NAME, id, data, VendaUpdateSchema, VendaSchema);
  if (!updatedVenda) {
    throw new Error(`Venda com ID ${id} não encontrada após a atualização.`);
  }
  return updatedVenda;
}

/**
 * Exclui uma venda.
 * @param id O ID da venda a ser excluída.
 */
export async function deleteVenda(id: string): Promise<void> {
  return deleteDocument(COLLECTION_NAME, id);
}
