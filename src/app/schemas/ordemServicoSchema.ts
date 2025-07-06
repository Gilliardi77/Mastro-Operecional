// src/schemas/ordemServicoSchema.ts
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';
import type { Timestamp } from 'firebase/firestore';

// Schema para os dados específicos da Ordem de Serviço
export const OrdemServicoDataSchema = z.object({
  numeroOS: z.string().min(1, "Número da OS é obrigatório."),
  dataCriacao: z.date({ required_error: "Data de criação é obrigatória." }), // Para input, será Date.
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório."),
  clienteId: z.string().optional().nullable(),
  descricaoServico: z.string().min(1, "Descrição do serviço é obrigatória."),
  valorEstimado: z.coerce.number().nonnegative("Valor estimado deve ser não-negativo.").optional().nullable(),
  statusOS: z.enum([
    "Em Aberto",
    "Em Andamento",
    "Concluída",
    "Faturada",
    "Cancelada"
  ], { required_error: "Status da OS é obrigatório." }),
  dataConclusaoPrev: z.date().optional().nullable(), // Para input
  dataConclusaoReal: z.date().optional().nullable(), // Para input
});
export type OrdemServicoData = z.infer<typeof OrdemServicoDataSchema>;

// Schema para dados como são lidos/armazenados no Firestore (com Timestamps)
export const OrdemServicoFirestoreFieldsSchema = OrdemServicoDataSchema.extend({
  dataCriacao: FirestoreTimestampSchema, // Sobrescreve 'dataCriacao' para esperar Timestamp
  dataConclusaoPrev: FirestoreTimestampSchema.optional().nullable(),
  dataConclusaoReal: FirestoreTimestampSchema.optional().nullable(),
}).shape;

// Schema completo do documento OrdemServico como ele existe no Firestore
export const OrdemServicoSchema = BaseSchema.extend(OrdemServicoFirestoreFieldsSchema);
export type OrdemServico = z.infer<typeof OrdemServicoSchema>;

// Schema para criar uma nova Ordem de Serviço
export const OrdemServicoCreateSchema = BaseCreateSchema.extend(OrdemServicoDataSchema.shape);
export type OrdemServicoCreateData = z.infer<typeof OrdemServicoCreateSchema>;

// Schema para atualizar uma Ordem de Serviço (todos os campos de dados são opcionais)
export const OrdemServicoUpdateSchema = BaseUpdateSchema.extend(OrdemServicoDataSchema.partial().shape);
export type OrdemServicoUpdateData = z.infer<typeof OrdemServicoUpdateSchema>;

// Tipo para consumo no cliente, onde Timestamps são serializados como strings
export type OrdemServicoClient = Omit<OrdemServico, 'createdAt' | 'updatedAt' | 'dataCriacao' | 'dataConclusaoPrev' | 'dataConclusaoReal'> & {
  createdAt: string; // ISO string date
  updatedAt: string; // ISO string date
  dataCriacao: string; // ISO string date
  dataConclusaoPrev?: string | null; // ISO string date
  dataConclusaoReal?: string | null; // ISO string date
};
