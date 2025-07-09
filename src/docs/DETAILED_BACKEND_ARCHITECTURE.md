# Guia de Arquitetura de Backend - Ecossistema Gestor Maestro
-->

## 1. Introdução

Este documento detalha a arquitetura de backend do ecossistema de aplicativos Gestor Maestro, que utilizam um banco de dados Firebase Firestore compartilhado. O objetivo é fornecer uma referência central para desenvolvedores e IAs, garantindo segurança, escalabilidade, consistência e compatibilidade entre todos os aplicativos.

Os aplicativos atuais ou planejados incluem:
*   **Diagnóstico Maestro:** Focado no diagnóstico inicial e planejamento estratégico do usuário.
*   **Maestro Operacional:** Focado na gestão de operações diárias (vendas, serviços, clientes, etc.).
*   **Visão Clara Financeira:** Focado na gestão financeira, metas e precificação.

## 2. Princípios Fundamentais

A interação com os dados segue os princípios estabelecidos no `DATA_INTERACTION_GUIDE.md`:
1.  **Schemas são a Verdade:** Toda entidade tem seu schema definido em `src/schemas/` (do app Diagnóstico Maestro, ou equivalente nos outros apps), usando Zod. Nenhum dado é enviado ou recebido sem validação.
2.  **Serviços são a Ponte com o Firestore:** Toda interação com o banco deve passar por serviços dedicados (ex: `src/services/[entidade]Service.ts`). Nunca interaja com o Firestore diretamente de componentes de UI ou fluxos de IA sem uma camada de serviço.
3.  **Validação por Zod:** Sempre use `Zod` para validar, transformar e tipar os dados.
4.  **Documentação Integrada (JSDoc):** Todos os campos e funções devem ter descrições claras.
5.  **UserID como Chave de Particionamento**: A maioria das coleções deve conter um campo `userId` para identificar o proprietário dos dados e facilitar as regras de segurança.

## 3. Detalhamento das Coleções

A seguir, a lista de coleções utilizadas no Firestore, seus propósitos, campos, operações e considerações.

---

### 3.1. `usuarios`

*   **Propósito:** Armazenar informações de perfil da empresa e dados pessoais complementares do usuário, além do que já existe no Firebase Authentication. O ID do documento é o `uid` do usuário do Firebase Auth.
*   **Campos Principais:**
    *   `companyName` (string, opcional): Nome da empresa. Ex: "ACME Soluções Criativas".
    *   `companyCnpj` (string, opcional): CNPJ da empresa. Ex: "00.000.000/0001-00".
    *   `businessType` (string, opcional): Tipo/segmento do negócio. Ex: "Consultoria em TI".
    *   `companyPhone` (string, opcional): Telefone comercial. Ex: "(11) 99999-8888".
    *   `companyEmail` (string, opcional): Email comercial. Ex: "contato@acme.com".
    *   `personalPhoneNumber` (string, opcional): Telefone pessoal/WhatsApp do usuário. Ex: "(11) 98888-7777".
    *   `role` (enum: 'user' | 'admin' | 'vip', opcional, default: 'user'): Papel do usuário no sistema. Controla o acesso privilegiado.
    *   `accessibleModules` (array de strings, opcional): Lista de módulos que o usuário pode acessar. Ex: `["operacional", "consultor"]`. Essencial para controle de acesso granular.
    *   `createdAt` (timestamp, obrigatório, gerenciado pelo sistema): Data de criação do perfil.
    *   `updatedAt` (timestamp, obrigatório, gerenciado pelo sistema): Data da última atualização.
*   **Operações e Atores:**
    *   **CREATE:**
        *   **Ator:** Sistema (via Módulo Consultor/Diagnóstico Maestro).
        *   **Descrição:** A criação de usuários e perfis iniciais é realizada no aplicativo de onboarding (Módulo Consultor/Diagnóstico Maestro). Este aplicativo (Maestro Operacional) apenas consome os dados de usuários existentes.
    *   **READ:**
        *   **Ator:** Usuário (em todos os apps para exibir informações de perfil e verificar permissões).
    *   **UPDATE:**
        *   **Ator:** Usuário (via página de Perfil no app Diagnóstico Maestro, e potencialmente em outros apps). A `role` e `accessibleModules` só devem ser alterados por um processo administrativo.
    *   **DELETE:**
        *   **Ator:** Geralmente não permitido pelo usuário final; pode ser uma operação administrativa.
*   **Aplicativos que Utilizam:**
    *   Diagnóstico Maestro (criação/atualização inicial)
    *   Maestro Operacional (leitura para exibir dados e verificar acesso)
    *   Visão Clara Financeira (leitura para exibir dados e verificar acesso)
*   **Regras de Segurança (Exemplo `firestore.rules`):**
    ```firestore
    match /usuarios/{userIdDoc} {
      // REQUER: ID do documento ser o UID do usuário
      allow create: if docIdIsSelf(userIdDoc) &&
                       (request.resource.data.userId == null || request.resource.data.userId == userIdDoc); // userId no corpo opcional e deve ser o mesmo
      allow read: if isSignedIn() && request.auth.uid == userIdDoc;
      // Impede que o usuário altere seu próprio 'role' ou 'accessibleModules'. Isso deve ser feito pelo backend com permissões de admin.
      allow update: if docIdIsSelf(userIdDoc) && 
                       request.resource.data.role == resource.data.role &&
                       request.resource.data.accessibleModules == resource.data.accessibleModules;
      // allow delete: if docIdIsSelf(userIdDoc); // Descomentar com cautela
    }
    ```

---

### 3.2. `consultationsMetadata`

