
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';
import type { ItemOS } from './ordemServicoSchema'; // Reutilizar se a estrutura do item for similar

// Similar ao ItemOSSchema, mas adaptado para Venda se necessário
export const ItemVendaSchema = z.object({
  productId: z.string().nullable().optional().describe("ID do produto/serviço do catálogo, se aplicável."),
  nome: z.string().min(1, "Nome do item é obrigatório.").describe("Nome do item."),
  quantidade: z.coerce.number().positive("Quantidade deve ser positiva.").default(1).describe("Quantidade do item."),
  valorUnitario: z.coerce.number().nonnegative("Valor unitário não pode ser negativo.").default(0).describe("Valor unitário do item."),
  valorTotal: z.coerce.number().nonnegative("Valor total não pode ser negativo.").default(0).describe("Valor total do item (qtd * valorUnitario)."),
  manual: z.boolean().optional().default(false).describe("Indica se o item foi adicionado manualmente."),
  productType: z.enum(['Produto', 'Serviço']).nullable().optional().describe("Tipo do item, se originado do catálogo.")
});
export type ItemVenda = z.infer<typeof ItemVendaSchema>;

export const VendaStatusEnum = z.enum(["Concluída", "Cancelada", "Pendente"]); // Adicionado Pendente se necessário
export type VendaStatus = z.infer<typeof VendaStatusEnum>;

export const FormaPagamentoEnum = z.enum([
  "dinheiro", 
  "pix", 
  "cartao_credito", 
  "cartao_debito", 
  "boleto",
  "transferencia",
  "outro" 
]);
export type FormaPagamento = z.infer<typeof FormaPagamentoEnum>;


/**
 * Schema Zod para os dados de uma Venda como são armazenados no Firestore.
 * Baseado na definição em DETAILED_BACKEND_ARCHITECTURE.md (Seção 2.10).
 */
export const VendaSchema = BaseSchema.extend({
  clienteId: z.string().nullable().optional().describe("ID do cliente da coleção 'clientes', se aplicável."),
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório.").describe("Nome do cliente (pode ser 'Cliente Avulso')."),
  itens: z.array(ItemVendaSchema).min(1, "A venda deve ter pelo menos um item.").describe("Lista de itens da venda."),
  totalVenda: z.coerce.number().nonnegative("Valor total da venda não pode ser negativo.").describe("Valor total da venda."),
  formaPagamento: FormaPagamentoEnum.describe("Forma de pagamento utilizada."),
  dataVenda: FirestoreTimestampSchema.describe("Data e hora em que a venda foi realizada."),
  status: VendaStatusEnum.default("Concluída").describe("Status da venda (Ex: Concluída, Cancelada)."),
  // Os campos 'criadoEm' e 'atualizadoEm' são herdados do BaseSchema.
  // No DETAILED_BACKEND_ARCHITECTURE, eles estão como 'createdAt' e 'updatedAt', que é o padrão do BaseSchema.
});
export type Venda = z.infer<typeof VendaSchema>;


/**
 * Schema Zod para os dados necessários ao CRIAR uma nova Venda.
 */
export const VendaCreateSchema = BaseCreateSchema.extend({
  clienteId: z.string().nullable().optional(),
  clienteNome: z.string().min(1),
  itens: z.array(ItemVendaSchema).min(1),
  totalVenda: z.coerce.number().nonnegative(),
  formaPagamento: FormaPagamentoEnum,
  dataVenda: FirestoreTimestampSchema, // Espera Date
  status: VendaStatusEnum.optional().default("Concluída"),
});
export type VendaCreateData = z.infer<typeof VendaCreateSchema>;

/**
 * Schema Zod para os dados ao ATUALIZAR uma Venda existente.
 */
export const VendaUpdateSchema = BaseUpdateSchema.extend({
  clienteId: z.string().nullable().optional(),
  clienteNome: z.string().min(1).optional(),
  itens: z.array(ItemVendaSchema).min(1).optional(),
  totalVenda: z.coerce.number().nonnegative().optional(),
  formaPagamento: FormaPagamentoEnum.optional(),
  dataVenda: FirestoreTimestampSchema.optional(), // Espera Date
  status: VendaStatusEnum.optional(),
});
export type VendaUpdateData = z.infer<typeof VendaUpdateSchema>;
