
import {
  LancamentoFinanceiroSchema,
  LancamentoFinanceiroCreateSchema,
  LancamentoFinanceiroUpdateSchema,
  type LancamentoFinanceiro,
  type LancamentoFinanceiroCreateData,
  type LancamentoFinanceiroUpdateData,
} from '@/schemas/lancamentoFinanceiroSchema';
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
 * Nome da coleção no Firestore para lançamentos financeiros.
 * Definido conforme DATA_SYNC_CONFIG.json.
 */
const COLLECTION_NAME = 'lancamentosFinanceiros';

/**
 * Cria um novo lançamento financeiro.
 * @param userId O ID do usuário proprietário.
 * @param data Os dados para o novo lançamento.
 * @returns O lançamento criado.
 */
export async function createLancamentoFinanceiro(userId: string, data: LancamentoFinanceiroCreateData): Promise<LancamentoFinanceiro> {
  return createDocument(COLLECTION_NAME, userId, LancamentoFinanceiroCreateSchema, LancamentoFinanceiroSchema, data);
}

/**
 * Obtém um lançamento financeiro pelo seu ID.
 * @param id O ID do lançamento.
 * @returns O lançamento, ou null se não encontrado.
 */
export async function getLancamentoFinanceiroById(id: string): Promise<LancamentoFinanceiro | null> {
  return getDocumentById(COLLECTION_NAME, id, LancamentoFinanceiroSchema);
}

/**
 * Obtém todos os lançamentos financeiros de um usuário específico.
 * @param userId O ID do usuário.
 * @param orderByField Campo para ordenação (opcional, padrão 'data').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'desc').
 * @returns Uma lista de lançamentos.
 */
export async function getAllLancamentosFinanceirosByUserId(
  userId: string,
  orderByField: keyof LancamentoFinanceiro & string = 'data',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<LancamentoFinanceiro[]> {
  return getAllDocumentsByUserId(COLLECTION_NAME, userId, LancamentoFinanceiroSchema, orderByField, orderDirection);
}

/**
 * Obtém lançamentos financeiros de um usuário dentro de um intervalo de datas.
 * @param userId O ID do usuário.
 * @param startDate Data de início do intervalo.
 * @param endDate Data de fim do intervalo.
 * @param orderByField Campo para ordenação (opcional, padrão 'data').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'desc').
 * @returns Uma lista de lançamentos financeiros.
 */
export async function getLancamentosByUserIdAndDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
  orderByField: keyof LancamentoFinanceiro & string = 'data',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<LancamentoFinanceiro[]> {
  const { where } = await import('firebase/firestore');
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    where("data", ">=", Timestamp.fromDate(startDate)),
    where("data", "<=", Timestamp.fromDate(endDate)),
    // Firestore requires the first orderBy to be on the field used in range comparisons
    // If orderByField is different from 'data', you might need a composite index or adjust logic.
    // For simplicity, if orderByField is 'data', this is fine. Otherwise, this specific orderBy might conflict.
    orderBy(orderByField, orderDirection)
  ];
  
  // If orderByField is not 'data', and you still want to order by it *after* filtering by date,
  // the primary sort for the query must be 'data'. Client-side sorting might be an option for secondary sort.
  // Or, ensure a composite index `(userId, data, your_orderByField)` exists.
  // For now, we assume 'data' is the primary sort or an index covers it.
  if (orderByField !== 'data') {
      console.warn(`Querying lancamentos by date range and ordering by ${orderByField}. Ensure composite index exists.`);
  }

  return queryDocuments(COLLECTION_NAME, constraints, LancamentoFinanceiroSchema);
}


/**
 * Atualiza um lançamento financeiro existente.
 * @param id O ID do lançamento a ser atualizado.
 * @param data Os dados para atualizar o lançamento.
 * @returns O lançamento atualizado.
 */
export async function updateLancamentoFinanceiro(id: string, data: LancamentoFinanceiroUpdateData): Promise<LancamentoFinanceiro> {
  const updatedLancamento = await updateDocument(COLLECTION_NAME, id, data, LancamentoFinanceiroUpdateSchema, LancamentoFinanceiroSchema);
  if (!updatedLancamento) {
    throw new Error(`Lançamento financeiro com ID ${id} não encontrado após a atualização.`);
  }
  return updatedLancamento;
}

/**
 * Exclui um lançamento financeiro.
 * @param id O ID do lançamento a ser excluído.
 */
export async function deleteLancamentoFinanceiro(id: string): Promise<void> {
  return deleteDocument(COLLECTION_NAME, id);
}
