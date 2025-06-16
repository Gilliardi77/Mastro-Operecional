import {
  OrdemProducaoSchema,
  OrdemProducaoCreateSchema,
  OrdemProducaoUpdateSchema,
  type OrdemProducao,
  type OrdemProducaoCreateData,
  type OrdemProducaoUpdateData,
} from '@/schemas/ordemProducaoSchema';
import {
  createDocument,
  getDocumentById,
  getAllDocumentsByUserId,
  updateDocument,
  deleteDocument,
  queryDocuments,
} from './firestoreService';
import type { QueryConstraint } from 'firebase/firestore';

const COLLECTION_NAME = 'ordensDeProducao';

/**
 * Cria uma nova Ordem de Produção.
 * @param userId O ID do usuário proprietário.
 * @param data Os dados para a nova OP.
 * @returns A Ordem de Produção criada.
 */
export async function createOrdemProducao(userId: string, data: OrdemProducaoCreateData): Promise<OrdemProducao> {
  return createDocument(COLLECTION_NAME, userId, OrdemProducaoCreateSchema, OrdemProducaoSchema, data);
}

/**
 * Obtém uma Ordem de Produção pelo seu ID.
 * @param id O ID da OP.
 * @returns A OP, ou null se não encontrada.
 */
export async function getOrdemProducaoById(id: string): Promise<OrdemProducao | null> {
  return getDocumentById(COLLECTION_NAME, id, OrdemProducaoSchema);
}

/**
 * Obtém todas as Ordens de Produção de um usuário específico.
 * @param userId O ID do usuário.
 * @param orderByField Campo para ordenação (opcional, padrão 'dataAgendamento').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'desc').
 * @returns Uma lista de Ordens de Produção.
 */
export async function getAllOrdensProducaoByUserId(
  userId: string,
  orderByField: keyof OrdemProducao & string = 'dataAgendamento',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<OrdemProducao[]> {
  return getAllDocumentsByUserId(COLLECTION_NAME, userId, OrdemProducaoSchema, orderByField, orderDirection);
}

/**
 * Atualiza uma Ordem de Produção existente.
 * @param id O ID da OP a ser atualizada.
 * @param data Os dados para atualizar a OP.
 * @returns A OP atualizada.
 */
export async function updateOrdemProducao(id: string, data: OrdemProducaoUpdateData): Promise<OrdemProducao> {
  const updatedOP = await updateDocument(COLLECTION_NAME, id, data, OrdemProducaoUpdateSchema, OrdemProducaoSchema);
  if (!updatedOP) {
    throw new Error(`Ordem de Produção com ID ${id} não encontrada após a atualização.`);
  }
  return updatedOP;
}

/**
 * Exclui uma Ordem de Produção.
 * @param id O ID da OP a ser excluída.
 */
export async function deleteOrdemProducao(id: string): Promise<void> {
  return deleteDocument(COLLECTION_NAME, id);
}

/**
 * Obtém Ordens de Produção com base no ID da Ordem de Serviço original.
 * @param userId O ID do usuário.
 * @param agendamentoId O ID da Ordem de Serviço original (campo 'agendamentoId' na OP).
 * @returns Uma lista de Ordens de Produção relacionadas.
 */
export async function getOrdensProducaoByAgendamentoId(userId: string, agendamentoId: string): Promise<OrdemProducao[]> {
    const { where } = await import('firebase/firestore');
    const constraints: QueryConstraint[] = [
        where("userId", "==", userId),
        where("agendamentoId", "==", agendamentoId),
        orderBy("createdAt", "desc") // Opcional, para pegar a mais recente se houver múltiplas
    ];
    return queryDocuments(COLLECTION_NAME, constraints, OrdemProducaoSchema);
}