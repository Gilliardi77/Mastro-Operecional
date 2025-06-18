
# Documento Técnico de Backend - Ecossistema Business Maestro

**Versão:** 1.0
**Data da Última Atualização:** {{ CURRENT_DATE }} <!-- Este placeholder será substituído pela data atual -->

## 0. Introdução

Este documento descreve a arquitetura de backend do Firebase/Firestore compartilhada pelos diversos aplicativos que compõem o ecossistema "Business Maestro". O objetivo é fornecer uma fonte única de verdade sobre a estrutura de dados, coleções, regras de segurança, relacionamentos e padrões de acesso, visando garantir segurança, escalabilidade, consistência e compatibilidade entre os aplicativos.

**Princípios Fundamentais do Backend:**

1.  **Schemas são a Verdade:** Toda entidade tem seu schema Zod definido em `src/schemas/` (dentro de cada app relevante ou em uma biblioteca compartilhada). Nenhuma interação com o Firestore ocorre sem validação prévia por esses schemas.
2.  **Serviços são a Ponte com o Firestore:** Toda interação com o banco de dados deve ser encapsulada em serviços (`src/services/[entidade]Service.ts`), que por sua vez utilizam um serviço genérico (`firestoreService.ts`) para as operações CRUD básicas. A interação direta com o SDK do Firestore fora dessa camada de serviço é desencorajada.
3.  **Segurança por Regras:** As regras de segurança do Firestore são a principal linha de defesa para proteger os dados.
4.  **Consistência de Dados:** Entidades compartilhadas (como `usuarios`) devem ter uma única fonte da verdade para evitar duplicidade e inconsistência.
5.  **Documentação JSDoc:** Todos os schemas, tipos e funções de serviço devem ser bem documentados usando JSDoc para facilitar a compreensão e o uso por desenvolvedores e IAs.

---

## 1. Visão Geral das Coleções

A seguir, uma lista das principais coleções de dados no Firestore utilizadas pelo ecossistema Business Maestro:

*   **`usuarios`**: Perfis de usuários e dados da empresa.
*   **`consultationsMetadata`**: Metadados sobre o status da consulta de diagnóstico inicial do usuário.
*   **`userGoals`**: Planejamento estratégico e metas geradas pela IA para o usuário.
*   **`consultations`**: Histórico detalhado das sessões de consulta de diagnóstico.
*   **`clientes`**: Cadastro de clientes dos usuários do Business Maestro.
*   **`produtosServicos`**: Catálogo de produtos e serviços oferecidos pelos usuários.
*   **`agendamentos`**: Agendamentos de serviços/compromissos.
*   **`ordensServico`**: Ordens de serviço geradas para clientes.
*   **`ordensDeProducao`**: Ordens de produção internas, geralmente vinculadas a `ordensServico` ou `agendamentos`.
*   **`vendas`**: Registros de vendas realizadas (ex: Balcão PDV).
*   **`lancamentosFinanceiros`**: Entradas e saídas financeiras, incluindo aquelas geradas por vendas e OS.
*   **`faturas`**: Faturas emitidas para clientes (principalmente para o app Financeiro).
*   **`metasFinanceiras`**: Metas financeiras específicas definidas pelo usuário (principalmente para o app Financeiro).

---

## 2. Detalhamento das Coleções

### 2.1. Coleção: `usuarios`

