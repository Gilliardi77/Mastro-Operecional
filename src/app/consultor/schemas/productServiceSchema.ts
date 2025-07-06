
/**
 * @fileOverview Zod schema e tipos TypeScript para a entidade Produto/Serviço.
 *
 * Exports:
 * - ProductServiceSchema: Schema Zod completo para um produto ou serviço.
 * - ProductService: Tipo TypeScript inferido de ProductServiceSchema.
 * - ProductServiceCreateSchema: Schema Zod para criar um novo produto/serviço.
 * - ProductServiceCreateData: Tipo TypeScript inferido de ProductServiceCreateSchema.
 * - ProductServiceUpdateSchema: Schema Zod para atualizar um produto/serviço existente.
 * - ProductServiceUpdateData: Tipo TypeScript inferido de ProductServiceUpdateSchema.
 */

import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema } from './commonSchemas';

const ItemTypeEnum = z.enum(["PRODUTO", "SERVICO"], {
  required_error: "O tipo do item (PRODUTO ou SERVICO) é obrigatório.",
  invalid_type_error: "Tipo de item inválido. Deve ser PRODUTO ou SERVICO.",
});
export type ItemType = z.infer<typeof ItemTypeEnum>;

/**
 * Schema Zod para a entidade Produto/Serviço.
 * Representa um item que pode ser vendido, seja um produto físico ou um serviço.
 */
export const ProductServiceSchema = BaseSchema.extend({
  nome: z.string().min(1, "Nome do item é obrigatório.").describe("Nome do produto ou serviço."),
  descricao: z.string().optional().or(z.literal('')).describe("Descrição detalhada do produto ou serviço (opcional)."),
  tipo: ItemTypeEnum.describe("Define se é um PRODUTO ou um SERVICO."),
  precoVenda: z.number().positive("Preço de venda deve ser um número positivo.").describe("Preço de venda unitário."),
  precoCusto: z.number().optional().describe("Preço de custo unitário (opcional)."),
  unidadeMedida: z.string().optional().or(z.literal('')).describe("Unidade de medida (ex: un, kg, hr, peça) (opcional)."),
  codigoBarras: z.string().optional().or(z.literal('')).describe("Código de barras do produto (opcional)."),
  categoria: z.string().optional().or(z.literal('')).describe("Categoria do produto ou serviço (opcional)."),
  estoqueAtual: z.number().optional().describe("Quantidade atual em estoque (relevante para PRODUTO, opcional)."),
  estoqueMinimo: z.number().optional().describe("Quantidade mínima em estoque para alerta (relevante para PRODUTO, opcional)."),
  fornecedor: z.string().optional().or(z.literal('')).describe("Nome do fornecedor principal (opcional)."),
  ativo: z.boolean().default(true).describe("Indica se o produto/serviço está ativo para venda (default: true)."),
});
export type ProductService = z.infer<typeof ProductServiceSchema>;

/**
 * Schema Zod para dados de entrada ao criar um novo Produto/Serviço.
 */
export const ProductServiceCreateSchema = BaseCreateSchema.merge(ProductServiceSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true }));
export type ProductServiceCreateData = z.infer<typeof ProductServiceCreateSchema>;

/**
 * Schema Zod para dados de entrada ao atualizar um Produto/Serviço existente.
 * Todos os campos específicos são opcionais.
 */
export const ProductServiceUpdateSchema = BaseUpdateSchema.merge(ProductServiceSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true }).partial());
export type ProductServiceUpdateData = z.infer<typeof ProductServiceUpdateSchema>;
