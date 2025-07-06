
'use server';

/**
 * @fileOverview Serviço para gerenciar a entidade Cliente.
 * Fornece funções CRUD (Create, Read, Update, Delete) para clientes,
 * utilizando o firestoreService genérico e os schemas Zod de Cliente.
 *
 * Funções Exportadas:
 * - createClient: Cria um novo cliente.
 * - getClientById: Busca um cliente pelo ID.
 * - getAllClientsByUserId: Busca todos os clientes de um usuário.
 * - updateClient: Atualiza um cliente existente.
 * - deleteClient: Remove um cliente.
 */

import { z } from 'zod';
import {
  ClientSchema,
  type Client,
  ClientCreateSchema,
  type ClientCreateData,
  ClientUpdateSchema,
  type ClientUpdateData
} from '@/schemas/clientSchema';
import {
  createDocument,
  getDocumentById as getGenericDocumentById,
  getAllDocumentsByUserId as getGenericAllDocumentsByUserId,
  updateDocument as updateGenericDocument,
  deleteDocument as deleteGenericDocument
} from './firestoreService';

const COLLECTION_NAME = "clientes";

/**
 * Cria um novo cliente para um usuário específico.
 * @param {string} userId - O ID do usuário proprietário do cliente.
 * @param {ClientCreateData} clientData - Dados do cliente a ser criado.
 * @returns {Promise<Client>} O cliente criado.
 * @throws {Error} Se a validação dos dados falhar ou a criação no Firestore falhar.
 */
export async function createClient(userId: string, clientData: ClientCreateData): Promise<Client> {
  // Validar os dados de entrada usando o schema de criação
  const validatedData = ClientCreateSchema.parse(clientData);
  return createDocument<Client>(COLLECTION_NAME, userId, validatedData);
}

/**
 * Busca um cliente específico pelo seu ID.
 * O cliente deve pertencer ao userId implícito nas regras do Firestore.
 * @param {string} clientId - O ID do cliente a ser buscado.
 * @returns {Promise<Client | null>} O cliente encontrado ou null se não existir.
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  const client = await getGenericDocumentById<Client>(COLLECTION_NAME, clientId);
  // Validar o resultado com o schema completo (opcional, mas bom para consistência)
  return client ? ClientSchema.parse(client) : null;
}

/**
 * Busca todos os clientes pertencentes a um usuário específico.
 * @param {string} userId - O ID do usuário.
 * @param {'nome' | 'createdAt' | 'updatedAt'} [orderByField='nome'] - Campo para ordenar os resultados.
 * @param {'asc' | 'desc'} [orderDirection='asc'] - Direção da ordenação.
 * @returns {Promise<Client[]>} Uma lista de clientes.
 */
export async function getAllClientsByUserId(
  userId: string,
  orderByField: 'nome' | 'createdAt' | 'updatedAt' = 'nome',
  orderDirection: 'asc' | 'desc' = 'asc'
): Promise<Client[]> {
  const clients = await getGenericAllDocumentsByUserId<Client>(COLLECTION_NAME, userId, orderByField, orderDirection);
  // Validar cada cliente (opcional)
  return clients.map(client => ClientSchema.parse(client));
}

/**
 * Atualiza um cliente existente.
 * @param {string} clientId - O ID do cliente a ser atualizado.
 * @param {ClientUpdateData} clientData - Dados do cliente a serem atualizados.
 * @returns {Promise<Client | null>} O cliente atualizado, ou null se não for encontrado.
 * @throws {Error} Se a validação dos dados falhar ou a atualização no Firestore falhar.
 */
export async function updateClient(clientId: string, clientData: ClientUpdateData): Promise<Client | null> {
  // Validar os dados de entrada usando o schema de atualização
  const validatedData = ClientUpdateSchema.parse(clientData);
  if (Object.keys(validatedData).length === 0) {
    // Se não houver dados válidos para atualizar após a remoção de undefined,
    // podemos optar por não fazer a chamada ao Firestore ou buscar e retornar o documento existente.
    // Por simplicidade, vamos permitir a chamada, pois o firestoreService adicionará `updatedAt`.
    // Considerar retornar erro se `validatedData` estiver vazio e não houver intenção de apenas atualizar `updatedAt`.
  }
  const updatedClient = await updateGenericDocument<Client>(COLLECTION_NAME, clientId, validatedData);
  return updatedClient ? ClientSchema.parse(updatedClient) : null;
}

/**
 * Remove um cliente pelo seu ID.
 * @param {string} clientId - O ID do cliente a ser removido.
 * @returns {Promise<void>}
 */
export async function deleteClient(clientId: string): Promise<void> {
  return deleteGenericDocument(COLLECTION_NAME, clientId);
}
