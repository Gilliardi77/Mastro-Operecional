/**
 * @fileOverview Schemas comuns reutilizáveis para entidades do Firestore.
 *
 * Exports:
 * - FirestoreTimestampSchema: Zod schema para validar instâncias de Timestamp do Firestore.
 * - BaseSchema: Zod schema base para documentos, incluindo id, userId, createdAt, updatedAt.
 * - BaseData: Tipo TypeScript inferido de BaseSchema.
 * - BaseCreateSchema: Zod schema para criação de documentos (omite campos gerenciados).
 * - BaseCreateData: Tipo TypeScript inferido de BaseCreateSchema.
 * - BaseUpdateSchema: Zod schema para atualização de documentos (todos os campos são opcionais).
 * - BaseUpdateData: Tipo TypeScript inferido de BaseUpdateSchema.
 */

import { z } from 'zod';
// Removida a importação de 'firebase/firestore' para tornar o schema agnóstico.

// Interface para a forma de um Timestamp, para clareza
interface TimestampLike {
  seconds: number;
  nanoseconds: number;
}

// Type guard para verificar se um objeto se parece com um Timestamp do Firestore
const isFirestoreTimestamp = (value: unknown): value is TimestampLike => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    'nanoseconds' in value &&
    typeof (value as any).seconds === 'number' &&
    typeof (value as any).nanoseconds === 'number'
  );
};

/**
 * Schema Zod para validar a FORMA de um Timestamp do Firestore, sem depender de uma instância de classe específica.
 * Isso torna o schema agnóstico em relação ao SDK (client vs. admin).
 */
export const FirestoreTimestampSchema = z.custom<TimestampLike>(
  isFirestoreTimestamp,
  {
    message: "Objeto inválido com formato de Timestamp do Firestore. Esperado { seconds: number, nanoseconds: number }.",
  }
);


/**
 * Schema Zod base para todos os documentos do Firestore gerenciados pela aplicação.
 * Inclui campos padrão como id, userId, createdAt, e updatedAt.
 */
export const BaseSchema = z.object({
  id: z.string().describe("The unique identifier for the document (gerado pelo Firestore, adicionado no fetch)."),
  userId: z.string().describe("The ID of the user who owns this document."),
  createdAt: FirestoreTimestampSchema.describe("Timestamp of when the document was created."),
  updatedAt: FirestoreTimestampSchema.describe("Timestamp of when the document was last updated."),
});
export type BaseData = z.infer<typeof BaseSchema>;

/**
 * Schema Zod para dados de entrada ao criar um novo documento.
 * Omite 'id', 'userId', 'createdAt', 'updatedAt', que são gerenciados pelo sistema.
 */
export const BaseCreateSchema = BaseSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type BaseCreateData = z.infer<typeof BaseCreateSchema>;

/**
 * Schema Zod para dados de entrada ao atualizar um documento existente.
 * Omite 'id', 'userId', 'createdAt', 'updatedAt', e torna todos os outros campos opcionais.
 */
export const BaseUpdateSchema = BaseCreateSchema.partial();
export type BaseUpdateData = z.infer<typeof BaseUpdateSchema>;