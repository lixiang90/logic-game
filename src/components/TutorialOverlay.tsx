'use client';
import React, { useEffect, useState } from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GameIcon from './GameIcon';
type Placement = { id: string; rect: { top: number; left: number; width: number; height: number } | null; x: number; y: number };
export default function TutorialOverlay() {
    const { currentStep, isTutorialActive, nextStep, skipTutorial, currentStepIndex, activeTutorial } = useTutorial();
    const { t, language } = useLanguage();
    const [placement, setPlacement] = useState<Placement | null>(null);
    const targetId = currentStep?.highlightElementId ?? '';
    useEffect(() => {
        if (!isTutorialActive) return;
        const update = () => {
            const target = targetId ? document.getElementById(targetId) : null;
            const box = target?.getBoundingClientRect();
            const w = Math.min(270, window.innerWidth - 24);
            const h = 310;
            let x = 20, y = 240;
            if (box) {
                if (box.right + w + 24 < window.innerWidth) { x = box.right + 15; y = box.top; }
                else if (box.left - w - 15 > 12) { x = box.left - w - 15; y = box.top; }
                else { x = (window.innerWidth - w) / 2; y = box.top > h + 30 ? box.top - h - 15 : box.bottom + 15; }
            }
            x = Math.max(12, Math.min(x, window.innerWidth - w - 12));
            y = Math.max(70, Math.min(y, window.innerHeight - h - 115));
            const next = { id: targetId, x, y, rect: box ? { top: box.top, left: box.left, width: box.width, height: box.height } : null };
            setPlacement(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
        };
        const frame = requestAnimationFrame(update);
        const timer = window.setInterval(update, 300);
        window.addEventListener('resize', update);
        return () => { cancelAnimationFrame(frame); clearInterval(timer); window.removeEventListener('resize', update); };
    }, [isTutorialActive, targetId]);
    if (!isTutorialActive || !currentStep) return null;
    const current = placement?.id === targetId ? placement : null;
    return <>
        {current?.rect && <div className="art-tutorial-highlight" style={{ top: current.rect.top - 5, left: current.rect.left - 5, width: current.rect.width + 10, height: current.rect.height + 10 }} />}
        <section className="art-tutorial" aria-label={language === 'zh' ? '操作引导' : 'Tutorial'} style={{ left: current?.x ?? 20, top: current?.y ?? 240 }}>
            <div className="art-goal-heading" style={{ marginBottom: 12 }}><GameIcon name="sparkles" size={17} /><span className="art-eyebrow">{language === 'zh' ? '学宫手记' : 'ACADEMY NOTES'}</span><span className="art-chapter-number">{currentStepIndex + 1} / {activeTutorial?.steps.length}</span></div>
            <div className="art-tutorial-content">{t(currentStep.textKey)}</div>
            <div className="art-tutorial-footer"><button onClick={skipTutorial}>{t('tut-hide')}</button>{currentStep.trigger === 'CUSTOM' && <button onClick={nextStep}>{t('tut-step-next')} →</button>}</div>
        </section>
    </>;
}