*   **Propósito:** Rastrear o status da consulta de diagnóstico inicial do usuário no app Diagnóstico Maestro. O ID do documento é o `uid` do usuário.
*   **Campos Principais:**
    *   `completed` (boolean, obrigatório): `true` se o diagnóstico foi concluído, `false` caso contrário.
    *   `completedAt` (timestamp, opcional): Data e hora da conclusão.
    *   `createdAt` (timestamp, obrigatório, gerenciado pelo sistema): Data de criação do registro.
*   **Operações e Atores:**
    *   **CREATE:**
        *   **Ator:** Usuário (via `AuthContext` no app Diagnóstico Maestro durante o `signUp`, com `completed: false`).
    *   **READ:**
        *   **Ator:** Usuário (app Diagnóstico Maestro para verificar status; outros apps para personalizar experiência).
    *   **UPDATE:**
        *   **Ator:** Usuário (indiretamente via `ConsultationContext` no app Diagnóstico Maestro ao finalizar a consulta).
*   **Aplicativos que Utilizam:**
    *   Diagnóstico Maestro (criação, leitura, atualização)
    *   Maestro Operacional (leitura para onboarding)
    *   Visão Clara Financeira (leitura para onboarding)
*   **Regras de Segurança (Exemplo `firestore.rules`):**
    ```firestore
    match /consultationsMetadata/{userIdDoc} {
      // REQUER: ID do documento ser o UID do usuário
      allow read, write: if docIdIsSelf(userIdDoc);
    }
    ```

---

### 3.3. `userGoals`

*   **Propósito:** Armazenar os resultados da análise estratégica gerada pela IA na página `/goals` do app Diagnóstico Maestro, incluindo dados financeiros fornecidos pelo usuário, suas metas e o plano de ação sugerido.
*   **Campos Principais:**
    *   `userId` (string, obrigatório): UID do usuário proprietário.
    *   `createdAt` (timestamp, obrigatório, gerenciado pelo sistema): Data de criação.
    *   `inputData` (objeto, obrigatório): Dados fornecidos pelo usuário.
        *   `currentRevenue` (number)
        *   `currentExpenses` (number)
        *   `targetRevenueGoal` (number)
        *   `userQuestion` (string) - *Nota: No form é `userScenario`, mas no fluxo/armazenamento é `userQuestion`.*
        *   ... (outros campos opcionais do formulário de metas)
    *   `analysisResult` (objeto, obrigatório): Resposta da IA.
        *   `currentProfit` (number)
        *   `targetProfit` (number)
        *   `revenueGap` (number)
        *   `businessDiagnosis` (string)
        *   `aiConsultantResponse` (string)
        *   `suggestions` (array de strings)
        *   `actionPlan` (array de strings)
        *   `preventiveAlerts` (array de strings, opcional)
    *   `status` (string, opcional): Ex: 'active'.
    *   `type` (string, opcional): Ex: 'strategic_planning'.
*   **Operações e Atores:**
    *   **CREATE:**
        *   **Ator:** Usuário (via página `/goals` no app Diagnóstico Maestro).
    *   **READ:**
        *   **Ator:** Usuário (app Diagnóstico Maestro para exibir; Maestro Operacional e Visão Clara Financeira para contextualização e planejamento).
    *   **UPDATE:**
        *   **Ator:** Usuário (potencialmente para marcar itens do plano de ação como concluídos em outros apps).
    *   **DELETE:**
        *   **Ator:** Usuário (se permitido para arquivar/excluir planejamentos).
*   **Aplicativos que Utilizam:**
    *   Diagnóstico Maestro (criação, leitura)
    *   Maestro Operacional (leitura)
    *   Visão Clara Financeira (leitura)
*   **Regras de Segurança (Exemplo `firestore.rules`):**
    ```firestore
    match /userGoals/{goalId} {
      // REQUER: userId no documento para validação de segurança
      allow create: if isRequestDataOwner();
      allow read, update, delete: if isResourceOwner();
    }
    ```
*   **Indexação:**
    *   `(userId ASC, createdAt DESC)` (definido em `firestore.indexes.json`)

---

### 3.4. `consultations`

*   **Propósito:** Armazenar os detalhes completos de cada sessão de diagnóstico interativa do app Diagnóstico Maestro.
*   **Campos Principais:**
    *   `userId` (string, obrigatório): UID do usuário.
    *   `initialFormData` (objeto, obrigatório): Dados do formulário inicial.
    *   `userAnswers` (objeto, obrigatório): Perguntas e respostas.
    *   `aiFeedbacks` (objeto, obrigatório): Perguntas e feedbacks da IA.
    *   `finalDiagnosisParts` (array de objetos, obrigatório): Partes do diagnóstico final.
    *   `consultationCompletedAt` (timestamp, obrigatório): Data de conclusão da consulta.
*   **Operações e Atores:**
    *   **CREATE:**
        *   **Ator:** Usuário (via `ConsultationContext` no app Diagnóstico Maestro ao finalizar a consulta).
    *   **READ:**
        *   **Ator:** Usuário (app Diagnóstico Maestro para histórico; outros apps se necessitarem de detalhes profundos).
    *   **UPDATE/DELETE:**
        *   **Ator:** Geralmente não permitido pelo usuário final para manter histórico.
*   **Aplicativos que Utilizam:**
    *   Diagnóstico Maestro (criação, leitura)
    *   Outros apps (leitura, se necessário)
*   **Regras de Segurança (Exemplo `firestore.rules`):**
    ```firestore
    match /consultations/{consultationId} {
      // REQUER: userId no documento para validação de segurança
      allow create: if isRequestDataOwner();
      allow read: if isResourceOwner();
      // update, delete geralmente não são expostos
    }
    ```
*   **Indexação:**
    *   `(userId ASC, consultationCompletedAt DESC)` (definido em `firestore.indexes.json`)

---

### 3.5. `lancamentosFinanceiros`