*   **Propósito:** Armazenar informações de perfil do usuário e dados da empresa associada à conta do usuário. É a fonte da verdade para dados adicionais ao Firebase Authentication.
*   **ID do Documento:** `uid` do usuário do Firebase Authentication.
*   **Campos:**
    *   `companyName` (String): [Opcional] Nome da empresa. Ex: "Maestro Soluções LTDA".
    *   `companyCnpj` (String): [Opcional] CNPJ da empresa. Ex: "00.000.000/0001-00".
    *   `businessType` (String): [Opcional] Ramo/tipo de negócio. Ex: "Consultoria em TI".
    *   `companyPhone` (String): [Opcional] Telefone comercial. Ex: "(11) 99999-8888".
    *   `companyEmail` (String): [Opcional] Email comercial. Ex: "contato@maestrosolucoes.com".
    *   `personalPhoneNumber` (String): [Opcional] Telefone pessoal do usuário (se diferente do comercial e não o do Firebase Auth). Ex: "(11) 98888-7777".
    *   `createdAt` (Timestamp): [Obrigatório] Data de criação do perfil. Gerenciado automaticamente pelo `userProfileService` (usando `serverTimestamp` ou `firestoreService` indiretamente).
    *   `updatedAt` (Timestamp): [Obrigatório] Data da última atualização. Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE (Upsert):**
        *   **Quem executa:** Usuário final (implicitamente no primeiro login ou ao completar o perfil), Sistema (ao criar a conta).
        *   **Apps que utilizam:** Todos os apps do ecossistema (para garantir que o perfil exista), "Diagnóstico Maestro" (pode solicitar preenchimento inicial), "Maestro Operacional" (ao acessar pela primeira vez).
    *   **READ:**
        *   **Quem executa:** Usuário final (para ver seu perfil), Todos os apps (para obter dados da empresa, personalizar a experiência), IA (para contexto).
        *   **Apps que utilizam:** Todos os apps do ecossistema.
    *   **UPDATE (Upsert):**
        *   **Quem executa:** Usuário final (ao editar seu perfil), Sistema (raramente, para sincronizações).
        *   **Apps que utilizam:** App de Perfil/Configurações (se houver um centralizado), "Diagnóstico Maestro", "Maestro Operacional" (qualquer app que permita edição do perfil).
    *   **DELETE:**
        *   **Quem executa:** Geralmente não é permitido diretamente pelo usuário final. Exclusão de conta pode ser um processo de admin ou automação que limpa dados relacionados.
        *   **Apps que utilizam:** Módulo de Administração (se houver).
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /usuarios/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // O 'upsertUserProfile' cria o documento se não existir, ou mescla (merge: true) se existir.
      // O create implícito no setDoc com merge:true precisa de permissão de write.
      // O update (que também é um setDoc com merge:true) precisa de permissão de write.
      allow write: if request.auth != null && request.auth.uid == userId;
      // Delete deve ser restrito.
      allow delete: if false; // Ou: if isAdmin(request.auth.uid);
    }
    ```
*   **Indexação e Performance:**
    *   O acesso é primariamente pelo ID do documento (`userId`), que é altamente eficiente.
    *   Não são esperadas consultas complexas nesta coleção que exijam índices compostos, a menos que haja busca por `companyEmail` ou `companyCnpj` por administradores.

---

### 2.2. Coleção: `consultationsMetadata`

*   **Propósito:** Rastrear o status da consulta de diagnóstico inicial do usuário no "Diagnóstico Maestro".
*   **ID do Documento:** `uid` do usuário do Firebase Authentication.
*   **Campos:**
    *   `completed` (Boolean): [Obrigatório] Indica se o diagnóstico foi concluído. Ex: `true`.
    *   `completedAt` (Timestamp): [Opcional] Data e hora da conclusão. Ex: `FieldValue.serverTimestamp()`.
    *   `createdAt` (Timestamp): [Obrigatório] Data de criação do registro. Ex: `FieldValue.serverTimestamp()`.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Sistema/Backend do "Diagnóstico Maestro" (quando o usuário se registra ou inicia a primeira interação).
        *   **Apps que utilizam:** "Diagnóstico Maestro".
    *   **READ:**
        *   **Quem executa:** "Diagnóstico Maestro" (para verificar status), Outros apps ("Maestro Operacional", "Visão Clara Financeira") para personalizar a experiência.
        *   **Apps que utilizam:** "Diagnóstico Maestro", "Maestro Operacional", "Visão Clara Financeira".
    *   **UPDATE:**
        *   **Quem executa:** Sistema/Backend do "Diagnóstico Maestro" (quando o diagnóstico é concluído).
        *   **Apps que utilizam:** "Diagnóstico Maestro".
    *   **DELETE:**
        *   **Quem executa:** Geralmente não aplicável.
        *   **Apps que utilizam:** N/A.
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /consultationsMetadata/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // A escrita é feita pelo backend do Diagnóstico Maestro, que pode usar Admin SDK
      // ou um usuário de serviço. Se feita pelo cliente:
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    ```
*   **Indexação e Performance:**
    *   Acesso primário por ID do documento (`userId`).

---

### 2.3. Coleção: `userGoals`

