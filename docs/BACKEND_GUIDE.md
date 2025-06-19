
# Guia Unificado de Dados e Backend para o Business Maestro

Este documento é a **fonte única de verdade** para todas as IAs, desenvolvedores humanos e sistemas que interagem com os dados da aplicação **Business Maestro**. Ele estabelece um padrão universal, prático e automático para criação, leitura, atualização, exclusão e indexação de dados no Firestore, assim como para a modelagem de schemas, geração de serviços e organização geral do backend.

---

## ⚠️ Fonte Oficial da Verdade para Coleções e Regras do Firestore

**Atenção:** Os arquivos `DATA_SYNC_CONFIG.json` e `DATA_SYNC_SUMMARY.md`, localizados na raiz deste projeto, são a **fonte oficial de verdade** para:

*   A lista definitiva de coleções do Firestore.
*   Nomes de coleções e campos principais (implícito pelo uso).
*   Formatos de ID de documentos.
*   Regras de segurança do Firebase Firestore.

Este guia (`BACKEND_GUIDE.md`) e o `DETAILED_BACKEND_ARCHITECTURE.md` fornecem o *raciocínio arquitetural, padrões de implementação, exemplos de schemas e discussões detalhadas sobre as entidades*. No entanto, para as especificações exatas mencionadas acima, os arquivos `DATA_SYNC_CONFIG.json` e `DATA_SYNC_SUMMARY.md` devem ser consultados e priorizados. Eles devem ser usados para validar e sincronizar dados e estruturas entre os módulos dos apps.

---

## ✨ Princípios Inquebráveis

1. **Schemas são a Verdade:** Toda entidade tem seu schema definido em `src/schemas/`, usando Zod. Nenhum dado é enviado ou recebido sem validação.
2. **Serviços são a Ponte com o Firestore:** Toda interação com o banco deve passar por `src/services/[entidade]Service.ts`. Nunca interaja com o Firestore diretamente.
3. **Validação por Zod:** Sempre use `Zod` para validar, transformar e tipar os dados.
4. **Documentação Integrada (JSDoc):** Todos os campos e funções devem ter descrições claras para uso humano e por IA.
5. **Gerador de Entidades Automatizado (futuro):** Este documento serve como base para scripts automatizados de geração.

---

## 🔎 JSON Padrão de Entidade (Modelo para IA)

Este é um modelo que pode ser usado para instruir uma IA a gerar os artefatos para uma nova entidade.

```json
{
  "entity": "[nomeSingularDaEntidade]",
  "schemaFile": "src/schemas/[nomeSingularDaEntidade]Schema.ts",
  "serviceFile": "src/services/[nomeSingularDaEntidade]Service.ts",
  "firestoreCollection": "[nomeDaColecaoNoPlural]",
  "types": {
    "full": "[NomeEntidadeCapitalizado]",
    "create": "[NomeEntidadeCapitalizado]CreateData",
    "update": "[NomeEntidadeCapitalizado]UpdateData"
  },
  "fields": [
    { "name": "campoExemplo1", "type": "string", "required": true, "description": "Descrição do campo 1." },
    { "name": "campoExemplo2", "type": "number", "required": false, "description": "Descrição do campo 2 (opcional)." },
    { "name": "campoEnum", "type": "enum", "values": ["VALOR1", "VALOR2"], "required": true, "description": "Campo com valores predefinidos." },
    { "name": "dataExemplo", "type": "timestamp", "required": false, "description": "Campo de data/hora." }
  ],
  "requiresUserId": true,
  "hasTimestamps": true,
  "firestoreRules": {
    "create": "isRequestDataOwner()",
    "read": "isResourceOwner()",
    "update": "isResourceOwner()",
    "delete": "isResourceOwner()"
  },
  "defaultSortField": "nome",
  "customQueries": [
    { "name": "getByAlgumCampoEspecifico", "params": ["userId: string", "valorCampo: string"], "description": "Busca entidades por um campo específico." }
  ]
}
```

