// src/schemas/assinaturaSchema.ts
import { z } from 'zod';
import { BaseSchema, FirestoreTimestampSchema } from './commonSchemas';

/**
 * Schema para os dados de uma Assinatura como são armazenados no Firestore.
 * O ID do documento é o UID do usuário.
 */
export const AssinaturaSchema = BaseSchema.extend({
  status: z.enum(["ativa", "inativa"]).describe("Status atual da assinatura."),
  plano: z.string().describe("Nome do plano assinado (ex: 'mensal', 'anual')."),
  expiracao: FirestoreTimestampSchema.describe("Data e hora em que a assinatura expira."),
  // 'userId', 'createdAt', e 'updatedAt' são herdados do BaseSchema.
});

export type Assinatura = z.infer<typeof AssinaturaSchema>;
