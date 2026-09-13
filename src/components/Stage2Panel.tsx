import React, { useEffect, useMemo, useRef, useState } from 'react';
import TheoremRibbon from './TheoremRibbon';
import { islandPremises } from '@/lib/render/theorem-ribbon';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/data/translations';
import { Stage2LevelConfig, Stage2MetaProgress } from '@/types/stage2';
import GameIcon from './GameIcon';

interface Stage2PanelProps {
    config: Stage2LevelConfig; progress: Stage2MetaProgress; activeTheoremId?: string | null;
    selectedIslandId?: string | null; onSelectIsland?: (islandId: string) => void; onOpenTheoremLibrary?: () => void;
    onTheoremDetails?: (islandId: string) => void;
}
export default function Stage2Panel({ config, progress, activeTheoremId, selectedIslandId, onSelectIsland, onOpenTheoremLibrary, onTheoremDetails }: Stage2PanelProps) {
    const { t, language } = useLanguage();
    const zh = language === 'zh';
    const [objectivesOpen, setObjectivesOpen] = useState(false);
    const [recentOpen, setRecentOpen] = useState(false);
    const previousProgress = useRef<{ level: string; theorems: Set<string>; islands: Set<string> } | null>(null);
    const pendingDiscovery = useRef<{ names: Set<string>; islandCount: number }>({ names: new Set(), islandCount: 0 });
    const discoveryFrame = useRef<number | null>(null);
    const [discovery, setDiscovery] = useState<{ level: string; names: string[]; islandCount: number } | null>(null);
    useEffect(() => () => { if (discoveryFrame.current !== null) cancelAnimationFrame(discoveryFrame.current); }, []);
    useEffect(() => {
        const previous = previousProgress.current;
        const theorems = new Set(Object.values(progress.collectedTheorems).filter(chip => !chip.virtual).map(chip => chip.theoremId));
        const islands = new Set(progress.unlockedIslandIds);
        previousProgress.current = { level: config.levelId, theorems, islands };
        if (!previous || previous.level !== config.levelId) {
            if (discoveryFrame.current !== null) cancelAnimationFrame(discoveryFrame.current);
            discoveryFrame.current = null;
            pendingDiscovery.current = { names: new Set(), islandCount: 0 };
            return;
        }
        const names = [...theorems].filter(id => !previous.theorems.has(id)).map(id => progress.collectedTheorems[id].name);
        const islandCount = [...islands].filter(id => !previous.islands.has(id)).length;
        if (!names.length && !islandCount) return;
        names.forEach(name => pendingDiscovery.current.names.add(name));
        pendingDiscovery.current.islandCount += islandCount;
        if (discoveryFrame.current !== null) return;
        discoveryFrame.current = requestAnimationFrame(() => {
            discoveryFrame.current = null;
            const pending = pendingDiscovery.current;
            pendingDiscovery.current = { names: new Set(), islandCount: 0 };
            setDiscovery({ level: config.levelId, names: [...pending.names], islandCount: pending.islandCount });
        });
    }, [config.levelId, progress.collectedTheorems, progress.unlockedIslandIds]);
    useEffect(() => {
        if (!discovery) return;
        const timer = window.setTimeout(() => setDiscovery(null), 4200);
        return () => window.clearTimeout(timer);
    }, [discovery]);
    const unlocked = useMemo(() => new Set(progress.unlockedIslandIds.length ? progress.unlockedIslandIds : config.initialUnlockedIslandIds), [progress.unlockedIslandIds, config.initialUnlockedIslandIds]);
    const completed = new Set(progress.completedIslandIds);
    const islands = useMemo(() => config.goalIslandIds.map(id => config.world.getIslandById(id)).filter(item => item !== null), [config]);
    const focus = config.world.getIslandById(config.focusIslandId);
    const selected = config.world.getIslandById(selectedIslandId ?? config.focusIslandId) ?? focus;
    const inventory = Object.values(progress.collectedTheorems);
    const recent = inventory.slice(-6).reverse();
    const selectedVisible = selected && unlocked.has(selected.id);
    return <>
        {discovery?.level === config.levelId && <div className="art-discovery-notice" role="status"><GameIcon name="sparkles" size={21}/><span>{discovery.names.length ? (zh ? '新定理已归档：' : 'Theorem archived: ') + discovery.names.join(' · ') : (zh ? `${discovery.islandCount} 座岛屿已揭示` : `${discovery.islandCount} islands revealed`)}</span></div>}
        <header id="stage2-hud" className="art-world-hud game-chrome">
            <GameIcon name="compass" size={30} />
            <div><p className="art-eyebrow">{zh ? '第二大关 · 群岛纪行' : 'STAGE II · THE ARCHIPELAGO'}</p><strong>{zh ? '悬浮岛地图' : 'Floating Islands'}</strong></div>
            <span className="art-chapter-number">{String(config.chapterLevel).padStart(2, '0')}<small> / 10</small></span>
            <div className="art-world-resources"><span><GameIcon name="coin" size={16} />{progress.coins}</span><span><GameIcon name="insight" size={16} />{progress.insight}</span></div>
        </header>
        <aside id="stage2-island-list" className="art-objectives game-chrome">
            <div className="art-panel-title"><span className="art-eyebrow">{t('mainObjective')}</span><span>{islands.filter(island => completed.has(island.id)).length} / {islands.length}</span></div>
            <button className="art-focus-island" onClick={() => selectedVisible && onSelectIsland?.(selected.id)} disabled={!selectedVisible}>
                <GameIcon name={selected && completed.has(selected.id) ? 'check' : 'target'} size={24} />
                <span><strong>{selectedVisible ? selected.name : t('hiddenInFog')}</strong><small>{selected?.id === config.focusIslandId ? t('mainIsland') : t('supportIslands')}</small></span>
                <GameIcon name="compass" size={16} />
            </button>
            {selectedVisible && selected.goalFormula && <button className="theorem-ribbon-button" aria-label={zh?'查看岛屿定理详情':'Theorem details'} onClick={()=>onTheoremDetails?.(selected.id)}><TheoremRibbon premises={islandPremises(selected)} conclusion={selected.goalFormula} language={language}/><small>{zh?'前提组 → 结论 · 查看详情':'Premises → conclusion · Details'}</small></button>}
            <button className="art-disclosure" onClick={() => setObjectivesOpen(!objectivesOpen)} aria-expanded={objectivesOpen} aria-controls="art-island-items"><GameIcon name="map" size={16} />{zh ? '群岛目录' : 'Island index'}<GameIcon name="chevron" size={14} /></button>
            {objectivesOpen && <div className="art-island-items" id="art-island-items">{(['main', 'support', 'optional'] as const).map(category => <section key={category}>
                <h3>{category === 'main' ? t('mainIsland') : category === 'support' ? t('supportIslands') : t('optionalIslands')}</h3>
                {islands.filter(island => (island.category ?? 'optional') === category).map(island => {
                    const visible = unlocked.has(island.id);
                    return <button key={island.id} className={'art-island-item ' + (island.id === selected?.id ? 'is-selected' : '')} disabled={!visible} onClick={() => onSelectIsland?.(island.id)}>
                        <GameIcon name={completed.has(island.id) ? 'check' : visible ? 'compass' : 'lock'} size={16} />
                        <span><b>{visible ? island.name : t('hiddenInFog')}</b>{visible && island.goalFormula && <TheoremRibbon premises={islandPremises(island)} conclusion={island.goalFormula} language={language} height={100}/ >}{visible && <small>{island.descriptionKey ? t(island.descriptionKey as TranslationKey) : island.description}</small>}</span>
                    </button>;
                })}
            </section>)}</div>}
        </aside>
        <aside id="stage2-theorem-list" className="art-theorem-drawer game-chrome">
            <button className="art-disclosure" onClick={() => setRecentOpen(!recentOpen)} aria-expanded={recentOpen} aria-controls="art-recent-theorems"><GameIcon name="book" size={20} /><span>{t('recentlyUnlocked')}</span><b>{inventory.length}</b><GameIcon name="chevron" size={14} /></button>
            {recentOpen && <div className="art-recent-theorems" id="art-recent-theorems">{recent.length ? recent.map(theorem => <article key={theorem.theoremId} className={theorem.theoremId === activeTheoremId ? 'is-selected' : ''}><b>{theorem.name}{theorem.virtual ? (zh ? ' · 虚芯片' : ' · Virtual') : ''}</b><button className="theorem-ribbon-button" onClick={()=>onTheoremDetails?.(theorem.sourceIslandId)}><TheoremRibbon premises={theorem.premises ?? []} conclusion={theorem.formula} language={language} height={115}/></button><small>{t('freeUsesRemaining')}: {theorem.freeUsesRemaining} · {t('theoremCost')}: {theorem.cost}</small></article>) : <p>{t('noTheoremsCollected')}</p>}</div>}
            <button className="art-library-link" onClick={onOpenTheoremLibrary} disabled={!inventory.length}>{t('theoremLibrary')}<GameIcon name="arrow-right" size={16} /></button>
        </aside>
    </>;
}