---

## 📃 Como Criar ou Entender uma Nova Entidade (Manual Universal)

Para qualquer entidade de dados no Business Maestro:

### 1. Schema (`src/schemas/[entidade]Schema.ts`)

*   **Definição da Estrutura:** Contém o schema Zod principal (ex: `ClientSchema`), que define todos os campos, tipos e validações.
*   **Tipos Derivados:** Exporta tipos TypeScript (ex: `Client`) inferidos do schema Zod.
*   **Schemas de Criação/Atualização:** Exporta schemas específicos para criação (ex: `ClientCreateSchema`) e atualização (ex: `ClientUpdateSchema`), omitindo campos gerenciados pelo sistema (`id`, `userId`, `createdAt`, `updatedAt`) ou tornando campos opcionais para atualização.
*   **Herança de Base:** Os schemas estendem `BaseSchema`, `BaseCreateSchema`, `BaseUpdateSchema` de `src/schemas/commonSchemas.ts`, que já incluem `id`, `userId`, `createdAt`, `updatedAt` (este último gerenciado pelo `firestoreService`).
*   **Documentação JSDoc:** Cada campo no schema Zod deve ter um `.describe()` com uma explicação clara.

### 2. Serviço (`src/services/[entidade]Service.ts`)

*   **Ponto de Acesso Único:** Toda interação com a entidade no Firestore DEVE passar por este serviço.
*   **Funções CRUD:** Exporta funções como `create[Entidade]`, `get[Entidade]ById`, `getAll[Entidades]ByUserId`, `update[Entidade]`, `delete[Entidade]`.
*   **Uso do `firestoreService`:** Internamente, estas funções utilizam as funções genéricas de `src/services/firestoreService.ts`.
*   **Validação de Entrada:** Os dados recebidos pelas funções do serviço são validados usando os schemas Zod apropriados (ex: `ClientCreateSchema.parse(data)`).
*   **Tipagem de Retorno:** As funções retornam os tipos definidos no schema (ex: `Promise<Client>`).

### 3. Exemplo de Interação (Criando uma Fatura)

```typescript
// Em algum lugar do seu código (ex: um fluxo Genkit, uma página Next.js)
import { createFatura, type FaturaCreateData } from '@/services/faturaService'; // Supondo que faturaService exista

async function registrarNovaFatura(userId: string) {
  const dadosNovaFatura: FaturaCreateData = {
    descricao: "Consultoria de Marketing Digital - Mês de Julho",
    valor: 1500.50,
    vencimento: new Date('2024-07-31'), // O schema pode converter para Timestamp ou string
    pago: false,
    // campos como clienteId, etc., seriam adicionados aqui
  };

  try {
    // A validação dos dadosNovaFatura contra FaturaCreateSchema
    // é feita DENTRO da função createFatura (ou antes de chamar createDocument no firestoreService).
    const faturaCriada = await createFatura(userId, dadosNovaFatura);
    console.log("Fatura criada com sucesso:", faturaCriada);
    // faturaCriada terá id, userId, createdAt, updatedAt preenchidos.
  } catch (error) {
    console.error("Erro ao criar fatura:", error);
  }
}
```
*Nota: No exemplo acima, a assinatura de `createDocument` no `firestoreService.ts` (neste guia) é idealmente `createDocument<TFull, TCreateInput>(...)` onde `TCreateInput` é validado pelo serviço da entidade ANTES de chamar `createDocument`. A implementação atual do `firestoreService.ts` neste projeto ("Maestro Operacional") pode diferir ligeiramente, recebendo o schema de criação para validação interna.*

### 4. Regras do Firestore (`firestore.rules`)

*   Define quem pode ler e escrever na coleção da entidade.
*   Normalmente, usa as funções utilitárias `isRequestDataOwner()` e `isResourceOwner()`.
    ```firestore
    match /[nomeDaColecaoNoPlural]/{docId} {
      allow create: if isRequestDataOwner(); // Usuário logado e userId no dado é o do requisitante
      allow read, update, delete: if isResourceOwner(); // Usuário logado e userId no recurso é o do requisitante
    }
    ```

