// src/schemas/custoFixoConfiguradoSchema.ts
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';
import type { Timestamp } from 'firebase/firestore';

export const CustoFixoConfiguradoDataSchema = z.object({
  nome: z.string().min(3, "Nome do custo deve ter pelo menos 3 caracteres."),
  valorMensal: z.coerce.number().nonnegative({ message: "Valor mensal deve ser não-negativo." }),
  categoria: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});
export type CustoFixoConfiguradoData = z.infer<typeof CustoFixoConfiguradoDataSchema>;

export const CustoFixoConfiguradoSchema = BaseSchema.extend({
  ...CustoFixoConfiguradoDataSchema.shape,
  // userId, createdAt, updatedAt são herdados de BaseSchema
});
export type CustoFixoConfigurado = z.infer<typeof CustoFixoConfiguradoSchema>;

// Tipo para consumo no cliente, onde Timestamps são serializados como strings
export type CustoFixoConfiguradoClient = Omit<CustoFixoConfigurado, 'createdAt' | 'updatedAt'> & {
  createdAt: string; // ISO string date
  updatedAt: string; // ISO string date
};

export const CustoFixoConfiguradoCreateSchema = BaseCreateSchema.extend(
  CustoFixoConfiguradoDataSchema.omit({ ativo: true }).shape // 'ativo' é true por padrão na criação via serviço
);
export type CustoFixoConfiguradoCreateData = z.infer<typeof CustoFixoConfiguradoCreateSchema>;

export const CustoFixoConfiguradoUpdateSchema = BaseUpdateSchema.extend(
  CustoFixoConfiguradoDataSchema.partial().shape
);
export type CustoFixoConfiguradoUpdateData = z.infer<typeof CustoFixoConfiguradoUpdateSchema>;