*   **Propósito:** Armazenar os resultados da análise estratégica e planejamento de metas gerados pela IA na página `/goals` do "Diagnóstico Maestro".
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos:** (Campos detalhados no `BACKEND_GUIDE.md` existente, seção "Planejamento Estratégico e Metas do Usuário (`userGoals`)")
    *   `userId` (String): [Obrigatório] UID do usuário.
    *   `createdAt` (Timestamp): [Obrigatório] Data de criação.
    *   `inputData` (Object): [Obrigatório] Dados fornecidos pelo usuário (receita, despesas, metas, etc.).
        *   `currentRevenue` (Number), `currentExpenses` (Number), `targetRevenueGoal` (Number), `userQuestion` (String), etc.
    *   `analysisResult` (Object): [Obrigatório] Resposta da IA.
        *   `currentProfit` (Number), `targetProfit` (Number), `businessDiagnosis` (String), `actionPlan` (Array<String>), etc.
    *   `status` (String): [Opcional] Ex: "active", "archived". Default: "active".
    *   `type` (String): [Opcional] Ex: "strategic_planning". Default: "strategic_planning".
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Usuário final (ao submeter o formulário na página `/goals` do "Diagnóstico Maestro").
        *   **Apps que utilizam:** "Diagnóstico Maestro".
    *   **READ:**
        *   **Quem executa:** "Diagnóstico Maestro" (para exibir histórico), Outros apps ("Maestro Operacional", "Visão Clara Financeira") para contexto e personalização.
        *   **Apps que utilizam:** "Diagnóstico Maestro", "Maestro Operacional", "Visão Clara Financeira".
    *   **UPDATE:**
        *   **Quem executa:** Usuário final (ex: para arquivar um plano) ou Sistema (raro).
        *   **Apps que utilizam:** "Diagnóstico Maestro".
    *   **DELETE:**
        *   **Quem executa:** Usuário final (ex: para excluir um plano antigo).
        *   **Apps que utilizam:** "Diagnóstico Maestro".
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /userGoals/{goalId} {
      // Usuário só pode criar metas para si mesmo
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      // Usuário só pode ler, atualizar ou deletar suas próprias metas
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   **Obrigatório:** Índice composto em `userId` (ASC) e `createdAt` (DESC) para buscar o plano mais recente do usuário.
      ```json
      {
        "collectionGroup": "userGoals",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "userId", "order": "ASCENDING" },
          { "fieldPath": "createdAt", "order": "DESCENDING" }
        ]
      }
      ```

---

### 2.4. Coleção: `consultations`

*   **Propósito:** Armazenar os detalhes completos de cada sessão de diagnóstico interativa do "Diagnóstico Maestro".
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos:** (Campos detalhados no `BACKEND_GUIDE.md` existente, seção "Detalhes da Consulta de Diagnóstico (`consultations`)")
    *   `userId` (String): [Obrigatório] UID do usuário.
    *   `consultationCompletedAt` (Timestamp): [Obrigatório] Quando a consulta foi concluída.
    *   `initialFormData` (Object): [Obrigatório] Dados do formulário inicial.
    *   `userAnswers` (Object): [Obrigatório] Perguntas e respostas do usuário.
    *   `aiFeedbacks` (Object): [Obrigatório] Perguntas e feedbacks da IA.
    *   `finalDiagnosisParts` (Array<Object>): [Obrigatório] Partes do diagnóstico final.
    *   `createdAt` (Timestamp): [Obrigatório] Data de criação.
    *   `updatedAt` (Timestamp): [Obrigatório] Data da última atualização.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Sistema/Backend do "Diagnóstico Maestro" (ao final de uma sessão de consulta).
        *   **Apps que utilizam:** "Diagnóstico Maestro".
    *   **READ:**
        *   **Quem executa:** "Diagnóstico Maestro" (para exibir histórico). Outros apps podem ter acesso limitado para contexto profundo se necessário.
        *   **Apps que utilizam:** "Diagnóstico Maestro", potencialmente outros com permissões restritas.
    *   **UPDATE:**
        *   **Quem executa:** Geralmente não aplicável para consultas históricas.
        *   **Apps que utilizam:** N/A.
    *   **DELETE:**
        *   **Quem executa:** Usuário final (se permitido) ou Admin.
        *   **Apps que utilizam:** "Diagnóstico Maestro" (se houver funcionalidade de exclusão).
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /consultations/{consultationId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid; // Ou mais restrito
    }
    ```
*   **Indexação e Performance:**
    *   **Obrigatório:** Índice composto em `userId` (ASC) e `consultationCompletedAt` (DESC) para buscar a consulta mais recente.
      ```json
      {
        "collectionGroup": "consultations",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "userId", "order": "ASCENDING" },
          { "fieldPath": "consultationCompletedAt", "order": "DESCENDING" }
        ]
      }
      ```

---

### 2.5. Coleção: `clientes`

*   **Propósito:** Armazenar os dados dos clientes dos usuários do Business Maestro.
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos:** (Baseado em `clientSchema.ts`)
    *   `userId` (String): [Obrigatório] ID do usuário Business Maestro proprietário deste cliente.
    *   `nome` (String): [Obrigatório] Nome do cliente. Ex: "Empresa Exemplo Ltda".
    *   `email` (String): [Opcional] Email do cliente. Ex: "contato@empresaexemplo.com".
    *   `telefone` (String): [Opcional] Telefone do cliente. Ex: "(XX) XXXXX-XXXX".
    *   `endereco` (String): [Opcional] Endereço do cliente. Ex: "Rua Exemplo, 123, Bairro, Cidade - UF".
    *   `cpfCnpj` (String): [Opcional] CPF ou CNPJ do cliente.
    *   `dataNascimento` (String): [Opcional] Data de nascimento (formato AAAA-MM-DD).
    *   `observacoes` (String): [Opcional] Observações sobre o cliente.
    *   `temDebitos` (Boolean): [Obrigatório] Indica se o cliente possui débitos. Default: `false`.
    *   `createdAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `updatedAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Usuário final (via UI do "Maestro Operacional").
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **READ:**
        *   **Quem executa:** Usuário final (para listar, selecionar em OS, etc.), IA (para contexto em OS).
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **UPDATE:**
        *   **Quem executa:** Usuário final (ao editar dados do cliente).
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **DELETE:**
        *   **Quem executa:** Usuário final.
        *   **Apps que utilizam:** "Maestro Operacional".
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /clientes/{clienteId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   Índice em `userId` (ASC) e `nome` (ASC) para listagem ordenada por nome.
    *   Considerar índices adicionais se houver buscas frequentes por `email` ou `cpfCnpj` dentro do escopo do `userId`.

---

### 2.6. Coleção: `produtosServicos`

*   **Propósito:** Catálogo de produtos e serviços oferecidos pelos usuários do Business Maestro.
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos:** (Baseado em `productServiceSchema.ts`)
    *   `userId` (String): [Obrigatório] ID do usuário Business Maestro proprietário.
    *   `nome` (String): [Obrigatório] Nome do produto/serviço. Ex: "Consultoria Estratégica".
    *   `tipo` (String): [Obrigatório] "Produto" ou "Serviço".
    *   `descricao` (String): [Opcional] Descrição.
    *   `valorVenda` (Number): [Obrigatório] Preço de venda. Ex: `250.00`.
    *   `unidade` (String): [Obrigatório] Unidade (UN, KG, HR, M², Peça). Ex: "HR".
    *   `custoUnitario` (Number): [Opcional, Obrigatório para tipo "Produto"] Custo. Ex: `100.00`.
    *   `quantidadeEstoque` (Number): [Opcional, Obrigatório para tipo "Produto"] Estoque atual. Ex: `10`.
    *   `estoqueMinimo` (Number): [Opcional, Obrigatório para tipo "Produto"] Estoque mínimo. Ex: `5`.
    *   `createdAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `updatedAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE, READ, UPDATE, DELETE:**
        *   **Quem executa:** Usuário final (via UI do "Maestro Operacional").
        *   **Apps que utilizam:** "Maestro Operacional" (cadastro, seleção em OS/Vendas, controle de estoque).
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /produtosServicos/{itemId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   Índice em `userId` (ASC) e `nome` (ASC).
    *   Índice em `userId` (ASC) e `tipo` (ASC) para filtrar por tipo.

---

### 2.7. Coleção: `agendamentos`

*   **Propósito:** Gerenciar agendamentos de serviços e compromissos dos usuários.
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos:** (Baseado em `appointmentSchema.ts`)
    *   `userId` (String): [Obrigatório] ID do usuário proprietário.
    *   `clienteId` (String): [Obrigatório] ID do cliente (pode ser 'manual_cliente_...' ou ID da coleção `clientes`).
    *   `clienteNome` (String): [Obrigatório] Nome do cliente.
    *   `servicoId` (String): [Obrigatório] ID do serviço/produto (pode ser 'manual_servico_...' ou ID da coleção `produtosServicos`).
    *   `servicoNome` (String): [Obrigatório] Nome do serviço/produto.
    *   `dataHora` (Timestamp): [Obrigatório] Data e hora do agendamento.
    *   `observacoes` (String): [Opcional].
    *   `status` (String): [Obrigatório] "Pendente", "Em Andamento", "Concluído", "Cancelado". Default: "Pendente".
    *   `geraOrdemProducao` (Boolean): [Obrigatório] Se gera OP. Default: `false`.
    *   `createdAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `updatedAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE, READ, UPDATE, DELETE:**
        *   **Quem executa:** Usuário final (via UI do "Maestro Operacional").
        *   **Apps que utilizam:** "Maestro Operacional" (principalmente módulo de Agenda).
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /agendamentos/{agendamentoId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   Índice em `userId` (ASC) e `dataHora` (ASC/DESC) para visualização em calendário/lista.

---

### 2.8. Coleção: `ordensServico`

*   **Propósito:** Gerenciar ordens de serviço (OS) para clientes.
*   **ID do Documento:** Gerado automaticamente pelo Firestore (usado como `numeroOS` também).
*   **Campos:** (Baseado em `ordemServicoSchema.ts`)
    *   `userId` (String): [Obrigatório] ID do usuário proprietário.
    *   `numeroOS` (String): [Obrigatório] ID do documento.
    *   `clienteId` (String): [Opcional] ID do cliente da coleção `clientes`.
    *   `clienteNome` (String): [Obrigatório] Nome do cliente.
    *   `itens` (Array<Object>): [Obrigatório] Lista de itens da OS. Cada item: `{ produtoServicoId?, nome, quantidade, valorUnitario, tipo }`.
    *   `valorTotal` (Number): [Obrigatório] Valor total da OS.
    *   `valorAdiantado` (Number): [Opcional] Default: `0`.
    *   `dataEntrega` (Timestamp): [Obrigatório] Data prevista de entrega.
    *   `observacoes` (String): [Opcional].
    *   `status` (String): [Obrigatório] "Pendente", "Em Andamento", "Concluído", "Cancelado". Default: "Pendente".
    *   `statusPagamento` (String): [Obrigatório] "Pendente", "Pago Parcial", "Pago Total". Default: "Pendente".
    *   `valorPagoTotal` (Number): [Opcional] Default: `0`.
    *   `dataUltimoPagamento` (Timestamp): [Opcional].
    *   `formaUltimoPagamento` (String): [Opcional].
    *   `observacoesPagamento` (String): [Opcional].
    *   `createdAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `updatedAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Usuário final (via UI "Maestro Operacional", ex: Nova OS, ou transformação de Venda Balcão em OS). Automação (se um Agendamento com `geraOrdemProducao` for `true` também gerar uma OS base).
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **READ, UPDATE, DELETE:**
        *   **Quem executa:** Usuário final (via UI "Maestro Operacional").
        *   **Apps que utilizam:** "Maestro Operacional".
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /ordensServico/{osId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   Índice em `userId` (ASC) e `createdAt` (DESC) para listagem das OS mais recentes.
    *   Índice em `userId` (ASC) e `dataEntrega` (ASC) para OS com entrega próxima.
    *   Índice em `userId` (ASC) e `status` (ASC) para filtrar por status.

---

### 2.9. Coleção: `ordensDeProducao`

*   **Propósito:** Gerenciar o fluxo de produção interno, geralmente vinculado a `ordensServico` ou `agendamentos`.
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos:** (Baseado em `ordemProducaoSchema.ts`)
    *   `userId` (String): [Obrigatório] ID do usuário proprietário.
    *   `agendamentoId` (String): [Obrigatório] ID da `ordensServico` ou `agendamentos` original.
    *   `clienteId` (String): [Opcional].
    *   `clienteNome` (String): [Obrigatório].
    *   `servicoNome` (String): [Obrigatório] Descrição do serviço/produto principal.
    *   `dataAgendamento` (Timestamp): [Obrigatório] Data herdada.
    *   `status` (String): [Obrigatório] "Pendente", "Em Andamento", "Concluído", "Cancelado". Default: "Pendente".
    *   `progresso` (Number): [Opcional] Percentual (0-100). Default: `0`.
    *   `observacoesAgendamento` (String): [Opcional] Observações da OS/Agendamento.
    *   `observacoesProducao` (String): [Opcional] Observações da equipe de produção.
    *   `createdAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `updatedAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Automação/Sistema (quando uma OS é criada ou um Agendamento com `geraOrdemProducao=true` é salvo).
        *   **Apps que utilizam:** "Maestro Operacional" (indiretamente).
    *   **READ, UPDATE:**
        *   **Quem executa:** Usuário final (via UI do "Maestro Operacional" - Módulo de Produção).
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **DELETE:**
        *   **Quem executa:** Geralmente não aplicável, exceto por Admin ou se a OS original for cancelada.
        *   **Apps que utilizam:** "Maestro Operacional" (condicionalmente).
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /ordensDeProducao/{opId} {
      // A criação é mais complexa, pode ser por função de backend ou regra que verifica a OS vinculada.
      // Exemplo simplificado para criação pelo usuário (se aplicável diretamente):
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid; // Ou mais restrito
    }
    ```
