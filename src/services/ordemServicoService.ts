
import {
  OrdemServicoSchema,
  OrdemServicoCreateSchema,
  OrdemServicoUpdateSchema,
  type OrdemServico,
  type OrdemServicoCreateData,
  type OrdemServicoUpdateData,
  PaymentStatusEnum, 
  PagamentoOsSchema, 
  type PagamentoOsFormValues,
  OrdemServicoStatusEnum
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
 * A lógica para calcular statusPagamento, valorPagoTotal, etc., a partir do adiantamento
 * agora é feita na página de criação antes de chamar este serviço.
 * O OrdemServicoCreateSchema define um valor padrão para 'status' se não for fornecido.
 * @param userId O ID do usuário proprietário.
 * @param data Os dados para a nova OS.
 * @returns A Ordem de Serviço criada.
 */
export async function createOrdemServico(userId: string, data: OrdemServicoCreateData): Promise<OrdemServico> {
  // OrdemServicoCreateSchema (passado como createSchema para createDocument)
  // tem status: OrdemServicoStatusEnum.optional().default("Pendente").
  // Isso significa que createDocument's call to createSchema.parse(data)
  // irá garantir que status seja "Pendente" se data.status for undefined.
  return createDocument(COLLECTION_NAME, userId, OrdemServicoCreateSchema, OrdemServicoSchema, data);
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
 * @param orderByField Campo para ordenação (opcional, padrão 'createdAt').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'desc').
 * @returns Uma lista de Ordens de Serviço.
 */
export async function getAllOrdensServicoByUserId(
  userId: string,
  orderByField: keyof OrdemServico & string = 'createdAt',
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<OrdemServico[]> {
  // OrdemServicoSchema has a default for 'status', so it should not be undefined after parsing.
  // The filter is an extra safety measure for type correctness if TS inference is tricky.
  const ordens = await getAllDocumentsByUserId(COLLECTION_NAME, userId, OrdemServicoSchema, orderByField, orderDirection);
  return ordens.filter(os => os.status !== undefined) as OrdemServico[];
}

/**
 * Atualiza uma Ordem de Serviço existente.
 * @param id O ID da OS a ser atualizada.
 * @param data Os dados para atualizar a OS.
 * @returns A OS atualizada.
 */
export async function updateOrdemServico(id: string, data: OrdemServicoUpdateData): Promise<OrdemServico> {
  // OrdemServicoUpdateSchema allows status to be optional (meaning "don't update if not provided").
  // OrdemServicoSchema (used as fullSchema in updateDocument) ensures the returned object has a status.
  const dataWithoutUndefinedStatus = { ...data };
  if (dataWithoutUndefinedStatus.status === undefined) {
    // If status is explicitly undefined in the update payload,
    // it means "do not update the status field".
    // We can remove it from the object passed to Firestore if it's truly optional there.
    // However, our updateSchema allows it to be optional, so Firestore won't update it if not present in dataWithoutUndefinedStatus.
    // If it *must* be present in the update payload for some reason but means "no change", this logic needs review.
    // For now, we assume undefined means "don't touch this field".
    // No action needed here as updateDocument only updates provided fields.
  }
  const updatedOS = await updateDocument(COLLECTION_NAME, id, dataWithoutUndefinedStatus, OrdemServicoUpdateSchema, OrdemServicoSchema);
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

// Exportar OrdemServicoStatusEnum para uso na ProducaoPage (se necessário)
// Exportar também PaymentStatusEnum, PagamentoOsSchema e PagamentoOsFormValues
export { OrdemServicoStatusEnum, PaymentStatusEnum, PagamentoOsSchema, type PagamentoOsFormValues };

    