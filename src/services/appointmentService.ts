
import {
  AppointmentSchema,
  AppointmentCreateSchema,
  AppointmentUpdateSchema,
  type Appointment,
  type AppointmentCreateData,
  type AppointmentUpdateData,
} from '@/schemas/appointmentSchema';
import {
  createDocument,
  getDocumentById,
  getAllDocumentsByUserId,
  updateDocument,
  deleteDocument,
} from './firestoreService';

/**
 * Nome da coleção no Firestore para agendamentos.
 * Definido conforme DATA_SYNC_CONFIG.json.
 */
const COLLECTION_NAME = 'agendamentos';

/**
 * Cria um novo agendamento.
 * @param userId O ID do usuário proprietário do agendamento.
 * @param data Os dados para o novo agendamento.
 * @returns O agendamento criado.
 */
export async function createAppointment(userId: string, data: AppointmentCreateData): Promise<Appointment> {
  // A validação de 'data' contra AppointmentCreateSchema ocorre dentro de createDocument
  return createDocument(COLLECTION_NAME, userId, AppointmentCreateSchema, AppointmentSchema, data);
}

/**
 * Obtém um agendamento pelo seu ID.
 * @param id O ID do agendamento.
 * @returns O agendamento, ou null se não encontrado.
 */
export async function getAppointmentById(id: string): Promise<Appointment | null> {
  return getDocumentById(COLLECTION_NAME, id, AppointmentSchema);
}

/**
 * Obtém todos os agendamentos de um usuário específico.
 * @param userId O ID do usuário.
 * @param orderByField Campo para ordenação (opcional, padrão 'dataHora').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'asc').
 * @returns Uma lista de agendamentos.
 */
export async function getAllAppointmentsByUserId(
  userId: string,
  orderByField: keyof Appointment & string = 'dataHora',
  orderDirection: 'asc' | 'desc' = 'asc'
): Promise<Appointment[]> {
  return getAllDocumentsByUserId(COLLECTION_NAME, userId, AppointmentSchema, orderByField, orderDirection);
}

/**
 * Atualiza um agendamento existente.
 * @param id O ID do agendamento a ser atualizado.
 * @param data Os dados para atualizar o agendamento.
 * @returns O agendamento atualizado.
 */
export async function updateAppointment(id: string, data: AppointmentUpdateData): Promise<Appointment> {
  const updatedAppointment = await updateDocument(COLLECTION_NAME, id, data, AppointmentUpdateSchema, AppointmentSchema);
  if (!updatedAppointment) {
    throw new Error(`Agendamento com ID ${id} não encontrado após a atualização.`);
  }
  return updatedAppointment;
}

/**
 * Exclui um agendamento.
 * @param id O ID do agendamento a ser excluído.
 */
export async function deleteAppointment(id: string): Promise<void> {
  return deleteDocument(COLLECTION_NAME, id);
}
