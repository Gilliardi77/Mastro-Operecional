
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';

// Definindo o enum aqui para clareza, mas poderia ser importado se compartilhado globalmente.
export const OrdemProducaoStatusEnum = z.enum(["Pendente", "Em Andamento", "Concluído", "Cancelado"]);
export type OrdemProducaoStatus = z.infer<typeof OrdemProducaoStatusEnum>;

/**
 * Schema Zod para os dados de uma Ordem de Produção como são armazenados no Firestore.
 */
export const OrdemProducaoSchema = BaseSchema.extend({
  agendamentoId: z.string().describe("ID da Ordem de Serviço original ou Agendamento que gerou esta OP."),
  clienteId: z.string().nullable().optional().describe("ID do cliente, se aplicável."),
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório."),
  servicoNome: z.string().min(1, "Nome do serviço/produto principal é obrigatório."),
  dataAgendamento: FirestoreTimestampSchema.describe("Data prevista de início/conclusão (herdada da OS/Agendamento)."),
  status: OrdemProducaoStatusEnum.default("Pendente"),
  progresso: z.coerce.number().min(0).max(100).default(0).describe("Progresso da produção em porcentagem (0-100)."),
  observacoesAgendamento: z.string().optional().or(z.literal('')).describe("Observações herdadas da OS/Agendamento."),
  observacoesProducao: z.string().optional().or(z.literal('')).describe("Observações específicas da equipe de produção."),
});
export type OrdemProducao = z.infer<typeof OrdemProducaoSchema>;


/**
 * Schema Zod para os dados necessários ao CRIAR uma nova Ordem de Produção.
 */
export const OrdemProducaoCreateSchema = BaseCreateSchema.extend({
  agendamentoId: z.string(),
  clienteId: z.string().nullable().optional(),
  clienteNome: z.string().min(1),
  servicoNome: z.string().min(1),
  dataAgendamento: FirestoreTimestampSchema, // Espera Date, será convertido para Timestamp
  status: OrdemProducaoStatusEnum.optional().default("Pendente"),
  progresso: z.coerce.number().min(0).max(100).optional().default(0),
  observacoesAgendamento: z.string().optional().or(z.literal('')),
  observacoesProducao: z.string().optional().or(z.literal('')),
});
export type OrdemProducaoCreateData = z.infer<typeof OrdemProducaoCreateSchema>;

/**
 * Schema Zod para os dados ao ATUALIZAR uma Ordem de Produção existente.
 */
export const OrdemProducaoUpdateSchema = BaseUpdateSchema.extend({
  status: OrdemProducaoStatusEnum.optional(),
  progresso: z.coerce.number().min(0).max(100).optional(),
  observacoesProducao: z.string().optional().or(z.literal('')),
  // Outros campos que podem ser atualizados, como dataAgendamento se for reagendado.
  dataAgendamento: FirestoreTimestampSchema.optional(),