*   **Propósito:** Registrar todas as transações financeiras (receitas e despesas) da empresa.
*   **Campos Principais (Baseado em `lancamentoFinanceiroSchema.ts`):**
    *   `userId` (string, obrigatório): UID do usuário proprietário.
    *   `descricao` (string, obrigatório): Descrição do lançamento. Ex: "Venda Produto X", "Pagamento Aluguel".
    *   `valor` (number, obrigatório): Valor monetário. Ex: 150.75.
    *   `data` (timestamp, obrigatório): Data do lançamento.
    *   `tipo` (enum: "RECEITA" | "DESPESA", obrigatório): Tipo da transação.
    *   `pago` (boolean, obrigatório, default: `true`): Indica se foi efetivado.
    *   `categoria` (string, opcional): Categoria. Ex: "Vendas", "Material de Escritório".
    *   `createdAt` (timestamp, obrigatório, gerenciado pelo sistema).
    *   `updatedAt` (timestamp, obrigatório, gerenciado pelo sistema).
    *   `contaBancariaId` (string, opcional): ID da conta associada (a ser detalhado).
    *   `faturaId` (string, opcional): ID da fatura associada (a ser detalhado).
*   **Operações e Atores:**
    *   **CREATE:**
        *   **Ator:** Usuário (principalmente via app Visão Clara Financeira; potencialmente via Maestro Operacional ao registrar vendas).
    *   **READ:**
        *   **Ator:** Usuário (Visão Clara Financeira para relatórios; Diagnóstico Maestro para importar resumo mensal; Maestro Operacional para conciliação).
    *   **UPDATE:**
        *   **Ator:** Usuário (Visão Clara Financeira para correções).
    *   **DELETE:**
        *   **Ator:** Usuário (Visão Clara Financeira para remoção).
*   **Aplicativos que Utilizam:**
    *   Visão Clara Financeira (CRUD principal)
    *   Diagnóstico Maestro (leitura para `/goals`)
    *   Maestro Operacional (leitura para conciliação, potencialmente criação ao registrar vendas)
*   **Regras de Segurança (Exemplo `firestore.rules`):**
    ```firestore
    match /lancamentosFinanceiros/{docId} {
      // REQUER: userId no documento para validação de segurança
      allow create: if isRequestDataOwner();
      allow read, delete: if isResourceOwner();
      allow update: if isResourceOwner() && userIdUnchanged();
    }
    ```
*   **Indexação:**
    *   `(userId ASC, data ASC)` (definido em `firestore.indexes.json`)
    *   `(userId ASC, data DESC)` (definido em `firestore.indexes.json`)

---

### 3.6. `clientes`

*   **Propósito:** Armazenar informações sobre os clientes da empresa.
*   **Campos Principais (Baseado em `clientSchema.ts`):**
    *   `userId` (string, obrigatório): UID do usuário proprietário.
    *   `nome` (string, obrigatório): Nome do cliente. Ex: "João Silva".
    *   `email` (string, opcional): Email. Ex: "joao.silva@example.com".
    *   `telefone` (string, opcional): Telefone. Ex: "(11) 97777-6666".
    *   `endereco` (string, opcional): Endereço.
    *   `cpfCnpj` (string, opcional): CPF ou CNPJ.
    *   `dataNascimento` (string, opcional): Data de nascimento.
    *   `observacoes` (string, opcional): Observações.
    *   `createdAt` (timestamp, obrigatório, gerenciado pelo sistema).
    *   `updatedAt` (timestamp, obrigatório, gerenciado pelo sistema).
*   **Operações e Atores:**
    *   **CREATE, READ, UPDATE, DELETE:**
        *   **Ator:** Usuário (principalmente via app Maestro Operacional).
*   **Aplicativos que Utilizam:**
    *   Maestro Operacional (CRUD principal)
    *   Visão Clara Financeira (leitura para associar a lançamentos/faturas)
    *   Diagnóstico Maestro (potencialmente leitura para entender perfil de cliente, se aplicável)
*   **Regras de Segurança (Exemplo `firestore.rules`):**
    ```firestore
    match /clientes/{docId} {
      // REQUER: userId no documento para validação de segurança
      allow create: if isRequestDataOwner();
      allow read, delete: if isResourceOwner();
      allow update: if isResourceOwner() && userIdUnchanged();
    }
    ```
*   **Indexação:**
    *   `(userId ASC, nome ASC)` (definido em `firestore.indexes.json`)

---

### 3.7. `produtosServicos`

*   **Propósito:** Catálogo de produtos e serviços oferecidos pela empresa.
*   **Campos Principais (Baseado em `productServiceSchema.ts`):**
    *   `userId` (string, obrigatório): UID do usuário proprietário.
    *   `nome` (string, obrigatório): Nome do item. Ex: "Consultoria SEO", "Camiseta Premium".
    *   `descricao` (string, opcional): Descrição.
    *   `tipo` (enum: "PRODUTO" | "SERVICO", obrigatório): Tipo do item.
    *   `precoVenda` (number, obrigatório): Preço de venda.
    *   `precoCusto` (number, opcional): Preço de custo.
    *   `unidadeMedida` (string, opcional): Ex: "un", "h".
    *   `estoqueAtual` (number, opcional, para PRODUTO).
    *   `ativo` (boolean, obrigatório, default: `true`).
    *   `createdAt` (timestamp, obrigatório, gerenciado pelo sistema).
    *   `updatedAt` (timestamp, obrigatório, gerenciado pelo sistema).
*   **Operações e Atores:**
    *   **CREATE, READ, UPDATE, DELETE:**
        *   **Ator:** Usuário (principalmente via app Maestro Operacional; Visão Clara Financeira pode ler para precificação).
