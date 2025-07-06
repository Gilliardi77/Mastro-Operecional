
import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ConsultationProvider } from '@/contexts/ConsultationContext';
// Importar as configurações processadas diretamente
import { 
  INITIAL_FORM_CFG, 
  RAW_MAESTRO_DATA_CFG, 
  BLOCKS_CFG, 
  TOTAL_MAIN_QUESTIONS_CFG, 
  FINAL_DIAGNOSIS_DISPLAY_CFG 
} from '@/data/questions';

export default function ConsultationLayout({ children }: { children: ReactNode }) {
  // Garantir que os dados não sejam undefined/null antes de passar.
  // Em um cenário real de produção, você pode querer um fallback ou página de erro aqui
  // se alguma dessas configurações críticas não carregar.
  // No entanto, src/data/questions.ts já lança erros se o carregamento falhar.
  if (!INITIAL_FORM_CFG || !RAW_MAESTRO_DATA_CFG || !BLOCKS_CFG || !FINAL_DIAGNOSIS_DISPLAY_CFG) {
    // Isso não deveria acontecer se questions.ts executou corretamente e populou os exports.
    // Mas é uma salvaguarda.
    return (
      <div>
        <p>Erro crítico: Falha ao carregar a configuração da consulta no layout.</p>
        <p>Verifique os logs do servidor.</p>
      </div>
    );
  }

  return (
    <ConsultationProvider
      initialFormConfigData={INITIAL_FORM_CFG}
      maestroDataConfig={RAW_MAESTRO_DATA_CFG}
      blocksConfigData={BLOCKS_CFG}
      totalMainQuestionsData={TOTAL_MAIN_QUESTIONS_CFG}
      finalDiagnosisDisplayConfigData={FINAL_DIAGNOSIS_DISPLAY_CFG}
    >
      {/* O Header e Footer serão renderizados pelo RootLayout agora */}
      <main className="flex-grow pt-16 pb-28 md:pb-24"> {/* Adjust padding for fixed header and footer */}
        {children}
      </main>
    </ConsultationProvider>
  );
}
