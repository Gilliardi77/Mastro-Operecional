import { config } from 'dotenv';
config();

import '@/ai/flows/module-prompt-generator.ts';
import '@/ai/flows/ai-content-suggestions.ts';
import '@/ai/flows/interactive-module-guide-flow.ts'; // Adicionado novo fluxo
