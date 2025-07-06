
/**
 * @fileOverview Zod schema e tipos TypeScript para a entidade Lançamento Financeiro.
 */

import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';

export const LancamentoTipoEnum = z.enum(["RECEITA", "DESPESA"], {
  required_error: "O tipo do lançamento (RECEITA ou DESPESA) é obrigatório.",
  invalid_type_error: "Tipo de lançamento inválido. Deve ser RECEITA ou DESPESA.",
});
export type LancamentoTipo = z.infer<typeof LancamentoTipoEnum>;

// Removido LancamentoStatusEnum pois o schema interno não usará 'status' diretamente.

/**
 * Schema Zod para a entidade Lançamento Financeiro como esperado internamente pelo Diagnóstico Maestro.
 * Representa uma transação financeira no sistema.
 */
export const LancamentoFinanceiroSchema = BaseSchema.extend({
  descricao: z.string().min(1, "Descrição é obrigatória.").describe("Descrição detalhada do lançamento financeiro."),
  valor: z.number({ required_error: "Valor é obrigatório.", invalid_type_error: "Valor deve ser um número."}).positive("Valor deve ser um número positivo.").describe("Valor monetário do lançamento."),
  data: FirestoreTimestampSchema.describe("Data em que o lançamento ocorreu ou foi registrado."),
  tipo: LancamentoTipoEnum.describe("Tipo do lançamento: RECEITA para entradas, DESPESA para saídas."),
  pago: z.boolean().default(true).describe("Indica se o lançamento já foi efetivado (pago/recebido)."), // Restaurado para não opcional, com default.
  categoria: z.string().optional().or(z.literal('')).describe("Categoria do lançamento (ex: Vendas, Fornecedores, Salário) (opcional)."),
  
  // O campo 'status' não faz parte deste schema interno; será tratado na leitura pelo financialSummaryService.
});
export type LancamentoFinanceiro = z.infer<typeof LancamentoFinanceiroSchema>;

/**
 * Schema Zod para dados de entrada ao criar um novo Lançamento Financeiro (se este app fosse criar).
 */
export const LancamentoFinanceiroCreateSchema = BaseCreateSchema.merge(
  LancamentoFinanceiroSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true })
);
export type LancamentoFinanceiroCreateData = z.infer<typeof LancamentoFinanceiroCreateSchema>;

/**
 * Schema Zod para dados de entrada ao atualizar um Lançamento Financeiro existente (se este app fosse atualizar).
 */
export const LancamentoFinanceiroUpdateSchema = BaseUpdateSchema.merge(
  LancamentoFinanceiroSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true }).partial()
);
export type LancamentoFinanceiroUpdateData = z.infer<typeof LancamentoFinanceiroUpdateSchema>;
