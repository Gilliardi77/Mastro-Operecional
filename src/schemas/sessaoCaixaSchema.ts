// src/schemas/sessaoCaixaSchema.ts
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';
import { EntradasPorMetodoSchema } from './fechamentoCaixaSchema'; // Reutilizando

export const SessaoCaixaStatusEnum = z.enum(['aberto', 'fechado']);
export type SessaoCaixaStatus = z.infer<typeof SessaoCaixaStatusEnum>;

export const SessaoCaixaSchema = BaseSchema.extend({
  dataAbertura: FirestoreTimestampSchema.describe("Data e hora em que a sessão de caixa foi aberta."),
  status: SessaoCaixaStatusEnum.describe("Status da sessão de caixa: 'aberto' ou 'fechado'."),
  trocoInicial: z.coerce.number().nonnegative().describe("Valor do troco inicial no caixa no momento da abertura."),
  
  // Campos preenchidos no fechamento
  dataFechamento: FirestoreTimestampSchema.nullable().optional().describe("Data e hora em que a sessão foi fechada."),
  totalEntradasCalculado: z.coerce.number().nonnegative().nullable().optional().describe("Total de entradas calculado no fechamento."),
  totalSaidasCalculado: z.coerce.number().nonnegative().nullable().optional().describe("Total de saídas calculado no fechamento."),
  sangrias: z.coerce.number().nonnegative().nullable().optional().describe("Total de sangrias informado no fechamento."),
  saldoFinalCalculado: z.coerce.number().nullable().optional().describe("Saldo final calculado no fechamento."),
  entradasPorMetodo: EntradasPorMetodoSchema.nullable().optional().describe("Detalhamento das entradas por método no fechamento."),
  responsavelFechamentoNome: z.string().nullable().optional().describe("Nome do responsável pelo fechamento."),
  responsavelFechamentoId: z.string().nullable().optional().describe("ID do responsável pelo fechamento."),
  observacoes: z.string().optional().or(z.literal('')).nullable().describe("Observações sobre o fechamento."),
});
export type SessaoCaixa = z.infer<typeof SessaoCaixaSchema>;

export const SessaoCaixaCreateSchema = BaseCreateSchema.extend({
  dataAbertura: FirestoreTimestampSchema,
  status: SessaoCaixaStatusEnum,
  trocoInicial: z.coerce.number().nonnegative(),
});
export type SessaoCaixaCreateData = z.infer<typeof SessaoCaixaCreateSchema>;

export const SessaoCaixaUpdateSchema = BaseUpdateSchema.extend({
  dataFechamento: FirestoreTimestampSchema.optional(),
  status: SessaoCaixaStatusEnum.optional(),
  totalEntradasCalculado: z.coerce.number().nonnegative().optional(),
  totalSaidasCalculado: z.coerce.number().nonnegative().optional(),
  sangrias: z.coerce.number().nonnegative().optional(),
  saldoFinalCalculado: z.coerce.number().optional(),
  entradasPorMetodo: EntradasPorMetodoSchema.optional(),
  responsavelFechamentoNome: z.string().optional(),
  responsavelFechamentoId: z.string().optional(),
  observacoes: z.string().optional().or(z.literal('')),
});
export type SessaoCaixaUpdateData = z.infer<typeof SessaoCaixaUpdateSchema>;