*   **Aplicativos que Utilizam:**
    *   Maestro Operacional (CRUD principal)
    *   Visão Clara Financeira (leitura para análise de precificação e rentabilidade)
*   **Regras de Segurança (Exemplo `firestore.rules`):**
    ```firestore
    match /produtosServicos/{docId} {
      // REQUER: userId no documento para validação de segurança
      allow create: if isRequestDataOwner();
      allow read, delete: if isResourceOwner();
      allow update: if isResourceOwner() && userIdUnchanged();
    }
    ```
*   **Indexação:**
    *   `(userId ASC, nome ASC)` (definido em `firestore.indexes.json`)
    *   `(tipo ASC, userId ASC, nome ASC)` (definido em `firestore.indexes.json`)

---
### 3.8. `vendas`

*   **Propósito:** Registrar as vendas realizadas. Pode ser uma venda de balcão simples ou o resultado de uma Ordem de Serviço.
*   **Campos Principais (Exemplo):**
    *   `userId` (string, obrigatório)
    *   `dataVenda` (timestamp, obrigatório)
    *   `clienteId` (string, opcional): Referência à coleção `clientes`.
    *   `nomeCliente` (string, opcional): Denormalizado para exibição rápida.
    *   `itens` (array de objetos, obrigatório):
        *   `produtoServicoId` (string): Referência à `produtosServicos`.
        *   `nomeItem` (string): Denormalizado.
        *   `quantidade` (number)
        *   `precoUnitario` (number)
        *   `precoTotalItem` (number)
    *   `valorTotalVenda` (number, obrigatório)
    *   `metodoPagamento` (string, opcional): Ex: "Cartão de Crédito", "Pix".
    *   `statusPagamento` (string, opcional): Ex: "Pago", "Pendente".
    *   `observacoes` (string, opcional)
    *   `ordemServicoId` (string, opcional): Se originada de uma OS.
    *   `createdAt` (timestamp, obrigatório)
    *   `updatedAt` (timestamp, obrigatório)
*   **Operações e Atores:**
    *   **CREATE:** Usuário (via Maestro Operacional)
    *   **READ:** Usuário (Maestro Operacional, Visão Clara Financeira)
    *   **UPDATE:** Usuário (Maestro Operacional, para status de pagamento, por exemplo)
    *   **DELETE:** Usuário (com restrições, talvez apenas cancelamento)
*   **Aplicativos que Utilizam:** Maestro Operacional, Visão Clara Financeira
*   **Regras de Segurança:**
    ```firestore
    match /vendas/{docId} {
      // REQUER: userId no documento
      allow create: if isRequestDataOwner();
      allow read, delete: if isResourceOwner(); // Delete pode ser restrito
      allow update: if isResourceOwner() && userIdUnchanged();
    }
    ```
*   **Indexação:** `(userId ASC, dataVenda ASC)` (definido em `firestore.indexes.json`)

---

### 3.9. `ordensServico`

*   **Propósito:** Gerenciar ordens de serviço para trabalhos a serem realizados.
*   **Campos Principais (Exemplo):**
    *   `userId` (string, obrigatório)
    *   `clienteId` (string, obrigatório): Referência à `clientes`.
    *   `nomeCliente` (string, obrigatório): Denormalizado.
    *   `descricaoServico` (string, obrigatório)
    *   `dataAbertura` (timestamp, obrigatório)
    *   `dataPrevisaoEntrega` (timestamp, opcional)
    *   `dataConclusao` (timestamp, opcional)
    *   `status` (string, obrigatório): Ex: "Aberta", "Em Andamento", "Concluída", "Cancelada".
    *   `itensServico` (array de objetos, opcional): Produtos/peças usadas.
        *   `produtoServicoId` (string)
        *   `quantidade` (number)
        *   `precoUnitario` (number)
    *   `valorTotalEstimado` (number, opcional)
    *   `valorTotalFinal` (number, opcional)
    *   `tecnicoResponsavel` (string, opcional)
    *   `createdAt` (timestamp, obrigatório)
    *   `updatedAt` (timestamp, obrigatório)
*   **Operações e Atores:** CRUD pelo Usuário (via Maestro Operacional).
*   **Aplicativos que Utilizam:** Maestro Operacional.
*   **Regras de Segurança:**
    ```firestore
    match /ordensServico/{docId} {
      // REQUER: userId no documento
      allow create: if isRequestDataOwner();
      allow read, update, delete: if isResourceOwner(); // Delete pode ser restrito
    }
    ```
*   **Indexação:** `(userId ASC, criadoEm DESC)` (definido como `criadoEm` no `firestore.indexes.json`, idealmente seria `dataAbertura` ou `status`).

---

### 3.10. `agendamentos`

*   **Propósito:** Gerenciar agendamentos de serviços, compromissos, etc.
*   **Campos Principais (Exemplo):**
    *   `userId` (string, obrigatório)
    *   `titulo` (string, obrigatório)
    *   `dataHoraInicio` (timestamp, obrigatório)
    *   `dataHoraFim` (timestamp, obrigatório)
    *   `clienteId` (string, opcional)
    *   `produtoServicoId` (string, opcional)
    *   `descricao` (string, opcional)
    *   `status` (string, opcional): Ex: "Confirmado", "Pendente", "Cancelado".
    *   `createdAt` (timestamp, obrigatório)
    *   `updatedAt` (timestamp, obrigatório)
*   **Operações e Atores:** CRUD pelo Usuário (via Maestro Operacional).
*   **Aplicativos que Utilizam:** Maestro Operacional.
*   **Regras de Segurança:**
    ```firestore
    match /agendamentos/{docId} {
      // REQUER: userId no documento
      allow create: if isRequestDataOwner();
      allow read, update, delete: if isResourceOwner();
    }
    ```
