
'use client';

import React from 'react';
import { Tool, NodeType } from '@/types/game';
import { useLanguage } from '@/contexts/LanguageContext';
import { TheoremChipInventoryEntry } from '@/types/stage2';

export type SelectMode = 'pointer' | 'box';

interface ToolbarProps {
    activeTool: Tool | null;
    onSelectTool: (tool: Tool | null) => void;
    selectMode?: SelectMode;
    onSelectModeChange?: (mode: SelectMode) => void;
    unlockedTools?: string[];
    theoremInventory?: TheoremChipInventoryEntry[];
    recommendedTheoremIds?: string[];
    coins?: number;
}

export default function Toolbar({
    activeTool,
    onSelectTool,
    selectMode = 'pointer',
    onSelectModeChange,
    unlockedTools,
    theoremInventory = [],
    recommendedTheoremIds = [],
    coins = 0
}: ToolbarProps) {
    const { t } = useLanguage();
    const [showTheoremLibrary, setShowTheoremLibrary] = React.useState(false);

    const handleSelect = (type: NodeType, subType: string, w: number, h: number) => {
        onSelectTool({ type, subType, w, h, rotation: 0 });
    };

    const normalizeTheoremFormula = (formula: string) => formula.replace(/^\s*(\|-|⊢)\s*/, '').trim();

    const extractVariables = (parts: string[]) => {
        const vars = new Set<string>();
        parts.forEach((part) => {
            const text = normalizeTheoremFormula(part);
            const matches = text.match(/[A-Z][A-Za-z0-9]*/g) ?? [];
            matches.forEach((m) => vars.add(m));
        });
        return Array.from(vars);
    };

    const theoremInventoryOrdered = React.useMemo(() => {
        const theoremById = new Map(theoremInventory.map((entry) => [entry.theoremId, entry]));
        const ordered: TheoremChipInventoryEntry[] = [];

        recommendedTheoremIds.forEach((theoremId) => {
            const entry = theoremById.get(theoremId);
            if (entry) ordered.push(entry);
        });

        theoremInventory.forEach((entry) => {
            if (!ordered.some((item) => item.theoremId === entry.theoremId)) {
                ordered.push(entry);
            }
        });

        return ordered;
    }, [recommendedTheoremIds, theoremInventory]);

    const pinnedTheorems = theoremInventoryOrdered.slice(0, 2);
    const overflowTheorems = theoremInventoryOrdered.slice(2);

    const canAffordTheorem = (theorem: TheoremChipInventoryEntry) =>
        theorem.freeUsesRemaining > 0 || coins >= theorem.cost;

    const handleTheoremSelect = (theorem: TheoremChipInventoryEntry) => {
        if (!canAffordTheorem(theorem)) return;

        const premises = theorem.premises ?? [];
        const conclusion = normalizeTheoremFormula(theorem.formula);
        const vars = extractVariables([...premises, conclusion]);
        const portRows = Math.max(1, vars.length + premises.length);
        const h = Math.max(6, portRows * 2 + 2);

        onSelectTool({
            type: 'theorem',
            subType: theorem.theoremId,
            customLabel: theorem.formula,
            theoremId: theorem.theoremId,
            sourceIslandId: theorem.sourceIslandId,
            placementCost: theorem.cost,
            theoremName: theorem.name,
            theoremVars: vars,
            theoremPremises: premises,
            theoremConclusion: conclusion,
            w: 10,
            h,
            rotation: 0,
        });
        setShowTheoremLibrary(false);
    };

    const isUnlocked = (type: string, subType?: string) => {
        if (!unlockedTools) return true;
        if (type === 'wire') return true; // Wire always unlocked
        if (type === 'mp' && unlockedTools.includes('mp')) return true;
        if (type === 'display' && subType && unlockedTools.includes(`display:${subType}`)) return true;
        if (type === 'bridge') return unlockedTools.includes('bridge');
        return unlockedTools.includes(`${type}:${subType}`);
    };

    const isActive = (subType: string) => activeTool?.subType === subType;
    const isTheoremActive = (theoremId: string) => activeTool?.theoremId === theoremId;
    const isPointerActive = activeTool === null && selectMode === 'pointer';
    const isBoxSelectActive = activeTool === null && selectMode === 'box';
    const activeClass = "ring-2 ring-white ring-offset-2 ring-offset-slate-900";
    const theoremButtonBaseClass = "h-12 min-w-[4.5rem] px-3 flex flex-col justify-center cursor-pointer transition-all duration-200 select-none relative border rounded-lg";

    const renderTheoremButton = (theorem: TheoremChipInventoryEntry) => {
        const isFree = theorem.freeUsesRemaining > 0;
        const affordable = canAffordTheorem(theorem);
        const disabled = !affordable;
        const statusLabel = isFree ? t('firstUseFree') : `${t('theoremCost')}: ${theorem.cost}`;

        return (
            <button
                key={theorem.theoremId}
                type="button"
                onClick={() => handleTheoremSelect(theorem)}
                disabled={disabled}
                className={`${theoremButtonBaseClass}
                    ${disabled
                        ? 'cursor-not-allowed border-slate-700 bg-slate-900/70 text-slate-500 opacity-60'
                        : 'border-cyan-500/60 bg-slate-800 text-cyan-100 hover:-translate-y-1 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:scale-105 active:scale-95'}
                    ${isTheoremActive(theorem.theoremId) ? activeClass : ''}`}
                title={`${theorem.name} ${theorem.formula}`}
            >
                <span className="text-sm font-bold uppercase tracking-wide">{theorem.name}</span>
                <span className="mt-1 text-[10px] text-slate-300">{statusLabel}</span>
            </button>
        );
    };

    return (
        <>
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-xl border border-slate-500/50 px-6 py-4 rounded-2xl flex items-end gap-2 shadow-[0_0_40px_-10px_rgba(0,0,0,0.8)] z-50 pointer-events-auto ring-1 ring-white/10">
            
            {/* Tools Group (Pointer & Box Select & Wire) */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-transparent select-none font-bold uppercase tracking-widest">{t('tools')}</span>
                </div>
                <div className="h-12 flex items-center gap-2">
                    {/* Pointer / Select Tool */}
                    <div 
                        id="tool-select"
                        onClick={() => { onSelectTool(null); onSelectModeChange?.('pointer'); }}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-slate-200 bg-slate-800 border border-slate-600
                                hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                ${isPointerActive ? activeClass : ''}`}
                        title="Select / Move"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
                            <path d="M13 13l6 6"></path>
                        </svg>
                    </div>

                    {/* Box Select Tool */}
                    <div 
                        id="tool-box-select"
                        onClick={() => { onSelectTool(null); onSelectModeChange?.('box'); }}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-slate-200 bg-slate-800 border border-slate-600
                                hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                ${isBoxSelectActive ? activeClass : ''}`}
                        title="Box Select (Right-click to delete selected)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3">
                            <path d="M4 4h16v16H4z"></path>
                        </svg>
                    </div>

                    <div className="w-px h-8 bg-slate-700"></div>

                    {/* Wire Tool */}
                    <div 
                        id="tool-wire"
                        onClick={() => handleSelect('wire', 'formula', 1, 1)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-slate-200 bg-slate-800 border border-slate-600
                                hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                ${activeTool?.type === 'wire' ? activeClass : ''}`}
                        title="Wire Tool (R to rotate, T to toggle type)"
                    >
                        {activeTool?.type === 'wire' && activeTool.subType === 'provable' ? (
                             // Yellow Zigzag
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                             </svg>
                        ) : (
                            // Blue Zigzag (Default or Formula)
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        )}
                    </div>

                    {/* Wire Bridge Tool */}
                    {isUnlocked('bridge') && (
                    <div 
                        id="tool-bridge"
                        onClick={() => handleSelect('bridge', 'bridge', 2, 2)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-slate-200 bg-slate-800 border border-slate-600
                                hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                ${activeTool?.type === 'bridge' ? activeClass : ''}`}
                        title="Wire Bridge - Allows wires to cross without merging (R to rotate)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 12h4"></path>
                            <path d="M14 12h4"></path>
                            <path d="M12 6v4"></path>
                            <path d="M12 14v4"></path>
                            <circle cx="12" cy="12" r="3" fill="none"></circle>
                        </svg>
                    </div>
                    )}
                </div>
            </div>

            {theoremInventoryOrdered.length > 0 && (
                <>
                    <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="h-[15px] flex items-center">
                            <span className="text-[10px] text-cyan-300 tracking-widest uppercase font-bold">{t('theoremBar')}</span>
                        </div>
                        <div className="h-12 flex items-center gap-3">
                            {pinnedTheorems.map(renderTheoremButton)}
                            {overflowTheorems.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowTheoremLibrary(true)}
                                    className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                            text-slate-200 bg-slate-800 border border-slate-600
                                            hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                            ${showTheoremLibrary ? activeClass : ''}`}
                                    title={t('theoremLibrary')}
                                >
                                    <span className="text-xl font-bold">+</span>
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* ATOMS Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('atoms')}</span>
                </div>
                <div className="h-12 flex items-center gap-3">
                    {/* Atom P */}
                    {isUnlocked('atom', 'P') && (
                    <div 
                        id="tool-atom-P"
                        onClick={() => handleSelect('atom', 'P', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#00d0ff] border border-[#00d0ff] bg-linear-to-br from-[#0a1a2a] to-[#151520] 
                                shadow-[0_0_10px_rgba(0,208,255,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,208,255,0.4)] hover:scale-110 active:scale-95 rounded-md font-bold
                                ${isActive('P') ? activeClass : ''}`}
                        title="Atom P"
                    >
                        P
                    </div>
                    )}

                    {/* Atom Q */}
                    {isUnlocked('atom', 'Q') && (
                    <div 
                        id="tool-atom-Q"
                        onClick={() => handleSelect('atom', 'Q', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#d000ff] border border-[#d000ff] bg-linear-to-br from-[#1a0a2a] to-[#201525] 
                                shadow-[0_0_10px_rgba(208,0,255,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(208,0,255,0.4)] hover:scale-110 active:scale-95 rounded-md font-bold
                                ${isActive('Q') ? activeClass : ''}`}
                        title="Atom Q"
                    >
                        Q
                    </div>
                    )}

                    {/* Atom R */}
                    {isUnlocked('atom', 'R') && (
                    <div 
                        onClick={() => handleSelect('atom', 'R', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#ffaa00] border border-[#ffaa00] bg-linear-to-br from-[#2a1a0a] to-[#252015] 
                                shadow-[0_0_10px_rgba(255,170,0,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,170,0,0.4)] hover:scale-110 active:scale-95 rounded-md font-bold
                                ${isActive('R') ? activeClass : ''}`}
                        title="Atom R"
                    >
                        R
                    </div>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* GATES Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('gates')}</span>
                </div>
                <div className="h-12 flex items-center gap-3">
                    {/* Implies */}
                    {isUnlocked('gate', 'implies') && (
                    <div 
                        id="tool-gate-implies"
                        onClick={() => handleSelect('gate', 'implies', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#ff0055] border border-[#ff0055] bg-[#1a1a1a] 
                                shadow-[0_0_8px_rgba(255,0,85,0.3)] hover:-translate-y-1 hover:shadow-[0_0_12px_rgba(255,0,85,0.5)] hover:scale-110 active:scale-95
                                rounded-[4px_24px_24px_4px] text-xl font-bold
                                ${isActive('implies') ? activeClass : ''}`}
                        title="Implies (→)"
                    >
                        →
                    </div>
                    )}

                    {/* Not */}
                    {isUnlocked('gate', 'not') && (
                    <div 
                        id="tool-gate-not"
                        onClick={() => handleSelect('gate', 'not', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#ff4400] bg-[rgba(255,68,0,0.1)] 
                                hover:-translate-y-1 hover:scale-110 active:scale-95
                                ${isActive('not') ? activeClass : ''}`}
                        style={{
                            clipPath: 'polygon(0% 0%, 100% 50%, 0% 100%)',
                            borderLeft: '2px solid #ff4400'
                        }}
                        title="Not (¬)"
                    >
                        <span className="ml-1 font-bold text-lg">¬</span>
                    </div>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* AXIOMS Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('axioms')}</span>
                </div>
                <div className="h-12 flex items-center gap-3">
                    {/* Axiom 1 */}
                    {isUnlocked('axiom', '1') && (
                    <div 
                        onClick={() => handleSelect('axiom', '1', 4, 4)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#00ffaa] border-4 border-double border-[#00ffaa] bg-[#0a1a15] 
                                shadow-[0_0_10px_rgba(0,255,170,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,255,170,0.4)] hover:scale-110 active:scale-95
                                rounded-lg font-serif italic
                                ${isActive('1') ? activeClass : ''}`}
                        title="A → (B → A)"
                    >
                        I
                    </div>
                    )}

                    {/* Axiom 2 */}
                    {isUnlocked('axiom', '2') && (
                    <div 
                        onClick={() => handleSelect('axiom', '2', 4, 6)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#00ffaa] border-4 border-double border-[#00ffaa] bg-[#0a1a15] 
                                shadow-[0_0_10px_rgba(0,255,170,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,255,170,0.4)] hover:scale-110 active:scale-95
                                rounded-lg font-serif italic
                                ${isActive('2') ? activeClass : ''}`}
                        title="(A→(B→C)) → ((A→B)→(A→C))"
                    >
                        II
                    </div>
                    )}

                    {/* Axiom 3 */}
                    {isUnlocked('axiom', '3') && (
                    <div 
                        onClick={() => handleSelect('axiom', '3', 4, 4)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#00ffaa] border-4 border-double border-[#00ffaa] bg-[#0a1a15] 
                                shadow-[0_0_10px_rgba(0,255,170,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,255,170,0.4)] hover:scale-110 active:scale-95
                                rounded-lg font-serif italic
                                ${isActive('3') ? activeClass : ''}`}
                        title="(¬A → ¬B) → (B → A)"
                    >
                        III
                    </div>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* RULES Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('rules')}</span>
                </div>
                <div className="h-12 flex items-center gap-3">
                    {/* MP Rule */}
                    {isUnlocked('mp') && (
                    <div 
                        onClick={() => handleSelect('mp', 'mp', 6, 6)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#ffff00] bg-[#1a1a00] 
                                shadow-[0_0_15px_rgba(255,255,0,0.3)] hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,0,0.5)] hover:scale-110 active:scale-95
                                font-bold text-xs
                                ${isActive('mp') ? activeClass : ''}`}
                        style={{
                            clipPath: 'polygon(0% 0%, 60% 0%, 100% 50%, 60% 100%, 0% 100%)'
                        }}
                        title="Modus Ponens"
                    >
                        MP
                    </div>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* DISPLAY Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('display')}</span>
                </div>
                <div className="h-12 flex items-center gap-3">
                    {/* Small Display */}
                    {isUnlocked('display', 'small') && (
                    <div 
                        id="tool-display-small"
                        onClick={() => handleSelect('display', 'small', 4, 4)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#6366f1] border-2 border-[#6366f1] bg-[#1a1a2e] 
                                shadow-[0_0_10px_rgba(99,102,241,0.3)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95
                                rounded-lg
                                ${isActive('small') ? activeClass : ''}`}
                        title="Small Display (4x4)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                        </svg>
                    </div>
                    )}

                    {/* Large Display */}
                    {isUnlocked('display', 'large') && (
                    <div 
                        id="tool-display-large"
                        onClick={() => handleSelect('display', 'large', 8, 8)}
                        className={`w-14 h-14 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#6366f1] border-2 border-[#6366f1] bg-[#1a1a2e] 
                                shadow-[0_0_10px_rgba(99,102,241,0.3)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95
                                rounded-lg
                                ${isActive('large') ? activeClass : ''}`}
                        title="Large Display (8x8)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                    </div>
                    )}
                </div>
            </div>
        </div>
        {showTheoremLibrary && theoremInventoryOrdered.length > 0 && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-[32rem] max-w-[90vw] rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-5 shadow-2xl">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300">{t('theoremBar')}</div>
                            <div className="text-xl font-bold text-white">{t('theoremLibrary')}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTheoremLibrary(false)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                        >
                            {t('cancel')}
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {theoremInventoryOrdered.map(renderTheoremButton)}
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
