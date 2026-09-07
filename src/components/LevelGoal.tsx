import React, { useMemo } from 'react';
import { parseGoal } from '@/lib/logic-engine';
import { useLanguage } from '@/contexts/LanguageContext';
import GameIcon from './GameIcon';
interface LevelGoalProps { level: number; title: string; goalFormula: string; description: string; }
export default function LevelGoal({ level, title, goalFormula, description }: LevelGoalProps) {
    const { language } = useLanguage();
    const displayFormula = useMemo(() => parseGoal(goalFormula)?.toString() ?? goalFormula, [goalFormula]);
    return <section className="art-level-goal game-chrome" aria-label={language === 'zh' ? '当前证明目标' : 'Current proof goal'}>
        <div className="art-goal-heading"><GameIcon name="compass" size={22} /><span className="art-eyebrow">{language === 'zh' ? '演绎工坊' : 'DEDUCTION ATELIER'}</span><span className="art-chapter-number">{String(level).padStart(2, '0')} / 10</span></div>
        <h2>{title}</h2><p className="art-formula">{displayFormula}</p>
        <details><summary>{language === 'zh' ? '查看任务说明' : 'Task details'}</summary><p>{description}</p><code>{goalFormula}</code></details>
    </section>;
}
