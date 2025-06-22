
import { config } from 'dotenv';
config();

// Removed imports for development-only flows to clean up the final app.
// import '@/ai/flows/module-prompt-generator.ts';
// import '@/ai/flows/ai-content-suggestions.ts';
// import '@/ai/flows/interactive-module-guide-flow.ts';
import '@/ai/flows/contextual-ai-guide-flow.ts';
