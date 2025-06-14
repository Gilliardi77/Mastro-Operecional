
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Schema para validar Timestamps do Firestore, tanto na leitura (Timestamp) quanto na escrita (Date).
 * No create/update, passamos Date, que o firestoreService converte para Timestamp.
 * Ao ler, recebemos Timestamp, que o firestoreService converte para Date.
 */
export const FirestoreTimestampSchema = z.custom<Timestamp | Date>(
  (data) => data instanceof Timestamp || data instanceof Date,
  {
    message: 'Deve ser um Timestamp do Firestore ou um objeto Date JavaScript.',
  }
).transform((val) => (val instanceof Timestamp ? val.toDate() : val)); // Sempre retorna Date para o código da aplicação

export const FirestoreTimestampOutputSchema = z.custom<Timestamp>(
  (data) => data instanceof Timestamp,
  {
    message: 'Deve ser um Timestamp do Firestore.',
  }
);


/**
 * Schema base para todas as entidades principais armazenadas no Firestore.
 * Inclui campos padrão que são gerenciados automaticamente pelos serviços.
 */
export const BaseSchema = z.object({
  id: z.string().describe('O ID único do documento Firestore.'),
  userId: z.string().describe('O ID do usuário proprietário do documento.'),
  createdAt: FirestoreTimestampSchema.describe('A data e hora em que o documento foi criado.'),
  updatedAt: FirestoreTimestampSchema.describe('A data e hora da última atualização do documento.'),
});
export type Base = z.infer<typeof BaseSchema>;

/**
 * Schema base para dados ao criar uma nova entidade.
 * Omite campos gerenciados pelo sistema como id, userId, createdAt, updatedAt.
 * Esses campos serão adicionados pelo firestoreService.
 */
export const BaseCreateSchema = z.object({}).passthrough(); // Permite campos extras que serão definidos nas entidades específicas

/**
 * Schema base para dados ao atualizar uma entidade existente.
 * Todos os campos específicos da entidade devem ser opcionais.
 * Omite campos gerenciados pelo sistema como id, userId, createdAt.
 * O campo updatedAt será atualizado automaticamente pelo firestoreService.
 */
export const BaseUpdateSchema = z.object({}).passthrough(); // Permite campos extras que serão definidos nas entidades específicas
