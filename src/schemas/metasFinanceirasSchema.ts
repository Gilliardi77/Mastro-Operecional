import { z } from 'zod';
import { BaseSchema, FirestoreTimestampSchema } from './commonSchemas';

// This schema is for the form itself
export const MetasFormSchema = z.object({
  metaFaturamento: z.coerce.number().nonnegative().step(0.01).default(0),
  metaLucro: z.coerce.number().nonnegative().step(0.01).default(0),
  metaDespesaMaxima: z.coerce.number().nonnegative({ message: "Meta de despesa máxima deve ser não-negativa."}).step(0.01).optional().default(0),
  margemDesejada: z.coerce.number().min(0).max(100).step(0.01).default(0),
  margemContribuicaoMediaPercentual: z.coerce.number().min(0).max(100, { message: "Margem de contribuição deve ser entre 0 e 100." }).step(0.01).optional().default(0),
  descricaoMeta: z.string().optional().default('').describe("Descrição geral ou foco para as metas do mês."),
});
export type MetasFormValues = z.infer<typeof MetasFormSchema>;

// This schema represents the document in Firestore
export const MetasFinanceirasSchema = MetasFormSchema.extend({
  userId: z.string(),
  anoMes: z.string(),
  criadoEm: FirestoreTimestampSchema.optional(),
  atualizadoEm: FirestoreTimestampSchema,
  id: z.string().optional(), // The ID is custom (userId_anoMes) and not part of the data itself, but good to have for type safety when reading.
});
export type MetasFinanceiras = z.infer<typeof MetasFinanceirasSchema>;
