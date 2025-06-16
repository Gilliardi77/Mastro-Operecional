
# Guia Unificado de Dados e Backend - Maestro Operacional

Este documento serve como guia central para o desenvolvimento de backend e gerenciamento de dados para todas as aplicações do ecossistema "Maestro Operacional". O objetivo é garantir consistência, qualidade, e facilitar a manutenção e evolução dos sistemas.

## 1. Inicialização e Configuração do Firebase

### 1.1. Centralização
A inicialização do Firebase no lado do cliente é centralizada no módulo `src/lib/firebase.ts`. Este deve ser o único ponto de inicialização da aplicação Firebase.

### 1.2. Variáveis de Ambiente
É **crítico** configurar corretamente as seguintes variáveis de ambiente no seu arquivo `.env` (para desenvolvimento local) ou nas configurações de ambiente do seu provedor de hospedagem (para produção):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

O módulo `src/lib/firebase.ts` inclui verificações e logs para alertar sobre a ausência dessas variáveis. Certifique-se de que elas estão presentes e corretas para evitar falhas na inicialização do Firebase.

### 1.3. Acesso às Instâncias Firebase
As instâncias do Firebase (app, auth, db, storage) devem ser obtidas exclusivamente através da função `getFirebaseInstances()` exportada por `src/lib/firebase.ts`. A inicialização ocorre automaticamente na primeira importação deste módulo em um contexto de cliente.

## 2. Camada de Serviço Abstrata para Firestore (`src/services/firestoreService.ts`)

### 2.1. Ponto Único de Acesso CRUD
O `firestoreService.ts` é a **única interface direta** para operações básicas de Create, Read, Update, Delete (CRUD) com o Firestore para todas as entidades do backend. Nenhum outro módulo (exceto os serviços de entidade) deve interagir diretamente com o SDK do Firestore para estas operações.

### 2.2. Gerenciamento Automático de Campos
O `firestoreService.ts` gerencia automaticamente os seguintes campos:
- **Na Criação:** Adiciona `userId` (do usuário autenticado), `createdAt` (como `Date`), e `updatedAt` (como `Date`) a novos documentos.
- **Na Atualização:** Atualiza automaticamente o campo `updatedAt` (como `Date`) em documentos existentes.

### 2.3. Conversão de Timestamps
O `firestoreService.ts` é responsável pela conversão transparente entre objetos `Date` do JavaScript (usados na lógica da aplicação e nos schemas Zod antes de enviar ao Firestore) e objetos `Timestamp` do Firestore (para armazenamento e recuperação). Os schemas Zod devem usar o `FirestoreTimestampSchema` para campos de data.

### 2.4. Validação com Zod na Camada de Serviço
O `firestoreService.ts` utiliza schemas Zod para validação:
- `createSchema`: Fornecido pelo serviço da entidade para validar os dados de entrada brutos antes da adição dos campos automáticos.
- `fullSchema`: Fornecido pelo serviço da entidade para validar a estrutura completa do documento (após a adição dos campos automáticos e conversão de timestamps) ao ser retornado do Firestore.

## 3. Serviços Dedicados por Entidade (Ex: `clientService.ts`)

### 3.1. Estrutura Padrão
Cada entidade de dados principal (Clientes, Produtos, Ordens de Serviço, etc.) deve ter seu próprio arquivo de serviço localizado em `src/services/`. Ex: `src/services/clientService.ts`.

### 3.2. Responsabilidades
Os serviços de entidade são responsáveis por:
- Definir a lógica de negócios específica da entidade (se houver).
- Utilizar **exclusivamente** as funções fornecidas pelo `src/services/firestoreService.ts` para qualquer persistência de dados.
- Fornecer os schemas Zod corretos (de criação, atualização e completo da entidade) para as funções do `firestoreService.ts`.

### 3.3. Interface Pública
Cada serviço de entidade deve expor uma API clara e bem definida para outras partes da aplicação interagirem com aquela entidade. Ex: `createClient(userId: string, data: ClientCreateData): Promise<Client>`.

