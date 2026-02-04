import React from 'react';
import { Tool } from '@/types/game';
import { useLanguage } from '@/contexts/LanguageContext';

interface VariantSelectorProps {
    activeTool: Tool | null;
    onSelectVariant: (subType: string) => void;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({ activeTool, onSelectVariant }) => {
    const { t } = useLanguage();

    if (!activeTool || activeTool.type !== 'wire') {
        return null;
    }

    const variants = [
        { id: 'formula', label: t('logicWire'), color: '#38bdf8' },
        { id: 'provable', label: t('provableWire'), color: '#facc15' }
    ];

    return (
        <div className="fixed right-8 top-1/3 -translate-y-1/2 z-40 flex flex-col items-end pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl pointer-events-auto">
                <div className="text-slate-400 text-xs font-bold mb-3 text-right uppercase tracking-wider">
                    {t('pressToSwitch').split('T').map((part, i, arr) => (
                        <React.Fragment key={i}>
                            {part}
                            {i < arr.length - 1 && <span className="bg-slate-700 px-1.5 py-0.5 rounded text-white mx-0.5">T</span>}
                        </React.Fragment>
                    ))}
                </div>
                
                <div className="flex gap-3">
                    {variants.map((variant) => {
                        const isActive = activeTool.subType === variant.id;
                        return (
                            <button
                                key={variant.id}
                                onClick={() => onSelectVariant(variant.id)}
                                className={`
                                    w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-200 border-2
                                    ${isActive 
                                        ? 'bg-slate-800 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-110' 
                                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-slate-500'
                                    }
                                `}
                                title={variant.label}
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="32" 
                                    height="32" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke={isActive ? variant.color : "currentColor"} 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                >
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                </svg>
                                
                                {isActive && (
                                    <div className="absolute -bottom-2 bg-white text-slate-900 text-[10px] font-bold px-1.5 rounded-full shadow-sm">
                                        {t('selected')}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
                
                <div className="mt-3 text-center">
                    <span className="text-sm font-medium text-white">
                        {variants.find(v => v.id === activeTool.subType)?.label}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VariantSelector;
