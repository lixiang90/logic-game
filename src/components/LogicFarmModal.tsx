'use client';

import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FARM_CROPS, getFarmCrop } from '@/data/farm';
import type { FarmCropId, FarmPlotState, LogicFarmProgress } from '@/types/stage2';
import { assetUrl } from '@/lib/art-assets';
import { formatFarmDuration, getFarmGrowth } from '@/lib/farm-visuals';
import { useArtModal } from '@/lib/use-art-modal';
import { useVisualSettings } from '@/contexts/VisualSettingsContext';
import GameIcon from '@/components/GameIcon';
import FarmCropArt, { FarmSeedArt } from '@/components/FarmCropArt';
import '@/styles/farm-art.css';

interface LogicFarmModalProps {
    language: 'en' | 'zh';
    progress: LogicFarmProgress;
    coins: number;
    insight: number;
    onPlant: (plotId: string, cropId: FarmCropId) => void;
    onHarvest: (plotId: string) => void;
    onClose: () => void;
}

interface FarmFeedback {
    id: number; plotId: string; kind: 'plant' | 'harvest'; text: string;
    insightYield: number; x: number; y: number;
    coinX: number; coinY: number; insightX: number; insightY: number;
}

export default function LogicFarmModal({ language, progress, coins, insight, onPlant, onHarvest, onClose }: LogicFarmModalProps) {
    const zh = language === 'zh';
    const { quality, reducedMotion } = useVisualSettings();
    const [selectedCropId, setSelectedCropId] = useState<FarmCropId>('axiom-wheat');
    const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [feedback, setFeedback] = useState<FarmFeedback | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const coinsRef = useRef<HTMLDivElement>(null);
    const insightRef = useRef<HTMLDivElement>(null);
    const feedbackSequence = useRef(0);
    useArtModal(modalRef, onClose);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!feedback) return;
        const timer = window.setTimeout(() => setFeedback(null), 2400);
        return () => window.clearTimeout(timer);
    }, [feedback]);

    const selectedCrop = getFarmCrop(selectedCropId)!;
    const selectedPlot = progress.plots.find(plot => plot.id === selectedPlotId);
    const inspectedCrop = getFarmCrop(selectedPlot?.cropId) ?? selectedCrop;
    const inspectedGrowth = selectedPlot?.cropId ? getFarmGrowth(selectedPlot, now, inspectedCrop.growMs) : null;
    const stageNames = zh ? ['破土新芽', '枝叶舒展', '即将成熟', '收获时节'] : ['New shoots', 'Growing leaves', 'Almost ripe', 'Harvest time'];
    const readyCount = progress.plots.filter(plot => plot.cropId && plot.readyAt !== undefined && now >= plot.readyAt).length;

    const actOnPlot = (plot: FarmPlotState, element: HTMLButtonElement) => {
        setSelectedPlotId(plot.id);
        const crop = getFarmCrop(plot.cropId);
        const ready = crop && plot.readyAt !== undefined && now >= plot.readyAt;
        if (crop && !ready) return;
        if (!crop && coins < selectedCrop.seedCost) return;
        const bounds = element.getBoundingClientRect();
        const coinBounds = coinsRef.current?.getBoundingClientRect();
        const insightBounds = insightRef.current?.getBoundingClientRect();
        if (crop) onHarvest(plot.id);
        else onPlant(plot.id, selectedCropId);
        const activeCrop = crop ?? selectedCrop;
        setFeedback({
            id: ++feedbackSequence.current, plotId: plot.id, kind: crop ? 'harvest' : 'plant',
            text: crop
                ? `${activeCrop.name[language]} · +${activeCrop.coinYield} ${zh ? '金币' : 'coins'}${activeCrop.insightYield ? ` / +${activeCrop.insightYield} ${zh ? '灵感' : 'insight'}` : ''}`
                : `${zh ? '已播种' : 'Planted'} ${activeCrop.name[language]}`,
            insightYield: crop?.insightYield ?? 0,
            x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2,
            coinX: coinBounds ? coinBounds.left + coinBounds.width / 2 : bounds.left,
            coinY: coinBounds ? coinBounds.top + coinBounds.height / 2 : bounds.top,
            insightX: insightBounds ? insightBounds.left + insightBounds.width / 2 : bounds.left,
            insightY: insightBounds ? insightBounds.top + insightBounds.height / 2 : bounds.top,
        });
    };

    return <div ref={modalRef} className="farm-modal art-economy-modal" role="dialog" aria-modal="true" aria-labelledby="farm-title" tabIndex={-1} data-motion={reducedMotion ? 'reduced' : 'full'} data-quality={quality}>
        <div className="farm-scenery" style={{ backgroundImage: `url("${assetUrl('/art/scenes/farm.webp')}")` }} aria-hidden="true" />
        <div className="farm-atmosphere" aria-hidden="true" />
        <div className="farm-shell">
            <header className="farm-header">
                <div className="farm-heading"><span className="farm-eyebrow">AURELIA · SKY GARDEN</span><h1 id="farm-title">{zh ? '逻辑农场' : 'Logic Farm'}</h1><p>{zh ? '云上的小小庭院，让每一份等待都开花。' : 'A little garden above the clouds. Give your ideas room to grow.'}</p></div>
                <div className="farm-header-actions">
                    <div ref={coinsRef} className="farm-resource farm-resource-coins" aria-label={`${zh ? '金币' : 'Coins'} ${coins}`}><GameIcon name="coin" size={23}/><span>{zh ? '金币' : 'Coins'}<b>{coins.toLocaleString()}</b></span></div>
                    <div ref={insightRef} className="farm-resource farm-resource-insight" aria-label={`${zh ? '灵感' : 'Insight'} ${insight}`}><GameIcon name="insight" size={23}/><span>{zh ? '灵感' : 'Insight'}<b>{insight.toLocaleString()}</b></span></div>
                    <button className="farm-return" type="button" onClick={onClose}><GameIcon name="arrow-left" size={17}/><span>{zh ? '返回群岛' : 'Back to islands'}</span></button>
                </div>
            </header>

            <div className="farm-layout">
                <aside className="farm-seed-shelf" aria-label={zh ? '种子架' : 'Seed shelf'}>
                    <div className="farm-section-heading"><div><span className="farm-eyebrow">THE SEED COLLECTION</span><h2>{zh ? '庭院种子架' : 'The seed shelf'}</h2></div><GameIcon name="seed" size={24}/></div>
                    <div className="farm-seed-list">
                        {FARM_CROPS.map(crop => <button key={crop.id} type="button" className={`farm-seed-choice${selectedCropId === crop.id ? ' is-selected' : ''}`} aria-pressed={selectedCropId === crop.id} onClick={() => { setSelectedCropId(crop.id); setSelectedPlotId(null); }}>
                            <FarmSeedArt cropId={crop.id}/>
                            <span className="farm-seed-info"><b>{crop.name[language]}</b><span><GameIcon name="clock" size={12}/>{formatFarmDuration(crop.growMs)}<i/><GameIcon name="coin" size={12}/>{crop.seedCost}</span></span>
                            {selectedCropId === crop.id && <span className="farm-seed-selected"><GameIcon name="check" size={14}/></span>}
                        </button>)}
                    </div>
                    <div className="farm-crop-notes">
                        <span className="farm-eyebrow">{selectedPlot?.cropId ? (zh ? '正在查看田块' : 'PLOT NOTES') : (zh ? '已选种子' : 'SELECTED SEED')}</span>
                        <h3>{inspectedCrop.name[language]}</h3>
                        <p>{inspectedCrop.description[language]}</p>
                        <dl><div><dt>{zh ? '播种成本' : 'Seed cost'}</dt><dd><GameIcon name="coin" size={14}/>{inspectedCrop.seedCost}</dd></div><div><dt>{zh ? '收获所得' : 'Harvest yield'}</dt><dd><GameIcon name="coin" size={14}/>{inspectedCrop.coinYield}{inspectedCrop.insightYield > 0 && <><span className="farm-yield-plus">+</span><GameIcon name="insight" size={14}/>{inspectedCrop.insightYield}</>}</dd></div><div><dt>{zh ? '生长时间' : 'Growing time'}</dt><dd><GameIcon name="clock" size={14}/>{formatFarmDuration(inspectedCrop.growMs)}</dd></div></dl>
                        {inspectedGrowth ? <div className="farm-note-status">{stageNames[inspectedGrowth.stage]}{!inspectedGrowth.ready && ` · ${formatFarmDuration(inspectedGrowth.remaining)}`}</div> : <div className={`farm-note-status${coins < selectedCrop.seedCost ? ' is-warning' : ''}`}>{coins < selectedCrop.seedCost ? (zh ? '金币不足，暂时无法播种。' : 'More coins are needed to plant this seed.') : (zh ? '点击一块空田，播下这颗种子。' : 'Choose an empty plot to plant this seed.')}</div>}
                    </div>
                </aside>

                <section className="farm-garden" aria-label={zh ? '六块庭院田地' : 'Six garden plots'}>
                    <div className="farm-garden-caption"><div><span className="farm-eyebrow">THE FLOATING COURTYARD</span><h2>{zh ? '晴光庭院' : 'Sunlit courtyard'}</h2></div><span className="farm-garden-status"><GameIcon name={readyCount ? 'check' : 'seed'} size={15}/>{readyCount ? (zh ? `${readyCount} 块田可收获` : `${readyCount} ready to harvest`) : (zh ? '等待新芽生长' : 'A little time to grow')}</span></div>
                    <div className="farm-terrace">
                        <div className="farm-irrigation" aria-hidden="true"/>
                        <div className="farm-plots">
                            {progress.plots.map((plot, index) => {
                                const crop = getFarmCrop(plot.cropId);
                                const growth = getFarmGrowth(plot, now, crop?.growMs ?? selectedCrop.growMs);
                                const canPlant = !crop && coins >= selectedCrop.seedCost;
                                const active = selectedPlotId === plot.id;
                                const plotName = zh ? `田块 ${index + 1}` : `Plot ${index + 1}`;
                                const status = crop ? (growth.ready ? (zh ? '点击收获' : 'Harvest crop') : `${stageNames[growth.stage]} · ${formatFarmDuration(growth.remaining)}`) : (canPlant ? (zh ? '点击播种' : 'Plant a seed') : (zh ? '金币不足' : 'Insufficient coins'));
                                return <button key={plot.id} type="button" className={`farm-plot${crop ? ' is-planted' : ' is-empty'}${growth.ready ? ' is-ready' : ''}${active ? ' is-inspected' : ''}${feedback?.plotId === plot.id ? ` feedback-${feedback.kind}` : ''}`} onClick={event => actOnPlot(plot, event.currentTarget)} aria-label={`${plotName} · ${crop?.name[language] ?? (zh ? '空田' : 'Empty plot')} · ${status}${!crop ? ` · ${selectedCrop.name[language]} ${selectedCrop.seedCost} ${zh ? '金币' : 'coins'}` : ''}`} aria-describedby={active ? 'farm-action-hint' : undefined} data-plot-id={plot.id} data-stage={crop ? growth.stage : 'empty'}>
                                    <span className="farm-plot-label">{plotName}</span>
                                    <span className="farm-plot-ground" aria-hidden="true"><span className="farm-soil-furrows"/><span className="farm-plot-corner farm-plot-corner-a"/><span className="farm-plot-corner farm-plot-corner-b"/></span>
                                    <span className="farm-plot-planting">
                                        {crop ? <FarmCropArt cropId={crop.id} stage={growth.stage}/> : <span className="farm-plot-empty-marker"><GameIcon name="plus" size={28}/></span>}
                                    </span>
                                    {growth.ready && <span className="farm-ready-seal"><GameIcon name="check" size={13}/>{zh ? '成熟' : 'Ripe'}</span>}
                                    {crop && !growth.ready && <span className="farm-growth-track" aria-hidden="true"><span style={{ width: `${growth.ratio * 100}%` }}/></span>}
                                    <span className="farm-plot-plaque"><b>{crop?.name[language] ?? (zh ? '等待播种' : 'An open plot')}</b><span>{status}</span></span>
                                    {feedback?.plotId === plot.id && <span key={feedback.id} className="farm-plot-action-feedback" aria-hidden="true"><GameIcon name={feedback.kind === 'harvest' ? 'coin' : 'seed'} size={28}/></span>}
                                </button>;
                            })}
                        </div>
                    </div>
                    <footer className="farm-garden-footer"><p id="farm-action-hint"><GameIcon name="seed" size={16}/>{zh ? '选种 → 点击空田播种 · 点击成熟作物收获' : 'Choose a seed, plant an empty plot, then harvest when ripe.'}</p><span>{zh ? '累计收获' : 'Total harvests'} <b>{progress.harvestedCount}</b></span></footer>
                </section>
            </div>
        </div>
        <div className={`farm-feedback-toast${feedback ? ' is-visible' : ''}`} role="status" aria-live="polite">{feedback && <><GameIcon name={feedback.kind === 'harvest' ? 'check' : 'seed'} size={18}/>{feedback.text}</>}</div>
        {feedback?.kind === 'harvest' && !reducedMotion && quality !== 'low' && <div className="farm-resource-flight" key={feedback.id} aria-hidden="true">
            {[0, 1, 2].map(index => <span key={index} className="farm-flying-coin" style={{ '--from-x': `${feedback.x}px`, '--from-y': `${feedback.y}px`, '--to-x': `${feedback.coinX}px`, '--to-y': `${feedback.coinY}px`, '--flight-delay': `${index * 75}ms` } as CSSProperties}><GameIcon name="coin" size={25}/></span>)}
            {feedback.insightYield > 0 && <span className="farm-flying-insight" style={{ '--from-x': `${feedback.x + 18}px`, '--from-y': `${feedback.y}px`, '--to-x': `${feedback.insightX}px`, '--to-y': `${feedback.insightY}px`, '--flight-delay': '120ms' } as CSSProperties}><GameIcon name="insight" size={25}/></span>}
        </div>}
    </div>;
}
