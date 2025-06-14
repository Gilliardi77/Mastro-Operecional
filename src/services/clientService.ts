
'use server';

import {
  ClientSchema,
  ClientCreateSchema,
  ClientUpdateSchema,
  type Client,
  type ClientCreateData,
  type ClientUpdateData,
} from '@/schemas/clientSchema';
import {
  createDocument,
  getDocumentById,
  getAllDocumentsByUserId,
  updateDocument,
  deleteDocument,
} from './firestoreService';

const COLLECTION_NAME = 'clientes';

/**
 * Cria um novo cliente.
 * @param userId O ID do usuário proprietário do cliente.
 * @param data Os dados para o novo cliente, conformes ao ClientCreateData.
 * @returns O cliente criado.
 */
export async function createClient(userId: string, data: ClientCreateData): Promise<Client> {
  return createDocument(COLLECTION_NAME, userId, ClientCreateSchema, ClientSchema, data);
}

/**
 * Obtém um cliente pelo seu ID.
 * @param id O ID do cliente.
 * @returns O cliente, ou null se não encontrado.
 */
export async function getClientById(id: string): Promise<Client | null> {
  return getDocumentById(COLLECTION_NAME, id, ClientSchema);
}

/**
 * Obtém todos os clientes de um usuário específico.
 * @param userId O ID do usuário.
 * @param orderByField Campo para ordenação (opcional, padrão 'nome').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'asc').
 * @returns Uma lista de clientes.
 */
export async function getAllClientsByUserId(
  userId: string,
  orderByField: keyof Client & string = 'nome',
  orderDirection: 'asc' | 'desc' = 'asc'
): Promise<Client[]> {
  return getAllDocumentsByUserId(COLLECTION_NAME, userId, ClientSchema, orderByField, orderDirection);
}

/**
 * Atualiza um cliente existente.
 * @param id O ID do cliente a ser atualizado.
 * @param data Os dados para atualizar o cliente, conformes ao ClientUpdateData.
 * @returns O cliente atualizado.
 */
export async function updateClient(id: string, data: ClientUpdateData): Promise<Client> {
  // Assegurar que o `updateDocument` retorne `Promise<Client>` e não `Promise<Client | null>`
  // pois se o documento não existir, ele deve lançar um erro.
  const updatedClient = await updateDocument(COLLECTION_NAME, id, data, ClientUpdateSchema, ClientSchema);
  if (!updatedClient) {
    // Este caso não deveria acontecer se updateDocument lança erro quando doc não existe
    throw new Error(`Cliente com ID ${id} não encontrado após a atualização.`);
  }
  return updatedClient;
}

/**
 * Exclui um cliente.
 * @param id O ID do cliente a ser excluído.
 */
export async function deleteClient(id: string): Promise<void> {
  return deleteDocument(COLLECTION_NAME, id);
}

// Aqui você pode adicionar outras funções específicas para clientes, se necessário.
// Ex: export async function findClientsWithDebits(userId: string): Promise<Client[]> { ... }
