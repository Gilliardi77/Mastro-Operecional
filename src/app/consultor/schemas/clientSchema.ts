
/**
 * @fileOverview Zod schema e tipos TypeScript para a entidade Cliente.
 *
 * Exports:
 * - ClientSchema: Schema Zod completo para um cliente.
 * - Client: Tipo TypeScript inferido de ClientSchema.
 * - ClientCreateSchema: Schema Zod para criar um novo cliente.
 * - ClientCreateData: Tipo TypeScript inferido de ClientCreateSchema.
 * - ClientUpdateSchema: Schema Zod para atualizar um cliente existente.
 * - ClientUpdateData: Tipo TypeScript inferido de ClientUpdateSchema.
 */

import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema } from './commonSchemas';

/**
 * Schema Zod para a entidade Cliente.
 * Representa um cliente no sistema.
 */
export const ClientSchema = BaseSchema.extend({
  nome: z.string().min(1, "Nome do cliente é obrigatório.").describe("Nome completo do cliente."),
  email: z.string().email("Formato de email inválido.").optional().or(z.literal('')).describe("Endereço de email do cliente (opcional)."),
  telefone: z.string().optional().or(z.literal('')).describe("Número de telefone do cliente (opcional)."),
  endereco: z.string().optional().or(z.literal('')).describe("Endereço do cliente (opcional)."),
  cpfCnpj: z.string().optional().or(z.literal('')).describe("CPF ou CNPJ do cliente (opcional)."),
  dataNascimento: z.string().optional().or(z.literal('')).describe("Data de nascimento do cliente (opcional, formato YYYY-MM-DD)."),
  observacoes: z.string().optional().or(z.literal('')).describe("Observações adicionais sobre o cliente (opcional)."),
});
export type Client = z.infer<typeof ClientSchema>;

/**
 * Schema Zod para dados de entrada ao criar um novo Cliente.
 */
export const ClientCreateSchema = BaseCreateSchema.merge(ClientSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true }));
export type ClientCreateData = z.infer<typeof ClientCreateSchema>;

/**
 * Schema Zod para dados de entrada ao atualizar um Cliente existente.
 * Todos os campos específicos do cliente são opcionais.
 */
export const ClientUpdateSchema = BaseUpdateSchema.merge(ClientSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true }).partial());
export type ClientUpdateData = z.infer<typeof ClientUpdateSchema>;
