
import { z } from 'zod';
import { BaseSchema, BaseCreateSchema, BaseUpdateSchema } from './commonSchemas';

/**
 * Schema Zod para os dados de um Produto ou Serviço como são armazenados no Firestore.
 * Estende o BaseSchema para incluir campos padrão.
 */
export const ProductServiceSchema = BaseSchema.extend({
  nome: z.string().min(3, { message: 'Nome do item deve ter pelo menos 3 caracteres.' }).describe('Nome do produto ou serviço.'),
  tipo: z.enum(['Produto', 'Serviço'], { required_error: "Tipo é obrigatório." }).describe("Indica se é um 'Produto' ou 'Serviço'."),
  descricao: z.string().optional().or(z.literal('')).describe('Descrição detalhada do produto ou serviço (opcional).'),
  valorVenda: z.coerce.number().positive({ message: 'Valor de venda deve ser positivo.' }).describe('Preço de venda ao cliente.'),
  unidade: z.string().min(1, { message: 'Unidade é obrigatória (Ex: UN, KG, HR, M²).' }).describe('Unidade de medida ou venda (ex: UN, KG, HR, M², Peça).'),
  
  // Campos específicos para 'Produto'
  custoUnitario: z.coerce.number().nonnegative().nullable().optional().describe('Custo de aquisição ou produção do item (apenas para Produto).'),
  quantidadeEstoque: z.coerce.number().nonnegative().nullable().optional().describe('Quantidade atual em estoque (apenas para Produto).'),
  estoqueMinimo: z.coerce.number().nonnegative().nullable().optional().describe('Nível mínimo de estoque desejado (apenas para Produto).'),
});
export type ProductService = z.infer<typeof ProductServiceSchema>;


/**
 * Schema Zod para os dados necessários ao CRIAR um novo Produto ou Serviço.
 */
export const ProductServiceCreateSchema = BaseCreateSchema.extend({
  nome: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres.' }),
  tipo: z.enum(['Produto', 'Serviço'], { required_error: "Tipo é obrigatório." }),
  descricao: z.string().optional().or(z.literal('')),
  valorVenda: z.coerce.number().positive({ message: 'Valor de venda deve ser positivo.' }),
  unidade: z.string().min(1, { message: 'Unidade é obrigatória.' }),
  custoUnitario: z.coerce.number().nonnegative().optional(),
  quantidadeEstoque: z.coerce.number().nonnegative().optional(),
  estoqueMinimo: z.coerce.number().nonnegative().optional(),
}).refine(data => {
  if (data.tipo === 'Produto') {
    return data.custoUnitario !== undefined && data.custoUnitario >= 0 &&
           data.quantidadeEstoque !== undefined && data.quantidadeEstoque >= 0 &&
           data.estoqueMinimo !== undefined && data.estoqueMinimo >= 0;
  }
  return true;
}, {
  message: "Para 'Produto', Custo Unitário, Estoque Atual e Estoque Mínimo são obrigatórios e devem ser não-negativos.",
  path: ['custoUnitario'], // Pode apontar para um campo geral ou o primeiro relevante
});
export type ProductServiceCreateData = z.infer<typeof ProductServiceCreateSchema>;


/**
 * Schema Zod para os dados ao ATUALIZAR um Produto ou Serviço existente.
 */
export const ProductServiceUpdateSchema = BaseUpdateSchema.extend({
  nome: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres.' }).optional(),
  tipo: z.enum(['Produto', 'Serviço']).optional(),
  descricao: z.string().optional().or(z.literal('')),
  valorVenda: z.coerce.number().positive({ message: 'Valor de venda deve ser positivo.' }).optional(),
  unidade: z.string().min(1, { message: 'Unidade é obrigatória.' }).optional(),
  custoUnitario: z.coerce.number().nonnegative().nullable().optional(),
  quantidadeEstoque: z.coerce.number().nonnegative().nullable().optional(),
  estoqueMinimo: z.coerce.number().nonnegative().nullable().optional(),
}).refine(data => {
  if (data.tipo === 'Produto') {
    // Se o tipo é Produto, e os campos de estoque estão sendo fornecidos, eles devem ser válidos.
    // Se não estão sendo fornecidos (são undefined), a validação não se aplica a eles.
    const custoOk = data.custoUnitario === undefined || (data.custoUnitario !== null && data.custoUnitario >= 0);
    const qtdOk = data.quantidadeEstoque === undefined || (data.quantidadeEstoque !== null && data.quantidadeEstoque >= 0);
    const minOk = data.estoqueMinimo === undefined || (data.estoqueMinimo !== null && data.estoqueMinimo >= 0);
    return custoOk && qtdOk && minOk;
  }
  return true;
}, {
  message: "Se o tipo é 'Produto' e os campos de estoque são fornecidos, eles devem ser não-negativos.",
  path: ['custoUnitario'],
});
export type ProductServiceUpdateData = z.infer<typeof ProductServiceUpdateSchema>;


/**
 * Schema Zod para o formulário de Produto/Serviço na interface do usuário.
 */
export const ProductServiceFormSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres." }),
  tipo: z.enum(['Produto', 'Serviço'], { required_error: "Tipo é obrigatório." }),
  descricao: z.string().optional().or(z.literal('')),
  valorVenda: z.preprocess(
    (val) => (val === "" || val === null ? undefined : parseFloat(String(val))),
    z.number({ required_error: "Valor de venda é obrigatório.", invalid_type_error: "Valor de venda deve ser um número." }).positive({ message: "Valor de venda deve ser positivo." })
  ),
  unidade: z.string().min(1, { message: "Unidade é obrigatória (Ex: UN, KG, HR, M²)." }),
  custoUnitario: z.preprocess(
    (val) => (val === "" || val === null ? undefined : parseFloat(String(val))),
    z.number({ invalid_type_error: "Custo deve ser um número." }).nonnegative("Custo deve ser não-negativo.").optional()
  ),
  quantidadeEstoque: z.preprocess(
    (val) => (val === "" || val === null ? undefined : parseInt(String(val), 10)),
    z.number({ invalid_type_error: "Estoque deve ser um número." }).int("Estoque deve ser um número inteiro.").nonnegative("Estoque deve ser não-negativo.").optional()
  ),
  estoqueMinimo: z.preprocess(
    (val) => (val === "" || val === null ? undefined : parseInt(String(val), 10)),
    z.number({ invalid_type_error: "Estoque mínimo deve ser um número." }).int("Estoque mínimo deve ser um número inteiro.").nonnegative("Estoque mínimo deve ser não-negativo.").optional()
  ),
}).refine(data => {
  if (data.tipo === 'Produto') {
    return data.custoUnitario !== undefined && data.custoUnitario >= 0 &&
           data.quantidadeEstoque !== undefined && data.quantidadeEstoque >= 0 &&
           data.estoqueMinimo !== undefined && data.estoqueMinimo >= 0;
  }
  return true;
}, {
  message: "Para tipo 'Produto', Custo Unitário, Estoque Atual e Estoque Mínimo são obrigatórios e devem ser não-negativos.",
  path: ['custoUnitario'], // Campo para exibir o erro, pode ser um campo geral ou o primeiro relevante
});
export type ProductServiceFormValues = z.infer<typeof ProductServiceFormSchema>;
