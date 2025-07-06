// src/schemas/assinaturaSchema.ts
import { z } from 'zod';
import { BaseSchema, FirestoreTimestampSchema } from './commonSchemas';

// Assinatura (Subscription) Schema for data as it is in Firestore
export const AssinaturaSchema = BaseSchema.extend({
  status: z.enum(['ativa', 'inativa', 'cancelada', 'pendente']).describe("Status of the subscription."),
  plano: z.string().describe("Name of the subscription plan (e.g., 'mensal', 'anual')."),
  expiracao: FirestoreTimestampSchema.describe("Timestamp of when the subscription expires."),
  // 'id', 'userId', 'createdAt', 'updatedAt' são herdados do BaseSchema
});

export type Assinatura = z.infer<typeof AssinaturaSchema>;