*   **Indexação e Performance:**
    *   Índice em `userId` (ASC) e `dataAgendamento` (DESC).
    *   Índice em `userId` (ASC) e `status` (ASC).
    *   Índice em `userId` (ASC) e `agendamentoId` (ASC) para encontrar OPs de uma OS específica.

---

### 2.10. Coleção: `vendas`

*   **Propósito:** Registrar vendas diretas, como as realizadas no Balcão PDV.
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos:**
    *   `userId` (String): [Obrigatório] ID do usuário proprietário.
    *   `clienteId` (String): [Opcional] ID do cliente da coleção `clientes`.
    *   `clienteNome` (String): [Obrigatório] Nome do cliente (pode ser "Cliente Avulso").
    *   `itens` (Array<Object>): [Obrigatório] Lista de itens da venda. Cada item: `{ productId?, nome, quantidade, valorUnitario, valorTotal, manual?, productType? }`.
    *   `totalVenda` (Number): [Obrigatório] Valor total da venda.
    *   `formaPagamento` (String): [Obrigatório] Ex: "dinheiro", "pix", "cartao_credito".
    *   `dataVenda` (Timestamp): [Obrigatório] Data e hora da venda.
    *   `status` (String): [Obrigatório] Ex: "Concluída", "Cancelada". Default: "Concluída".
    *   `criadoEm` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `atualizadoEm` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Usuário final (via UI do Balcão PDV no "Maestro Operacional").
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **READ:**
        *   **Quem executa:** Usuário final (para histórico, relatórios), IA (para análise financeira).
        *   **Apps que utilizam:** "Maestro Operacional", "Visão Clara Financeira".
    *   **UPDATE:**
        *   **Quem executa:** Usuário final (ex: para cancelar uma venda, se permitido).
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **DELETE:**
        *   **Quem executa:** Geralmente restrito a Admin ou para correções.
        *   **Apps que utilizam:** Módulo de Administração (se houver).
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /vendas/{vendaId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update: if request.auth != null && resource.data.userId == request.auth.uid;
      // Delete deve ser mais restrito
      allow delete: if false; // Ou: if isAdmin(request.auth.uid) && resource.data.userId == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   Índice em `userId` (ASC) e `dataVenda` (DESC) para histórico.

---

### 2.11. Coleção: `lancamentosFinanceiros`

*   **Propósito:** Registrar todas as transações financeiras (receitas e despesas).
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos:**
    *   `userId` (String): [Obrigatório] ID do usuário proprietário.
    *   `titulo` (String): [Obrigatório] Descrição breve. Ex: "Venda Balcão #123", "Pagamento OS #456".
    *   `valor` (Number): [Obrigatório] Valor da transação (positivo para receita, negativo para despesa).
    *   `tipo` (String): [Obrigatório] "receita" ou "despesa".
    *   `data` (Timestamp): [Obrigatório] Data da transação/competência.
    *   `categoria` (String): [Obrigatório] Ex: "Venda Balcão", "Receita de OS", "Aluguel", "Fornecedor".
    *   `status` (String): [Obrigatório] "pago", "recebido", "pendente".
    *   `descricao` (String): [Opcional] Detalhes adicionais.
    *   `vendaId` (String): [Opcional] ID da venda relacionada (da coleção `vendas`).
    *   `referenciaOSId` (String): [Opcional] ID da OS relacionada (da coleção `ordensServico`).
    *   `criadoEm` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `atualizadoEm` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Automação/Sistema (ao finalizar uma `venda` ou registrar pagamento de `ordensServico`), Usuário final (ao registrar despesas ou receitas manuais no "Visão Clara Financeira").
        *   **Apps que utilizam:** "Maestro Operacional" (indiretamente), "Visão Clara Financeira".
    *   **READ:**
        *   **Quem executa:** Usuário final (para extratos, relatórios), IA (para análises).
        *   **Apps que utilizam:** "Visão Clara Financeira", "Maestro Operacional" (para exibir pagamentos de OS).
    *   **UPDATE, DELETE:**
        *   **Quem executa:** Usuário final (para corrigir ou excluir lançamentos manuais). Lançamentos automáticos geralmente não são editados diretamente.
        *   **Apps que utilizam:** "Visão Clara Financeira".
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /lancamentosFinanceiros/{lancamentoId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   Índice em `userId` (ASC) e `data` (DESC) para extratos.
    *   Índice em `userId` (ASC), `tipo` (ASC), `data` (DESC) para filtrar por tipo e data.
    *   Índice em `userId` (ASC) e `categoria` (ASC) para filtrar por categoria.

---

### 2.12. Coleção: `faturas` (Exemplo para App Financeiro)

*   **Propósito:** Gerenciar faturas emitidas para clientes, controle de vencimento e pagamento.
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos (Sugestão):**
    *   `userId` (String): [Obrigatório].
    *   `clienteId` (String): [Obrigatório] ID da coleção `clientes`.
    *   `clienteNome` (String): [Obrigatório].
    *   `numeroFatura` (String): [Obrigatório] Número sequencial ou customizado.
    *   `dataEmissao` (Timestamp): [Obrigatório].
    *   `dataVencimento` (Timestamp): [Obrigatório].
    *   `itens` (Array<Object>): [Obrigatório] `{ descricao, quantidade, valorUnitario, valorTotal }`.
    *   `valorTotalFatura` (Number): [Obrigatório].
    *   `status` (String): [Obrigatório] "Pendente", "Paga", "Vencida", "Cancelada".
    *   `dataPagamento` (Timestamp): [Opcional].
    *   `observacoes` (String): [Opcional].
    *   `linkBoletoPdf` (String): [Opcional].
    *   `createdAt` (Timestamp): [Obrigatório].
    *   `updatedAt` (Timestamp): [Obrigatório].
*   **Operações (CRUD):**
    *   **CREATE, READ, UPDATE, DELETE:**
        *   **Quem executa:** Usuário final (via UI do "Visão Clara Financeira").
        *   **Apps que utilizam:** "Visão Clara Financeira".
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /faturas/{faturaId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   `userId` (ASC), `dataVencimento` (ASC) para faturas a vencer.
    *   `userId` (ASC), `status` (ASC), `dataVencimento` (ASC).

---

### 2.13. Coleção: `metasFinanceiras` (Exemplo para App Financeiro)

*   **Propósito:** Permitir que o usuário defina e acompanhe metas financeiras.
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos (Sugestão):**
    *   `userId` (String): [Obrigatório].
    *   `nomeMeta` (String): [Obrigatório] Ex: "Aumentar Receita Mensal", "Reduzir Despesas Operacionais".
    *   `descricao` (String): [Opcional].
    *   `valorAlvo` (Number): [Obrigatório].
    *   `valorAtual` (Number): [Obrigatório] Calculado ou inserido. Default: `0`.
    *   `dataInicio` (Timestamp): [Obrigatório].
    *   `dataAlvo` (Timestamp): [Obrigatório].
    *   `tipoMeta` (String): [Obrigatório] Ex: "Receita", "Lucro", "Despesa Max", "Investimento".
    *   `categoriaRelacionada` (String): [Opcional] Se a meta for específica para uma categoria de `lancamentosFinanceiros`.
    *   `status` (String): [Obrigatório] "Ativa", "Concluída", "Não Atingida", "Cancelada".
    *   `createdAt` (Timestamp): [Obrigatório].
    *   `updatedAt` (Timestamp): [Obrigatório].
*   **Operações (CRUD):**
    *   **CREATE, READ, UPDATE, DELETE:**
        *   **Quem executa:** Usuário final (via UI do "Visão Clara Financeira"). Automação (para atualizar `valorAtual` com base em `lancamentosFinanceiros`).
        *   **Apps que utilizam:** "Visão Clara Financeira".
*   **Regras de Segurança (Firestore Rules):**
    ```firestore
    match /metasFinanceiras/{metaId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   `userId` (ASC), `dataAlvo` (ASC).
    *   `userId` (ASC), `status` (ASC).

---

## 3. Relacionamentos entre Coleções

*   **`ordensServico`**
    *   Referencia `clientes` (opcionalmente, via `clienteId`).
    *   Referencia `produtosServicos` (nos `itens`, via `produtoServicoId`).
*   **`ordensDeProducao`**
    *   Referencia `ordensServico` ou `agendamentos` (via `agendamentoId`).
    *   Pode referenciar `clientes` (via `clienteId`, herdado).
*   **`agendamentos`**
    *   Referencia `clientes` (via `clienteId`).
    *   Referencia `produtosServicos` (via `servicoId`).
*   **`vendas`**
    *   Referencia `clientes` (opcionalmente, via `clienteId`).
    *   Referencia `produtosServicos` (nos `itens`, via `productId`).
*   **`lancamentosFinanceiros`**
    *   Pode referenciar `vendas` (via `vendaId`).
    *   Pode referenciar `ordensServico` (via `referenciaOSId`).
*   **`faturas`** (Exemplo)
    *   Referencia `clientes` (via `clienteId`).
*   **`userGoals`**
    *   Pertence a um usuário (via `userId`), mas não referencia diretamente outras coleções de dados operacionais, pois é mais estratégico.
*   **`consultationsMetadata`** e **`consultations`**
    *   Vinculadas ao `usuarios` pelo ID do documento ser o `userId`.

**Visualização (Simplificada):**
```
usuarios --1:N-- clientes
usuarios --1:N-- produtosServicos
usuarios --1:N-- agendamentos
usuarios --1:N-- ordensServico
usuarios --1:N-- ordensDeProducao
usuarios --1:N-- vendas
usuarios --1:N-- lancamentosFinanceiros
usuarios --1:N-- userGoals
usuarios --1:1-- consultationsMetadata (ID do doc é o userId)
usuarios --1:N-- consultations

clientes --1:N-- agendamentos
clientes --1:N-- ordensServico
clientes --1:N-- vendas

produtosServicos --M:N-- ordensServico (via tabela de itens)
produtosServicos --M:N-- agendamentos
produtosServicos --M:N-- vendas (via tabela de itens)

ordensServico --1:N-- ordensDeProducao (via agendamentoId, que aqui seria o osId)
agendamentos --1:N-- ordensDeProducao (via agendamentoId)

ordensServico --1:N-- lancamentosFinanceiros
vendas --1:N-- lancamentosFinanceiros
```

---

## 4. Considerações de Performance e Indexação

*   **Índices Padrão:** O Firestore cria automaticamente índices de campo único em ordem ascendente e descendente para todos os campos.
*   **Índices Compostos:**
    *   São **essenciais** para consultas que filtram por múltiplos campos ou que ordenam por um campo e filtram por outro.
    *   O Firebase Console geralmente sugere a criação de índices compostos quando uma consulta falha devido à sua ausência.
    *   Exemplos de índices compostos necessários já foram listados nas seções de cada coleção (ex: `userGoals` por `userId` e `createdAt`).
    *   **Regra geral:** Se você tem `query(collectionRef, where("campoA", "==", valorA), orderBy("campoB"))`, você precisará de um índice em `campoA` (ASC) e `campoB` (ASC/DESC).
*   **Limitar Dados Lidos:**
    *   Use `limit()` em consultas para paginar resultados e evitar carregar grandes volumes de dados desnecessariamente.
    *   Busque apenas os campos necessários se os documentos forem muito grandes (projeção), embora isso seja mais comum em APIs REST do que diretamente no Firestore SDK cliente, onde geralmente se busca o documento inteiro.
*   **Denormalização:**
    *   Para leituras frequentes de dados relacionados, considere a denormalização (duplicação controlada de dados). Por exemplo, armazenar `clienteNome` em `ordensServico` evita um join na leitura, mas requer lógica para manter a consistência se o nome do cliente mudar. Já estamos fazendo isso em várias coleções.
*   **Estrutura de Dados:**
    *   Evite documentos excessivamente grandes ou arrays muito longos dentro de documentos, pois há limites de tamanho de documento (1MB). Para listas potencialmente ilimitadas, use subcoleções.
*   **Subcoleções vs. Coleções Raiz:**
    *   Subcoleções são úteis para dados fortemente ligados a um documento pai (ex: `itens` de uma `ordemServico` poderiam ser uma subcoleção se fossem muito numerosos ou complexos). Atualmente, estamos usando arrays, o que é bom para listas menores/moderadas.

---

## 5. Padrões de Acesso aos Dados (Consulta e Escrita)

*   **Camada de Serviço:**
    *   Conforme os "Princípios Fundamentais", toda interação com o Firestore deve passar pela camada de serviço.
    *   **`firestoreService.ts`**: Contém funções genéricas (`createDocument`, `getDocumentById`, `getAllDocumentsByUserId`, `updateDocument`, `deleteDocument`, `queryDocuments`).
        *   Responsável por:
            *   Adicionar/atualizar automaticamente `userId`, `createdAt`, `updatedAt`.
            *   Converter `Date` JavaScript para `Timestamp` Firestore na escrita.
            *   Converter `Timestamp` Firestore para `Date` JavaScript na leitura.
            *   Validação de schemas Zod (o `createSchema` na criação e o `fullSchema` para o retorno).
    *   **`[entidade]Service.ts`** (ex: `clientService.ts`):
        *   Define funções específicas para a entidade (ex: `createClient`, `findClientsWithDebits`).
        *   Invoca as funções do `firestoreService.ts`, passando os schemas Zod corretos e os dados.
        *   Encapsula qualquer lógica de negócios específica antes ou depois da interação com o `firestoreService`.
*   **Consultas no Frontend (quando aplicável):**
    *   Para listagens dinâmicas e com filtros complexos na UI, o frontend pode construir consultas usando o SDK do Firebase e chamar funções dos serviços de entidade que, por sua vez, usam `queryDocuments` do `firestoreService`.
    *   O hook `useRealtimeCollection` é um exemplo de como o frontend pode escutar mudanças em tempo real, mas para operações de escrita, sempre deve passar pelo serviço.
*   **Operações de Escrita:**
    *   Sempre validadas por schemas Zod na camada de serviço (`[entidade]Service.ts` antes de chamar `firestoreService.ts`, ou dentro do `firestoreService.ts` como está atualmente).
    *   Dados de entrada para criação/atualização devem usar `Date` para campos de data/hora; a conversão para `Timestamp` é feita pelo `firestoreService`.

---

## 6. Possíveis Conflitos, Duplicidades ou Inconsistências (e Como Mitigar)

*   **Perfil de Usuário (`usuarios`) vs. Firebase Auth:**
    *   **Problema:** Dados como nome de exibição e email podem existir em ambos.
    *   **Mitigação:** Definido no Guia: Firebase Auth é a fonte da verdade para dados básicos de autenticação. `usuarios` armazena dados adicionais. Sincronização pode ser necessária se o usuário atualizar dados no Firebase Auth.
*   **Denormalização de Nomes (ex: `clienteNome` em `ordensServico`):**
    *   **Problema:** Se o nome do cliente mudar na coleção `clientes`, as OS antigas terão o nome desatualizado.
    *   **Mitigação:**
        *   **Aceitar:** Para registros históricos, o nome no momento da criação da OS pode ser o desejado.
        *   **Atualização em Cascata (Complexo):** Implementar gatilhos (Cloud Functions) para atualizar `clienteNome` em todas as OS relacionadas quando um cliente é atualizado. Geralmente excessivo para este campo.
        *   **Preferível:** Na UI, ao exibir uma OS, sempre mostrar o `clienteNome` armazenado na OS, mas fornecer um link para o perfil atual do cliente na coleção `clientes` para ver os dados mais recentes.
*   **Duplicação de Produtos/Serviços em Itens de OS/Venda:**
    *   **Problema:** `itens` em `ordensServico` e `vendas` armazenam `nome` e `valorUnitario` do produto/serviço no momento da transação. Se o preço mudar no catálogo `produtosServicos`, as transações antigas mantêm o preço original.
    *   **Mitigação:** Este é o comportamento **desejado e correto**. Preços de transações passadas não devem mudar. A referência `produtoServicoId` permite buscar os detalhes atuais do item no catálogo, se necessário.
*   **Consistência de Estoque (`produtosServicos`.`quantidadeEstoque`):**
    *   **Problema:** Múltiplas operações (vendas, entradas, saídas, ajustes) podem modificar o estoque. Sem transações atômicas, pode haver inconsistência.
    *   **Mitigação:** Usar **transações do Firestore** para operações que leem e depois escrevem o estoque (ex: ao registrar uma venda ou uma saída manual). O `firestoreService` atual não implementa transações em suas funções genéricas CRUD, mas os serviços de entidade específicos (ou as páginas, como visto em `BalcaoPage` e `EstoquePage`) devem usar `runTransaction` para essas operações críticas. O Guia deve reforçar isso.
*   **Geração de `lancamentosFinanceiros`:**
    *   **Problema:** Garantir que para cada venda ou pagamento de OS, um `lancamentoFinanceiro` correspondente seja criado atomicamente.
    *   **Mitigação:**
        *   **Transações:** Idealmente, a criação da Venda/atualização da OS e a criação do `lancamentoFinanceiro` deveriam ocorrer dentro da mesma transação do Firestore.
        *   **Cloud Functions (Alternativa):** Um gatilho do Firestore na criação/atualização de `vendas` ou `ordensServico` (para pagamentos) pode criar o `lancamentoFinanceiro`. Isso desacopla a lógica, mas introduz latência e complexidade de tratamento de erros.
        *   **No Código do Serviço/Página:** Como está sendo feito atualmente, criar o lançamento financeiro logo após a operação principal. É crucial ter bom tratamento de erros para o caso de a segunda escrita falhar.
*   **`userGoals` (Diagnóstico) vs. `metasFinanceiras` (Financeiro):**
    *   **Problema:** Potencial sobreposição de propósito.
    *   **Mitigação:** Clarificar no Guia:
        *   `userGoals`: Nível estratégico, gerado por IA no Diagnóstico, focado em direcionamento amplo do negócio.
        *   `metasFinanceiras`: Nível operacional/tático, criadas e acompanhadas pelo usuário no app Financeiro, podem ser inspiradas pelo `actionPlan` do `userGoals`, mas são mais granulares e mensuráveis (ex: meta de faturamento mensal, redução de custo X). Os apps podem ler `userGoals` para sugerir a criação de `metasFinanceiras`.

---

## 7. Notas Adicionais

*   **Firebase Emulators:** Recomendar fortemente o uso do Firebase Local Emulator Suite durante o desenvolvimento para testar regras de segurança, Cloud Functions e interações com o Firestore sem afetar dados de produção ou incorrer em custos.
*   **Backup e Restore:** Definir uma estratégia de backup e restore para os dados do Firestore.
*   **Monitoramento e Alertas:** Configurar monitoramento no Firebase para uso do Firestore, execução de funções e erros, com alertas para problemas críticos.
*   **Evolução do Schema:** Este documento deve ser vivo. À medida que novas funcionalidades são adicionadas ou schemas mudam, este guia precisa ser atualizado. Considerar versionamento do guia.
*   **Validação de `userId`:** Todas as funções de serviço que recebem um `userId` devem validar se ele não é nulo ou indefinido antes de prosseguir, especialmente se o `bypassAuth` não estiver sendo usado.

---

Este documento serve como um ponto de partida e deve ser continuamente refinado à medida que o ecossistema Business Maestro cresce e evolui.
