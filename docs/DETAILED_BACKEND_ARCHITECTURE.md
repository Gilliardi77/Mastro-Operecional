
# Documento Técnico de Backend - Ecossistema Business Maestro

**Versão:** 1.2
**Data da Última Atualização:** 05 de Agosto de 2024

## 0. Introdução

Este documento descreve a arquitetura de backend do Firebase/Firestore compartilhada pelos diversos aplicativos que compõem o ecossistema "Business Maestro". O objetivo é fornecer uma fonte única de verdade sobre a estrutura de dados, coleções, regras de segurança, relacionamentos e padrões de acesso, visando garantir segurança, escalabilidade, consistência e compatibilidade entre os aplicativos.

**⚠️ Fonte Oficial da Verdade para Coleções e Regras do Firestore:**

**Atenção:** Os arquivos `DATA_SYNC_CONFIG.json` e `DATA_SYNC_SUMMARY.md`, localizados na raiz deste projeto, são a **fonte oficial de verdade** para:

*   A lista definitiva de coleções do Firestore.
*   Nomes de coleções e campos principais (implícito pelo uso).
*   Formatos de ID de documentos.
*   Regras de segurança do Firebase Firestore.

Embora este documento (`DETAILED_BACKEND_ARCHITECTURE.md`) forneça um detalhamento extensivo das coleções, seus campos e operações conforme entendidos durante sua criação, os arquivos `DATA_SYNC_CONFIG.json` e `DATA_SYNC_SUMMARY.md` devem ser considerados a referência canônica. Utilize-os para validar ou atualizar os detalhes específicos das coleções, especialmente nomes de coleções, regras de segurança, e formatos de ID. O `docs/BACKEND_GUIDE.md` complementa com o raciocínio arquitetural e padrões de implementação.

**Princípios Fundamentais do Backend:**

1.  **Schemas são a Verdade:** Toda entidade tem seu schema Zod definido em `src/schemas/` (dentro de cada app relevante ou em uma biblioteca compartilhada). Nenhuma interação com o Firestore ocorre sem validação prévia por esses schemas.
2.  **Serviços são a Ponte com o Firestore:** Toda interação com o banco de dados deve ser encapsulada em serviços (`src/services/[entidade]Service.ts`), que por sua vez utilizam um serviço genérico (`firestoreService.ts`) para as operações CRUD básicas. A interação direta com o SDK do Firestore fora dessa camada de serviço é desencorajada.
3.  **Segurança por Regras:** As regras de segurança do Firestore são a principal linha de defesa para proteger os dados.
4.  **Consistência de Dados:** Entidades compartilhadas (como `usuarios`) devem ter uma única fonte da verdade para evitar duplicidade e inconsistência.
5.  **Documentação JSDoc:** Todos os schemas, tipos e funções de serviço devem ser bem documentados usando JSDoc para facilitar a compreensão e o uso por desenvolvedores e IAs.

---

## 1. Visão Geral das Coleções

A seguir, uma lista das principais coleções de dados no Firestore utilizadas pelo ecossistema Business Maestro (consulte `DATA_SYNC_CONFIG.json` para a lista canônica e regras):

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
*   **`fechamentosCaixa`**: Registros diários de fechamento de caixa.
*   **`faturas`**: Faturas emitidas para clientes (principalmente para o app Financeiro).
*   **`metasFinanceiras`**: Metas financeiras específicas definidas pelo usuário (principalmente para o app Financeiro).
*   *(Outras coleções podem estar definidas em `DATA_SYNC_CONFIG.json`)*

---

## 2. Detalhamento das Coleções

*(Esta seção fornece detalhes sobre a estrutura e uso das coleções. Para a lista canônica de coleções e suas regras de segurança exatas, consulte `DATA_SYNC_CONFIG.json` e `DATA_SYNC_SUMMARY.md`.)*

### 2.1. Coleção: `usuarios`