### 5. Índices do Firestore (`firestore.indexes.json`)

*   Se a entidade precisa de consultas compostas ou ordenações específicas não padrão, defina os índices aqui.
    ```json
    {
      "collectionGroup": "[nomeDaColecaoNoPlural]",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "[campoParaOrdenar]", "order": "DESCENDING" }
      ]
    }
    ```

---

## 🤖 Prompt Padrão para Geração de Entidade por IA

> Crie uma nova entidade chamada `[NomeEntidadeSingular]` para o Business Maestro.
> A coleção no Firestore será `[nomeEntidadePlural]`.
>
> Campos obrigatórios:
> `[campo1: tipo (ex: string, number, boolean, enum:VALOR1,VALOR2, timestamp), descrição]`
> `[campo2: tipo, descrição]`
>
> Campos opcionais:
> `[campoOpcional1: tipo, descrição]`
>
> A entidade requer `userId` e timestamps padrão (`createdAt`, `updatedAt`).
> As regras do Firestore devem permitir que o proprietário crie, leia, atualize e delete seus próprios documentos.
> O ordenamento padrão na listagem deve ser por `[campoPadraoDeOrdenacao]`.
>
> Gere os seguintes arquivos e trechos de código:
> 1.  **Schema Zod:** Em `src/schemas/[nomeEntidadeSingular]Schema.ts`, incluindo `[NomeEntidadeCapitalizado]Schema`, `[NomeEntidadeCapitalizado]CreateSchema`, `[NomeEntidadeCapitalizado]UpdateSchema` e os tipos TypeScript correspondentes. Use JSDoc para descrever cada campo.
> 2.  **Serviço:** Em `src/services/[nomeEntidadeSingular]Service.ts`, com as funções `create[NomeEntidadeCapitalizado]`, `get[NomeEntidadeCapitalizado]ById`, `getAll[NomeEntidadeCapitalizadoPlural]ByUserId`, `update[NomeEntidadeCapitalizado]`, `delete[NomeEntidadeCapitalizado]`. O serviço deve usar o `firestoreService.ts` genérico e os schemas Zod para validação.
> 3.  **Regras do Firestore:** O trecho para `firestore.rules` para a coleção `[nomeEntidadePlural]`.
> 4.  **Índice do Firestore (se necessário):** Sugestão para `firestore.indexes.json` para a consulta `getAll` ordenada por `userId` e `[campoPadraoDeOrdenacao]`.

---
## 🗂️ Entidade Especial: Perfil de Usuário / Empresa (`usuarios`)

A gestão do perfil do usuário e dos dados da empresa é crucial para a consistência entre os diferentes módulos/aplicativos do Business Maestro.

*   **Coleção no Firestore:** `usuarios`
*   **ID do Documento:** O `uid` do usuário do Firebase Authentication.
*   **Fonte da Verdade para Dados Básicos de Auth:** Firebase Authentication (nome de exibição, email). Alterações no nome de exibição devem ser feitas via SDK do Firebase Auth.
*   **Fonte da Verdade para Dados Adicionais:** A coleção `usuarios` no Firestore.
*   **Schema de Definição:** `src/schemas/userProfileSchema.ts` (contém `UserProfileDataSchema` e `UserProfileUpsertDataSchema`). Este schema define campos como `companyName`, `companyCnpj`, `businessType`, `companyPhone`, `companyEmail`, `personalPhoneNumber`, além de `createdAt` e `updatedAt`.
*   **Serviço de Interação:** `src/services/userProfileService.ts` (contém `getUserProfile` e `upsertUserProfile`).
    *   `getUserProfile(userId: string)`: Busca o perfil do Firestore.
    *   `upsertUserProfile(userId: string, data: UserProfileUpsertData)`: Cria ou atualiza o perfil no Firestore.
