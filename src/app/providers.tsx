'use client';

import { LanguageProvider } from "@/contexts/LanguageContext";
import { TutorialProvider } from "@/contexts/TutorialContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <TutorialProvider>
        {children}
      </TutorialProvider>
    </LanguageProvider>
  );
}