*   **Propósito:** Armazenar informações de perfil do usuário e dados da empresa associada à conta do usuário. É a fonte da verdade para dados adicionais ao Firebase Authentication.
*   **ID do Documento:** `uid` do usuário do Firebase Authentication (conforme `DATA_SYNC_CONFIG.json`).
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
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `usuarios.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /usuarios/{docId} { // Onde docId é o userId
    //   allow read, write: if request.auth.uid == docId;
    //   allow delete: if false; // Ou conforme política de admin
    // }

    // Regras detalhadas do documento original:
    match /usuarios/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if false; // Ou: if isAdmin(request.auth.uid);
    }
    ```
*   **Indexação e Performance:**
    *   O acesso é primariamente pelo ID do documento (`userId`), que é altamente eficiente.
    *   Não são esperadas consultas complexas nesta coleção que exijam índices compostos, a menos que haja busca por `companyEmail` ou `companyCnpj` por administradores.

---

### 2.2. Coleção: `consultationsMetadata`

*   **Propósito:** Rastrear o status da consulta de diagnóstico inicial do usuário no "Diagnóstico Maestro".
*   **ID do Documento:** `uid` do usuário do Firebase Authentication (conforme `DATA_SYNC_CONFIG.json`).
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
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `consultationsMetadata.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /consultationsMetadata/{docId} { // Onde docId é o userId
    //   allow read, write: if request.auth.uid == docId;
    // }

    // Regras detalhadas do documento original:
    match /consultationsMetadata/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
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
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `userGoals.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /userGoals/{goalId} {
    //   allow read, write: if request.auth.uid == resource.data.userId;
    // }
    
    // Regras detalhadas do documento original:
    match /userGoals/{goalId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
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
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `consultations.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /consultations/{consultationId} {
    //   allow read, write: if request.auth.uid == resource.data.userId;
    // }

    // Regras detalhadas do documento original:
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
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `clientes.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /clientes/{clienteId} {
    //   allow read, write: if request.auth.uid == resource.data.userId;
    // }

    // Regras detalhadas do documento original:
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
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `produtosServicos.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /produtosServicos/{itemId} {
    //   allow read, write: if request.auth.uid == resource.data.userId;
    // }
    
    // Regras detalhadas do documento original:
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
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `agendamentos.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /agendamentos/{agendamentoId} {
    //   allow read, write: if request.auth.uid == resource.data.userId;
    // }

    // Regras detalhadas do documento original:
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
    *   `valorAdiantado` (Number): [Opcional] Default: `0`. Registra o valor pago no momento da criação da OS.
    *   `dataEntrega` (Timestamp): [Obrigatório] Data prevista de entrega.
    *   `observacoes` (String): [Opcional].
    *   `status` (String): [Obrigatório] "Pendente", "Em Andamento", "Concluído", "Cancelado". Default: "Pendente".
    *   `statusPagamento` (String): [Obrigatório] "Pendente", "Pago Parcial", "Pago Total". Default: "Pendente". Inicializado com base no `valorAdiantado`.
    *   `valorPagoTotal` (Number): [Opcional] Default: `0`. Soma de todos os pagamentos recebidos para esta OS, inicializado com `valorAdiantado`.
    *   `dataPrimeiroPagamento` (Timestamp): [Opcional, Nullable] Data do adiantamento, se houver.
    *   `formaPrimeiroPagamento` (String): [Opcional, Nullable] Forma de pagamento do adiantamento, se houver.
    *   `dataUltimoPagamento` (Timestamp): [Opcional, Nullable] Data do último pagamento subsequente (não o adiantamento).
    *   `formaUltimoPagamento` (String): [Opcional, Nullable] Forma do último pagamento subsequente.
    *   `observacoesPagamento` (String): [Opcional].
    *   `createdAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `updatedAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Usuário final (via UI "Maestro Operacional", ex: Nova OS, ou transformação de Venda Balcão em OS). Automação (se um Agendamento com `geraOrdemProducao` for `true` também gerar uma OS base).
        *   **Observação:** Se `valorAdiantado` > 0, um `lancamentoFinanceiro` do tipo "receita" e categoria "Adiantamento OS" é criado automaticamente com a `formaPrimeiroPagamento` e `dataPrimeiroPagamento` (data atual).
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **READ, UPDATE, DELETE:**
        *   **Quem executa:** Usuário final (via UI "Maestro Operacional").
        *   **Observação UPDATE:** Ao registrar pagamentos subsequentes (ex: na listagem de OS ou ao concluir OP), os campos `valorPagoTotal`, `statusPagamento`, `dataUltimoPagamento`, `formaUltimoPagamento`, `observacoesPagamento` são atualizados, e um `lancamentoFinanceiro` (categoria "Receita de OS") é gerado.
        *   **Apps que utilizam:** "Maestro Operacional".
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `ordensServico.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /ordensServico/{osId} {
    //   allow read, write: if request.auth.uid == resource.data.userId;
    // }

    // Regras detalhadas do documento original:
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
        *   **Observação UPDATE:** Ao atualizar o status da OP para "Concluído" (progresso 100%), o sistema verifica o `statusPagamento` da `ordensServico` original. Se houver saldo devedor na OS, um modal é apresentado para registrar o pagamento final (valor, forma de pagamento, data). Somente após o registro do pagamento (se necessário) ou se a OS já estiver totalmente paga, a OP tem seu status atualizado para "Concluído", a `ordensServico` original é marcada como "Concluído", e a baixa de estoque dos produtos da OS é realizada.
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **DELETE:**
        *   **Quem executa:** Geralmente não aplicável, exceto por Admin ou se a OS original for cancelada.
        *   **Apps que utilizam:** "Maestro Operacional" (condicionalmente).
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `ordensDeProducao.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /ordensDeProducao/{opId} {
    //   allow read, write: if request.auth.uid == resource.data.userId;
    // }

    // Regras detalhadas do documento original:
    match /ordensDeProducao/{opId} {
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
        *   **Observação:** Ao criar, um `lancamentoFinanceiro` do tipo "receita" é gerado automaticamente.
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
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `vendas.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /vendas/{vendaId} {
    //   allow read, write: if request.auth.uid == resource.data.userId;
    // }

    // Regras detalhadas do documento original:
    match /vendas/{vendaId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update: if request.auth != null && resource.data.userId == request.auth.uid;
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
    *   `titulo` (String): [Obrigatório] Descrição breve. Ex: "Venda Balcão #123", "Pagamento OS #456", "Adiantamento OS #789".
    *   `valor` (Number): [Obrigatório] Valor da transação (sempre positivo, `tipo` define natureza).
    *   `tipo` (String): [Obrigatório] "receita" ou "despesa".
    *   `data` (Timestamp): [Obrigatório] Data da transação/competência.
    *   `categoria` (String): [Obrigatório] Ex: "Venda Balcão", "Receita de OS", "Adiantamento OS", "Aluguel", "Fornecedor".
    *   `status` (String): [Obrigatório] "pago", "recebido", "pendente".
    *   `formaPagamento` (String): [Opcional, Nullable] Forma de pagamento utilizada (ex: "dinheiro", "pix").
    *   `descricao` (String): [Opcional] Detalhes adicionais.
    *   `vendaId` (String): [Opcional] ID da venda relacionada (da coleção `vendas`).
    *   `referenciaOSId` (String): [Opcional] ID da OS relacionada (da coleção `ordensServico`).
    *   `criadoEm` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `atualizadoEm` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Automação/Sistema (ao finalizar uma `venda`, registrar adiantamento ou pagamento de `ordensServico`), Usuário final (ao registrar despesas ou receitas manuais no "Visão Clara Financeira").
        *   **Apps que utilizam:** "Maestro Operacional" (indiretamente), "Visão Clara Financeira".
    *   **READ:**
        *   **Quem executa:** Usuário final (para extratos, relatórios), IA (para análises).
        *   **Apps que utilizam:** "Visão Clara Financeira", "Maestro Operacional" (para exibir pagamentos de OS).
    *   **UPDATE, DELETE:**
        *   **Quem executa:** Usuário final (para corrigir ou excluir lançamentos manuais). Lançamentos automáticos geralmente não são editados diretamente.
        *   **Apps que utilizam:** "Visão Clara Financeira".
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `lancamentosFinanceiros.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /lancamentosFinanceiros/{lancamentoId} {
    //   allow read, write: if request.auth.uid == resource.data.userId;
    // }

    // Regras detalhadas do documento original:
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

### 2.12. Coleção: `metasFinanceiras`

*   **Propósito:** Permitir que o usuário defina e acompanhe metas financeiras. Poderia ser usado pelo app "Visão Clara Financeira".
*   **ID do Documento:** Formato `userId_anoMes` (conforme `DATA_SYNC_CONFIG.json`).
*   **Campos (Sugestão, pois não está totalmente definido no schema):**
    *   `userId` (String): [Obrigatório, parte do ID].
    *   `anoMes` (String): [Obrigatório, parte do ID] Ex: "2024_07".
    *   `metaReceita` (Number): [Opcional] Meta de receita para o mês.
    *   `metaLucro` (Number): [Opcional] Meta de lucro para o mês.
    *   `metaDespesaMaxima` (Number): [Opcional] Limite de despesa para o mês.
    *   `descricao` (String): [Opcional] Descrição da meta.
    *   `createdAt` (Timestamp): [Obrigatório].
    *   `updatedAt` (Timestamp): [Obrigatório].
*   **Operações (CRUD):**
    *   **CREATE, READ, UPDATE, DELETE:**
        *   **Quem executa:** Usuário final (via UI do "Visão Clara Financeira").
        *   **Apps que utilizam:** "Visão Clara Financeira".
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `metasFinanceiras.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /metasFinanceiras/{docId} { // Onde docId é userId_anoMes
    //   allow read, write: if request.auth.uid == docId.split('_')[0];
    // }

    // Regras detalhadas do documento original (exemplo):
    match /metasFinanceiras/{metaId} { // Supondo que metaId seja o formato userId_anoMes
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid && metaId.split('_')[0] == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid && metaId.split('_')[0] == request.auth.uid;
    }
    ```
*   **Indexação e Performance:**
    *   Acesso primário pelo ID do documento (`userId_anoMes`). Se for buscar por `userId` apenas para listar todas as metas de um usuário, um índice em `userId` seria necessário se o ID do documento não for suficiente para a consulta.

---

### 2.13. Coleção: `fechamentosCaixa`

*   **Propósito:** Armazenar os registros diários de fechamento de caixa, incluindo totais de entradas, saídas, saldo final, sangrias, troco inicial e detalhamento de entradas por método de pagamento.
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Campos:** (Baseado em `fechamentoCaixaSchema.ts`)
    *   `userId` (String): [Obrigatório] ID do usuário Business Maestro proprietário deste fechamento.
    *   `dataFechamento` (Timestamp): [Obrigatório] Data e hora em que o fechamento foi realizado.
    *   `totalEntradasCalculado` (Number): [Obrigatório] Somatório de todas as entradas (receitas efetivadas no dia, calculado com base em `lancamentosFinanceiros` de receita e `vendas` PDV que não geraram lançamentos).
    *   `totalSaidasCalculado` (Number): [Obrigatório] Somatório de todas as saídas (despesas pagas) do dia, calculado pelo sistema com base nos `lancamentosFinanceiros`.
    *   `trocoInicial` (Number): [Opcional, Default: 0] Valor do troco inicial no caixa, informado manualmente. Sugerido com base no saldo final do último fechamento registrado, independentemente do dia.
    *   `sangrias` (Number): [Opcional, Default: 0] Total de retiradas manuais (sangrias) do caixa durante o dia, informado manualmente.
    *   `saldoFinalCalculado` (Number): [Obrigatório] Saldo final do caixa calculado: `(totalEntradasCalculado + trocoInicial) - totalSaidasCalculado - sangrias`.
    *   `entradasPorMetodo` (Object): [Obrigatório] Detalhamento das entradas por método de pagamento, baseado nas `vendas` e `lancamentosFinanceiros` (receitas) do dia. Contém:
        *   `dinheiro` (Number)
        *   `pix` (Number)
        *   `cartaoCredito` (Number)
        *   `cartaoDebito` (Number)
        *   `cartao` (Number) - Soma de `cartaoCredito` e `cartaoDebito`.
        *   `boleto` (Number)
        *   `transferenciaBancaria` (Number)
        *   `outros` (Number)
    *   `responsavelNome` (String): [Obrigatório] Nome do usuário responsável pelo fechamento (preferencialmente `displayName`, fallback para `email`).
    *   `responsavelId` (String): [Obrigatório] ID do usuário responsável pelo fechamento.
    *   `observacoes` (String): [Opcional] Observações adicionais sobre o fechamento.
    *   `createdAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
    *   `updatedAt` (Timestamp): [Obrigatório] Gerenciado automaticamente.
*   **Operações (CRUD):**
    *   **CREATE:**
        *   **Quem executa:** Usuário final (via UI do "Maestro Operacional" na página de Fechamento de Caixa).
        *   **Observação:** Múltiplos fechamentos no mesmo dia são permitidos. Um diálogo de confirmação é apresentado antes de salvar, e um aviso informa se já existem fechamentos para o dia.
        *   **Apps que utilizam:** "Maestro Operacional".
    *   **READ:**
        *   **Quem executa:** Usuário final (para histórico de fechamentos), "Visão Clara Financeira" (para análises e relatórios), "Diagnóstico Maestro" (IA pode usar para entender fluxo de caixa).
        *   **Apps que utilizam:** "Maestro Operacional", "Visão Clara Financeira", "Diagnóstico Maestro".
    *   **UPDATE:**
        *   **Quem executa:** Geralmente não se atualiza um fechamento de caixa. Se necessário, um estorno ou ajuste seria um novo lançamento/registro. Pode ser permitido para Admin corrigir observações.
        *   **Apps que utilizam:** Módulo de Administração (se houver).
    *   **DELETE:**
        *   **Quem executa:** Restrito a Admin para correções ou por política de retenção de dados.
        *   **Apps que utilizam:** Módulo de Administração (se houver).
*   **Regras de Segurança (Firestore Rules):** (Referência: `DATA_SYNC_CONFIG.json` -> `fechamentosCaixa.regras`)
    ```firestore
    // Exemplo baseado no DATA_SYNC_CONFIG.json:
    // match /fechamentosCaixa/{docId} {
    //   allow create: if request.auth.uid == request.resource.data.userId; // isRequestDataOwner()
    //   allow read, update, delete: if request.auth.uid == resource.data.userId; // isResourceOwner()
    // }
    match /fechamentosCaixa/{docId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      // Update e Delete podem ser mais restritos (ex: permitir apenas para Admin ou não permitir)
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid; // Ou if false;
    }
    ```
*   **Indexação e Performance:**
    *   Índice em `userId` (ASC) e `dataFechamento` (DESC) para buscar o histórico de fechamentos do usuário, ordenado do mais recente para o mais antigo.
      ```json
      {
        "collectionGroup": "fechamentosCaixa",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "userId", "order": "ASCENDING" },
          { "fieldPath": "dataFechamento", "order": "DESCENDING" }
        ]
      }
      ```

---

### 2.14. Outras Coleções do `DATA_SYNC_CONFIG.json`

O arquivo `DATA_SYNC_CONFIG.json` lista outras coleções como:
*   `contasPagar`
*   `contasReceber`
*   `custos`
*   `custosFixosConfigurados`

Estas coleções provavelmente pertencem ao app "Visão Clara Financeira" ou são compartilhadas. Para cada uma delas, seguiríamos o mesmo padrão de detalhamento: propósito, campos, operações, quem executa, apps que utilizam, e regras de segurança conforme definido no `DATA_SYNC_CONFIG.json`.

**Exemplo para `contasPagar`:**
*   **Propósito:** Gerenciar contas a pagar da empresa.
*   **ID do Documento:** Gerado automaticamente.
*   **Campos (Suposição):** `userId`, `descricao`, `valor`, `dataVencimento`, `dataPagamento`, `fornecedorId`, `status ("pendente", "paga", "atrasada")`, `createdAt`, `updatedAt`.
*   **Operações:** CRUD pelo usuário no app "Visão Clara Financeira".
*   **Regras:** `request.auth.uid == resource.data.userId`.

---

## 3. Relacionamentos entre Coleções

*   **`ordensServico`**
    *   Referencia `clientes` (opcionalmente, via `clienteId`).
    *   Referencia `produtosServicos` (nos `itens`, via `produtoServicoId`).
    *   Gera `lancamentosFinanceiros` (para adiantamentos e pagamentos subsequentes).
*   **`ordensDeProducao`**
    *   Referencia `ordensServico` ou `agendamentos` (via `agendamentoId`).
    *   Pode referenciar `clientes` (via `clienteId`, herdado).
    *   Ao ser concluída, pode acionar a atualização de status e pagamentos na `ordensServico` vinculada.
*   **`agendamentos`**
    *   Referencia `clientes` (via `clienteId`).
    *   Referencia `produtosServicos` (via `servicoId`).
*   **`vendas`**
    *   Referencia `clientes` (opcionalmente, via `clienteId`).
    *   Referencia `produtosServicos` (nos `itens`, via `productId`).
    *   Gera `lancamentosFinanceiros`.
*   **`lancamentosFinanceiros`**
    *   Pode referenciar `vendas` (via `vendaId`).
    *   Pode referenciar `ordensServico` (via `referenciaOSId` para adiantamentos e pagamentos).
    *   Pode referenciar `contasPagar` ou `contasReceber` (via campos de referência, ex: `contaPagarId`).
    *   São a fonte primária para os cálculos de `totalEntradasCalculado` e `totalSaidasCalculado` em `fechamentosCaixa`.
*   **`fechamentosCaixa`**
    *   Agrega dados de `lancamentosFinanceiros` e `vendas` (que também geram `lancamentosFinanceiros`) para um `userId` em uma `dataFechamento`.
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
usuarios --1:N-- fechamentosCaixa
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

ordensServico --1:N-- lancamentosFinanceiros (para adiantamentos e pagamentos)
vendas --1:N-- lancamentosFinanceiros
```

---

## 4. Considerações de Performance e Indexação

*   **Índices Padrão:** O Firestore cria automaticamente índices de campo único.
*   **Índices Compostos:**
    *   Essenciais para consultas que filtram por múltiplos campos ou ordenam por um campo e filtram por outro.
    *   O Firebase Console sugere índices. Planeje-os com base nas consultas mais frequentes de cada app.
    *   Exemplos já listados nas seções de cada coleção (ex: `userGoals`, `consultations`, `fechamentosCaixa`).
*   **Limitar Dados Lidos:**
    *   Use `limit()` para paginar resultados.
*   **Denormalização:**
    *   Considere para leituras frequentes de dados relacionados (ex: `clienteNome` em `ordensServico`). Já utilizado.
*   **Estrutura de Dados:**
    *   Evite documentos > 1MB ou arrays muito longos. Use subcoleções se necessário.

---

## 5. Padrões de Acesso aos Dados (Consulta e Escrita)

*   **Camada de Serviço:**
    *   **`firestoreService.ts`**: Funções genéricas (`createDocument`, `getDocumentById`, etc.).
        *   Responsável por: Adicionar/atualizar `userId`, `createdAt`, `updatedAt`; Converter `Date` <> `Timestamp`; Validação de schemas Zod.
    *   **`[entidade]Service.ts`** (ex: `clientService.ts`):
        *   Funções específicas da entidade. Invoca `firestoreService.ts`. Encapsula lógica de negócios.
*   **Consultas no Frontend:**
    *   Para listagens dinâmicas, o frontend pode construir consultas Firebase SDK e usar funções dos serviços de entidade.
    *   Hook `useRealtimeCollection` para escutar mudanças em tempo real.
*   **Operações de Escrita:**
    *   Sempre validadas por schemas Zod na camada de serviço.
    *   Dados de entrada usam `Date`; conversão para `Timestamp` no `firestoreService`.

---

## 6. Possíveis Conflitos, Duplicidades ou Inconsistências (e Como Mitigar)

*   **Perfil de Usuário (`usuarios`) vs. Firebase Auth:**
    *   **Mitigação:** Firebase Auth é fonte para dados básicos de auth. `usuarios` para adicionais. Sincronização pode ser necessária.
*   **Denormalização de Nomes (ex: `clienteNome` em `ordensServico`):**
    *   **Mitigação:** Aceitar para histórico ou atualizar em cascata (complexo). Preferível: mostrar nome da OS, link para perfil atual.
*   **Duplicação de Produtos/Serviços em Itens de OS/Venda:**
    *   **Mitigação:** Comportamento desejado. Preços de transações passadas não mudam.
*   **Consistência de Estoque (`produtosServicos`.`quantidadeEstoque`):**
    *   **Mitigação:** Usar **transações do Firestore** para operações que leem e escrevem estoque (vendas, saídas manuais, conclusão de OP).
*   **Geração de `lancamentosFinanceiros`:**
    *   **Mitigação:** Idealmente, criação da Venda/OS e do `lancamentoFinanceiro` em transação Firestore ou uma Cloud Function para garantir atomicidade. Atualmente, são operações sequenciais no cliente/serviço, o que pode gerar inconsistência se uma falhar. O `firestoreService` lida com a criação de um único documento atomicamente.
*   **`userGoals` (Diagnóstico) vs. `metasFinanceiras` (Financeiro):**
    *   **Mitigação:** `userGoals`: estratégico, gerado por IA. `metasFinanceiras`: operacional/tático, granular, criado pelo usuário no app Financeiro, pode ser inspirado por `userGoals`.
*   **Sincronia entre `fechamentosCaixa`, `lancamentosFinanceiros` e `vendas`:**
    *   **Mitigação:** O `fechamentosCaixa` é um snapshot. Se um lançamento ou venda for alterado *após* o fechamento do dia correspondente, o `fechamentosCaixa` não será automaticamente atualizado. Isso é geralmente aceitável, pois o fechamento representa o estado *no momento do fechamento*. Relatórios financeiros mais abrangentes devem sempre consultar as fontes primárias (`lancamentosFinanceiros`, `vendas`). A lógica de `fechamentosCaixa` deve ser robusta para evitar dupla contagem, idealmente baseando-se apenas em `lancamentosFinanceiros` se estes forem a fonte única da verdade para todas as receitas.

---

## 7. Notas Adicionais

*   **Firebase Emulators:** Usar durante desenvolvimento.
*   **Backup e Restore:** Definir estratégia.
*   **Monitoramento e Alertas:** Configurar no Firebase.
*   **Evolução do Schema:** Manter este documento atualizado.
*   **Validação de `userId`:** Serviços devem validar `userId` não nulo.

---

Este documento serve como um guia técnico detalhado e deve ser mantido atualizado à medida que o ecossistema Business Maestro evolui. Sempre consulte `DATA_SYNC_CONFIG.json` e `DATA_SYNC_SUMMARY.md` para as especificações canônicas de coleções e regras.

    