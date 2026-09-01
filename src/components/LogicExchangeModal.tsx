'use client';

import React from 'react';
import type { TheoremChipInventoryEntry } from '@/types/stage2';
import { getSimplifiedTheoremPackCost } from '@/lib/theorem-chips';

interface LogicExchangeModalProps {
    language: 'en' | 'zh';
    coins: number;
    insight: number;
    quickMpUnlocked: boolean;
    quickMpUses: number;
    onBuyQuickMp: (uses: number, coinCost: number) => void;
    simplifiableTheorems: TheoremChipInventoryEntry[];
    onBuySimplifiedTheorem: (theoremId: string, uses: number, coinCost: number) => void;
    onClose: () => void;
}

const PACKS = [
    { uses: 5, cost: 60 },
    { uses: 15, cost: 150 },
    { uses: 40, cost: 360 },
];

const THEOREM_PACKS = [
    { uses: 5, multiplier: 1.2 },
    { uses: 15, multiplier: 1.0 },
    { uses: 40, multiplier: 0.9 },
];

export default function LogicExchangeModal({
    language,
    coins,
    insight,
    quickMpUnlocked,
    quickMpUses,
    onBuyQuickMp,
    simplifiableTheorems,
    onBuySimplifiedTheorem,
    onClose,
}: LogicExchangeModalProps) {
    const zh = language === 'zh';
    return (
        <div className="fixed inset-0 z-[180] grid place-items-center overflow-y-auto bg-slate-950/95 p-5 text-white backdrop-blur-xl">
            <div className="w-full max-w-4xl rounded-[2rem] border border-violet-400/25 bg-gradient-to-br from-slate-900 to-violet-950/40 p-6 shadow-2xl sm:p-9">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.35em] text-violet-300">PROOF EXCHANGE</div>
                        <h2 className="mt-2 text-4xl font-black">{zh ? '证明交易所' : 'Proof Exchange'}</h2>
                        <p className="mt-2 max-w-xl text-slate-300">{zh ? '将农场产出转化为高级推理工具。购买的是使用次数，不会改变形式规则。' : 'Turn farm output into advanced inference tools. Packages grant uses without changing the formal rules.'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-600 px-4 py-2 font-bold hover:bg-white/10">{zh ? '关闭' : 'Close'}</button>
                </div>
                <div className="mt-6 flex gap-3 text-sm">
                    <div className="rounded-full bg-amber-400/15 px-4 py-2 text-amber-200">◉ {zh ? '金币' : 'Coins'} <b>{coins}</b></div>
                    <div className="rounded-full bg-violet-400/15 px-4 py-2 text-violet-200">✦ {zh ? '灵感' : 'Insight'} <b>{insight}</b></div>
                </div>
                <section className="mt-8 rounded-3xl border border-yellow-300/20 bg-black/25 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-black uppercase tracking-widest text-yellow-300">MP-LITE</div>
                            <h3 className="mt-1 text-2xl font-black">{zh ? '简化版 MP' : 'Simplified MP'}</h3>
                            <p className="mt-2 max-w-2xl text-sm text-slate-300">{zh ? '只接入 ⊢φ 与 ⊢(φ→ψ) 两条黄线，设备自动完成公式匹配并输出 ⊢ψ。' : 'Connect only the two yellow premises ⊢φ and ⊢(φ→ψ); the device matches formulas and emits ⊢ψ automatically.'}</p>
                        </div>
                        <div className="rounded-2xl border border-yellow-300/20 bg-yellow-400/10 px-5 py-3 text-yellow-200">{zh ? '剩余次数' : 'Uses left'} <b className="ml-2 text-2xl">{quickMpUses}</b></div>
                    </div>
                    {!quickMpUnlocked ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-600 p-5 text-center text-slate-400">{zh ? '完成第二大关第 7 章后解锁。' : 'Unlock after completing Stage 2, Chapter 7.'}</div>
                    ) : (
                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                            {PACKS.map((pack) => (
                                <button key={pack.uses} type="button" disabled={coins < pack.cost} onClick={() => onBuyQuickMp(pack.uses, pack.cost)} className="rounded-2xl border border-yellow-300/20 bg-yellow-400/10 p-5 text-left transition enabled:hover:-translate-y-1 enabled:hover:border-yellow-200 disabled:cursor-not-allowed disabled:opacity-40">
                                    <div className="text-3xl font-black text-yellow-200">+{pack.uses}</div>
                                    <div className="mt-1 text-sm text-slate-400">{zh ? '次简化 MP' : 'Simplified MP uses'}</div>
                                    <div className="mt-4 font-bold text-amber-200">{pack.cost} ◉</div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="mt-6 rounded-3xl border border-amber-300/20 bg-black/25 p-6">
                    <div>
                        <div className="text-sm font-black uppercase tracking-widest text-amber-300">THEOREM-LITE</div>
                        <h3 className="mt-1 text-2xl font-black">{zh ? '定理芯片简化版' : 'Simplified theorem chips'}</h3>
                        <p className="mt-2 max-w-3xl text-sm text-slate-300">
                            {zh
                                ? '仅列出能够由有序黄口前提唯一推断全部变量的定理。简化版移除蓝口，仍会严格验证每条黄口前提。'
                                : 'Only theorems whose ordered yellow premises uniquely determine every variable are listed. Simplified versions remove blue ports while still validating every premise.'}
                        </p>
                    </div>

                    {!quickMpUnlocked ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-600 p-5 text-center text-slate-400">
                            {zh ? '完成第二大关第 7 章后解锁简化芯片交易。' : 'Unlock simplified chip trading after completing Stage 2, Chapter 7.'}
                        </div>
                    ) : simplifiableTheorems.length === 0 ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-600 p-5 text-center text-slate-400">
                            {zh ? '尚未收集到可无歧义简化的混合输入定理。' : 'No collected mixed-input theorem can be simplified unambiguously yet.'}
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            {simplifiableTheorems.map((theorem) => (
                                <article key={theorem.theoremId} className="rounded-2xl border border-amber-300/15 bg-amber-400/5 p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="font-black text-amber-100">{theorem.name}+</div>
                                            <div className="mt-1 break-words text-xs text-slate-400">{theorem.formula}</div>
                                        </div>
                                        <div className="shrink-0 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                                            {zh ? '剩余' : 'Left'} <b className="ml-1 text-lg">{theorem.simplifiedUsesRemaining ?? 0}</b>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        {THEOREM_PACKS.map((pack) => {
                                            const cost = getSimplifiedTheoremPackCost(theorem.cost, pack.uses, pack.multiplier);
                                            return (
                                                <button
                                                    key={pack.uses}
                                                    type="button"
                                                    disabled={coins < cost}
                                                    onClick={() => onBuySimplifiedTheorem(theorem.theoremId, pack.uses, cost)}
                                                    className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <div className="font-black text-amber-100">+{pack.uses}</div>
                                                    <div className="mt-1 text-xs text-amber-200">{cost} ◉</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
