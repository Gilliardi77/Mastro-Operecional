
import { config } from 'dotenv';
config();

import '@/ai/flows/financial-trend-prediction.ts';
import '@/ai/flows/product-pricing-flow.ts';
import '@/ai/flows/contextual-ai-guide-flow.ts';
import '@/ai/schemas/product-pricing-schema.ts'; 
import '@/ai/schemas/contextual-ai-guide-schema.ts';
import '@/schemas/custoFixoConfiguradoSchema.ts';
import '@/schemas/ordemServicoSchema.ts';

// Se o arquivo src/components/financeiro/PlanejamentoCustosSection.tsx
// contiver flows ou prompts Genkit, ele precisaria ser importado aqui.
// Como é um componente React, não precisa ser listado, a menos que
// o Genkit CLI tenha uma razão específica para rastreá-lo (o que não é comum).
// O antigo 'CustosSection.ts' ou 'CustosFixosVariaveisSection.ts' não foi listado,
// então 'PlanejamentoCustosSection.tsx' também não precisa ser, a menos que tenha Genkit.
