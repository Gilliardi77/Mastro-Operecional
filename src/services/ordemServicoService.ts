
import {
  OrdemServicoSchema,
  OrdemServicoCreateSchema,
  OrdemServicoUpdateSchema,
  type OrdemServico,
  type OrdemServicoCreateData,
  type OrdemServicoUpdateData,
} from '@/schemas/ordemServicoSchema';
import {
  createDocument,
  getDocumentById,
  getAllDocumentsByUserId,
  updateDocument,
  deleteDocument,
} from './firestoreService';

/**
 * Nome da coleção no Firestore para ordens de serviço.
 * Definido conforme DATA_SYNC_CONFIG.json.
 */
const COLLECTION_NAME = 'ordensServico';

/**
 * Cria uma nova Ordem de Serviço.
 * @param userId O ID do usuário proprietário.
 * @param data Os dados para a nova OS.
 * @returns A Ordem de Serviço criada.
 */
export async function createOrdemServico(userId: string, data: OrdemServicoCreateData): Promise<OrdemServico> {
  // A validação de 'data' contra OrdemServicoCreateSchema ocorre dentro de createDocument
  // e também podemos adicionar uma camada aqui se necessário.
  // O campo numeroOS será preenchido com o ID do documento gerado pelo Firestore.
  const dataToCreate = { ...data };
  if (!dataToCreate.numeroOS) { // Se numeroOS não veio, será o ID
    // Deixamos o createDocument lidar com isso, ele usará o docRef.id
  }
  const createdDoc = await createDocument(COLLECTION_NAME, userId, OrdemServicoCreateSchema, OrdemServicoSchema, dataToCreate);
  
  // Se o numeroOS não foi fornecido e o ID do documento é usado como numeroOS,
  // pode ser necessário um update adicional se numeroOS precisar ser explicitamente o ID.
  // Por ora, assumimos que o schema e o firestoreService cuidam da estrutura.
  if (!createdDoc.numeroOS) {
     const osWithNumero = { ...createdDoc, numeroOS: createdDoc.id };
     // Atualiza o documento recém-criado para incluir o numeroOS se ele não foi definido.
     // Isso garante que numeroOS sempre tenha um valor (o ID do documento se não especificado).
     return updateOrdemServico(createdDoc.id, { numeroOS: createdDoc.id });
  }
  return createdDoc;
}

/**
 * Obtém uma Ordem de Serviço pelo seu ID.
 * @param id O ID da OS.
 * @returns A OS, ou null se não encontrada.
 */
export async function getOrdemServicoById(id: string): Promise<OrdemServico | null> {
  return getDocumentById(COLLECTION_NAME, id, OrdemServicoSchema);
}

/**
 * Obtém todas as Ordens de Serviço de um usuário específico.
 * @param userId O ID do usuário.
 * @param orderByField Campo para ordenação (opcional, padrão 'criadoEm').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'desc').
 * @returns Uma lista de Ordens de Serviço.
 */
export async function getAllOrdensServicoByUserId(
  userId: string,
  orderByField: keyof OrdemServico & string = 'createdAt',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<OrdemServico[]> {
  return getAllDocumentsByUserId(COLLECTION_NAME, userId, OrdemServicoSchema, orderByField, orderDirection);
}

/**
 * Atualiza uma Ordem de Serviço existente.
 * @param id O ID da OS a ser atualizada.
 * @param data Os dados para atualizar a OS.
 * @returns A OS atualizada.
 */
export async function updateOrdemServico(id: string, data: OrdemServicoUpdateData): Promise<OrdemServico> {
  const updatedOS = await updateDocument(COLLECTION_NAME, id, data, OrdemServicoUpdateSchema, OrdemServicoSchema);
  if (!updatedOS) {
    throw new Error(`Ordem de Serviço com ID ${id} não encontrada após a atualização.`);
  }
  return updatedOS;
}

/**
 * Exclui uma Ordem de Serviço.
 * @param id O ID da OS a ser excluída.
 */
export async function deleteOrdemServico(id: string): Promise<void> {
  return deleteDocument(COLLECTION_NAME, id);
}