*   **Consistência Entre Módulos/Apps:**
    *   Todos os módulos/apps do ecossistema Business Maestro que precisam acessar ou modificar dados de perfil/empresa DEVEM:
        1.  Obter o `uid` do usuário autenticado.
        2.  Usar o `userProfileService.ts` (ou uma implementação equivalente que utilize a coleção `usuarios` e o `uid` como ID do documento) para ler ou escrever esses dados.
        3.  Respeitar o `UserProfileDataSchema` para a estrutura dos dados.
    *   Alterações feitas no perfil do usuário (ex: informações da empresa) através de um app (ex: app de Diagnóstico) serão refletidas nos outros apps (ex: app Operacional) se eles seguirem este padrão de acesso à coleção `usuarios`.

---

## 💡 Entidades Geradas pelo Módulo de Diagnóstico (Relevantes para Integração)

Esta seção detalha as coleções chave que o módulo "Diagnóstico Maestro" (este aplicativo) cria e que são importantes para outros aplicativos do ecossistema "Gestor Maestro" consumirem para uma experiência integrada.

### 1. Metadados da Consulta de Diagnóstico (`consultationsMetadata`)
*   **Coleção no Firestore:** `consultationsMetadata`
*   **ID do Documento:** O `uid` do usuário do Firebase Authentication.
*   **Propósito:** Rastrear o status da consulta de diagnóstico inicial do usuário.
*   **Campos Chave para Outros Apps:**
    *   `completed` (boolean): Indica se o usuário completou o diagnóstico inicial. `true` se completou, `false` ou ausente caso contrário.
    *   `completedAt` (timestamp): Data e hora em que o diagnóstico foi concluído.
    *   `createdAt` (timestamp): Data e hora em que o registro foi criado (geralmente quando o usuário se registra ou inicia a primeira interação).
*   **Uso por Outros Apps:**
    *   Verificar se o usuário já passou pelo diagnóstico inicial para personalizar a experiência ou oferecer prompts para completá-lo.
    *   Entender quando o usuário entrou no ecossistema.
*   **Schema de Definição:** (Implícito, mas simples) `userId` (implícito pelo ID do doc), `completed: boolean`, `completedAt: Timestamp`, `createdAt: Timestamp`.
*   **Serviço de Interação (neste app):** A lógica de atualização está no `AuthContext` (`setAuthConsultationCompleted`) e no `ConsultationContext`.
*   **Regras do Firestore (Exemplo):**
    ```firestore
    match /consultationsMetadata/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId; // Usuário lê seus próprios metadados
      allow write: if request.auth != null && request.auth.uid == userId; // Usuário pode atualizar seus metadados (ex: via AuthContext)
    }
    ```

### 2. Planejamento Estratégico e Metas do Usuário (`userGoals`)
*   **Coleção no Firestore:** `userGoals`
*   **ID do Documento:** Gerado automaticamente pelo Firestore. Cada documento representa um planejamento/análise de metas.
*   **Propósito:** Armazenar os resultados da análise estratégica gerada pela IA na página `/goals` deste aplicativo, incluindo dados financeiros fornecidos pelo usuário, suas metas e o plano de ação sugerido pela IA.
*   **Campos Chave para Outros Apps:**
    *   `userId` (string): O UID do usuário proprietário desta meta/planejamento.
    *   `createdAt` (timestamp): Data e hora da criação do planejamento.
    *   `inputData` (object): Os dados que o usuário forneceu no formulário da página `/goals`.
        *   `currentRevenue` (number): Receita mensal atual.
        *   `currentExpenses` (number): Despesas mensais atuais.
        *   `targetRevenueGoal` (number): Meta de receita mensal desejada.
        *   `userQuestion` (string): Cenário ou pergunta do usuário.
        *   `businessSegment` (string, opcional): Segmento do negócio.
        *   `ticketMedioAtual` (number, opcional): Ticket médio.
        *   `taxaConversaoOrcamentos` (number, opcional): Taxa de conversão.
        *   `principaisFontesReceita` (string, opcional): Fontes de receita.
        *   `maioresCategoriasDespesa` (string, opcional): Categorias de despesa.
        *   `saldoCaixaAtual` (number, opcional): Saldo em caixa.
    *   `analysisResult` (object): A resposta completa da IA (tipo `GenerateGoalsAnalysisOutput` do fluxo `generate-goals-analysis-flow.ts`).
        *   `currentProfit` (number): Lucro atual calculado.
        *   `targetProfit` (number): Lucro alvo calculado.
        *   `revenueGap` (number): Diferença para a meta de receita.
        *   `businessDiagnosis` (string): Diagnóstico do negócio pela IA.
        *   `aiConsultantResponse` (string): Resposta consultiva principal da IA.
        *   `suggestions` (array de strings): Sugestões de foco estratégico.
        *   `actionPlan` (array de strings): Plano de ação inicial.
        *   `preventiveAlerts` (array de strings, opcional): Alertas preventivos.
    *   `status` (string, opcional): Ex: 'active', 'archived'. (Padrão 'active')
    *   `type` (string, opcional): Ex: 'strategic_planning'. (Padrão 'strategic_planning')
