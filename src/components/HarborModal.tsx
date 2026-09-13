import React, { useMemo, useState } from 'react';
import type { Stage2LevelConfig, Stage2MetaProgress, TheoremChipInventoryEntry } from '@/types/stage2';
import { shippingIslands, virtualChipCost, type ShippingRoute } from '@/lib/shipping';
import { parseGoal } from '@/lib/logic-engine';
import ArtModal from './ArtModal';
import TheoremRibbon from './TheoremRibbon';
import { islandHarbors } from '@/lib/harbors';
import { islandPremises } from '@/lib/render/theorem-ribbon';

interface Props {
    config: Stage2LevelConfig; progress: Stage2MetaProgress; islandId: string; theoremId?: string; portId?: string;
    onBuildPort: (portId?: string) => void; onLocatePort: (portId: string) => void; onRemovePort: (portId: string) => void;
    onBindRoute: (key: string, binding: {sourcePortId?: string; targetPortId?: string}) => void;
    routes: ShippingRoute[]; pending: string[]; language: 'zh' | 'en';
    onClose: () => void; onChangePort: (id: string) => void; onJump: (id: string) => void; onOverview: () => void;
    onPlan: (source: string, target: string, remove?: boolean) => void;
    onBuy: (id: string) => void; onUse: (chip: TheoremChipInventoryEntry) => void;
}
export default function HarborModal({ config, progress, islandId, theoremId, portId, onBuildPort, onLocatePort, onRemovePort, onBindRoute, routes, pending, language, onClose, onChangePort, onJump, onOverview, onPlan, onBuy, onUse }: Props) {
    const zh = language === 'zh';
    const islands = useMemo(() => shippingIslands(config, progress), [config, progress]);
    const port = config.world.getIslandById(islandId)!;
    const ports = islandHarbors(port, progress);
    const [selectedPortId, setSelectedPortId] = useState(portId ?? ports[0]?.id ?? '');
    const selectedPort = ports.find(p => p.id === selectedPortId) ?? ports[0];
    const sources = islands.filter(island => island.id !== islandId);
    const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
    const [detailId, setDetailId] = useState(theoremId ?? port.rewardTheorem?.theoremId ?? '');
    const detail = islands.find(island => island.rewardTheorem?.theoremId === detailId);
    const chip = progress.collectedTheorems[detailId];
    const arrivals = routes.filter(route => route.targetIslandId === islandId);
    const departures = routes.filter(route => route.sourceIslandId === islandId);
    const formula = (value: string) => parseGoal(value)?.toString() ?? value;
    const status = (route: ShippingRoute) => ({ planned: zh ? '手动规划' : 'Planned', building: zh ? '搭建中' : 'In construction', pending: zh ? '等待源定理' : 'Awaiting source proof', proved: zh ? '证明已使用' : 'Used in proof' })[route.status];
    const available = chip && (chip.freeUsesRemaining > 0 || (!chip.virtual && progress.coins >= chip.cost));
    const bindings = (route: ShippingRoute) => {
        const key=`${route.sourceIslandId}>${route.targetIslandId}`;
        return <div className="shipping-bindings">{(['source','target'] as const).map(side => {
            const island=config.world.getIslandById(side==='source'?route.sourceIslandId:route.targetIslandId)!;
            const field=side==='source'?'sourcePortId':'targetPortId';
            return <label key={side}>{zh?(side==='source'?'出港':'入港'):(side==='source'?'From':'To')} · {island.name}<select aria-label={`${route.theoremId} ${side==='source'?'出港':'入港'}`} value={progress.routePorts?.[key]?.[field] ?? ''} onChange={e=>onBindRoute(key,{...progress.routePorts?.[key],[field]:e.target.value || undefined})}><option value="">{zh?'自动分流':'Automatic'}</option>{islandHarbors(island,progress).map(p=><option value={p.id} key={p.id}>{zh?'港':'Port'} {p.name}</option>)}</select></label>;
        })}</div>;
    };
    return <ArtModal wide title={`${port.name} · ${zh ? '星潮港' : 'Star Harbor'}`} eyebrow="THEOREM SHIPPING" closeLabel={zh ? '关闭港口' : 'Close harbor'} onClose={onClose} className="shipping-dialog">
        <div className="shipping-content">
            <button className="art-button" onClick={onOverview}>{zh ? '查看航线全景' : 'Shipping overview'}</button>
            <div className="shipping-port-switch"><label>{zh ? '查看港口' : 'Port'}<select aria-label={zh ? '查看港口' : 'Port'} value={islandId} onChange={event => onChangePort(event.target.value)}>{islands.map(island => <option key={island.id} value={island.id}>{island.name}</option>)}</select></label><button className="art-button" onClick={() => onJump(islandId)}>{zh ? '定位群岛' : 'Locate island'}</button><span>◈ {progress.coins}</span></div>
            <section className="shipping-quays"><div className="shipping-port-switch"><label>{zh?'本岛码头':'Island harbors'}<select aria-label={zh?'本岛码头':'Island harbors'} value={selectedPort?.id ?? ''} onChange={e=>setSelectedPortId(e.target.value)}>{ports.map(p=><option key={p.id} value={p.id}>{zh?'港':'Port'} {p.name} · ({p.x}, {p.y})</option>)}</select></label><button className="art-button" onClick={()=>onBuildPort()}>{zh?'新增港口':'Build harbor'}</button>{selectedPort && <><button className="art-button" onClick={()=>onLocatePort(selectedPort.id)}>{zh?'定位港口':'Locate harbor'}</button><button className="art-button" onClick={()=>onBuildPort(selectedPort.id)}>{zh?'迁移此港口':'Move harbor'}</button><button className="art-button" disabled={ports.length<=1} onClick={()=>onRemovePort(selectedPort.id)}>{zh?'拆除此港口':'Remove harbor'}</button></>}</div><p>{zh?'每座港口占据岛岸 4 × 3 格；至少保留一座。可免费增建或迁移，下方逐条分配出入港，未指定的航线自动分流。':'Each harbor occupies 4 × 3 shore cells. Keep at least one. Build or move for free; assign routes below or use automatic allocation.'}</p></section>
            <p className="shipping-explanation">{zh ? 'A → B 表示 B 调用 A。放置芯片会开启搭建航线；完成证明后，真正参与推导的航线会点亮为金色。' : 'A → B means B calls A. Placing a chip opens a working route; routes actually used in a completed proof turn gold.'}</p>
            {pending.includes(islandId) && <p className="shipping-pending" role="status">{zh ? '电路推导已接通，等待虚芯片的源定理完成证明后正式结算。' : 'The circuit matches. Rewards await the source proofs of its virtual chips.'}</p>}
            <div className="shipping-columns"><section>
                <h3>{zh ? '入港定理' : 'Arrivals'} <small>{arrivals.length}</small></h3>
                <div className="shipping-arrivals">{arrivals.length ? arrivals.map(route => {
                    const source=config.world.getIslandById(route.sourceIslandId)!;
                    return <article key={route.sourceIslandId}><button className={`shipping-chip is-${route.status}`} aria-pressed={detailId === route.theoremId} onClick={() => setDetailId(route.theoremId)}><span>{route.theoremId} → {port.name}<small>{status(route)}</small></span><TheoremRibbon premises={islandPremises(source)} conclusion={source.rewardTheorem?.formula ?? ''} language={language}/><small>{zh?'点击查看完整前提与结论':'View premises and conclusion'}</small></button>{bindings(route)}</article>;
                }) : <p>{zh ? '码头尚无来船。可先规划调用关系，也可直接在岛上放置定理芯片。' : 'No arrivals yet. Plan a call below or place a theorem chip on this island.'}</p>}</div>
                <h3>{zh ? '规划入港航线' : 'Plan an incoming route'}</h3>
                <div className="shipping-plan"><label>{zh ? '源定理 A' : 'Source theorem A'}<select aria-label={zh ? '源定理 A' : 'Source theorem A'} value={sourceId} onChange={event => setSourceId(event.target.value)}>{sources.map(island => <option key={island.id} value={island.id}>{island.name}{progress.collectedTheorems[island.rewardTheorem!.theoremId]?.virtual ? ' ◌' : ''}</option>)}</select></label><span>→ {port.name}</span><button className="art-button" disabled={!sourceId || progress.plannedRoutes.some(route => route.sourceIslandId === sourceId && route.targetIslandId === islandId)} onClick={() => onPlan(sourceId, islandId)}>{zh ? '建立航线' : 'Plan route'}</button></div>
                {progress.plannedRoutes.filter(route => route.targetIslandId === islandId).map(route => <div className="shipping-planned" key={route.sourceIslandId}><span>{config.world.getIslandById(route.sourceIslandId)?.name} → {port.name}</span><button className="art-button" onClick={() => onPlan(route.sourceIslandId, islandId, true)}>{zh ? '撤销规划' : 'Remove plan'}</button></div>)}
                <h3>{zh ? '出港目的地' : 'Departures'}</h3><div className="shipping-departures">{departures.map(route => <article key={route.targetIslandId}><button className="art-button" onClick={() => onChangePort(route.targetIslandId)}>→ {config.world.getIslandById(route.targetIslandId)?.name}</button>{bindings(route)}</article>)}{!departures.length && <small>{zh ? '尚无出港航线' : 'No departures'}</small>}</div>
            </section><section className="shipping-details">
                <h3>{zh ? '定理详情与芯片' : 'Theorem & chip'}</h3>
                <label>{zh ? '查看定理' : 'Theorem'}<select aria-label={zh ? '查看定理' : 'Theorem'} value={detailId} onChange={event => setDetailId(event.target.value)}>{islands.map(island => <option key={island.id} value={island.rewardTheorem!.theoremId}>{island.name}</option>)}</select></label>
                {detail?.rewardTheorem && <><h4>{detail.name} <span>{chip && !chip.virtual ? (zh ? '实芯片' : 'Proved') : (zh ? '待证明' : 'Unproved')}</span></h4>
                    <TheoremRibbon premises={islandPremises(detail)} conclusion={detail.rewardTheorem.formula} language={language} height={170}/>
                    <p className="shipping-explanation">{zh?'左侧前提组经金色汇聚线推出右侧结论；每个图形沿用电路中的命题表示。':'The premise group on the left leads through the gold inference arrow to the conclusion. Each formula uses the circuit’s proposition graphics.'}</p>
                    {islandPremises(detail).length ? islandPremises(detail).map((premise, index) => <p className="shipping-formula" key={index}><small>{zh ? '前提' : 'Premise'} {index+1}</small><code>{formula(premise)}</code></p>) : <p className="shipping-formula">{zh?'无前提':'No premises'}</p>}
                    <p className="shipping-formula"><small>{zh ? '结论' : 'Conclusion'}</small><code>{formula(detail.rewardTheorem.formula)}</code></p>
                    {chip && <p>{chip.virtual ? (zh ? '已购虚芯片次数' : 'Virtual uses') : (zh ? '免费放置次数' : 'Free uses')}: {chip.freeUsesRemaining}</p>}
                    {(!chip || chip.virtual) && <><p className="shipping-explanation">{zh ? '虚芯片从第二大关第六章开放。每次购买一枚，价格为普通放置费的两倍加 20 金币；源定理证实后，已放置的芯片自动变实。互相等待的循环不会自行通关。' : 'From Stage 2 chapter 6, buy one virtual use for twice the normal placement cost plus 20 coins. Placed chips become real once their source is proved. Circular dependencies cannot certify themselves.'}</p><button className="art-button shipping-buy" disabled={config.chapterLevel < 6 || progress.coins < virtualChipCost(detail.rewardTheorem.cost)} onClick={() => onBuy(detail.id)}>{zh ? '购买虚芯片' : 'Buy virtual chip'} · ◈ {virtualChipCost(detail.rewardTheorem.cost)}</button></>}
                    <button className="art-button" disabled={!available} onClick={() => chip && onUse(chip)}>{zh ? '选用此芯片' : 'Use this chip'}</button>
                    <button className="art-button" onClick={() => onJump(detail.id)}>{zh ? '前往证明源定理' : 'Visit source theorem'}</button>
                </>}
            </section></div>
        </div>
    </ArtModal>;
}