*   **Indexação:** `(userId ASC, dataHora ASC)` (definido como `dataHora` no `firestore.indexes.json`, idealmente seria `dataHoraInicio`).

---

### 3.11. `metasFinanceiras`
*   **Propósito:** Armazenar metas financeiras definidas pelo usuário (ex: meta de lucro mensal, meta de economia).
*   **Campos Principais (Exemplo):**
    *   `userId` (string, obrigatório)
    *   `descricaoMeta` (string, obrigatório): Ex: "Atingir R$ 5.000 de lucro líquido".
    *   `valorAlvo` (number, obrigatório)
    *   `dataAlvo` (timestamp, opcional): Prazo para atingir a meta.
    *   `tipoMeta` (string, opcional): Ex: "Lucro", "Receita", "Redução de Custo".
    *   `progressoAtual` (number, opcional): Calculado ou inserido manualmente.
    *   `status` (string, opcional): Ex: "Ativa", "Concluída", "Cancelada".
    *   `createdAt` (timestamp, obrigatório)
    *   `updatedAt` (timestamp, obrigatório)
*   **Operações e Atores:** CRUD pelo Usuário (via Visão Clara Financeira).
*   **Aplicativos que Utilizam:** Visão Clara Financeira.
*   **Regras de Segurança:**
    ```firestore
    match /metasFinanceiras/{docId} {
        // REQUER: userId no documento para validação de segurança.
        // REQUER: ID do documento no formato "userId_anoMes" para validação de segurança.
        allow create: if isRequestDataOwner() && request.auth.uid == docId.split('_')[0];
        allow read, update, delete: if isSignedIn() && request.auth.uid == docId.split('_')[0];
                                     // Para update, adicionar && userIdUnchanged() se userId estiver no corpo.
    }
    ```

---

### 3.12. Outras Coleções Potenciais (Exemplos)
Estas coleções são mencionadas no `DATA_INTERACTION_GUIDE.md` ou no `firestore.rules` como exemplos ou parte de outros módulos. Seus schemas e operações detalhadas precisariam ser definidos conforme esses módulos são construídos.

*   **`fornecedores`** (Maestro Operacional)
    *   Propósito: Gerenciar dados de fornecedores.
    *   Regras: Semelhante a `clientes`.
*   **`entregas`** (Maestro Operacional)
    *   Propósito: Rastrear entregas de produtos/serviços.
    *   Regras: Semelhante a `ordensServico`.
*   **`faturas`** (Visão Clara Financeira)
    *   Propósito: Gerenciar faturas emitidas e recebidas.
    *   Regras: Semelhante a `lancamentosFinanceiros`.
*   **`pagamentos`, `recebimentos`, `transferencias`, `cartoes`** (Visão Clara Financeira)
    *   Propósito: Detalhar diferentes aspectos da gestão financeira.
    *   Regras: Semelhante a `lancamentosFinanceiros`.
*   **`ordensDeProducao`** (Maestro Operacional)
    *   Propósito: Detalhar o fluxo de produção. Poderia ser uma subcoleção de `ordensServico` ou uma coleção separada.
    *   Regras: Semelhante a `ordensServico`.
*   **`contasPagar`, `contasReceber`** (Visão Clara Financeira)
    *   Propósito: Controle de contas a pagar e a receber.
    *   Regras: Semelhante a `lancamentosFinanceiros`.
*   **`custos`** (Visão Clara Financeira)
    *   Propósito: Detalhamento de custos variáveis ou específicos.
    *   Regras: Semelhante a `lancamentosFinanceiros`.
*   **`custosFixosConfigurados`** (Visão Clara Financeira)
    *   Propósito: Configuração de custos fixos recorrentes para cálculos.
    *   Regras (Ajustada para `isResourceOwner` na leitura, como discutido):
        ```firestore
        match /custosFixosConfigurados/{docId} {
          // REQUER: userId no documento para validação de segurança
          allow create: if isRequestDataOwner();
          allow read: if isResourceOwner(); // Somente o proprietário pode ler suas configurações
          allow update: if isResourceOwner() && userIdUnchanged();
          allow delete: if isResourceOwner();
        }
        ```

---

### 3.13. `assinaturas`

*   **Propósito:** Armazenar informações sobre a assinatura do usuário (status, plano, data de expiração), geralmente atualizadas por webhooks de plataformas de pagamento como Hotmart. O ID do documento é o `uid` do usuário.
*   **Campos Principais:**
    *   `userId` (string, obrigatório): UID do usuário. Redundante com o ID do documento, mas útil para consistência.
    *   `status` (enum: "ativa" | "inativa", obrigatório): Status atual da assinatura.
    *   `plano` (string, obrigatório): Nome do plano assinado (ex: "mensal", "anual").
    *   `expiracao` (timestamp, obrigatório): Data em que a assinatura expira.
    *   `atualizadoEm` (timestamp, obrigatório, gerenciado pelo sistema): Data da última atualização.
*   **Operações e Atores:**
    *   **CREATE/UPDATE (Upsert):**
        *   **Ator:** Sistema (via webhook da Hotmart na rota `/api/webhooks/hotmart`).
        *   **Descrição:** Cria ou atualiza a assinatura do usuário com base em eventos de pagamento.
    *   **READ:**
        *   **Ator:** Sistema (em todos os apps para verificar o acesso a funcionalidades pagas).
        *   **Descrição:** Ler os dados da assinatura do próprio usuário.
*   **Aplicativos que Utilizam:**
    *   Todos os aplicativos para controle de acesso a funcionalidades premium.
*   **Regras de Segurança (Exemplo `firestore.rules`):**
    ```firestore
    match /assinaturas/{userIdDoc} {
      // Ninguém pode escrever diretamente. Apenas o backend via Admin SDK.
      allow write: if false; 
      // O usuário pode ler sua própria assinatura.
      allow read: if isSignedIn() && request.auth.uid == userIdDoc;
    }
    ```
