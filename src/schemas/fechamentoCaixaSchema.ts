
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, FirestoreTimestampSchema } from './commonSchemas';

/**
 * Schema para o objeto que detalha as entradas por método de pagamento.
 * Expandido para incluir mais formas de pagamento.
 */
export const EntradasPorMetodoSchema = z.object({
  dinheiro: z.coerce.number().nonnegative().default(0).describe("Total de entradas em dinheiro."),
  pix: z.coerce.number().nonnegative().default(0).describe("Total de entradas via PIX."),
  cartaoCredito: z.coerce.number().nonnegative().default(0).describe("Total de entradas via Cartão de Crédito."),
  cartaoDebito: z.coerce.number().nonnegative().default(0).describe("Total de entradas via Cartão de Débito."),
  cartao: z.coerce.number().nonnegative().default(0).describe("Somatório de todas as entradas via cartão (Crédito + Débito)."),
  boleto: z.coerce.number().nonnegative().default(0).describe("Total de entradas via Boleto."),
  transferenciaBancaria: z.coerce.number().nonnegative().default(0).describe("Total de entradas via Transferência Bancária."),
  outros: z.coerce.number().nonnegative().default(0).describe("Total de entradas por outros métodos de pagamento."),
});
export type EntradasPorMetodo = z.infer<typeof EntradasPorMetodoSchema>;

/**
 * Schema Zod para os dados de um Fechamento de Caixa como são armazenados no Firestore.
 */
export const FechamentoCaixaSchema = BaseSchema.extend({
  dataFechamento: FirestoreTimestampSchema.describe("Data e hora em que o fechamento foi realizado."),
  totalEntradasCalculado: z.coerce.number().nonnegative().describe("Somatório de todas as entradas (receitas recebidas) do dia, calculado pelo sistema."),
  totalSaidasCalculado: z.coerce.number().nonnegative().describe("Somatório de todas as saídas (despesas pagas) do dia, calculado pelo sistema."),
  trocoInicial: z.coerce.number().nonnegative().optional().default(0).describe("Valor do troco inicial no caixa (informado manualmente)."),
  sangrias: z.coerce.number().nonnegative().optional().default(0).describe("Total de retiradas manuais (sangrias) do caixa durante o dia (informado manualmente)."),
  saldoFinalCalculado: z.coerce.number().describe("Saldo final do caixa calculado: (Entradas + Troco Inicial) - Saídas - Sangrias."),
  entradasPorMetodo: EntradasPorMetodoSchema.describe("Detalhamento das entradas por método de pagamento, baseado nas vendas e outros recebimentos do dia."),
  responsavelNome: z.string().min(1, "Nome do responsável é obrigatório.").describe("Nome do usuário responsável pelo fechamento."),
  responsavelId: z.string().min(1, "ID do responsável é obrigatório.").describe("ID do usuário responsável pelo fechamento."),
  observacoes: z.string().optional().or(z.literal('')).describe("Observações adicionais sobre o fechamento."),
});
export type FechamentoCaixa = z.infer<typeof FechamentoCaixaSchema>;

/**
 * Schema Zod para os dados necessários ao CRIAR um novo Fechamento de Caixa.
 */
export const FechamentoCaixaCreateSchema = BaseCreateSchema.extend({
  dataFechamento: FirestoreTimestampSchema,
  totalEntradasCalculado: z.coerce.number().nonnegative(),
  totalSaidasCalculado: z.coerce.number().nonnegative(),
  trocoInicial: z.coerce.number().nonnegative().optional().default(0),
  sangrias: z.coerce.number().nonnegative().optional().default(0),
  saldoFinalCalculado: z.coerce.number(),
  entradasPorMetodo: EntradasPorMetodoSchema,
  responsavelNome: z.string().min(1),
  responsavelId: z.string().min(1),
  observacoes: z.string().optional().or(z.literal('')),
});
export type FechamentoCaixaCreateData = z.infer<typeof FechamentoCaixaCreateSchema>;


/**
 * Schema Zod para o formulário de Fechamento de Caixa na UI.
 */
export const FechamentoCaixaFormSchema = z.object({
  trocoInicial: z.coerce.number()
    .nonnegative({ message: "Troco inicial não pode ser negativo." })
    .optional()
    .default(0)
    .transform(val => val ?? 0),
  sangrias: z.coerce.number()
    .nonnegative({ message: "Sangrias não podem ser negativas." })
    .optional()
    .default(0)
    .transform(val => val ?? 0),
  observacoes: z.string().optional().or(z.literal('')),
});
export type FechamentoCaixaFormValues = z.infer<typeof FechamentoCaixaFormSchema>;
