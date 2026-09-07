'use client';

import { LanguageProvider } from "@/contexts/LanguageContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { VisualSettingsProvider } from "@/contexts/VisualSettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <VisualSettingsProvider><TutorialProvider>
        {children}
      </TutorialProvider></VisualSettingsProvider>
    </LanguageProvider>
  );
}