*   **Uso por Outros Apps:**
    *   **Visão Clara Financeira:** Pode usar `currentRevenue`, `currentExpenses`, `targetRevenueGoal` e o `actionPlan` para pré-configurar dashboards, metas financeiras e sugerir ações de acompanhamento. Pode também permitir que o usuário marque itens do `actionPlan` como concluídos.
    *   **Maestro Operacional:** Pode usar o `businessSegment`, `principaisFontesReceita` e `actionPlan` para contextualizar sugestões operacionais ou destacar áreas de foco em vendas e produção.
    *   Qualquer app pode usar o `userQuestion` e `aiConsultantResponse` para entender as dores e os direcionamentos estratégicos do usuário.
*   **Consulta:** Outros apps devem buscar o `userGoals` mais recente para o `userId` (ordenando por `createdAt` descendente e pegando o primeiro, se aplicável).
*   **Schema de Definição:** Os tipos `GenerateGoalsAnalysisInput` e `GenerateGoalsAnalysisOutput` (de `src/ai/flows/generate-goals-analysis-flow.ts`) definem a estrutura de `inputData` e `analysisResult`.
*   **Serviço de Interação (neste app):** A página `/goals` salva esses dados.
*   **Regras do Firestore (Exemplo):**
    ```firestore
    match /userGoals/{goalId} {
      allow create: if isRequestDataOwner(); // request.auth.uid == request.resource.data.userId
      allow read, update, delete: if isResourceOwner(); // request.auth.uid == resource.data.userId
    }
    ```
*   **Índice do Firestore (Sugerido para consulta):**
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

### 3. Detalhes da Consulta de Diagnóstico (`consultations`)
*   **Coleção no Firestore:** `consultations`
*   **ID do Documento:** Gerado automaticamente pelo Firestore.
*   **Propósito:** Armazenar todos os detalhes de cada sessão de diagnóstico interativa, incluindo todas as perguntas, respostas do usuário, feedbacks da IA e o diagnóstico final dividido em partes.
*   **Campos Chave para Outros Apps:**
    *   `userId` (string): O UID do usuário.
    *   `consultationCompletedAt` (timestamp): Quando a consulta foi completada.
    *   `initialFormData` (object): Dados do formulário inicial.
    *   `userAnswers` (object): Perguntas e respostas.
    *   `aiFeedbacks` (object): Perguntas e feedbacks da IA.
    *   `finalDiagnosisParts` (array de objects): As partes do diagnóstico final (`{partId, title, content}`).
*   **Uso por Outros Apps:**
    *   Principalmente para este aplicativo (Diagnóstico Maestro) exibir o histórico de consultas.
    *   Outros aplicativos podem consultar os `finalDiagnosisParts` para obter um entendimento profundo do diagnóstico do usuário, se necessário, embora `userGoals` seja geralmente mais direto para dados estratégicos e financeiros.
