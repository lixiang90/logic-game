'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FARM_CROPS, getFarmCrop } from '@/data/farm';
import { FarmCropId, LogicFarmProgress } from '@/types/stage2';

interface LogicFarmModalProps {
    language: 'en' | 'zh';
    progress: LogicFarmProgress;
    coins: number;
    insight: number;
    onPlant: (plotId: string, cropId: FarmCropId) => void;
    onHarvest: (plotId: string) => void;
    onClose: () => void;
}

const formatDuration = (milliseconds: number) => {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes}:${rest.toString().padStart(2, '0')}` : `${rest}s`;
};

export default function LogicFarmModal({
    language,
    progress,
    coins,
    insight,
    onPlant,
    onHarvest,
    onClose,
}: LogicFarmModalProps) {
    const [selectedCropId, setSelectedCropId] = useState<FarmCropId>('axiom-wheat');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const selectedCrop = useMemo(() => getFarmCrop(selectedCropId)!, [selectedCropId]);
    const copy = language === 'zh'
        ? {
              title: '逻辑农场', subtitle: '让证明之外的时间也产生价值', coins: '金币', insight: '灵感',
              seedShelf: '种子架', cost: '种植成本', yield: '收获', ready: '可以收获', empty: '空闲田块',
              plant: '种植', growing: '生长中', close: '返回群岛', harvested: '累计收获',
          }
        : {
              title: 'Logic Farm', subtitle: 'Let time between proofs grow into value', coins: 'Coins', insight: 'Insight',
              seedShelf: 'Seed shelf', cost: 'Planting cost', yield: 'Yield', ready: 'Ready to harvest', empty: 'Empty plot',
              plant: 'Plant', growing: 'Growing', close: 'Return to islands', harvested: 'Total harvests',
          };

    return (
        <div className="fixed inset-0 z-[180] overflow-y-auto bg-[#06101f] text-white">
            <div
                className="absolute inset-0 bg-cover bg-center opacity-45"
                style={{ backgroundImage: `url("${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logic-farm-bg.svg")` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/55 to-slate-950" />
            <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-col px-5 py-6 lg:px-10">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">AURELIA AGRONOMY UNIT</div>
                        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{copy.title}</h1>
                        <p className="mt-2 text-slate-300">{copy.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-amber-400/30 bg-slate-950/75 px-4 py-3 text-amber-200">◉ {copy.coins} <b>{coins}</b></div>
                        <div className="rounded-2xl border border-violet-400/30 bg-slate-950/75 px-4 py-3 text-violet-200">✦ {copy.insight} <b>{insight}</b></div>
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 font-bold hover:bg-slate-800">{copy.close}</button>
                    </div>
                </header>

                <div className="mt-8 grid flex-1 gap-6 lg:grid-cols-[340px_1fr]">
                    <aside className="rounded-3xl border border-emerald-400/20 bg-slate-950/78 p-5 shadow-2xl backdrop-blur-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-black uppercase tracking-widest text-emerald-200">{copy.seedShelf}</h2>
                            <span className="text-xs text-slate-400">{copy.harvested}: {progress.harvestedCount}</span>
                        </div>
                        <div className="space-y-3">
                            {FARM_CROPS.map((crop) => {
                                const selected = crop.id === selectedCropId;
                                return (
                                    <button
                                        key={crop.id}
                                        type="button"
                                        onClick={() => setSelectedCropId(crop.id)}
                                        className={`w-full rounded-2xl border p-4 text-left transition ${selected ? 'border-cyan-300 bg-cyan-400/15' : 'border-slate-700 bg-slate-900/75 hover:border-slate-500'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="grid h-10 w-10 place-items-center rounded-full text-xl" style={{ backgroundColor: `${crop.color}26`, color: crop.color }}>✦</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold" style={{ color: crop.color }}>{crop.name[language]}</div>
                                                <div className="mt-1 text-xs text-slate-400">{crop.description[language]}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-between text-xs text-slate-300">
                                            <span>{copy.cost}: {crop.seedCost} ◉</span>
                                            <span>{copy.yield}: {crop.coinYield} ◉{crop.insightYield > 0 ? ` + ${crop.insightYield} ✦` : ''}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <section className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {progress.plots.map((plot, index) => {
                            const crop = getFarmCrop(plot.cropId);
                            const ready = Boolean(crop && plot.readyAt && now >= plot.readyAt);
                            const remaining = plot.readyAt ? plot.readyAt - now : 0;
                            return (
                                <div key={plot.id} className="min-h-56 rounded-[2rem] border border-emerald-300/20 bg-gradient-to-b from-emerald-950/85 to-[#120d12]/90 p-5 shadow-xl backdrop-blur-md">
                                    <div className="flex items-center justify-between text-xs uppercase tracking-widest text-emerald-300/75">
                                        <span>Plot {index + 1}</span>
                                        <span>{crop ? (ready ? copy.ready : copy.growing) : copy.empty}</span>
                                    </div>
                                    <div className="mt-5 grid min-h-24 place-items-center rounded-2xl border border-dashed border-emerald-300/20 bg-black/20">
                                        {crop ? (
                                            <div className="text-center">
                                                <div className={`text-5xl ${ready ? 'animate-pulse' : ''}`} style={{ color: crop.color }}>✦</div>
                                                <div className="mt-2 font-bold" style={{ color: crop.color }}>{crop.name[language]}</div>
                                                {!ready && <div className="mt-1 font-mono text-sm text-slate-300">{formatDuration(remaining)}</div>}
                                            </div>
                                        ) : (
                                            <div className="text-4xl text-emerald-200/30">＋</div>
                                        )}
                                    </div>
                                    {crop ? (
                                        <button type="button" disabled={!ready} onClick={() => onHarvest(plot.id)} className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 enabled:hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500">
                                            {ready ? `${copy.ready} · +${crop.coinYield} ◉` : copy.growing}
                                        </button>
                                    ) : (
                                        <button type="button" disabled={coins < selectedCrop.seedCost} onClick={() => onPlant(plot.id, selectedCropId)} className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 font-black text-slate-950 enabled:hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500">
                                            {copy.plant} {selectedCrop.name[language]} · {selectedCrop.seedCost} ◉
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </section>
                </div>
            </div>
        </div>
    );
}
