
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';

export const AppointmentStatusEnum = z.enum(["Pendente", "Em Andamento", "Concluído", "Cancelado"]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;

/**
 * Schema Zod para os dados de um Agendamento como são armazenados no Firestore.
 */
export const AppointmentSchema = BaseSchema.extend({
  clienteId: z.string().describe("ID do cliente (pode ser 'manual_cliente_...' se não cadastrado)."),
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório.").describe("Nome do cliente (mesmo que seja manual)."),
  servicoId: z.string().describe("ID do serviço/produto (pode ser 'manual_servico_...' se não cadastrado)."),
  servicoNome: z.string().min(1, "Nome do serviço/produto é obrigatório.").describe("Nome do serviço/produto (mesmo que seja manual)."),
  dataHora: FirestoreTimestampSchema.describe("Data e hora do agendamento."),
  observacoes: z.string().optional().or(z.literal('')).describe("Observações adicionais sobre o agendamento."),
  status: AppointmentStatusEnum.default("Pendente").describe("Status atual do agendamento."),
  geraOrdemProducao: z.boolean().default(false).describe("Indica se este agendamento deve gerar uma ordem de produção."),
});
export type Appointment = z.infer<typeof AppointmentSchema>;


/**
 * Schema Zod para os dados necessários ao CRIAR um novo Agendamento.
 */
export const AppointmentCreateSchema = BaseCreateSchema.extend({
  clienteId: z.string(),
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório."),
  servicoId: z.string(),
  servicoNome: z.string().min(1, "Nome do serviço/produto é obrigatório."),
  dataHora: FirestoreTimestampSchema, // Espera um Date, será convertido para Timestamp no firestoreService
  observacoes: z.string().optional().or(z.literal('')),
  status: AppointmentStatusEnum.optional().default("Pendente"),
  geraOrdemProducao: z.boolean().optional().default(false),
});
export type AppointmentCreateData = z.infer<typeof AppointmentCreateSchema>;

/**
 * Schema Zod para os dados ao ATUALIZAR um Agendamento existente.
 */
export const AppointmentUpdateSchema = BaseUpdateSchema.extend({
  clienteId: z.string().optional(),
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório.").optional(),
  servicoId: z.string().optional(),
  servicoNome: z.string().min(1, "Nome do serviço/produto é obrigatório.").optional(),
  dataHora: FirestoreTimestampSchema.optional(), // Espera um Date, será convertido
  observacoes: z.string().optional().or(z.literal('')),
  status: AppointmentStatusEnum.optional(),
  geraOrdemProducao: z.boolean().optional(),
});
export type AppointmentUpdateData = z.infer<typeof AppointmentUpdateSchema>;


/**
 * Schema Zod para o formulário de Agendamento na UI.
 * Usado em src/app/produtos-servicos/agenda/page.tsx
 */
export const AppointmentFormSchema = z.object({
  id: z.string().optional(), // Para identificar edição
  clienteId: z.string().optional(), // ID do cliente selecionado do catálogo
  clienteNomeInput: z.string().optional(), // Nome manual do cliente
  servicoId: z.string().optional(), // ID do serviço/produto selecionado do catálogo
  servicoNomeInput: z.string().optional(), // Nome manual do serviço/produto
  data: z.date({ required_error: "Data é obrigatória." }),
  hora: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida (HH:MM)."),
  observacoes: z.string().optional().or(z.literal('')),
  status: AppointmentStatusEnum,
  geraOrdemProducao: z.boolean().optional().default(false),
}).refine(data => {
  // Validação: ou um clienteId de catálogo é selecionado, ou um nome manual é fornecido
  return (data.clienteId && data.clienteId.trim() !== "" && data.clienteId !== "__placeholder_cliente__") || 
         (data.clienteNomeInput && data.clienteNomeInput.trim() !== "");
}, {
  message: "Selecione um cliente ou informe o nome manualmente.",
  path: ["clienteId"], // Ou clienteNomeInput, dependendo de qual está vazio
}).refine(data => {
  // Validação: ou um servicoId de catálogo é selecionado, ou um nome manual é fornecido
  return (data.servicoId && data.servicoId.trim() !== "" && data.servicoId !== "__placeholder_servico__") ||
         (data.servicoNomeInput && data.servicoNomeInput.trim() !== "");
}, {
  message: "Selecione um serviço/produto ou informe o nome manualmente.",
  path: ["servicoId"], // Ou servicoNomeInput
});
export type AppointmentFormValues = z.infer<typeof AppointmentFormSchema>;
