// src/schemas/userProfileSchema.ts
import { z } from 'zod';
import { BaseSchema, FirestoreTimestampSchema } from './commonSchemas';

// Schema para os dados como são lidos do Firestore e usados na aplicação (com Dates)
// O ID do documento na coleção 'usuarios' é o próprio userId,
// então o BaseSchema já cobre isso (id e userId serão o mesmo).
export const UserProfileDataSchema = BaseSchema.extend({
  companyName: z.string().optional().or(z.literal('')).nullable(),
  companyCnpj: z.string().optional().or(z.literal('')).nullable(),
  businessType: z.string().optional().or(z.literal('')).nullable(),
  companyPhone: z.string().optional().or(z.literal('')).nullable(),
  companyEmail: z.string().email().optional().or(z.literal('')).nullable(),
  personalPhoneNumber: z.string().optional().or(z.literal('')).nullable(),
  // O campo role é opcional. Se não existir no documento do Firestore,
  // a lógica do AuthProvider irá tratá-lo como 'user'.
  role: z.enum(['user', 'admin', 'vip']).optional().describe('O papel do usuário no sistema para controle de acesso.'),
  // createdAt e updatedAt vêm do BaseSchema e serão objetos Date
});
export type UserProfileData = z.infer<typeof UserProfileDataSchema>;


// Schema para criação/atualização (upsert) de dados do perfil.
// Não inclui id, userId, createdAt, updatedAt, pois são gerenciados de outra forma.
export const UserProfileUpsertDataSchema = z.object({
  companyName: z.string().optional().nullable(),
  companyCnpj: z.string().optional().nullable(),
  businessType: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  companyEmail: z.string().email().optional().or(z.literal('')).nullable(),
  personalPhoneNumber: z.string().optional().nullable(),
  // Permitir que a role seja definida durante o upsert (por um processo administrativo)
  role: z.enum(['user', 'admin', 'vip']).optional(),
}).passthrough();
export type UserProfileUpsertData = z.infer<typeof UserProfileUpsertDataSchema>;
