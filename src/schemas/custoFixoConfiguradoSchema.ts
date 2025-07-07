import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema } from './commonSchemas';

/**
 * Schema Zod para um Custo Fixo Configurado.
 */
export const CustoFixoConfiguradoSchema = BaseSchema.extend({
  nome: z.string().min(1, "O nome do custo é obrigatório."),
  valorMensal: z.coerce.number().nonnegative("O valor mensal deve ser não-negativo."),
  categoria: z.string().optional().or(z.literal('')).nullable(),
  observacoes: z.string().optional().or(z.literal('')).nullable(),
  ativo: z.boolean().default(true).describe("Indica se o custo fixo está ativo para os cálculos.")
});
export type CustoFixoConfigurado = z.infer<typeof CustoFixoConfiguradoSchema>;

/**
 * Schema Zod para criar um novo Custo Fixo Configurado.
 */
export const CustoFixoConfiguradoCreateSchema = BaseCreateSchema.extend({
  nome: z.string().min(1, "O nome do custo é obrigatório."),
  valorMensal: z.coerce.number().nonnegative("O valor mensal deve ser não-negativo."),
  categoria: z.string().optional().or(z.literal('')).nullable(),
  observacoes: z.string().optional().or(z.literal('')).nullable(),
  ativo: z.boolean().optional().default(true)
});
export type CustoFixoConfiguradoCreateData = z.infer<typeof CustoFixoConfiguradoCreateSchema>;

/**
 * Schema Zod para atualizar um Custo Fixo Configurado.
 */
export const CustoFixoConfiguradoUpdateSchema = BaseUpdateSchema.extend({
  nome: z.string().min(1).optional(),
  valorMensal: z.coerce.number().nonnegative().optional(),
  categoria: z.string().optional().or(z.literal('')).nullable(),
  observacoes: z.string().optional().or(z.literal('')).nullable(),
  ativo: z.boolean().optional()
});
export type CustoFixoConfiguradoUpdateData = z.infer<typeof CustoFixoConfiguradoUpdateSchema>;

/**
 * Schema Zod para o formulário de Custo Fixo.
 */
export const CustoFixoFormSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, "O nome do custo é obrigatório."),
  valorMensal: z.coerce.number({invalid_type_error: "Valor deve ser um número."}).nonnegative("O valor mensal não pode ser negativo."),
  categoria: z.string().optional().or(z.literal('')).nullable(),
  observacoes: z.string().optional().or(z.literal('')).nullable(),
  ativo: z.boolean().default(true),
});
export type CustoFixoFormValues = z.infer<typeof CustoFixoFormSchema>;