---

## 4. Relacionamentos Entre Coleções (Exemplos)

*   **`vendas` -> `clientes`**: Uma venda (`vendas`) pode ter um `clienteId` referenciando um documento na coleção `clientes`.
*   **`vendas` -> `produtosServicos`**: Cada item em uma venda (`vendas.itens[].produtoServicoId`) referencia um documento em `produtosServicos`.
*   **`ordensServico` -> `clientes`**: Uma OS (`ordensServico`) tem um `clienteId`.
*   **`ordensServico` -> `produtosServicos`**: Itens em uma OS (`ordensServico.itensServico[].produtoServicoId`) referenciam `produtosServicos`.
*   **`lancamentosFinanceiros` -> `faturas` / `clientes` / `fornecedores`**: Lançamentos podem estar ligados a faturas, clientes ou fornecedores através de IDs.
*   **`agendamentos` -> `clientes` / `produtosServicos`**: Agendamentos podem estar ligados a um cliente e/
    ou a um serviço específico.

**Consideração sobre Denormalização:** Para otimizar leituras e evitar múltiplas consultas, campos como `nomeCliente` ou `nomeItem` são frequentemente denormalizados (copiados) para documentos em outras coleções (ex: `vendas`, `ordensServico`). Isso requer uma estratégia de atualização caso o dado original mude (ex: nome do cliente atualizado em `clientes` deve refletir nas vendas).

## 5. Indexação e Performance

*   **Índices Existentes:** O arquivo `firestore.indexes.json` já define vários índices compostos essenciais para as consultas realizadas pelos aplicativos. É crucial que este arquivo seja mantido atualizado e que os índices sejam deployados e construídos no Firebase.
*   **Consultas Comuns:**
    *   Filtrar por `userId` e ordenar por um campo de data (ex: `createdAt`, `dataVenda`) é uma operação comum.
    *   Filtrar por `userId` e outro campo específico (ex: `tipo` em `produtosServicos`).
*   **Sugestões de Performance:**
    *   **Limitar Dados:** Use `limit()` em consultas que podem retornar muitos documentos.
    *   **Paginação:** Implemente paginação para listas longas.
    *   **Denormalização Seletiva:** Conforme mencionado acima, denormalizar dados pode reduzir a necessidade de joins complexos no lado do cliente, mas adiciona complexidade na escrita/atualização.
    *   **Listeners com Cautela:** Evite `onSnapshot` em grandes conjuntos de dados sem filtros adequados, pois pode consumir muita banda e recursos.
    *   **Otimizar Estrutura de Dados:** Para dados hierárquicos ou altamente relacionais, considere subcoleções ou estruturas de dados aninhadas, mas avalie o impacto nas regras de segurança e na complexidade das consultas.
    *   **Monitorar Firestore Usage:** Use o console do Firebase para monitorar leituras, escritas, e documentos armazenados para identificar gargalos.

## 6. Fluxo de Dados por Aplicativo (Como Consultam e Escrevem)

### 6.1. Diagnóstico Maestro

*   **Consultas Principais:**
    *   `usuarios/{userId}`: Para carregar/exibir dados do perfil da empresa.
    *   `consultationsMetadata/{userId}`: Para verificar se o diagnóstico inicial foi concluído.
    *   `consultations`: Query por `userId` e `consultationCompletedAt` para exibir histórico.
    *   `userGoals`: Query por `userId` e `createdAt` para planejamentos anteriores (potencialmente).
    *   `lancamentosFinanceiros`: Query por `userId` e `data` (mês atual) para pré-preencher formulário de metas (`/goals`).
*   **Escritas Principais:**
    *   `usuarios/{userId}`: Criação (no registro) e atualização (página de perfil).
    *   `consultationsMetadata/{userId}`: Criação (no registro) e atualização (ao concluir consulta).
    *   `consultations`: Criação de um novo documento ao final da consulta interativa.
    *   `userGoals`: Criação de um novo documento após análise da IA na página `/goals`.
*   **Referência Detalhada:** `src/DIAGNOSTICO_MAESTRO_DATA_OPERATIONS.md`.

### 6.2. Maestro Operacional (Exemplo/Planejado)

*   **Consultas Principais:**
    *   `usuarios/{userId}`: Ler dados da empresa.
    *   `clientes`: CRUD, listar por `userId`.
    *   `produtosServicos`: CRUD, listar por `userId`, filtrar por `tipo`.
    *   `vendas`: CRUD, listar por `userId` e `dataVenda`.
    *   `ordensServico`: CRUD, listar por `userId` e status/data.
    *   `agendamentos`: CRUD, listar por `userId` e `dataHoraInicio`.
    *   `userGoals` (leitura): Para entender contexto estratégico do usuário.
    *   `consultationsMetadata` (leitura): Para onboarding.
*   **Escritas Principais:**
    *   `clientes`, `produtosServicos`, `vendas`, `ordensServico`, `agendamentos` (CRUD).
    *   Potencialmente, criação de `lancamentosFinanceiros` ao finalizar uma venda.

### 6.3. Visão Clara Financeira (Exemplo/Planejado)

*   **Consultas Principais:**
    *   `usuarios/{userId}`: Ler dados da empresa.
    *   `lancamentosFinanceiros`: CRUD, listar/filtrar por `userId`, `data`, `tipo`, `categoria`.
    *   `metasFinanceiras`: CRUD, listar por `userId` e formato de ID `userId_anoMes`.
    *   `produtosServicos` (leitura): Para análise de precificação.
    *   `vendas` (leitura): Para dashboards e relatórios financeiros.
    *   `userGoals` (leitura): Para dashboards e comparação com metas.
    *   `consultationsMetadata` (leitura): Para onboarding.
    *   `contasPagar`, `contasReceber`, `custos`, `custosFixosConfigurados`.
