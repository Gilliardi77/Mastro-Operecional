/**
 * @fileOverview Zod schema e tipos TypeScript para o perfil de usuário no Firestore.
 * Estes são dados adicionais ao Firebase Auth, como informações da empresa.
 */

import { z } from 'zod';
import { FirestoreTimestampSchema } from './commonSchemas';

/**
 * Schema Zod para os dados do perfil do usuário armazenados no Firestore.
 * O ID do documento na coleção 'usuarios' será o UID do Firebase Auth.
 * Usa um schema de timestamp agnóstico que não depende de SDKs específicos.
 */
export const UserProfileFirestoreSchema = z.object({
  // Informações da Empresa
  companyName: z.string().max(100).optional().or(z.literal('')),
  companyCnpj: z.string().max(20).optional().or(z.literal('')),
  businessType: z.string().max(100).optional().or(z.literal('')),
  companyPhone: z.string().max(20).optional().or(z.literal('')),
  companyEmail: z.string().email('Email da empresa inválido.').max(100).optional().or(z.literal('')),

  // Informações Pessoais Adicionais
  personalPhoneNumber: z.string().max(20).optional().or(z.literal('')),
  
  // Timestamps (validados pela forma, não pela instância da classe)
  // Opcional e anulável para lidar com documentos que ainda não têm esses campos definidos.
  createdAt: FirestoreTimestampSchema.nullable().optional().describe("Timestamp de quando o perfil do usuário foi criado no Firestore."),
  updatedAt: FirestoreTimestampSchema.nullable().optional().describe("Timestamp de quando o perfil do usuário foi atualizado pela última vez no Firestore."),
});

export type UserProfileFirestore = z.infer<typeof UserProfileFirestoreSchema>;

/**
 * Schema Zod para dados de entrada ao criar ou atualizar o perfil do usuário no Firestore.
 * createdAt e updatedAt são gerenciados pelo serviço.
 * Todos os campos são opcionais para permitir atualizações parciais.
 */
export const UserProfileFirestoreDataSchema = UserProfileFirestoreSchema.omit({ createdAt: true, updatedAt: true }).partial();
export type UserProfileFirestoreData = z.infer<typeof UserProfileFirestoreDataSchema>;