
// src/schemas/lancamentoFinanceiroSchema.ts
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema, FirestoreTimestampSchema } from './commonSchemas';

// Este é o schema de dados base, usado principalmente para LER dados.
export const LancamentoFinanceiroDataSchema = z.object({
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres."),
  valor: z.coerce.number().nonnegative({ message: "O valor não pode ser negativo." }),
  valorOriginal: z.coerce.number().positive().optional().nullable().describe("Valor original da despesa/receita antes de pagamentos/recebimentos parciais."),
  tipo: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(['RECEITA', 'DESPESA'], {
      required_error: "Tipo é obrigatório e deve ser RECEITA ou DESPESA.",
    })
  ),
  data: z.date({ required_error: "Data é obrigatória." }),
  categoria: z.string().min(2, "Categoria deve ter pelo menos 2 caracteres.").optional().nullable(),
  status: z.enum(['pago', 'recebido', 'pendente', 'liquidado'], { required_error: "Status é obrigatório." }),
  descricao: z.string().optional().nullable(),
  clienteFornecedor: z.string().optional().nullable(),
  formaPagamento: z.string().optional().nullable(),
  referenciaOSId: z.string().optional().nullable(),
  vendaId: z.string().optional().nullable(),
  relatedCustoFixoId: z.string().optional().nullable().describe("ID do Custo Fixo Configurado relacionado a este pagamento."),
  relatedLancamentoId: z.string().optional().nullable().describe("ID do lançamento de dívida original ao qual este pagamento se refere."),
});

// Este schema é para CRIAR um novo lançamento, aplicando validações complexas (refinements).
export const LancamentoFinanceiroCreateSchema = LancamentoFinanceiroDataSchema.superRefine((data, ctx) => {
  // Validação de status vs tipo
  if (data.tipo === 'RECEITA' && data.status === 'pago') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Receitas não podem ter status 'pago'. Use 'recebido' ou 'pendente'.", path: ["status"] });
  }
  if (data.tipo === 'DESPESA' && data.status === 'recebido') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Despesas não podem ter status 'recebido'. Use 'pago' ou 'pendente'.", path: ["status"] });
  }
});
export type LancamentoFinanceiroCreateData = z.infer<typeof LancamentoFinanceiroCreateSchema>;


// Schema para dados como são lidos/armazenados no Firestore (com Timestamps)
export const LancamentoFinanceiroFirestoreSchemaFields = LancamentoFinanceiroDataSchema.extend({
  data: FirestoreTimestampSchema, // Sobrescreve 'data' para esperar Timestamp do Firestore
}).shape;


export const LancamentoFinanceiroSchema = BaseSchema.extend(LancamentoFinanceiroFirestoreSchemaFields).extend({
  createdAt: FirestoreTimestampSchema.optional().nullable(),
  updatedAt: FirestoreTimestampSchema.optional().nullable(),
});
export type LancamentoFinanceiro = z.infer<typeof LancamentoFinanceiroSchema>;


// Schema para atualizar um lançamento (todos os campos são opcionais).
export const LancamentoFinanceiroUpdateSchema = BaseUpdateSchema.extend(
  LancamentoFinanceiroDataSchema.partial().shape
).superRefine((data, ctx) => {
  // Validação de status vs tipo apenas se ambos estiverem presentes na atualização
  if (data.tipo && data.status) {
    if (data.tipo === 'RECEITA' && data.status === 'pago') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Receitas não podem ter status 'pago'.", path: ["status"] });
    }
    if (data.tipo === 'DESPESA' && data.status === 'recebido') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Despesas não podem ter status 'recebido'.", path: ["status"] });
    }
  }
});
export type LancamentoFinanceiroUpdateData = z.infer<typeof LancamentoFinanceiroUpdateSchema>;