*   **Consulta:** Outros apps podem buscar a consulta mais recente para o `userId` (ordenando por `consultationCompletedAt` descendente).
*   **Schema de Definição:** (Implícito, baseado nos tipos do `ConsultationContext`).
*   **Serviço de Interação (neste app):** O `ConsultationContext` salva esses dados ao final da consulta.
*   **Regras do Firestore (Exemplo):**
    ```firestore
    match /consultations/{consultationId} {
      allow create: if isRequestDataOwner();
      allow read: if isResourceOwner();
      // Geralmente, não se espera update/delete dessas consultas históricas por outros apps.
    }
    ```
*   **Índice do Firestore (Sugerido para consulta):**
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

## 🔢 Funções Genéricas no `firestoreService.ts`

O `src/services/firestoreService.ts` contém funções genéricas como `createDocument`, `getDocumentById`, `getAllDocumentsByUserId`, `updateDocument`, e `deleteDocument`. Os serviços específicos de entidade (ex: `clientService.ts`) utilizam essas funções.

A implementação atual do `firestoreService.ts` no projeto "Maestro Operacional" lida com a validação de schemas (tanto o de criação quanto o completo) e a conversão de `Date` para `Timestamp` (e vice-versa), além de adicionar/atualizar campos como `userId`, `createdAt`, e `updatedAt`.

**Assinatura de `createDocument` (conforme implementado atualmente no Maestro Operacional):**
```ts
export async function createDocument<TCreate, TFull extends { id: string }>(
  collectionName: string,
  userId: string,
  createSchema: ZodSchema<TCreate>, // Schema para validar os dados de entrada
  fullSchema: ZodSchema<TFull>,    // Schema para validar o documento completo retornado
  data: TCreate
): Promise<TFull>
```

*   Adiciona `userId`, `createdAt` (como `Date`), `updatedAt` (como `Date`) automaticamente.
*   Converte os campos `Date` para `Timestamp` antes de salvar no Firestore.
*   Converte `Timestamp` para `Date` ao ler do Firestore.
*   Valida `data` contra `createSchema` antes de adicionar campos automáticos.
*   Valida o documento final (com `id` e campos automáticos) contra `fullSchema` antes de retornar.

---

## 🌊 Fluxos de Transação e Integrações Notáveis (App "Maestro Operacional")

Esta seção destaca alguns fluxos de dados importantes dentro do aplicativo "Maestro Operacional" que podem ser relevantes para entender a interação entre diferentes entidades e a origem de certos dados financeiros.

### 1. Criação de Ordem de Serviço (OS) com Adiantamento
*   **Página:** `/produtos-servicos/atendimentos/novo`
*   **Fluxo:**
    1.  Usuário preenche os dados da OS, incluindo um `valorAdiantado` e a `formaPagamentoAdiantamento`.
    2.  Ao salvar, o sistema:
        *   Cria um documento na coleção `ordensServico` com os detalhes da OS, incluindo `dataPrimeiroPagamento` (data atual) e `formaPrimeiroPagamento`. O `statusPagamento` é definido como "Pago Parcial" ou "Pago Total" com base no adiantamento.
        *   Automaticamente cria um `lancamentoFinanceiro` do tipo "receita", status "recebido", categoria "Adiantamento OS", com o valor e forma de pagamento do adiantamento, e o `referenciaOSId` preenchido.
        *   Cria uma `ordemDeProducao` vinculada.
*   **Impacto:** O adiantamento entra no caixa no mesmo dia e é refletido no `fechamentoCaixa`.

