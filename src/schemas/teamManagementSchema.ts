// src/schemas/teamManagementSchema.ts
import { z } from 'zod';

export const CreateUserFormSchema = z.object({
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  accessibleModules: z.array(z.string()).min(1, "Selecione pelo menos um módulo."),
});

export type CreateUserFormValues = z.infer<typeof CreateUserFormSchema>;
