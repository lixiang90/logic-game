'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import type { TheoremChipInventoryEntry } from '@/types/stage2';
import { getSimplifiedTheoremPackCost } from '@/lib/theorem-chips';
import { assetUrl } from '@/lib/art-assets';
import { useArtModal } from '@/lib/use-art-modal';
import { useVisualSettings } from '@/contexts/VisualSettingsContext';
import GameIcon from '@/components/GameIcon';
import '@/styles/farm-art.css';

interface LogicExchangeModalProps {
    language: 'en' | 'zh'; coins: number; insight: number;
    quickMpUnlocked: boolean; quickMpUses: number;
    onBuyQuickMp: (uses: number, coinCost: number) => void;
    simplifiableTheorems: TheoremChipInventoryEntry[];
    onBuySimplifiedTheorem: (theoremId: string, uses: number, coinCost: number) => void;
    onClose: () => void;
}

// These packs and multipliers are the existing game economy, unchanged by the art layer.
const PACKS = [{ uses: 5, cost: 60 }, { uses: 15, cost: 150 }, { uses: 40, cost: 360 }];
const THEOREM_PACKS = [{ uses: 5, multiplier: 1.2 }, { uses: 15, multiplier: 1.0 }, { uses: 40, multiplier: 0.9 }];

function FoundryDeviceArt({ locked }: { locked: boolean }) {
    const id = useId().replace(/:/g, '');
    return <svg viewBox="0 0 380 290" className="foundry-device-art" aria-hidden="true" focusable="false">
        <defs><linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ddd0a7"/><stop offset=".23" stopColor="#85704f"/><stop offset=".6" stopColor="#b69b65"/><stop offset="1" stopColor="#4b4440"/></linearGradient><radialGradient id={`${id}-core`}><stop stopColor={locked ? '#9ca1a3' : '#ffedb4'}/><stop offset=".5" stopColor={locked ? '#535a5a' : '#d9aa4d'}/><stop offset="1" stopColor="#463f33"/></radialGradient></defs>
        <ellipse cx="190" cy="252" rx="128" ry="19" fill="#000" opacity=".3"/>
        <g stroke="#b19a64" fill="none" opacity=".35"><ellipse cx="190" cy="225" rx="158" ry="38"/><ellipse cx="190" cy="225" rx="135" ry="29"/><path d="M27 226 350 226 M190 184 190 267"/></g>
        <path d="M77 220 188 171 303 220 191 265Z" fill="#514b40" stroke="#a39477"/><path d="M77 211 188 163 303 211 191 253Z" fill={`url(#${id}-metal)`} stroke="#dac69d"/><path d="M98 209 187 172 280 210 191 242Z" fill="#242e34" stroke="#d0ba87"/>
        <path d="M128 85 188 57 253 87 253 194 190 222 128 193Z" fill="#1b2831" stroke={`url(#${id}-metal)`} strokeWidth="10"/>
        <path d="M142 94 188 74 238 96 238 183 190 205 142 182Z" fill="#34434a" stroke="#bc9e64" strokeWidth="1.5"/>
        <path d="M129 87 191 114 252 88 M190 114 190 220" fill="none" stroke="#ebd7a0" opacity=".8"/>
        <path d="M150 74 150 61 190 42 229 61 229 75 190 94Z" fill={`url(#${id}-metal)`} stroke="#dbcea3"/>
        <path d="M163 57 190 22 216 57 190 74Z" fill={`url(#${id}-core)`} stroke="#f2dfa4"/>
        <path d="M190 22 190 74 M163 57 216 57" stroke="#f8e9b9" strokeWidth="1"/>
        <g fill={`url(#${id}-core)`} stroke="#e0c280" strokeWidth="2"><circle cx="137" cy="124" r="8"/><circle cx="137" cy="162" r="8"/><circle cx="244" cy="144" r="8"/></g>
        <g fill="none" stroke={locked ? '#777e7b' : '#ebca77'} strokeWidth="3"><path d="M38 108 77 108 100 124 128 124 M40 176 87 176 102 162 128 162 M252 144 293 144 312 131 344 131"/><path d="M39 115 74 115 99 132 M44 184 88 184" opacity=".25" strokeWidth="1"/></g>
        <g fill="#1c2b36" stroke="#c6ad72"><circle cx="36" cy="108" r="7"/><circle cx="38" cy="176" r="7"/><circle cx="346" cy="131" r="7"/></g>
        <path d="M162 129 187 140 213 129 213 173 188 185 162 173Z" fill="#14232c" stroke="#9c855b"/>
        <text x="188" y="162" textAnchor="middle" fill="#eedba3" fontFamily="Georgia, serif" fontSize="22">MP</text>
        <g fill="#dbbc79"><circle cx="149" cy="100" r="2"/><circle cx="229" cy="101" r="2"/><circle cx="151" cy="178" r="2"/><circle cx="228" cy="180" r="2"/></g>
        <ellipse className="foundry-core-ring" cx="190" cy="58" rx="48" ry="13" fill="none" stroke={locked ? '#707572' : '#e6c786'} strokeDasharray="65 8 12 8" strokeWidth="1.7"/>
    </svg>;
}

