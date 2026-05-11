import React, { useMemo } from 'react';
import { parseGoal } from '@/lib/logic-engine';
import { useLanguage } from '@/contexts/LanguageContext';
import { Stage2IslandCategory, Stage2LevelConfig, Stage2MetaProgress } from '@/types/stage2';

interface Stage2PanelProps {
    config: Stage2LevelConfig;
    progress: Stage2MetaProgress;
    activeTheoremId?: string | null;
    selectedIslandId?: string | null;
    onSelectIsland?: (islandId: string) => void;
}

const categoryOrder: Stage2IslandCategory[] = ['main', 'support', 'optional'];

export default function Stage2Panel({
    config,
    progress,
    activeTheoremId,
    selectedIslandId,
    onSelectIsland
}: Stage2PanelProps) {
    const { t } = useLanguage();
    const unlockedIslandIds = useMemo(() => new Set(progress.unlockedIslandIds), [progress.unlockedIslandIds]);
    const completedIslandIds = useMemo(() => new Set(progress.completedIslandIds), [progress.completedIslandIds]);
    const goalIslands = useMemo(() => {
        return config.goalIslandIds
            .map((id) => config.world.getIslandById(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .map((island) => ({ ...island, unlocked: unlockedIslandIds.has(island.id) }));
    }, [config.goalIslandIds, config.world, unlockedIslandIds]);
    const groupedIslands = useMemo(() => {
        return categoryOrder.map((category) => ({
            category,
            islands: goalIslands.filter((island) => (island.category ?? 'optional') === category),
        }));
    }, [goalIslands]);

    const theoremCount = Object.keys(progress.collectedTheorems).length;
    const focusIslandName = config.world.getIslandById(config.focusIslandId)?.name ?? '';
    const unlockedGoalCount = goalIslands.filter((island) => island.unlocked).length;

    return (
        <>
            <div className="absolute top-4 left-4 z-40 w-72 rounded-2xl border border-cyan-500/30 bg-slate-900/85 p-4 text-white shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300">{t('stage')} 2</div>
                        <div className="text-lg font-bold">{t('stage2Map')}</div>
                    </div>
                    <div className="rounded-full bg-amber-400/10 px-3 py-1 text-sm font-bold text-amber-300">
                        {t('coins')}: {progress.coins}
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/90 p-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('mainIsland')}</div>
                    <div className="mt-1 text-base font-bold text-cyan-200">{focusIslandName}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-300">{config.introText}</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400">{t('revealedIslands')}</div>
                        <div className="mt-1 text-xl font-bold text-white">{unlockedGoalCount}</div>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400">{t('theoremChips')}</div>
                        <div className="mt-1 text-xl font-bold text-white">{theoremCount}</div>
                    </div>
                </div>
            </div>

            <div className="absolute right-4 top-[19rem] z-40 flex max-h-[calc(100vh-21rem)] w-80 flex-col rounded-2xl border border-slate-600/70 bg-slate-900/85 p-4 text-white shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">{t('revealedIslands')}</div>
                        <div className="text-lg font-bold">{t('mainObjective')}</div>
                    </div>
                    <div className="text-xs text-slate-400">{t('chapter')} {config.chapterLevel}</div>
                </div>

                <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
                    {groupedIslands.map(({ category, islands }) => (
                        <div key={category} className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {category === 'main'
                                    ? t('mainIsland')
                                    : category === 'support'
                                      ? t('supportIslands')
                                      : t('optionalIslands')}
                            </div>
                            <div className="flex flex-col gap-2">
                                {islands.map((island) => {
                                    const completed = completedIslandIds.has(island.id);
                                    const unlocked = unlockedIslandIds.has(island.id);
                                    const parsedGoal = island.goalFormula ? parseGoal(island.goalFormula) : null;
                                    return (
                                        <div
                                            key={island.id}
                                            onClick={() => unlocked && onSelectIsland?.(island.id)}
                                            className={`rounded-lg border px-3 py-2 ${
                                                completed
                                                    ? 'border-emerald-400/40 bg-emerald-500/10'
                                                    : island.id === selectedIslandId
                                                      ? 'border-cyan-400/40 bg-cyan-500/10'
                                                      : 'border-slate-700 bg-slate-900/70'
                                            } ${unlocked ? 'cursor-pointer transition-colors hover:border-cyan-400/60 hover:bg-cyan-500/8' : ''}`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="font-bold text-slate-100">{unlocked ? island.name : ''}</div>
                                                <div className="text-[10px] uppercase tracking-widest text-slate-400">
                                                    {completed ? t('completedIsland') : unlocked ? t('revealed') : t('hiddenInFog')}
                                                </div>
                                            </div>
                                            {unlocked ? (
                                                <>
                                                    {island.goalFormula && (
                                                        <div className="mt-1 text-sm text-slate-300">
                                                            {parsedGoal ? parsedGoal.toString() : island.goalFormula}
                                                        </div>
                                                    )}
                                                    {island.description && (
                                                        <div className="mt-1 text-xs leading-relaxed text-slate-400">{island.description}</div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="mt-1 text-xs leading-relaxed text-slate-500">
                                                    {t('hiddenInFog')}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-28 left-4 z-40 w-80 rounded-2xl border border-slate-600/70 bg-slate-900/85 p-4 text-white shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">{t('theoremChips')}</div>
                        <div className="text-lg font-bold">{t('collectedTheorems')}</div>
                    </div>
                    <div className="text-xs text-slate-400">{theoremCount}</div>
                </div>

                {theoremCount === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-400">
                        {t('noTheoremsCollected')}
                    </div>
                ) : (
                    <div className="mt-3 flex flex-col gap-2">
                        {Object.values(progress.collectedTheorems).map((theorem) => (
                            <div
                                key={theorem.theoremId}
                                className={`rounded-xl border bg-slate-800/70 p-3 ${
                                    theorem.theoremId === activeTheoremId
                                        ? 'border-cyan-400/70 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                                        : 'border-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-bold text-cyan-200">{theorem.name}</div>
                                    <div className="text-xs text-amber-300">
                                        {t('theoremCost')}: {theorem.cost}
                                    </div>
                                </div>
                                <div className="mt-1 text-sm text-slate-300">{theorem.formula}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                    {t('freeUsesRemaining')}: {theorem.freeUsesRemaining}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    {theorem.freeUsesRemaining > 0 ? t('firstUseFree') : `${t('coins')}: -${theorem.cost}`}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