*   **Escritas Principais:**
    *   `lancamentosFinanceiros`, `metasFinanceiras` (CRUD).
    *   `contasPagar`, `contasReceber`, `custos`, `custosFixosConfigurados`.

## 7. Possíveis Conflitos, Duplicidades ou Inconsistências

*   **Denormalização de Dados:**
    *   **Problema:** Campos como `nomeCliente` em `vendas` ou `userGoals.inputData` (que duplica informações financeiras que podem estar em `lancamentosFinanceiros`). Se o dado original mudar (ex: nome do cliente em `clientes`), os dados denormalizados ficam desatualizados.
    *   **Mitigação:**
        *   Usar Cloud Functions para propagar atualizações (complexo).
        *   Aceitar que alguns dados denormalizados são "snapshots" e podem não ser sempre 100% atuais, focando na leitura da fonte da verdade quando necessário.
        *   Minimizar a denormalização ou usá-la apenas para campos raramente alterados.
*   **Consistência de Schemas entre Apps:**
    *   **Problema:** Se cada app definir seus próprios schemas para coleções compartilhadas (ex: `usuarios`), pode haver divergências.
    *   **Mitigação:** Manter este guia e o `DATA_INTERACTION_GUIDE.md` como fontes da verdade. Idealmente, ter um pacote de schemas compartilhado se os apps forem monorepo ou tiverem código comum.
*   **Lógica de Negócios Duplicada:**
    *   **Problema:** Diferentes apps podem implementar lógicas de cálculo financeiro ou de status de forma ligeiramente diferente.
    *   **Mitigação:** Centralizar lógica de negócios complexa em Cloud Functions ou serviços backend compartilhados, se possível, ou garantir que os serviços de frontend em cada app sigam rigorosamente as definições deste guia.
*   **Gestão de IDs:**
    *   **Problema:** Confusão entre IDs gerados pelo Firestore e IDs de referência (ex: `clienteId`).
    *   **Mitigação:** Padronizar nomes de campos de ID (ex: sempre `entidadeId`). Garantir que os IDs referenciados sejam válidos. Especial atenção ao formato `userId_anoMes` para `metasFinanceiras`.
*   **Operações Concorrentes:**
    *   **Problema:** Múltiplos apps ou usuários atualizando o mesmo documento podem levar a condições de corrida.
    *   **Mitigação:** Usar transações do Firestore para operações críticas. Implementar lógica de "optimistic locking" se necessário.
*   **Migração de Dados e Schema:**
    *   **Problema:** À medida que os apps evoluem, os schemas podem mudar, exigindo migração de dados.
    *   **Mitigação:** Planejar migrações com cuidado. Usar scripts de migração. Versionar schemas ou adicionar campos de forma não destrutiva.

## 8. Guia de Integração de Autenticação e Assinaturas (Hotmart)

Esta seção destina-se a outros aplicativos do ecossistema ("Maestro Operacional", "Visão Clara Financeira") que precisam verificar se um usuário possui uma assinatura ativa para conceder acesso.

### 8.1. Visão Geral do Fluxo de Acesso
1.  **Fonte da Verdade**: O acesso é determinado por uma hierarquia de dados.
    *   **Acesso Privilegiado (`.env` local)**: Para desenvolvimento e administração, e-mails específicos podem ser definidos no arquivo `.env` (ex: `NEXT_PUBLIC_ADMIN_EMAILS`). Esta verificação tem a **maior prioridade**.
    *   **Acesso por Papel (`usuarios`)**: Um documento na coleção `usuarios` (com ID igual ao UID do usuário) pode ter um campo `role` definido como `"admin"` ou `"vip"`. Se este for o caso, o acesso é concedido, sobrepondo a verificação de assinatura.
    *   **Acesso Padrão (`assinaturas`)**: Se o usuário não for privilegiado, o sistema consulta a coleção `assinaturas`. Um documento com ID igual ao UID do usuário deve existir, ter `status: "ativa"`, e a data em `expiracao` não deve ter passado.
2.  **Entrada de Dados**:
    *   As variáveis de ambiente são gerenciadas no arquivo `.env` de cada projeto.
    *   O campo `role` na coleção `usuarios` deve ser gerenciado por um aplicativo administrativo (ex: "Módulo Consultor") ou diretamente no console do Firestore por um administrador humano. **O usuário não pode alterar seu próprio `role`**.
    *   Os dados na coleção `assinaturas` são gerenciados por um sistema externo (ex: Hotmart) através de webhooks.
3.  **Lógica de Verificação (Centralizada no `AuthContext`)**:
    *   O `onAuthStateChanged` (um listener de autenticação) é acionado no login. Ele executa uma função centralizada `performAccessCheck`.
    *   `performAccessCheck` implementa a hierarquia de verificação: `.env` -> `role` -> `assinaturas`.
    *   O `AuthContext` então popula o objeto `user` com as permissões corretas (`role`, `accessibleModules`). Componentes como `ModuleAccessGuard` usam essas informações para controlar o acesso.

### 8.2. Checklist de Implementação para Outros Apps
Para implementar a verificação de acesso no seu aplicativo, siga estes passos:

**Passo 1: Copiar os Schemas Relevantes**
- Do projeto de referência (ex: "Maestro Operacional"), copie os seguintes arquivos para o seu projeto, mantendo a estrutura de diretórios:
    - `src/schemas/userProfileSchema.ts` (para `role`)
    - `src/schemas/assinaturaSchema.ts`
    - `src/schemas/commonSchemas.ts` (dependência dos outros schemas)

