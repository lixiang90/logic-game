import React from 'react';

interface LevelGoalProps {
    level: number;
    title: string;
    goalFormula: string;
    description: string;
}

export default function LevelGoal({ level, title, goalFormula, description }: LevelGoalProps) {
    // Format the formula for display (ASCII -> Unicode)
    const displayFormula = goalFormula
        .replace(/-\./g, '¬')
        .replace(/->/g, '→')
        .replace(/\|-/g, '⊢ ');

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-md border border-slate-500/50 rounded-2xl px-8 py-4 shadow-2xl z-40 flex flex-col items-center gap-2 select-none min-w-[300px]">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                    Level {level}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                    {title}
                </span>
            </div>
            
            <div className="text-3xl font-bold text-white font-serif italic tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {displayFormula}
            </div>
            
            <div className="text-xs text-slate-400 mt-1 max-w-[250px] text-center leading-relaxed">
                {description}
            </div>
        </div>
    );
}
