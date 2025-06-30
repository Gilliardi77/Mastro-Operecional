
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';

export const ItemOSSchema = z.object({
  produtoServicoId: z.string().nullable().optional().describe("ID do produto/serviço do catálogo, se aplicável."),
  nome: z.string().min(1, "Nome do item é obrigatório.").describe("Nome do item (produto, serviço ou manual)."),
  quantidade: z.coerce.number().positive("Quantidade deve ser positiva.").default(1).describe("Quantidade do item."),
  valorUnitario: z.coerce.number().nonnegative("Valor unitário não pode ser negativo.").describe("Valor unitário do item."),
  tipo: z.enum(['Produto', 'Serviço', 'Manual']).default('Manual').describe("Tipo do item (se é do catálogo ou manual)."),
});
export type ItemOS = z.infer<typeof ItemOSSchema>;

export const OrdemServicoStatusEnum = z.enum(["Pendente", "Em Andamento", "Concluído", "Cancelado"]);
export type OrdemServicoStatus = z.infer<typeof OrdemServicoStatusEnum>;

export const PaymentStatusEnum = z.enum(["Pendente", "Pago Parcial", "Pago Total"]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

/**
 * Schema Zod para os dados de uma Ordem de Serviço como são armazenados no Firestore.
 */
export const OrdemServicoSchema = BaseSchema.extend({
  numeroOS: z.string().describe("Número único da Ordem de Serviço (geralmente o ID do documento)."),
  clienteId: z.string().nullable().optional().describe("ID do cliente, se selecionado do cadastro."),
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório.").describe("Nome do cliente (pode ser avulso)."),
  itens: z.array(ItemOSSchema).min(1, "A OS deve ter pelo menos um item.").describe("Lista de itens da Ordem de Serviço."),
  valorTotal: z.coerce.number().nonnegative("Valor total não pode ser negativo.").describe("Valor total calculado da OS."),
  valorAdiantado: z.coerce.number().nonnegative("Valor adiantado não pode ser negativo.").default(0).describe("Valor pago adiantado pelo cliente na criação da OS."),
  dataEntrega: FirestoreTimestampSchema.describe("Data prevista para entrega ou conclusão."),
  observacoes: z.string().optional().or(z.literal('')).describe("Observações gerais sobre a OS."),
  status: OrdemServicoStatusEnum.default("Pendente").describe("Status atual da produção/execução da OS."),
  
  // Campos de pagamento
  statusPagamento: PaymentStatusEnum.default("Pendente").describe("Status do pagamento da OS."),
  valorPagoTotal: z.coerce.number().nonnegative().default(0).describe("Valor total já pago pelo cliente para esta OS."),
  
  dataPrimeiroPagamento: FirestoreTimestampSchema.optional().nullable().describe("Data do primeiro pagamento (adiantamento)."),
  formaPrimeiroPagamento: z.string().optional().nullable().describe("Forma do primeiro pagamento (adiantamento)."),
  
  dataUltimoPagamento: FirestoreTimestampSchema.optional().nullable().describe("Data do último pagamento recebido (excluindo adiantamento, se houver)."),
  formaUltimoPagamento: z.string().optional().nullable().describe("Forma do último pagamento (excluindo adiantamento, se houver)."),
  observacoesPagamento: z.string().optional().or(z.literal('')).describe("Observações sobre o(s) pagamento(s) subsequente(s)."),
});
export type OrdemServico = z.infer<typeof OrdemServicoSchema>;


/**
 * Schema Zod para os dados necessários ao CRIAR uma nova Ordem de Serviço.
 */
export const OrdemServicoCreateSchema = BaseCreateSchema.extend({
  numeroOS: z.string().optional(), 
  clienteId: z.string().nullable().optional(),
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório."),
  itens: z.array(ItemOSSchema).min(1, "A OS deve ter pelo menos um item."),
  valorTotal: z.coerce.number().nonnegative("Valor total não pode ser negativo."),
  valorAdiantado: z.coerce.number().nonnegative().optional().default(0),
  dataEntrega: FirestoreTimestampSchema, 
  observacoes: z.string().optional().or(z.literal('')),
  status: OrdemServicoStatusEnum.optional().default("Pendente"),
  
  // Campos de pagamento inicial
  statusPagamento: PaymentStatusEnum.optional().default("Pendente"),
  valorPagoTotal: z.coerce.number().nonnegative().optional().default(0),
  dataPrimeiroPagamento: FirestoreTimestampSchema.optional().nullable(),
  formaPrimeiroPagamento: z.string().optional().nullable(),
});
export type OrdemServicoCreateData = z.infer<typeof OrdemServicoCreateSchema>;


/**
 * Schema Zod para os dados ao ATUALIZAR uma Ordem de Serviço existente.
 */
export const OrdemServicoUpdateSchema = BaseUpdateSchema.extend({
  clienteId: z.string().nullable().optional(),
  clienteNome: z.string().min(1).optional(),
  itens: z.array(ItemOSSchema).min(1).optional(),
  valorTotal: z.coerce.number().nonnegative().optional(),
  // valorAdiantado não deve ser atualizado após a criação, pois é um registro histórico.
  dataEntrega: FirestoreTimestampSchema.optional(), 
  observacoes: z.string().optional().or(z.literal('')),
  status: OrdemServicoStatusEnum.optional(),
  
  // Campos de pagamento para atualizações subsequentes
  statusPagamento: PaymentStatusEnum.optional(),
  valorPagoTotal: z.coerce.number().nonnegative().optional(),
  dataUltimoPagamento: FirestoreTimestampSchema.optional().nullable(), 
  formaUltimoPagamento: z.string().optional().nullable(),
  observacoesPagamento: z.string().optional().or(z.literal('')),
  // dataPrimeiroPagamento e formaPrimeiroPagamento não devem ser atualizados aqui, são do momento da criação.
});
export type OrdemServicoUpdateData = z.infer<typeof OrdemServicoUpdateSchema>;


/**
 * Schema Zod para o formulário de Nova Ordem de Serviço na UI.
 * Usado em src/app/produtos-servicos/atendimentos/novo/page.tsx
 */
const itemOSFormSchema = z.object({ 
  idTemp: z.string().describe("ID temporário para controle no formulário React Hook Form."),
  produtoServicoId: z.string().optional().describe("ID do produto/serviço do catálogo, se aplicável."),
  nome: z.string().min(1, "Nome do item é obrigatório."),
  quantidade: z.coerce.number().positive("Quantidade deve ser positiva.").default(1),
  valorUnitario: z.coerce.number().nonnegative("Valor unitário não pode ser negativo.").optional(),
  tipo: z.enum(['Produto', 'Serviço', 'Manual']).default('Manual'),
});
export type ItemOSFormValues = z.infer<typeof itemOSFormSchema>;

export const OrdemServicoFormSchema = z.object({
  clienteId: z.string().optional(),
  clienteNome: z.string().optional(),
  itens: z.array(itemOSFormSchema).min(1, { message: "Adicione pelo menos um item à Ordem de Serviço." }),
  valorTotalOS: z.coerce.number().nonnegative({ message: "O valor total da OS não pode ser negativo." }).optional(),
  valorAdiantado: z.coerce.number().nonnegative({ message: "O valor adiantado não pode ser negativo." }).optional(),
  formaPagamentoAdiantamento: z.string().optional(), // Novo campo para forma de pagamento do adiantamento
  dataEntrega: z.date({ required_error: "A data de entrega é obrigatória." }),
  observacoes: z.string().optional(),
}).refine(data => {
  if (data.valorAdiantado && data.valorAdiantado > 0) {
    return !!data.formaPagamentoAdiantamento && data.formaPagamentoAdiantamento.trim() !== "";
  }
  return true;
}, {
  message: "Se houver valor adiantado, a forma de pagamento do adiantamento é obrigatória.",
  path: ["formaPagamentoAdiantamento"],
});
export type OrdemServicoFormValues = z.infer<typeof OrdemServicoFormSchema>;

/**
 * Schema Zod para o formulário de pagamento de OS na UI.
 * Usado em src/app/produtos-servicos/ordens/page.tsx
 */
export const PagamentoOsSchema = z.object({
  valorPago: z.coerce.number().positive({ message: "O valor pago deve ser positivo." }),
  formaPagamento: z.string().min(1, { message: "Selecione a forma de pagamento." }),
  dataPagamento: z.date({ required_error: "A data do pagamento é obrigatória." }),
  observacoesPagamento: z.string().optional(),
});
export type PagamentoOsFormValues = z.infer<typeof PagamentoOsSchema>;

    
