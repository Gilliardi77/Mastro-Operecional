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
    *   `createdAt` (timestamp, obrigatório, gerenciado pelo sistema): Data de criação do perfil.
    *   `updatedAt` (timestamp, obrigatório, gerenciado pelo sistema): Data da última atualização.
*   **Operações e Atores:**
    *   **CREATE:**
        *   **Ator:** Usuário (via `AuthContext` no app Diagnóstico Maestro durante o `signUp`).
        *   **Descrição:** Criação inicial do perfil (pode ser um documento vazio ou com poucos campos).
    *   **READ:**
        *   **Ator:** Usuário (em todos os apps para exibir informações de perfil).
        *   **Descrição:** Ler os dados do próprio perfil.
    *   **UPDATE:**
        *   **Ator:** Usuário (via página de Perfil no app Diagnóstico Maestro, e potencialmente em outros apps).
        *   **Descrição:** Atualizar informações da empresa ou pessoais.
    *   **DELETE:**
        *   **Ator:** Geralmente não permitido pelo usuário final; pode ser uma operação administrativa.
        *   **Descrição:** Remoção do perfil (requer cuidado devido a dependências).
*   **Aplicativos que Utilizam:**
    *   Diagnóstico Maestro (principalmente para criação/atualização inicial)
    *   Maestro Operacional (leitura para exibir dados da empresa)
    *   Visão Clara Financeira (leitura para exibir dados da empresa)
*   **Regras de Segurança (Exemplo `firestore.rules`):**
    ```firestore
    match /usuarios/{userIdDoc} {
      // REQUER: ID do documento ser o UID do usuário
      allow create: if docIdIsSelf(userIdDoc) &&
                       (request.resource.data.userId == null || request.resource.data.userId == userIdDoc); // userId no corpo opcional e deve ser o mesmo
      allow read: if isSignedIn() && request.auth.uid == userIdDoc;
      allow update: if docIdIsSelf(userIdDoc);
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

### 8.1. Visão Geral do Fluxo
1.  O **Diagnóstico Maestro** é o ponto de entrada principal, onde o usuário cria sua conta no Firebase Authentication.
2.  Um webhook (ex: Hotmart) chama uma API no **Diagnóstico Maestro** (`/api/webhooks/hotmart`) quando uma assinatura é criada ou atualizada.
3.  Essa API salva ou atualiza um documento na coleção `assinaturas` no Firestore. O ID do documento é o UID do usuário.
4.  Os **outros aplicativos** do ecossistema **NÃO** precisam de um webhook. Eles apenas precisam **LER** da coleção `assinaturas` para verificar o status do usuário logado.

### 8.2. Checklist de Implementação para Outros Apps
Para implementar a verificação de assinatura em seu aplicativo, siga estes passos:

**Passo 1: Copiar o Schema de Assinatura**
- Copie o arquivo `src/schemas/assinaturaSchema.ts` do projeto Diagnóstico Maestro para o seu projeto. Isso garante que você possa validar e tipar os dados lidos do Firestore corretamente.

**Passo 2: Implementar a Lógica de Verificação no Cliente**
- Em seu provedor de autenticação (ex: `AuthContext.tsx`), você precisará de uma função para verificar o status da assinatura do usuário.
- Esta função deve ser chamada sempre que o estado de autenticação mudar (um usuário fizer login ou a página for carregada com um usuário já logado).

**Exemplo de Função de Verificação (para seu `AuthContext`):**
```typescript
// Dentro do seu AuthContext.tsx ou equivalente

// Função auxiliar para verificar usuários privilegiados (opcional, mas recomendado)
const isPrivilegedUser = (uid: string): boolean => {
  const adminUids = process.env.NEXT_PUBLIC_ADMIN_UIDS?.split(',') || [];
  const vipUids = process.env.NEXT_PUBLIC_VIP_UIDS?.split(',') || [];
  return !!uid && (adminUids.includes(uid) || vipUids.includes(uid));
};