### 2. Conclusão de Ordem de Produção (OP) e Pagamento Final da OS
*   **Página:** `/produtos-servicos/producao`
*   **Fluxo:**
    1.  Usuário marca uma OP como concluída (progresso 100%).
    2.  O sistema verifica a `ordemServico` original vinculada.
    3.  Se houver saldo devedor na OS (`valorTotal - valorPagoTotal > 0`), um modal é exibido para registrar o pagamento final, incluindo valor e forma de pagamento.
    4.  Após o registro do pagamento (se necessário):
        *   Um `lancamentoFinanceiro` do tipo "receita", status "recebido", categoria "Receita de OS", é criado para o pagamento final.
        *   A `ordemServico` é atualizada: `valorPagoTotal` incrementado, `statusPagamento` para "Pago Total", `dataUltimoPagamento` e `formaUltimoPagamento` registrados, e o `status` da OS para "Concluído".
        *   A `ordemDeProducao` tem seu status atualizado para "Concluído".
        *   A baixa de estoque dos produtos da OS é realizada.
    5.  Se não houver saldo devedor na OS, o sistema pula o modal de pagamento e procede diretamente com a conclusão da OP, da OS e a baixa de estoque.
*   **Impacto:** Garante que o pagamento final seja registrado antes de considerar a OS totalmente concluída, e o valor entra no caixa na data do pagamento.

### 3. Vendas no Balcão (PDV)
*   **Página:** `/produtos-servicos/balcao`
*   **Fluxo:**
    1.  Usuário adiciona itens ao carrinho e finaliza a venda, selecionando a forma de pagamento.
    2.  O sistema:
        *   Cria um documento na coleção `vendas`.
        *   Automaticamente cria um `lancamentoFinanceiro` do tipo "receita", status "recebido", categoria "Venda Balcão", com o valor e forma de pagamento da venda, e o `vendaId` preenchido.
        *   Realiza a baixa de estoque dos produtos vendidos.
*   **Impacto:** Vendas PDV entram imediatamente no caixa e são refletidas no `fechamentoCaixa`.

### 4. Fechamento de Caixa
*   **Página:** `/financeiro/fechamento-caixa`
*   **Fluxo:**
    1.  O sistema calcula `totalEntradasCalculado` (somando `lancamentosFinanceiros` do tipo "receita" e status "recebido" do dia, e vendas PDV do dia que não geraram lançamentos como uma contingência) e `totalSaidasCalculado` (somando `lancamentosFinanceiros` do tipo "despesa" e status "pago" do dia).
    2.  O usuário informa `trocoInicial` (sugerido com base no último fechamento) e `sangrias`.
    3.  O `saldoFinalCalculado` é exibido.
    4.  Um resumo de `entradasPorMetodo` (dinheiro, pix, cartão, boleto, transferência, etc.) é apresentado, baseado nas `formaPagamento` dos `lancamentosFinanceiros` de receita e das `vendas`.
    5.  Múltiplos fechamentos no mesmo dia são permitidos.
*   **Impacto:** Fornece um resumo diário das movimentações financeiras. A precisão do `entradasPorMetodo` depende da correta atribuição de `formaPagamento` nos `lancamentosFinanceiros`.

Estes fluxos demonstram como as operações e finanças estão interligadas, com lançamentos financeiros sendo gerados automaticamente em momentos chave para manter a integridade dos dados.

---

## 📊 Aplicativos Modulares (Operacional, Financeiro, Gestão)

Os dados das coleções `usuarios`, `consultationsMetadata` e, especialmente, `userGoals` são fundamentais para que os módulos Operacional e Financeiro possam oferecer uma experiência rica e contextualizada.

### 1. Operacional (Exemplo de Entidades)

* Entidades: `clientes`, `fornecedores`, `produtosServicos` (já criado), `ordensServico`, `entregas`, `agendamentos`
* **Integração:** Pode usar `userGoals.inputData.businessSegment` e `userGoals.actionPlan` para sugerir focos operacionais.

### 2. Financeiro (Exemplo de Entidades)

