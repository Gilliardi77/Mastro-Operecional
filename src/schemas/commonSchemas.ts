
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Schema para validar Timestamps do Firestore, tanto na leitura (Timestamp) quanto na escrita (Date).
 * No create/update, passamos Date, que o firestoreService converte para Timestamp.
 * Ao ler, recebemos Timestamp, que o firestoreService converte para Date.
 * Esta versão é mais robusta para lidar com casos onde o dado no Firestore pode ser
 * um Timestamp, Date, string ISO válida ou número (epoch).
 */
export const FirestoreTimestampSchema = z.custom<Timestamp | Date | string | number>(
  (data) => {
    if (data instanceof Timestamp || data instanceof Date) {
      return true; // Aceita instâncias de Timestamp e Date diretamente
    }
    // Para strings ou números, verifica se podem ser convertidos para uma Data válida
    if (typeof data === 'string' || typeof data === 'number') {
      const d = new Date(data);
      return !isNaN(d.getTime()); // getTime() retorna NaN para datas inválidas
    }
    return false; // Não é um tipo esperado ou conversível
  },
  {
    message: 'Deve ser um Timestamp do Firestore, um objeto Date JavaScript, ou uma string/número que possa ser convertido para Data válida.',
  }
).transform((val) => {
  if (val instanceof Timestamp) {
    return val.toDate(); // Converte Timestamp do Firestore para Date JS
  }
  if (val instanceof Date) {
    return val; // Já é um Date JS, retorna como está
  }
  // Se for string ou número, já foi validado que é conversível. Agora converte.
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d;
  }
  // Fallback, embora a validação customizada deva pegar isso.
  // Lançar um erro Zod aqui pode ser mais informativo se chegar neste ponto.
  throw new z.ZodError([
    {
      code: z.ZodIssueCode.custom,
      path: [], // O caminho será preenchido pelo Zod ao chamar este transform
      message: 'Não foi possível transformar o valor em um objeto Date válido.',
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

