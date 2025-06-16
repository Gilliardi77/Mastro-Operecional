
import {
  ProductServiceSchema,
  ProductServiceCreateSchema,
  ProductServiceUpdateSchema,
  type ProductService,
  type ProductServiceCreateData,
  type ProductServiceUpdateData,
} from '@/schemas/productServiceSchema';
import {
  createDocument,
  getDocumentById,
  getAllDocumentsByUserId,
  updateDocument,
  deleteDocument,
  queryDocuments, // Importação adicionada
} from './firestoreService';
import type { QueryConstraint } from 'firebase/firestore'; // Importação adicionada

const COLLECTION_NAME = 'produtosServicos';

/**
 * Cria um novo produto ou serviço.
 * @param userId O ID do usuário proprietário.
 * @param data Os dados para o novo item, conformes ao ProductServiceCreateData.
 * @returns O item criado.
 */
export async function createProductService(userId: string, data: ProductServiceCreateData): Promise<ProductService> {
  // A validação de 'data' contra ProductServiceCreateSchema ocorre dentro de createDocument
  // Se createDocument for simplificado para não fazer a validação inicial, ela deve ocorrer aqui:
  // const validatedData = ProductServiceCreateSchema.parse(data);
  // No momento, firestoreService.createDocument faz a validação do schema de criação.

  // Ajustar os dados para Firestore: campos de produto podem ser null se não aplicável
  const dataForFirestore: ProductServiceCreateData = {
    ...data,
    custoUnitario: data.tipo === 'Produto' ? (data.custoUnitario ?? 0) : null,
    quantidadeEstoque: data.tipo === 'Produto' ? (data.quantidadeEstoque ?? 0) : null,
    estoqueMinimo: data.tipo === 'Produto' ? (data.estoqueMinimo ?? 0) : null,
  };
  return createDocument(COLLECTION_NAME, userId, ProductServiceCreateSchema, ProductServiceSchema, dataForFirestore);
}

/**
 * Obtém um produto ou serviço pelo seu ID.
 * @param id O ID do item.
 * @returns O item, ou null se não encontrado.
 */
export async function getProductServiceById(id: string): Promise<ProductService | null> {
  return getDocumentById(COLLECTION_NAME, id, ProductServiceSchema);
}

/**
 * Obtém todos os produtos e serviços de um usuário específico.
 * @param userId O ID do usuário.
 * @param orderByField Campo para ordenação (opcional, padrão 'nome').
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional, padrão 'asc').
 * @returns Uma lista de produtos e serviços.
 */
export async function getAllProductServicesByUserId(
  userId: string,
  orderByField: keyof ProductService & string = 'nome',
  orderDirection: 'asc' | 'desc' = 'asc'
): Promise<ProductService[]> {
  return getAllDocumentsByUserId(COLLECTION_NAME, userId, ProductServiceSchema, orderByField, orderDirection);
}

/**
 * Atualiza um produto ou serviço existente.
 * @param id O ID do item a ser atualizado.
 * @param data Os dados para atualizar o item, conformes ao ProductServiceUpdateData.
 * @returns O item atualizado.
 */
export async function updateProductService(id: string, data: ProductServiceUpdateData): Promise<ProductService> {
  // A validação de 'data' contra ProductServiceUpdateSchema ocorre dentro de updateDocument.
  // Ajustar os dados para Firestore: se tipo muda para Serviço, zerar/anular campos de produto
  let dataForFirestore = { ...data };
  if (data.tipo === 'Serviço') {
    dataForFirestore = {
      ...dataForFirestore,
      custoUnitario: null,
      quantidadeEstoque: null,
      estoqueMinimo: null,
    };
  } else if (data.tipo === 'Produto') {
    // Se tipo é produto, garantir que campos de estoque não sejam undefined se não fornecidos
    // mas devem ser >= 0 se fornecidos. O schema de update já lida com opcionais.
    // O schema de update permite que sejam undefined, o que significa "não alterar".
    // Se forem explicitamente null, serão setados como null.
  }


  const updatedProductService = await updateDocument(COLLECTION_NAME, id, dataForFirestore, ProductServiceUpdateSchema, ProductServiceSchema);
  if (!updatedProductService) {
    throw new Error(`Produto/Serviço com ID ${id} não encontrado após a atualização.`);
  }
  return updatedProductService;
}

/**
 * Exclui um produto ou serviço.
 * @param id O ID do item a ser excluído.
 */
export async function deleteProductService(id: string): Promise<void> {
  return deleteDocument(COLLECTION_NAME, id);
}

/**
 * Busca produtos/serviços por tipo.
 * @param userId O ID do usuário.
 * @param tipo O tipo de item ('Produto' ou 'Serviço').
 * @returns Uma lista de produtos/serviços do tipo especificado.
 */
export async function getProductServicesByType(userId: string, tipo: 'Produto' | 'Serviço'): Promise<ProductService[]> {
  const { where } = await import('firebase/firestore'); // Importação dinâmica para QueryConstraint
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    where("tipo", "==", tipo)
  ];
  return queryDocuments(COLLECTION_NAME, constraints, ProductServiceSchema);
}
