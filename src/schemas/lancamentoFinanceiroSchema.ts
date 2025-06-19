
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';

export const LancamentoTipoEnum = z.enum(['receita', 'despesa']);
export type LancamentoTipo = z.infer<typeof LancamentoTipoEnum>;

export const LancamentoStatusEnum = z.enum(['pago', 'recebido', 'pendente']);
export type LancamentoStatus = z.infer<typeof LancamentoStatusEnum>;

/**
 * Schema Zod para os dados de um Lançamento Financeiro como são armazenados no Firestore.
 * Baseado na definição em DETAILED_BACKEND_ARCHITECTURE.md (Seção 2.11).
 */
export const LancamentoFinanceiroSchema = BaseSchema.extend({
  titulo: z.string().min(1, "Título é obrigatório.").describe("Descrição breve do lançamento. Ex: Venda Balcão #123, Pagamento OS #456."),
  valor: z.coerce.number().describe("Valor da transação. Positivo para receita, pode ser negativo ou positivo para despesa dependendo da convenção, mas aqui forçaremos positivo e o 'tipo' define a natureza."),
  tipo: LancamentoTipoEnum.describe("Tipo do lançamento: 'receita' ou 'despesa'."),
  data: FirestoreTimestampSchema.describe("Data da transação ou competência."),
  categoria: z.string().min(1, "Categoria é obrigatória.").describe("Categoria do lançamento. Ex: Venda Balcão, Receita de OS, Aluguel, Fornecedor."),
  status: LancamentoStatusEnum.describe("Status do lançamento: 'pago' (para despesa), 'recebido' (para receita), 'pendente'."),
  descricao: z.string().optional().or(z.literal('')).describe("Detalhes adicionais sobre o lançamento."),
  vendaId: z.string().nullable().optional().describe("ID da venda relacionada (da coleção 'vendas'), se aplicável."),
  referenciaOSId: z.string().nullable().optional().describe("ID da OS relacionada (da coleção 'ordensServico'), se aplicável."),
  // Adicionar 'formaPagamento' se for ser armazenado diretamente aqui
  formaPagamento: z.string().nullable().optional().describe("Forma de pagamento, se aplicável (ex: dinheiro, pix, cartao_credito).")
});
export type LancamentoFinanceiro = z.infer<typeof LancamentoFinanceiroSchema>;

/**
 * Schema Zod para os dados necessários ao CRIAR um novo Lançamento Financeiro.
 */
export const LancamentoFinanceiroCreateSchema = BaseCreateSchema.extend({
  titulo: z.string().min(1, "Título é obrigatório."),
  valor: z.coerce.number(), // Validação de positivo/negativo pode ser mais específica dependendo do tipo
  tipo: LancamentoTipoEnum,
  data: FirestoreTimestampSchema, // Espera Date
  categoria: z.string().min(1, "Categoria é obrigatória."),
  status: LancamentoStatusEnum,
  descricao: z.string().optional().or(z.literal('')),
  vendaId: z.string().nullable().optional(),
  referenciaOSId: z.string().nullable().optional(),
  formaPagamento: z.string().nullable().optional(),
}).refine(data => {
    if (data.tipo === 'receita') return data.valor >= 0;
    if (data.tipo === 'despesa') return data.valor >= 0; // Armazenar sempre positivo, o tipo indica a natureza
    return true;
  }, {
    message: "Valor da receita deve ser >= 0. Valor da despesa deve ser armazenado como >= 0.",
    path: ['valor'],
});
export type LancamentoFinanceiroCreateData = z.infer<typeof LancamentoFinanceiroCreateSchema>;

/**
 * Schema Zod para os dados ao ATUALIZAR um Lançamento Financeiro existente.
 */
export const LancamentoFinanceiroUpdateSchema = BaseUpdateSchema.extend({
  titulo: z.string().min(1).optional(),
  valor: z.coerce.number().optional(),
  tipo: LancamentoTipoEnum.optional(),
  data: FirestoreTimestampSchema.optional(), // Espera Date
  categoria: z.string().min(1).optional(),
  status: LancamentoStatusEnum.optional(),
  descricao: z.string().optional().or(z.literal('')),
  vendaId: z.string().nullable().optional(),
  referenciaOSId: z.string().nullable().optional(),
  formaPagamento: z.string().nullable().optional(),
});
export type LancamentoFinanceiroUpdateData = z.infer<typeof LancamentoFinanceiroUpdateSchema>;
