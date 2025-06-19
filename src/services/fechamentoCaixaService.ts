
import {
  FechamentoCaixaSchema,
  FechamentoCaixaCreateSchema,
  // FechamentoCaixaUpdateSchema, // Se necessário no futuro
  type FechamentoCaixa,
  type FechamentoCaixaCreateData,
  // type FechamentoCaixaUpdateData, // Se necessário no futuro
} from '@/schemas/fechamentoCaixaSchema';
import {
  createDocument,
  getDocumentById,
  getAllDocumentsByUserId,
  // updateDocument, // Se necessário no futuro
  // deleteDocument, // Se necessário no futuro
} from './firestoreService';

/**
 * Nome da coleção no Firestore para fechamentos de caixa.
 * Definido conforme a solicitação do usuário e será adicionado ao DATA_SYNC_CONFIG.json.
 */
const COLLECTION_NAME = 'fechamentosCaixa';

/**
 * Cria um novo registro de fechamento de caixa.
 * @param userId O ID do usuário proprietário do fechamento.
 * @param data Os dados para o novo fechamento.
 * @returns O fechamento de caixa criado.
 */
export async function createFechamentoCaixa(userId: string, data: FechamentoCaixaCreateData): Promise<FechamentoCaixa> {
  return createDocument(COLLECTION_NAME, userId, FechamentoCaixaCreateSchema, FechamentoCaixaSchema, data);
}

/**
 * Obtém um fechamento de caixa pelo seu ID.
 * @param id O ID do fechamento.
 * @returns O fechamento, ou null se não encontrado.
 */
export async function getFechamentoCaixaById(id: string): Promise<FechamentoCaixa | null> {
  return getDocumentById(COLLECTION_NAME, id, FechamentoCaixaSchema);
}

/**
 * Obtém todos os fechamentos de caixa de um usuário específico.
 * Útil para histórico.
 * @param userId O ID do usuário.
 * @param orderByField Campo para ordenação (opcional, padrão 'dataFechamento').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'desc').
 * @returns Uma lista de fechamentos de caixa.
 */
export async function getAllFechamentosCaixaByUserId(
  userId: string,
  orderByField: keyof FechamentoCaixa & string = 'dataFechamento',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<FechamentoCaixa[]> {
  return getAllDocumentsByUserId(COLLECTION_NAME, userId, FechamentoCaixaSchema, orderByField, orderDirection);
}

// Funções de update e delete podem ser adicionadas aqui se forem necessárias no futuro.
// export async function updateFechamentoCaixa(id: string, data: FechamentoCaixaUpdateData): Promise<FechamentoCaixa> { ... }
// export async function deleteFechamentoCaixa(id: string): Promise<void> { ... }
