
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Schema para validar Timestamps do Firestore, tanto na leitura (Timestamp) quanto na escrita (Date).
 * Aceita Timestamps do Firestore, Datas JS, strings/números conversíveis para Data, e null.
 * Strings vazias são rejeitadas na validação.
 * Null e strings vazias (como fallback no transform) são convertidos para a data epoch (1970-01-01).
 */
export const FirestoreTimestampSchema = z.custom<Timestamp | Date | string | number | null>(
  (data) => {
    if (data === null) return true; // Permite null explicitamente
    if (data instanceof Timestamp || data instanceof Date) {
      return true; 
    }
    if (typeof data === 'string' || typeof data === 'number') {
      if (typeof data === 'string' && data.trim() === "") return false; // Rejeita string vazia
      const d = new Date(data);
      return !isNaN(d.getTime()); 
    }
    return false; 
  },
  {
    message: 'Deve ser um Timestamp do Firestore, um objeto Date JavaScript, uma string/número que possa ser convertido para Data válida, ou null.',
  }
).transform((val) => {
  if (val === null) {
    console.warn("[FirestoreTimestampSchema] Valor de timestamp nulo encontrado no Firestore. Usando data epoch (1970-01-01) como padrão. Verifique os dados da sua coleção.");
    return new Date(0); // Default para epoch se o valor for null
  }
  if (val instanceof Timestamp) {
    return val.toDate(); 
  }
  if (val instanceof Date) {
    return val; 
  }
  // Lidar com conversão de string/número
  if (typeof val === 'string' && val.trim() === "") {
    // Este caso deve ser pego pela validação, mas como fallback:
    console.warn("[FirestoreTimestampSchema] Valor de timestamp como string vazia encontrado. Usando data epoch (1970-01-01) como padrão. Verifique os dados da sua coleção.");
    return new Date(0);
  }
  const d = new Date(val); // val aqui pode ser string ou número
  if (!isNaN(d.getTime())) {
    return d;
  }
  
  // Se chegou aqui, a transformação falhou apesar da validação (improvável com a lógica atual)
  console.error(`[FirestoreTimestampSchema] Falha ao transformar o valor '${String(val)}' em um objeto Date válido. Isso não deveria acontecer se a validação customizada estiver correta.`);
  throw new z.ZodError([ 
    {
      code: z.ZodIssueCode.custom,
      path: [], 
      message: `Não foi possível transformar o valor '${String(val)}' em um objeto Date válido.`,
    },
  ]);
});


export const FirestoreTimestampOutputSchema = z.custom<Timestamp>(
  (data) => data instanceof Timestamp,
  {
    message: 'Deve ser um Timestamp do Firestore.',
  }
);


/**
 * Schema base para todas as entidades principais armazenadas no Firestore.
 * Inclui campos padrão que são gerenciados automaticamente pelos serviços.
 */
export const BaseSchema = z.object({
  id: z.string().describe('O ID único do documento Firestore.'),
  userId: z.string().describe('O ID do usuário proprietário do documento.'),
  createdAt: FirestoreTimestampSchema.describe('A data e hora em que o documento foi criado.'),
  updatedAt: FirestoreTimestampSchema.describe('A data e hora da última atualização do documento.'),
});
export type Base = z.infer<typeof BaseSchema>;

/**
 * Schema base para dados ao criar uma nova entidade.
 * Omite campos gerenciados pelo sistema como id, userId, createdAt, updatedAt.
 * Esses campos serão adicionados pelo firestoreService.
 */
export const BaseCreateSchema = z.object({}).passthrough(); // Permite campos extras que serão definidos nas entidades específicas

/**
 * Schema base para dados ao atualizar uma entidade existente.
 * Todos os campos específicos da entidade devem ser opcionais.
 * Omite campos gerenciados pelo sistema como id, userId, createdAt.
 * O campo updatedAt será atualizado automaticamente pelo firestoreService.
 */
export const BaseUpdateSchema = z.object({}).passthrough(); // Permite campos extras que serão definidos nas entidades específicas