export default function LogicExchangeModal({ language, coins, insight, quickMpUnlocked, quickMpUses, onBuyQuickMp, simplifiableTheorems, onBuySimplifiedTheorem, onClose }: LogicExchangeModalProps) {
    const zh = language === 'zh';
    const { quality, reducedMotion } = useVisualSettings();
    const modalRef = useRef<HTMLDivElement>(null);
    const [receipt, setReceipt] = useState('');
    useArtModal(modalRef, onClose);
    useEffect(() => {
        if (!receipt) return;
        const timeout = window.setTimeout(() => setReceipt(''), 2600);
        return () => window.clearTimeout(timeout);
    }, [receipt]);
    const recordPurchase = (name: string, uses: number, cost: number) => setReceipt(`${name} · +${uses} ${zh ? '次' : 'uses'} · −${cost} ${zh ? '金币' : 'coins'}`);

    return <div ref={modalRef} className="foundry-modal art-economy-modal" role="dialog" aria-modal="true" aria-labelledby="foundry-title" tabIndex={-1} data-motion={reducedMotion ? 'reduced' : 'full'} data-quality={quality}>
        <div className="foundry-scenery" style={{ backgroundImage: `url("${assetUrl('/art/scenes/foundry.webp')}")` }} aria-hidden="true"/>
        <div className="foundry-atmosphere" aria-hidden="true"/>
        <div className="foundry-shell">
            <header className="farm-header foundry-header"><div className="farm-heading"><span className="farm-eyebrow">THE ACADEMY · PROOF FOUNDRY</span><h1 id="foundry-title">{zh ? '证明交易所' : 'Proof Exchange'}</h1><p>{zh ? '以田园的收获，铸造下一段证明。' : 'Forge the next proof from the fruits of your garden.'}</p></div><div className="farm-header-actions"><div className="farm-resource farm-resource-coins"><GameIcon name="coin" size={23}/><span>{zh ? '金币' : 'Coins'}<b>{coins.toLocaleString()}</b></span></div><div className="farm-resource farm-resource-insight"><GameIcon name="insight" size={23}/><span>{zh ? '灵感' : 'Insight'}<b>{insight.toLocaleString()}</b></span></div><button type="button" className="farm-return" onClick={onClose}><GameIcon name="arrow-left" size={17}/>{zh ? '返回群岛' : 'Back to islands'}</button></div></header>

            <section className="foundry-mp-workbench" aria-labelledby="foundry-mp-title">
                <div className={`foundry-device-display${!quickMpUnlocked ? ' is-locked' : ''}`}><span className="foundry-device-serial">ACADEMY INSTRUMENT / 07</span><FoundryDeviceArt locked={!quickMpUnlocked}/><div className="foundry-device-premises"><span>⊢φ</span><span>⊢(φ→ψ)</span><span className="foundry-device-result">⊢ψ</span></div><p>{zh ? '双前提 · 自动匹配' : 'Two premises · automatic matching'}</p></div>
                <div className="foundry-mp-offers"><div className="foundry-product-heading"><div><span className="farm-eyebrow">MODUS PONENS · LITE</span><h2 id="foundry-mp-title">{zh ? '简化版 MP' : 'Simplified MP'}</h2></div><div className="foundry-use-counter"><span>{zh ? '剩余次数' : 'Uses left'}</span><b>{quickMpUses}</b></div></div><p className="foundry-product-description">{zh ? '接入 ⊢φ 与 ⊢(φ→ψ) 两条黄线，设备自动匹配公式，输出 ⊢ψ。' : 'Connect the yellow premises ⊢φ and ⊢(φ→ψ). The device matches their formulas and emits ⊢ψ.'}</p>
                    {!quickMpUnlocked ? <div className="foundry-lock"><GameIcon name="lock" size={22}/><div><b>{zh ? '工坊尚未开放' : 'The workshop is sealed'}</b><p>{zh ? '完成第二大关第 7 章后解锁。' : 'Unlock after completing Stage 2, Chapter 7.'}</p></div></div> : <div className="foundry-pack-grid">{PACKS.map((pack, index) => <button key={pack.uses} className="foundry-pack" type="button" disabled={coins < pack.cost} onClick={() => { onBuyQuickMp(pack.uses, pack.cost); recordPurchase(zh ? '简化 MP' : 'Simplified MP', pack.uses, pack.cost); }}><span className="foundry-pack-tier">{(zh ? ['学徒补给', '研究储备', '工坊储备'] : ['APPRENTICE', 'RESEARCHER', 'WORKSHOP'])[index]}</span><b className="foundry-pack-uses">+{pack.uses}<small>{zh ? '次' : 'uses'}</small></b><span className="foundry-pack-price"><GameIcon name="coin" size={18}/>{pack.cost}</span><span className="foundry-pack-action">{coins < pack.cost ? (zh ? '金币不足' : 'More coins needed') : (zh ? '购买次数' : 'Purchase uses')}<GameIcon name={coins < pack.cost ? 'lock' : 'plus'} size={13}/></span></button>)}</div>}
                </div>
            </section>

            <section className="foundry-theorem-workbench" aria-labelledby="foundry-theorem-title"><div className="foundry-theorem-heading"><div><span className="farm-eyebrow">THE THEOREM COLLECTION</span><h2 id="foundry-theorem-title">{zh ? '定理芯片简化版' : 'Simplified theorem chips'}</h2></div><span className="foundry-catalog-count">{simplifiableTheorems.length} {zh ? '种可用芯片' : 'available designs'}</span></div><p className="foundry-product-description">{zh ? '仅列出黄口前提能够唯一确定全部变量的已收集定理。简化芯片移除蓝口，仍严格验证每条前提。' : 'Collected theorems whose yellow premises uniquely determine all variables. Simplified chips remove blue ports and still validate every premise.'}</p>
                {!quickMpUnlocked ? <div className="foundry-lock"><GameIcon name="lock" size={21}/><div><b>{zh ? '芯片铸造尚未解锁' : 'Chip forging is locked'}</b><p>{zh ? '完成第二大关第 7 章后开放交易。' : 'Trading opens after completing Stage 2, Chapter 7.'}</p></div></div> : simplifiableTheorems.length === 0 ? <div className="foundry-lock"><GameIcon name="insight" size={22}/><div><b>{zh ? '等待新的定理图纸' : 'New theorem designs await'}</b><p>{zh ? '尚未收集到可无歧义简化的混合输入定理。' : 'No collected mixed-input theorem can be simplified unambiguously yet.'}</p></div></div> : <div className="foundry-chip-grid">{simplifiableTheorems.map(theorem => <article key={theorem.theoremId} className="foundry-chip"><div className="foundry-chip-heading"><div className="foundry-chip-miniature" aria-hidden="true"><span>⊢</span><i/><i/><i/></div><div className="foundry-chip-name"><h3>{theorem.name}+</h3><span>{theorem.theoremId}</span></div><div className="foundry-chip-remaining"><span>{zh ? '剩余' : 'Left'}</span><b>{theorem.simplifiedUsesRemaining ?? 0}</b></div></div><p className="foundry-chip-formula">{theorem.formula}</p><div className="foundry-chip-packs">{THEOREM_PACKS.map(pack => { const cost = getSimplifiedTheoremPackCost(theorem.cost, pack.uses, pack.multiplier); return <button key={pack.uses} type="button" disabled={coins < cost} onClick={() => { onBuySimplifiedTheorem(theorem.theoremId, pack.uses, cost); recordPurchase(`${theorem.name}+`, pack.uses, cost); }} aria-label={`${theorem.name}+ · ${zh ? '购买' : 'Buy'} ${pack.uses} ${zh ? '次' : 'uses'} · ${cost} ${zh ? '金币' : 'coins'}${coins < cost ? (zh ? ' · 金币不足' : ' · Insufficient coins') : ''}`}><b>+{pack.uses}<small>{zh ? '次' : 'uses'}</small></b><span><GameIcon name="coin" size={14}/>{cost}</span><em>{coins < cost ? (zh ? '金币不足' : 'Need coins') : (zh ? '购买' : 'Purchase')}</em></button>; })}</div></article>)}</div>}
            </section>
            <footer className="foundry-footer"><GameIcon name="check" size={15}/>{zh ? '每次购买增加使用次数；形式证明规则保持严格。' : 'Each purchase grants uses; formal proof rules remain strict.'}</footer>
        </div>
        <div className={`farm-feedback-toast foundry-receipt${receipt ? ' is-visible' : ''}`} role="status" aria-live="polite">{receipt && <><GameIcon name="check" size={18}/>{receipt}</>}</div>
    </div>;
}
