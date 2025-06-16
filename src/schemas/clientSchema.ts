
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';

/**
 * Enum para o campo 'statusCliente' se necessário no futuro.
 * Exemplo: export const ClientStatusEnum = z.enum(['Ativo', 'Inativo', 'Potencial']);
 */

/**
 * Schema Zod para os dados de um Cliente como são armazenados no Firestore.
 * Estende o BaseSchema para incluir campos padrão.
 */
export const ClientSchema = BaseSchema.extend({
  nome: z.string().min(3, { message: 'Nome do cliente deve ter pelo menos 3 caracteres.' }).describe('Nome completo do cliente.'),
  email: z.string().email({ message: 'Formato de e-mail inválido.' }).optional().or(z.literal('')).nullable().describe('Endereço de e-mail do cliente (opcional).'),
  telefone: z.string().optional().or(z.literal('')).nullable().describe('Número de telefone do cliente (opcional).'),
  endereco: z.string().optional().or(z.literal('')).nullable().describe('Endereço completo do cliente (opcional).'),
  cpfCnpj: z.string().optional().or(z.literal('')).nullable().describe('CPF ou CNPJ do cliente (opcional).'),
  dataNascimento: z.string().optional().or(z.literal('')).nullable().describe('Data de nascimento do cliente (formato AAAA-MM-DD, opcional).'), // Ou z.date() se for lidar com objeto Date
  observacoes: z.string().optional().or(z.literal('')).nullable().describe('Observações adicionais sobre o cliente (opcional).'),
  temDebitos: z.boolean().default(false).describe('Indica se o cliente possui débitos pendentes.'),
  // Adicionar outros campos específicos do cliente aqui, se necessário.
  // Ex: statusCliente: ClientStatusEnum.optional().describe('Status atual do cliente.'),
});
export type Client = z.infer<typeof ClientSchema>;


/**
 * Schema Zod para os dados necessários ao CRIAR um novo Cliente.
 * Campos como id, userId, createdAt, updatedAt são omitidos, pois são gerenciados pelo sistema.
 */
export const ClientCreateSchema = BaseCreateSchema.extend({
  nome: z.string().min(3, { message: 'Nome do cliente deve ter pelo menos 3 caracteres.' }),
  email: z.string().email({ message: 'Formato de e-mail inválido.' }).optional().or(z.literal('')).nullable(),
  telefone: z.string().optional().or(z.literal('')).nullable(),
  endereco: z.string().optional().or(z.literal('')).nullable(),
  cpfCnpj: z.string().optional().or(z.literal('')).nullable(),
  dataNascimento: z.string().optional().or(z.literal('')).nullable(),
  observacoes: z.string().optional().or(z.literal('')).nullable(),
  temDebitos: z.boolean().optional().default(false),
});
export type ClientCreateData = z.infer<typeof ClientCreateSchema>;

/**
 * Schema Zod para os dados ao ATUALIZAR um Cliente existente.
 * Todos os campos específicos da entidade são opcionais.
 * Omitir userId, createdAt. updatedAt será atualizado automaticamente.
 */
export const ClientUpdateSchema = BaseUpdateSchema.extend({
  nome: z.string().min(3, { message: 'Nome do cliente deve ter pelo menos 3 caracteres.' }).optional(),
  email: z.string().email({ message: 'Formato de e-mail inválido.' }).optional().or(z.literal('')).nullable(),
  telefone: z.string().optional().or(z.literal('')).nullable(),
  endereco: z.string().optional().or(z.literal('')).nullable(),
  cpfCnpj: z.string().optional().or(z.literal('')).nullable(),
  dataNascimento: z.string().optional().or(z.literal('')).nullable(),
  observacoes: z.string().optional().or(z.literal('')).nullable(),
  temDebitos: z.boolean().optional(),
});
export type ClientUpdateData = z.infer<typeof ClientUpdateSchema>;

/**
 * Schema Zod para o formulário de Cliente na interface do usuário.
 * Pode ser uma combinação ou um subconjunto dos campos de criação/atualização.
 * Para este exemplo, será similar ao ClientCreateSchema mas com ID opcional para edição.
 */
export const ClientFormSchema = z.object({
  id: z.string().optional(), // Usado para identificar se é uma edição
  nome: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres." }),
  email: z.string().email({ message: "Formato de e-mail inválido." }).optional().or(z.literal('')).nullable(),
  telefone: z.string().optional().or(z.literal('')).nullable(),
  endereco: z.string().optional().or(z.literal('')).nullable(),
  // Campos adicionais do ClientCreateSchema que você quer no formulário
  cpfCnpj: z.string().optional().or(z.literal('')).nullable(),
  dataNascimento: z.string().optional().or(z.literal('')).nullable(), // Mantido como string para compatibilidade com input type="date"
  observacoes: z.string().optional().or(z.literal('')).nullable(),
  temDebitos: z.boolean().optional().default(false),
});
export type ClientFormValues = z.infer<typeof ClientFormSchema>;