* Entidades: `faturas`, `lancamentosFinanceiros`, `pagamentos`, `recebimentos`, `transferencias`, `cartoes`, `metasFinanceiras`, `fechamentosCaixa`.
* **Integração:**
    *   Pode usar `userGoals.inputData.currentRevenue`, `userGoals.inputData.currentExpenses`, `userGoals.inputData.targetRevenueGoal` para popular dashboards iniciais e comparar com as metas definidas no app de diagnóstico. O `userGoals.actionPlan` pode inspirar a criação de metas financeiras específicas.
    *   A coleção `fechamentosCaixa` (gerada pelo Maestro Operacional) fornece um resumo diário do fluxo de caixa (entradas, saídas, saldo, métodos de pagamento) que é crucial para o "Visão Clara Financeira" realizar análises de DRE, fluxo de caixa projetado e comparar com metas.
    *   Os dados de `lancamentosFinanceiros` e `vendas` (gerados pelo Maestro Operacional ou diretamente no Visão Clara Financeira) são a base para todas as análises financeiras.

### 3. Gestão (Exemplo de Entidades no App de Diagnóstico/Central)

* Entidades: `usuarios` (perfil da empresa), `consultations` (histórico do diagnóstico), `consultationsMetadata` (status do diagnóstico), `userGoals` (planejamento estratégico e metas da IA).
* **Outros apps podem ter suas próprias entidades de gestão**, como `logs` específicos de cada app, `avisos` internos, etc.

---

## ⚖️ Padrão de Nomeação

| Entidade        | Schema Principal     | Serviço (Arquivo)             | Função de Serviço (Exemplo) | Coleção Firestore    |
| --------------- | -------------------- | ----------------------------- | --------------------------- | -------------------- |
| cliente         | ClientSchema         | `clientService.ts`            | `createClient`              | `clientes`           |
| produto/serviço | ProductServiceSchema | `productServiceService.ts`    | `createProductService`      | `produtosServicos`   |
| fatura          | FaturaSchema         | `faturaService.ts`            | `createFatura`              | `faturas`            |
| perfil usuário  | UserProfileDataSchema | `userProfileService.ts` | `upsertUserProfile`         | `usuarios`           |
| meta/planejamento | (tipos de `generate-goals-analysis-flow.ts`) | (Lógica na página `/goals`) | `addDoc` (direto no Firestore) | `userGoals` |
| fechamento de caixa | FechamentoCaixaSchema | `fechamentoCaixaService.ts` | `createFechamentoCaixa` | `fechamentosCaixa` |
| ...             | `[Entidade]Schema`   | `[entidade]Service.ts`        | `create[Entidade]`          | `[entidades]` (plural) |

---

## 🏛️ Diretórios Padrão

```
src/
├── schemas/
│   ├── commonSchemas.ts       # BaseSchema, etc.
│   ├── clientSchema.ts
│   ├── productServiceSchema.ts
│   ├── userProfileSchema.ts   # Schema para a coleção 'usuarios'
│   ├── fechamentoCaixaSchema.ts # Schema para a coleção 'fechamentosCaixa'
│   ├── faturaSchema.ts        # Exemplo de nova entidade
│   └── ...
├── services/
│   ├── firestoreService.ts    # Funções genéricas CRUD
│   ├── clientService.ts
│   ├── productServiceService.ts
│   ├── userProfileService.ts  # Serviço para a coleção 'usuarios'
│   ├── fechamentoCaixaService.ts # Serviço para a coleção 'fechamentosCaixa'
│   ├── faturaService.ts       # Exemplo de novo serviço
│   └── ...
```

---

## 🚀 Futuro: CLI para Geração Automática

Com base neste documento, será possível criar um comando como:

```bash
npx maestro generate-entity fatura --fields "descricao:string,valor:number,vencimento:date,pago:boolean:false"
```

E ele gerará:

* `src/schemas/faturaSchema.ts` (Schema e Tipos)
* `src/services/faturaService.ts` (Serviço com CRUD)
* Sugestão para `firestore.rules`
* Sugestão para `firestore.indexes.json`
* Exemplo de uso básico.

---

**Este guia deve ser seguido integralmente por qualquer IA ou humano que deseje interagir com os dados da aplicação Business Maestro.**