// Função principal de verificação
const checkSubscriptionStatus = useCallback(async (uid: string) => {
  setCheckingSubscriptionStatus(true); // Para exibir um loader

  // 1. Conceder acesso imediato a usuários privilegiados
  if (isPrivilegedUser(uid)) {
    setSubscriptionStatus('active');
    setCheckingSubscriptionStatus(false);
    return;
  }

  // 2. Acessar o Firestore
  if (!db) { // db importado da sua configuração do Firebase
    setSubscriptionStatus('inactive');
    setCheckingSubscriptionStatus(false);
    return;
  }

  try {
    // 3. Ler o documento da assinatura
    const subRef = doc(db, "assinaturas", uid);
    const subSnap = await getDoc(subRef);

    if (subSnap.exists()) {
      const subData = subSnap.data() as Assinatura; // Use o tipo do schema copiado
      const expiracao = (subData.expiracao as Timestamp).toDate();

      // 4. Validar o status e a data de expiração
      if (subData.status === 'ativa' && expiracao >= new Date()) {
        setSubscriptionStatus('active');
      } else {
        setSubscriptionStatus('inactive');
      }
    } else {
      // 5. Se não há documento, não há assinatura
      setSubscriptionStatus('inactive');
    }
  } catch (error) {
    console.error("Erro ao verificar status da assinatura:", error);
    setSubscriptionStatus('inactive');
  } finally {
    setCheckingSubscriptionStatus(false);
  }
}, []);
```

**Passo 3: Proteger a Rota de Login**
- É crucial verificar a assinatura do usuário **no momento do login**. Se o usuário não tiver uma assinatura ativa, o login deve ser interrompido e o usuário não deve conseguir acessar o aplicativo.

**Exemplo de Lógica na Função `signIn`:**
```typescript
// Dentro do seu AuthContext.tsx ou equivalente

const signIn = useCallback(async (email: string, pass: string) => {
  if (!authInstance) throw new Error("Firebase Auth não inicializado.");
  
  try {
    const userCredential = await signInWithEmailAndPassword(authInstance, email, pass);
    const user = userCredential.user;

    if (user) {
      // Verifica se é privilegiado
      if (isPrivilegedUser(user.uid)) {
        router.push('/dashboard'); // Ou sua página principal
        return;
      }
      
      // Verifica a assinatura
      const hasAccess = await checkUserHasActiveSubscription(user.uid); // Função auxiliar que faz a mesma lógica de `checkSubscriptionStatus` mas retorna um booleano
      
      if (hasAccess) {
        // Login bem-sucedido, redireciona para o app
        router.push('/dashboard');
      } else {
        // Acesso negado, desloga o usuário e mostra um erro
        await signOut(authInstance);
        toast({ 
          title: "Acesso Negado", 
          description: "Você não possui uma assinatura ativa.", 
          variant: "destructive"
        });
      }
    }
  } catch (error) {
    // Tratar erros de login (senha errada, etc.)
  }
}, [/* dependências */]);
```

**Passo 4: Configurar Variáveis de Ambiente e Regras do Firestore**
- **Variáveis de Ambiente:** Adicione `NEXT_PUBLIC_ADMIN_UIDS` e `NEXT_PUBLIC_VIP_UIDS` ao seu arquivo `.env.local` (ou às configurações do seu ambiente de produção) para gerenciar usuários com acesso privilegiado.
- **Regras do Firestore:** Garanta que suas `firestore.rules` permitam que os usuários leiam seus próprios documentos de assinatura:
    ```firestore
    match /assinaturas/{userIdDoc} {
      // Apenas o backend (via Admin SDK) pode escrever.
      allow write: if false; 
      // O usuário logado pode ler sua própria assinatura.
      allow read: if isSignedIn() && request.auth.uid == userIdDoc;
    }
    ```

Seguindo estes passos, qualquer aplicativo do ecossistema poderá verificar de forma segura e consistente se um usuário tem permissão para usar as funcionalidades pagas.


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
