'use client';

import React, { useEffect, useState } from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TutorialOverlay() {
    const { currentStep, isTutorialActive, nextStep, skipTutorial } = useTutorial();
    const { t } = useLanguage();
    const [highlightInfo, setHighlightInfo] = useState<{ id: string; rect: DOMRect } | null>(null);

    useEffect(() => {
        if (isTutorialActive && currentStep?.highlightElementId) {
            const targetId = currentStep.highlightElementId;
            const updateHighlight = () => {
                const element = document.getElementById(targetId);
                if (element) {
                    setHighlightInfo({ id: targetId, rect: element.getBoundingClientRect() });
                } else {
                    setHighlightInfo(null);
                }
            };

            // Initial check
            updateHighlight();

            // Check periodically in case UI is animating in
            const interval = setInterval(updateHighlight, 100);
            
            // Listen for resize
            window.addEventListener('resize', updateHighlight);

            return () => {
                clearInterval(interval);
                window.removeEventListener('resize', updateHighlight);
            };
        }
    }, [isTutorialActive, currentStep]);

    if (!isTutorialActive || !currentStep) return null;

    // Only show highlight if it matches the current step's target
    const highlightRect = (highlightInfo && highlightInfo.id === currentStep.highlightElementId) 
        ? highlightInfo.rect 
        : null;

    // Unified placement on the left side (Shapez-style)
    // Compressed width (max-w-[240px] approx w-60), increased vertical space implicit by content flow
    const currentPositionClass = 'top-24 left-4';

    return (
        <>
            {/* Spotlight / Highlight Effect */}
            {highlightRect && (
                <div 
                    className="fixed z-[99] pointer-events-none transition-all duration-300 ease-out"
                    style={{
                        top: highlightRect.top - 8,
                        left: highlightRect.left - 8,
                        width: highlightRect.width + 16,
                        height: highlightRect.height + 16,
                    }}
                >
                    <div className="absolute inset-0 border-4 border-yellow-400/80 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-pulse"></div>
                    {/* Optional: Darken background outside (clip-path is complex, maybe just simple highlight for now) */}
                </div>
            )}

            {/* Tutorial Message Box */}
            <div className={`fixed z-[100] w-64 p-6 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-blue-500/50 backdrop-blur-sm transition-all duration-300 ${currentPositionClass}`}>
                <div className="flex flex-col gap-4">
                    <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[calc(100vh-220px)] pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                        {t(currentStep.textKey)}
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                        <button 
                            onClick={skipTutorial}
                            className="text-slate-400 hover:text-white text-sm transition-colors"
                        >
                            {t('tut-hide')}
                        </button>

                        {currentStep.trigger === 'CUSTOM' && (
                            <button 
                                onClick={nextStep}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105"
                            >
                                {t('tut-step-next')}
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Optional: Add a pointer/arrow if we want to get fancy later */}
            </div>
        </>
    );
}
