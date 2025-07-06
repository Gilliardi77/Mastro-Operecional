
/**
 * @fileOverview Zod schema e tipos TypeScript para a entidade Consulta e suas partes.
 */

import { z } from 'zod';
import { FirestoreTimestampSchema, BaseSchema } from './commonSchemas';

/**
 * Schema Zod para uma parte individual do diagnóstico final.
 */
export const FinalDiagnosisPartSchema = z.object({
  partId: z.string().describe("ID da parte do diagnóstico."),
  title: z.string().describe("Título da parte do diagnóstico."),
  content: z.string().describe("Conteúdo da parte do diagnóstico."),
});
export type FinalDiagnosisPart = z.infer<typeof FinalDiagnosisPartSchema>;

/**
 * Schema Zod para os dados de uma consulta como armazenados no Firestore.
 * Inclui todos os campos relevantes que são salvos.
 */
export const ConsultationDataSchema = BaseSchema.extend({
  initialFormData: z.record(z.union([z.string(), z.array(z.string())])).optional().describe("Dados do formulário inicial da consulta."),
  userAnswers: z.record(z.string()).describe("Respostas do usuário às perguntas da consulta."),
  aiFeedbacks: z.record(z.string()).describe("Feedbacks da IA para as respostas do usuário."),
  finalDiagnosisParts: z.array(FinalDiagnosisPartSchema).describe("Array com as partes do diagnóstico final."),
  consultationCompletedAt: FirestoreTimestampSchema.describe("Timestamp de quando a consulta foi completada e salva."),
});
export type ConsultationData = z.infer<typeof ConsultationDataSchema>;


/**
 * Schema Zod específico para os itens exibidos na página de histórico de consultas.
 * Contém apenas os campos necessários para essa visualização.
 */
export const ConsultationHistoryItemSchema = z.object({
  id: z.string().describe("ID do documento da consulta."),
  consultationCompletedAt: FirestoreTimestampSchema.describe("Timestamp de quando a consulta foi completada."),
  finalDiagnosisParts: z.array(FinalDiagnosisPartSchema).default([]).describe("Array com as partes do diagnóstico final."),
});
export type ConsultationHistoryItem = z.infer<typeof ConsultationHistoryItemSchema>;
