'use client';

import React, { useMemo } from 'react';
import { parseGoal } from '@/lib/logic-engine';
import { useLanguage } from '@/contexts/LanguageContext';
import { Stage2IslandDefinition, Stage2LevelConfig, Stage2MetaProgress } from '@/types/stage2';

interface Stage2MapProps {
    config: Stage2LevelConfig;
    progress: Stage2MetaProgress;
}

const getIslandCenter = (island: Stage2IslandDefinition) => ({
    x: island.mapBounds.x + island.mapBounds.w / 2,
    y: island.mapBounds.y + island.mapBounds.h / 2,
});

const getIslandGoalPreview = (goalFormula: string) => {
    const parsed = parseGoal(goalFormula);
    const text = parsed ? parsed.toString() : goalFormula;
    return text.length > 18 ? `${text.slice(0, 18)}...` : text;
};

export default function Stage2Map({ config, progress }: Stage2MapProps) {
    const { t } = useLanguage();

    const unlockedIslandIds = useMemo(() => new Set(progress.unlockedIslandIds), [progress.unlockedIslandIds]);
    const goalIslands = useMemo(() => {
        return config.goalIslandIds
            .map((id) => config.world.getIslandById(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .map((island) => ({ ...island, unlocked: unlockedIslandIds.has(island.id) }));
    }, [config.goalIslandIds, config.world, unlockedIslandIds]);
    const focusIsland = useMemo(() => config.world.getIslandById(config.focusIslandId), [config.focusIslandId, config.world]);

    const recommendedTheorems = useMemo(() => {
        const theoremById = new Map(
            goalIslands
                .filter((island) => island.rewardTheorem)
                .map((island) => [island.rewardTheorem!.theoremId, island.rewardTheorem!])
        );

        return config.recommendedTheoremIds
            .map((id) => theoremById.get(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }, [goalIslands, config.recommendedTheoremIds]);

    const completedIslandIds = new Set(progress.completedIslandIds);
    const focusCenter = focusIsland ? getIslandCenter(focusIsland) : { x: 0, y: 0 };
    const viewWidth = 760;
    const viewHeight = 380;
    const viewBoxX = focusCenter.x - viewWidth / 2;
    const viewBoxY = focusCenter.y - viewHeight / 2;

    const renderIsland = (island: Stage2IslandDefinition) => {
        const { x, y, w, h } = island.mapBounds;
        const center = getIslandCenter(island);
        const visible = island.unlocked;
        const completed = completedIslandIds.has(island.id);
        const isFocus = island.id === config.focusIslandId;

        const mainFill = completed
            ? '#134e4a'
            : island.category === 'main'
              ? '#164e63'
              : island.category === 'support'
                ? '#334155'
                : '#3f3f46';
        const topFill = completed
            ? '#34d399'
            : island.category === 'main'
              ? '#67e8f9'
              : island.category === 'support'
                ? '#cbd5e1'
                : '#d6d3d1';
        const edgeFill = completed ? '#10b981' : isFocus ? '#22d3ee' : '#94a3b8';

        return (
            <g key={island.id} opacity={visible ? 1 : 0.22}>
                {completed && (
                    <ellipse
                        cx={center.x}
                        cy={y + h * 0.48}
                        rx={w * 0.62}
                        ry={h * 0.36}
                        fill="#34d399"
                        opacity="0.18"
                    />
                )}
                {isFocus && visible && (
                    <>
                        <ellipse
                            cx={center.x}
                            cy={y + h * 0.48}
                            rx={w * 0.68}
                            ry={h * 0.42}
                            fill="#22d3ee"
                            opacity="0.16"
                        />
                        <ellipse
                            cx={center.x}
                            cy={y + h * 0.48}
                            rx={w * 0.82}
                            ry={h * 0.52}
                            fill="none"
                            stroke="#67e8f9"
                            strokeWidth="4"
                            strokeDasharray="10 8"
                            opacity="0.6"
                        />
                    </>
                )}

                <path
                    d={`M ${x + w * 0.22} ${y + h * 0.45}
                        C ${x + w * 0.18} ${y + h * 0.72}, ${x + w * 0.36} ${y + h * 0.92}, ${center.x} ${y + h}
                        C ${x + w * 0.64} ${y + h * 0.92}, ${x + w * 0.82} ${y + h * 0.72}, ${x + w * 0.78} ${y + h * 0.45}
                        Z`}
                    fill={mainFill}
                    opacity={visible ? 0.95 : 0.7}
                />
                <ellipse
                    cx={center.x}
                    cy={y + h * 0.42}
                    rx={w * 0.42}
                    ry={h * 0.23}
                    fill={topFill}
                    stroke={edgeFill}
                    strokeWidth={isFocus ? 5 : 3}
                />
                <ellipse
                    cx={center.x}
                    cy={y + h * 0.5}
                    rx={w * 0.34}
                    ry={h * 0.1}
                    fill="#0f172a"
                    opacity="0.22"
                />

                {visible && (
                    <>
                        <text
                            x={center.x}
                            y={y + h * 0.42}
                            fill={isFocus ? '#082f49' : '#0f172a'}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="26"
                            fontWeight="700"
                            letterSpacing="1"
                        >
                            {island.name ?? ''}
                        </text>
                        <text
                            x={center.x}
                            y={y + h * 0.66}
                            fill="#cbd5e1"
                            textAnchor="middle"
                            fontSize="18"
                        >
                            {island.goalFormula ? getIslandGoalPreview(island.goalFormula) : ''}
                        </text>
                    </>
                )}
            </g>
        );
    };

    return (
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 h-72 w-[46rem] max-w-[calc(100vw-38rem)] min-w-[24rem] -translate-x-1/2">
            <div className="relative h-full overflow-hidden rounded-[1.75rem] border border-cyan-500/30 bg-slate-950/80 shadow-2xl backdrop-blur-md">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.15),rgba(2,6,23,0.65))]" />

                <div className="absolute left-4 top-4 z-10">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">{t('stage2Map')}</div>
                    <div className="mt-1 text-sm font-bold text-white">
                        {t('mainObjective')}: <span className="text-cyan-300">{focusIsland.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-slate-300">
                        {recommendedTheorems.map((theorem) => (
                            <span key={theorem.theoremId} className="rounded-full border border-slate-600 bg-slate-900/70 px-2 py-1">
                                {theorem.name}
                            </span>
                        ))}
                    </div>
                </div>

                <svg
                    viewBox={`${viewBoxX} ${viewBoxY} ${viewWidth} ${viewHeight}`}
                    className="absolute inset-0 h-full w-full"
                    aria-label={t('stage2Map')}
                >
                    <defs>
                        <filter id="stage2-map-fog">
                            <feGaussianBlur stdDeviation="14" />
                        </filter>
                    </defs>

                    <rect
                        x={viewBoxX - viewWidth}
                        y={viewBoxY - viewHeight}
                        width={viewWidth * 3}
                        height={viewHeight * 3}
                        fill="#020617"
                    />

                    <g opacity="0.45">
                        {goalIslands
                            .filter((island) => island.unlocked && island.id !== config.focusIslandId)
                            .map((island) => {
                                const from = getIslandCenter(island);
                                const to = focusCenter;
                                const controlX = (from.x + to.x) / 2;
                                const controlY = Math.min(from.y, to.y) - 60;
                                return (
                                    <path
                                        key={`link-${island.id}`}
                                        d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
                                        fill="none"
                                        stroke="#22d3ee"
                                        strokeOpacity="0.22"
                                        strokeWidth="5"
                                        strokeDasharray="10 12"
                                    />
                                );
                            })}
                    </g>

                    <g>
                        {goalIslands.map(renderIsland)}
                    </g>

                    <circle cx={focusCenter.x} cy={focusCenter.y - 80} r="6" fill="#67e8f9" opacity="0.85" />
                    <path
                        d={`M ${focusCenter.x} ${focusCenter.y - 78} L ${focusCenter.x} ${focusCenter.y - 18}`}
                        stroke="#67e8f9"
                        strokeWidth="3"
                        strokeOpacity="0.85"
                    />
                </svg>

                <div className="absolute bottom-3 right-4 z-10 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                    {t('revealedIslands')}: {progress.unlockedIslandIds.length}
                </div>
            </div>
        </div>
    );
}
