'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { TutorialStep, TutorialTriggerType, LevelTutorial } from '@/types/tutorial';
import { tutorials } from '@/data/tutorials';

interface TutorialContextType {
    activeTutorial: LevelTutorial | null;
    currentStep: TutorialStep | null;
    currentStepIndex: number;
    isTutorialActive: boolean;
    completedTutorials: number[];
    startTutorial: (levelIndex: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTutorial: () => void;
    resetTutorials: () => void;
    dispatchAction: (action: TutorialTriggerType, params?: Record<string, unknown>) => void;
    forceStartTutorial: (levelIndex: number) => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [activeTutorial, setActiveTutorial] = useState<LevelTutorial | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isTutorialActive, setIsTutorialActive] = useState(false);
    const isAdvancingRef = useRef(false);
    const [completedTutorials, setCompletedTutorials] = useState<number[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('completed_tutorials');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse completed tutorials', e);
                }
            }
        }
        return [];
    });

    const saveCompleted = useCallback((levelIndex: number) => {
        setCompletedTutorials(prev => {
            if (prev.includes(levelIndex)) return prev;
            const newCompleted = [...prev, levelIndex];
            localStorage.setItem('completed_tutorials', JSON.stringify(newCompleted));
            return newCompleted;
        });
    }, []);

    const resetTutorials = useCallback(() => {
        setCompletedTutorials([]);
        localStorage.removeItem('completed_tutorials');
        setActiveTutorial(null);
        setIsTutorialActive(false);
        setCurrentStepIndex(0);
        isAdvancingRef.current = false;
    }, []);

    const startTutorial = useCallback((levelIndex: number) => {
        const tutorial = tutorials[levelIndex];
        // Note: We check completedTutorials here, but it's now in dependency array.
        // To be safe with stale closures if we remove it from deps, we might need a ref or functional update,
        // but since startTutorial is called from effects/handlers, including it in deps is fine.
        if (tutorial && !completedTutorials.includes(levelIndex)) {
            setActiveTutorial(tutorial);
            setCurrentStepIndex(0);
            setIsTutorialActive(true);
            isAdvancingRef.current = false;
        } else {
            // No tutorial or already completed
            setActiveTutorial(null);
            setIsTutorialActive(false);
        }
    }, [completedTutorials]);

    const nextStep = useCallback(() => {
        if (!activeTutorial) return;
        
        if (currentStepIndex < activeTutorial.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            // End of tutorial
            saveCompleted(activeTutorial.levelIndex);
            setIsTutorialActive(false);
            setActiveTutorial(null);
        }
    }, [activeTutorial, currentStepIndex, saveCompleted]);

    const prevStep = useCallback(() => {
        setCurrentStepIndex(prev => (prev > 0 ? prev - 1 : prev));
    }, []);

    const skipTutorial = useCallback(() => {
        if (activeTutorial) {
            saveCompleted(activeTutorial.levelIndex);
        }
        setIsTutorialActive(false);
        setActiveTutorial(null);
    }, [activeTutorial, saveCompleted]);

    const dispatchAction = useCallback((action: TutorialTriggerType, params?: Record<string, unknown>) => {
        if (!isTutorialActive || !activeTutorial) return;

        // Prevent multiple rapid advances (debounce)
        if (isAdvancingRef.current) return;

        const currentStep = activeTutorial.steps[currentStepIndex];
        if (currentStep.trigger === action) {
            // Check params if needed
            if (currentStep.triggerParams) {
                const match = Object.keys(currentStep.triggerParams).every(
                    key => params && params[key] === currentStep.triggerParams![key]
                );
                if (!match) return;
            }
            
            // Set advancing flag
            isAdvancingRef.current = true;
            
            // Advance automatically
            if (currentStepIndex < activeTutorial.steps.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            } else {
                saveCompleted(activeTutorial.levelIndex);
                setIsTutorialActive(false);
                setActiveTutorial(null);
            }
            
            // Reset flag after a short delay
            setTimeout(() => {
                isAdvancingRef.current = false;
            }, 500);
        }
    }, [isTutorialActive, activeTutorial, currentStepIndex, saveCompleted]);

    const showTutorialHelp = useCallback(() => {
        if (activeTutorial) {
            // If already active but maybe user wants to see it (e.g. if we had a hide feature)
            // For now, if active, do nothing or maybe reset step to 0?
            // Let's just ensure it's active
            setIsTutorialActive(true);
        } else {
            // Try to start tutorial for current level even if completed
            // We need the current level index. Since we don't track global level index here easily
            // without passing it, we might rely on the caller to pass it.
            // But wait, `activeTutorial` is null if completed.
            // Let's change this to accept levelIndex
        }
    }, [activeTutorial]);
    
    const forceStartTutorial = useCallback((levelIndex: number) => {
        const tutorial = tutorials[levelIndex];
        if (tutorial) {
            setActiveTutorial(tutorial);
            setCurrentStepIndex(0);
            setIsTutorialActive(true);
        }
    }, []);

    return (
        <TutorialContext.Provider value={{
            activeTutorial,
            currentStep: activeTutorial ? activeTutorial.steps[currentStepIndex] : null,
            currentStepIndex,
            isTutorialActive,
            completedTutorials,
            startTutorial,
            nextStep,
            prevStep,
            skipTutorial,
            resetTutorials,
            dispatchAction,
            forceStartTutorial
        }}>
            {children}
        </TutorialContext.Provider>
    );
}

export function useTutorial() {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
}
