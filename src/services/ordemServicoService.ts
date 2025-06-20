
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
  OrdemServicoStatusEnum // Mantido para exportação, se necessário em outros lugares
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
  // O schema OrdemServicoCreateSchema (passado para createDocument)
  // já tem status: OrdemServicoStatusEnum.optional().default("Pendente").
  // Isso garante que o Zod aplicará "Pendente" se data.status for undefined.
  // A função createDocument lida com a validação de 'data' contra OrdemServicoCreateSchema.
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
  // OrdemServicoSchema tem um default para 'status', então não deveria ser undefined após o parse.
  // Este filtro é uma camada extra de segurança para a tipagem TypeScript.
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
  // OrdemServicoUpdateSchema permite que status seja opcional (significando "não atualizar se não fornecido").
  // OrdemServicoSchema (usado como fullSchema no updateDocument) garante que o objeto retornado tenha um status.
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

// Exportar OrdemServicoStatusEnum para uso na ProducaoPage (se necessário)
// Exportar também PaymentStatusEnum, PagamentoOsSchema e PagamentoOsFormValues
export { PaymentStatusEnum, PagamentoOsSchema, type PagamentoOsFormValues };
// OrdemServicoStatusEnum é exportado implicitamente ao ser importado de '@/schemas/ordemServicoSchema'
// e não usado diretamente neste arquivo após as simplificações, mas pode ser necessário em outros locais.
// Para clareza, se for usado por outros módulos através deste serviço, a exportação explícita é boa:
export { OrdemServicoStatusEnum };
    