**Passo 2: Implementar os Serviços Necessários**
- Copie o serviço `src/services/userProfileService.ts`. Ele é essencial para ler o campo `role`.

**Passo 3: Adaptar seu Provedor de Autenticação (`AuthContext.tsx`)**
- A lógica de verificação deve ser centralizada no seu `AuthContext`. O exemplo abaixo é uma implementação robusta e recomendada.

**Exemplo de Código para seu `AuthContext`:**
```typescript
// Dentro do seu AuthContext.tsx ou equivalente

import { getUserProfile } from "@/services/userProfileService"; // Importe o serviço
import type { Assinatura } from '@/schemas/assinaturaSchema'; // Importe o tipo

// ... outras importações de firebase, react, etc.

type SubscriptionStatus = 'loading' | 'active' | 'inactive' | 'privileged';

// Função de verificação centralizada
const performAccessCheck = async (
  uid: string,
  email: string | null,
  db: any
): Promise<{ status: SubscriptionStatus; role: User['role']; accessibleModules: string[] }> => {
    if (!uid || !db) return { status: 'inactive', role: 'user', accessibleModules: [] };
    
    // 1. Check for privileged users via environment variables (highest priority)
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').filter(e => e.trim());
    if (email && adminEmails.includes(email)) {
        return { status: 'privileged', role: 'admin', accessibleModules: ['operacional', 'financeiro', 'consultor'] };
    }
    
    // 2. Check for roles in Firestore database
    let profileRole: User['role'] = 'user';
    let profileModules: string[] | undefined;
    try {
        const profile = await getUserProfile(uid);
        if (profile) {
            profileRole = profile.role || 'user';
            profileModules = profile.accessibleModules;
        }
        if (profileRole === 'admin' || profileRole === 'vip') {
            return { status: 'privileged', role: profileRole, accessibleModules: ['operacional', 'financeiro', 'consultor'] };
        }
    } catch (e) {
        console.error("Error checking user role from Firestore.", e);
    }
    
    // 3. Check for active subscription
    try {
        const subRef = doc(db, "assinaturas", uid);
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
            const subData = subSnap.data() as Assinatura;
            const isExpired = (subData.expiracao as Timestamp).toDate() < new Date();
            if (subData.status === 'ativa' && !isExpired) {
                const modules = profileModules || ['operacional', 'financeiro', 'consultor'];
                return { status: 'active', role: profileRole, accessibleModules: modules };
            }
        }
    } catch (e) {
        console.error("Error checking subscription status.", e);
    }

    // 4. Default to inactive
    return { status: 'inactive', role: profileRole, accessibleModules: profileModules || [] };
};


// Dentro do seu componente AuthProvider
// ...

const [user, setUser] = useState<User | null>(null);

// Efeito principal que reage a mudanças no estado de autenticação
useEffect(() => {
    if (!authInstance) return;

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
        if (firebaseUser) {
            const { status, role, accessibleModules } = await performAccessCheck(firebaseUser.uid, firebaseUser.email, db);
            
            setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role,
                accessibleModules,
            });
            // ... resto da lógica
        } else {
            setUser(null);
            // ... resto da lógica
        }
    });
    return () => unsubscribe();
}, [authInstance, db]);
```

**Passo 4: Configurar Regras do Firestore**
- Garanta que suas `firestore.rules` permitam que os usuários leiam seus próprios documentos de assinatura e perfil, mas não os alterem (exceto via processos seguros).

```firestore
match /assinaturas/{userIdDoc} {
  // Apenas o backend (via Admin SDK) pode escrever.
  allow write: if false; 
  // O usuário logado pode ler sua própria assinatura.
  allow read: if isSignedIn() && request.auth.uid == userIdDoc;
}

match /usuarios/{userIdDoc} {
  allow read: if isSignedIn() && request.auth.uid == userIdDoc;
  // Impede que o usuário altere seu próprio 'role'.
  allow update: if isSignedIn() && request.auth.uid == userIdDoc && request.resource.data.role == resource.data.role;
  allow create: if isSignedIn() && request.auth.uid == userIdDoc;
}
```

Seguindo estes passos, qualquer aplicativo do ecossistema poderá verificar de forma segura e consistente se um usuário tem permissão para usar as funcionalidades, mantendo a fonte da verdade centralizada no Firestore e permitindo overrides de desenvolvimento via `.env`.


## 9. Regras de Segurança Globais (Fallback)

Para auxiliar na depuração e garantir que nenhuma coleção seja acidentalmente exposta, a seguinte regra de fallback deve estar no final do arquivo `firestore.rules`:

```firestore
    // ========== FALLBACK DE SEGURANÇA ==========
    // Bloqueia qualquer acesso a coleções não explicitamente permitidas acima.
    // Útil para desenvolvimento para identificar caminhos não cobertos.
    // NUNCA permita acesso genérico em produção.
    match /{document=**} {
      allow read, write: if false;
    }
```

## 10. Conclusão

Este guia serve como um pilar para o desenvolvimento coeso do backend do ecossistema Gestor Maestro. Ele deve ser um documento vivo, atualizado conforme novas funcionalidades são adicionadas e os aplicativos evoluem. A colaboração entre as equipes (ou IAs) responsáveis por cada aplicativo é fundamental para manter a integridade e eficiência do sistema de dados compartilhado.

---
**Próximos Passos Recomendados:**
1.  Validar este documento com as equipes/IAs de cada aplicativo.
2.  Detalhar os schemas e operações para coleções marcadas como "Exemplo" ou "A ser detalhado".
3.  Revisar e atualizar `firestore.rules` e `firestore.indexes.json` com base neste guia consolidado e no `DATA_SYNC_CONFIG.json`.
4.  Considerar a criação de testes automatizados para as regras de segurança.