import { config } from 'dotenv';
config();

// Flows from 'operacional' module
import '@/ai/flows/ai-content-suggestions.ts';
import '@/ai/flows/interactive-module-guide-flow.ts';
import '@/ai/flows/module-prompt-generator.ts';
import '@/ai/flows/contextual-ai-guide-operacional-flow.ts';

// Flows from 'consultor' module
import '@/ai/flows/generate-consultant-feedback.ts';
import '@/ai/flows/generate-stage-summary.ts';
import '@/ai/flows/generate-goals-analysis-flow.ts';

// Flows from 'financeiro' module
import '@/ai/flows/financial-trend-prediction.ts';
import '@/ai/flows/product-pricing-flow.ts';
// O fluxo financeiro foi unificado no operacional, então removemos o import daqui.
