
'use server';

/**
 * @fileOverview Serviço para gerenciar a entidade Produto/Serviço.
 * Fornece funções CRUD para produtos e serviços.
 *
 * Funções Exportadas:
 * - createProductService: Cria um novo produto/serviço.
 * - getProductServiceById: Busca um produto/serviço pelo ID.
 * - getAllProductServicesByUserId: Busca todos os produtos/serviços de um usuário.
 * - updateProductService: Atualiza um produto/serviço existente.
 * - deleteProductService: Remove um produto/serviço.
 * - getProductServicesByType: Busca produtos/serviços de um usuário por tipo (PRODUTO ou SERVICO).
 */

import { z } from 'zod';
import {
  ProductServiceSchema,
  type ProductService,
  type ItemType,
  ProductServiceCreateSchema,
  type ProductServiceCreateData,
  ProductServiceUpdateSchema,
  type ProductServiceUpdateData
} from '@/schemas/productServiceSchema';
import {
  createDocument,
  getDocumentById as getGenericDocumentById,
  getAllDocumentsByUserId as getGenericAllDocumentsByUserId,
  updateDocument as updateGenericDocument,
  deleteDocument as deleteGenericDocument,
  queryDocuments // Importar queryDocuments para filtros mais complexos
} from './firestoreService';
import { where, orderBy } from 'firebase/firestore'; // Importar 'where' e 'orderBy'

const COLLECTION_NAME = "produtosServicos";

/**
 * Cria um novo produto ou serviço para um usuário específico.
 * @param {string} userId - O ID do usuário proprietário.
 * @param {ProductServiceCreateData} data - Dados do produto/serviço.
 * @returns {Promise<ProductService>} O produto/serviço criado.
 */
export async function createProductService(userId: string, data: ProductServiceCreateData): Promise<ProductService> {
  const validatedData = ProductServiceCreateSchema.parse(data);
  return createDocument<ProductService>(COLLECTION_NAME, userId, validatedData);
}

/**
 * Busca um produto/serviço específico pelo seu ID.
 * @param {string} id - O ID do produto/serviço.
 * @returns {Promise<ProductService | null>} O item encontrado ou null.
 */
export async function getProductServiceById(id: string): Promise<ProductService | null> {
  const item = await getGenericDocumentById<ProductService>(COLLECTION_NAME, id);
  return item ? ProductServiceSchema.parse(item) : null;
}

/**
 * Busca todos os produtos/serviços de um usuário.
 * @param {string} userId - O ID do usuário.
 * @param {'nome' | 'precoVenda' | 'tipo' | 'createdAt' | 'updatedAt'} [orderByField='nome'] - Campo para ordenação.
 * @param {'asc' | 'desc'} [orderDirection='asc'] - Direção da ordenação.
 * @returns {Promise<ProductService[]>} Lista de produtos/serviços.
 */
export async function getAllProductServicesByUserId(
  userId: string,
  orderByField: 'nome' | 'precoVenda' | 'tipo' | 'createdAt' | 'updatedAt' = 'nome',
  orderDirection: 'asc' | 'desc' = 'asc'
): Promise<ProductService[]> {
  const items = await getGenericAllDocumentsByUserId<ProductService>(COLLECTION_NAME, userId, orderByField, orderDirection);
  return items.map(item => ProductServiceSchema.parse(item));
}

/**
 * Atualiza um produto/serviço existente.
 * @param {string} id - O ID do produto/serviço.
 * @param {ProductServiceUpdateData} data - Dados a serem atualizados.
 * @returns {Promise<ProductService | null>} O item atualizado ou null se não encontrado.
 */
export async function updateProductService(id: string, data: ProductServiceUpdateData): Promise<ProductService | null> {
  const validatedData = ProductServiceUpdateSchema.parse(data);
  const updatedItem = await updateGenericDocument<ProductService>(COLLECTION_NAME, id, validatedData);
  return updatedItem ? ProductServiceSchema.parse(updatedItem) : null;
}

/**
 * Remove um produto/serviço pelo seu ID.
 * @param {string} id - O ID do produto/serviço.
 * @returns {Promise<void>}
 */
export async function deleteProductService(id: string): Promise<void> {
  return deleteGenericDocument(COLLECTION_NAME, id);
}

/**
 * Busca produtos/serviços de um usuário, filtrando por tipo (PRODUTO ou SERVICO).
 * @param {string} userId - O ID do usuário.
 * @param {ItemType} itemType - O tipo de item a ser filtrado ('PRODUTO' ou 'SERVICO').
 * @param {'nome' | 'precoVenda' | 'createdAt'} [orderByField='nome'] - Campo para ordenação.
 * @param {'asc' | 'desc'} [orderDirection='asc'] - Direção da ordenação.
 * @returns {Promise<ProductService[]>} Lista de produtos/serviços filtrados.
 */
export async function getProductServicesByType(
  userId: string,
  itemType: ItemType,
  orderByField: 'nome' | 'precoVenda' | 'createdAt' = 'nome',
  orderDirection: 'asc' | 'desc' = 'asc'
): Promise<ProductService[]> {
  const constraints = [
    where("userId", "==", userId),
    where("tipo", "==", itemType),
    orderBy(orderByField, orderDirection)
  ];
  const items = await queryDocuments<ProductService>(COLLECTION_NAME, constraints);
  return items.map(item => ProductServiceSchema.parse(item));
}