## 4. Definições de Schema com Zod (`src/schemas/`)

### 4.1. `src/schemas/commonSchemas.ts`
- **`BaseSchema`**: Deve ser estendido por todos os schemas de entidade principais. Define os campos `id: string`, `userId: string`, `createdAt: FirestoreTimestampSchema`, `updatedAt: FirestoreTimestampSchema`.
- **`FirestoreTimestampSchema`**: Um schema Zod customizado (`z.custom().transform()`) que valida e transforma Timestamps do Firestore em objetos `Date` JavaScript na leitura, e aceita objetos `Date` na escrita para serem convertidos em Timestamps pelo `firestoreService`.
- **`BaseCreateSchema`**: Schema base para dados de criação de novas entidades (geralmente um `z.object({}).passthrough()` para ser estendido).
- **`BaseUpdateSchema`**: Schema base para dados de atualização de entidades existentes (geralmente um `z.object({}).passthrough()` para ser estendido, com campos opcionais).

### 4.2. Schemas por Entidade (Ex: `src/schemas/clientSchema.ts`)
Para cada entidade, definir:
- **`EntitySchema` (ex: `ClientSchema`):** Estende `BaseSchema`. Representa a estrutura completa do documento como é lido do Firestore e usado na aplicação (com campos `Date` já convertidos).
- **`EntityCreateSchema` (ex: `ClientCreateSchema`):** Estende `BaseCreateSchema`. Valida os dados brutos na criação. Campos de data devem ser compatíveis com o que `FirestoreTimestampSchema` espera para transformação em `Date`.
- **`EntityUpdateSchema` (ex: `ClientUpdateSchema`):** Estende `BaseUpdateSchema`. Valida dados para atualizações parciais; todos os campos da entidade devem ser opcionais. Mesma consideração para campos de data.

### 4.3. Schemas de Formulário (UI)
Podem existir schemas Zod específicos para formulários na UI, localizados próximos aos componentes que os utilizam ou em uma subpasta dentro de `src/schemas/ui/`. Estes podem diferir dos schemas de backend (ex: datas como strings para inputs HTML) e são responsabilidade da camada de apresentação.

## 5. Tratamento de Erros nos Serviços
- O `firestoreService.ts` propaga erros de validação Zod e erros do Firestore.
- Os serviços de entidade (ex: `clientService.ts`) devem capturar esses erros.
- Se necessário, podem re-lançá-los com mais contexto ou transformá-los em tipos de erro específicos da aplicação para tratamento uniforme no frontend (ex: exibição de `toast`s).

## 6. Padrões de Desenvolvimento Específicos

### 6.1. `bypassAuth` e `bypass_user_placeholder`
- Para facilitar o desenvolvimento local sem autenticação completa, o padrão de usar uma flag `bypassAuth: boolean` e um `userId` placeholder (ex: `"bypass_user_placeholder"`) pode ser adotado.
- **Regras de Segurança Firestore:** O Guia deve instruir que, para este modo de desenvolvimento, as Regras de Segurança do Firestore precisam ser temporariamente ajustadas para permitir acesso (leitura/escrita conforme necessário) para este `userId` placeholder ou para usuários não autenticados (`request.auth == null`).
  \`\`\`rules
  // Exemplo para desenvolvimento - NÃO USAR EM PRODUÇÃO SEM REVISÃO
  match /suaColecao/{docId} {
    allow read: if request.auth != null || request.auth.uid == "bypass_user_placeholder";
    allow write: if request.auth != null && request.auth.uid == resource.data.userId;
  }
  \`\`\`
- **Aviso de Segurança:** Incluir um aviso **MUITO CLARO** de que estas regras permissivas são **APENAS PARA DESENVOLVIMENTO** e devem ser substituídas por regras restritivas e seguras antes de qualquer implantação em produção. Em produção, o `bypass_user_placeholder` não deve ter acesso.

---

Este guia é um documento vivo e deve ser atualizado conforme novas decisões de arquitetura e padrões são estabelecidos.
    