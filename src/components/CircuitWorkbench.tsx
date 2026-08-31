'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CircuitBlueprint, LevelState } from '@/lib/saveSystem';

interface CircuitWorkbenchProps {
    language: 'en' | 'zh';
    onUndo: () => boolean;
    onRedo: () => boolean;
    onCopy: () => number;
    onPaste: () => number;
    onArrange: () => number;
    onAlign: (axis: 'left' | 'top' | 'center-x' | 'center-y') => number;
    onDistribute: (axis: 'horizontal' | 'vertical') => number;
    onAnnotate: (note: string) => number;
    onTrace: () => number;
    onToggleFocus: () => boolean;
    getSelectionState: () => LevelState;
    onInsertBlueprint: (state: LevelState) => number;
}

const STORAGE_KEY = 'logic_game_blueprints_v1';

const readBlueprints = (): CircuitBlueprint[] => {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
        return Array.isArray(parsed) ? parsed as CircuitBlueprint[] : [];
    } catch {
        return [];
    }
};

export default function CircuitWorkbench(props: CircuitWorkbenchProps) {
    const { language } = props;
    const zh = language === 'zh';
    const [expanded, setExpanded] = useState(false);
    const [showBlueprints, setShowBlueprints] = useState(false);
    const [blueprints, setBlueprints] = useState<CircuitBlueprint[]>([]);
    const [search, setSearch] = useState('');
    const [draftState, setDraftState] = useState<LevelState | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftTags, setDraftTags] = useState('');
    const [annotation, setAnnotation] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    useEffect(() => {
        const load = () => setBlueprints(readBlueprints());
        load();
        window.addEventListener('logic_game_save_loaded', load);
        return () => window.removeEventListener('logic_game_save_loaded', load);
    }, []);

    const announce = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(''), 1800);
    };

    const persistBlueprints = (next: CircuitBlueprint[]) => {
        setBlueprints(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event('logic_game_blueprints_changed'));
    };

    const startBlueprintSave = () => {
        const selection = props.getSelectionState();
        if (selection.nodes.length === 0) {
            announce(zh ? '请先框选要保存的电路。' : 'Select a circuit first.');
            return;
        }
        setDraftState(selection);
        setDraftName(zh ? `蓝图 ${blueprints.length + 1}` : `Blueprint ${blueprints.length + 1}`);
        setDraftTags('');
    };

    const saveBlueprint = () => {
        if (!draftState || !draftName.trim()) return;
        const blueprint: CircuitBlueprint = {
            id: crypto.randomUUID(),
            name: draftName.trim(),
            createdAt: Date.now(),
            nodes: draftState.nodes,
            wires: draftState.wires,
            tags: draftTags.split(',').map((tag) => tag.trim()).filter(Boolean),
        };
        persistBlueprints([blueprint, ...blueprints]);
        setDraftState(null);
        announce(zh ? '蓝图已保存。' : 'Blueprint saved.');
    };

    const filteredBlueprints = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return blueprints;
        return blueprints.filter((blueprint) => `${blueprint.name} ${blueprint.tags.join(' ')}`.toLowerCase().includes(query));
    }, [blueprints, search]);

    const action = (label: string, fn: () => number | boolean) => (
        <button key={label} type="button" onClick={() => fn()} className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:border-cyan-400/50 hover:bg-slate-800">
            {label}
        </button>
    );

    return (
        <>
            <div className="fixed bottom-32 left-4 z-[70] flex items-end gap-2 text-white">
                {expanded && (
                    <div className="w-72 rounded-2xl border border-slate-600/70 bg-slate-950/92 p-3 shadow-2xl backdrop-blur-xl">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">WORKBENCH</div>
                                <div className="font-black">{zh ? '电路工作台' : 'Circuit Workbench'}</div>
                            </div>
                            <button type="button" onClick={() => setExpanded(false)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white">×</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {action(zh ? '↶ 撤销' : '↶ Undo', props.onUndo)}
                            {action(zh ? '↷ 重做' : '↷ Redo', props.onRedo)}
                            {action(zh ? '复制' : 'Copy', props.onCopy)}
                            {action(zh ? '粘贴' : 'Paste', props.onPaste)}
                            {action(zh ? '自动整理' : 'Auto arrange', props.onArrange)}
                            {action(zh ? '左对齐' : 'Align left', () => props.onAlign('left'))}
                            {action(zh ? '顶部对齐' : 'Align top', () => props.onAlign('top'))}
                            {action(zh ? '水平等距' : 'Distribute H', () => props.onDistribute('horizontal'))}
                            {action(zh ? '垂直等距' : 'Distribute V', () => props.onDistribute('vertical'))}
                            {action(zh ? '追踪目标依赖' : 'Trace goal', props.onTrace)}
                            {action(zh ? '切换聚焦' : 'Toggle focus', props.onToggleFocus)}
                            <button type="button" onClick={() => setAnnotation('')} className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-left text-xs font-bold text-slate-200 hover:border-cyan-400/50">{zh ? '添加注释' : 'Add note'}</button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
                            <button type="button" onClick={startBlueprintSave} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300">{zh ? '保存为蓝图' : 'Save blueprint'}</button>
                            <button type="button" onClick={() => setShowBlueprints(true)} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-black text-white hover:bg-violet-400">{zh ? `蓝图库 ${blueprints.length}` : `Blueprints ${blueprints.length}`}</button>
                        </div>
                        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">{zh ? '框选后可用方向键批量移动；Shift + 方向键每次移动 4 格。' : 'After box-selecting, use arrow keys to move as a group; Shift moves 4 cells.'}</p>
                    </div>
                )}
                {!expanded && (
                    <button type="button" onClick={() => setExpanded(true)} className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/30 bg-slate-950/90 text-xl text-cyan-200 shadow-xl hover:bg-cyan-950" title={zh ? '电路工作台' : 'Circuit Workbench'}>⌘</button>
                )}
            </div>

            {toast && <div className="fixed left-1/2 top-24 z-[220] -translate-x-1/2 rounded-full border border-cyan-300/30 bg-slate-950/95 px-5 py-2 text-sm font-bold text-cyan-100 shadow-xl">{toast}</div>}

            {annotation !== null && (
                <div className="fixed inset-0 z-[190] grid place-items-center bg-slate-950/80 p-4 text-white backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-900 p-6 shadow-2xl">
                        <h3 className="text-xl font-black">{zh ? '给选中节点/线路添加注释' : 'Annotate selected nodes / wires'}</h3>
                        <textarea value={annotation} onChange={(event) => setAnnotation(event.target.value)} autoFocus className="mt-4 min-h-28 w-full rounded-xl border border-slate-600 bg-slate-950 p-3 outline-none focus:border-cyan-400" placeholder={zh ? '输入注释……' : 'Write a note…'} />
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setAnnotation(null)} className="rounded-lg px-4 py-2 text-slate-300 hover:bg-white/10">{zh ? '取消' : 'Cancel'}</button>
                            <button type="button" onClick={() => { const count = props.onAnnotate(annotation.trim()); setAnnotation(null); announce(zh ? `已注释 ${count} 个对象。` : `Annotated ${count} items.`); }} className="rounded-lg bg-cyan-500 px-4 py-2 font-black text-slate-950">{zh ? '保存' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {draftState && (
                <div className="fixed inset-0 z-[190] grid place-items-center bg-slate-950/80 p-4 text-white backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-cyan-400/25 bg-slate-900 p-6 shadow-2xl">
                        <h3 className="text-xl font-black">{zh ? '保存个人蓝图' : 'Save personal blueprint'}</h3>
                        <p className="mt-1 text-sm text-slate-400">{zh ? `${draftState.nodes.length} 个节点将被保存。` : `${draftState.nodes.length} nodes will be saved.`}</p>
                        <input value={draftName} onChange={(event) => setDraftName(event.target.value)} autoFocus className="mt-4 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" />
                        <input value={draftTags} onChange={(event) => setDraftTags(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" placeholder={zh ? '标签，用逗号分隔' : 'Tags, comma separated'} />
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setDraftState(null)} className="rounded-lg px-4 py-2 text-slate-300 hover:bg-white/10">{zh ? '取消' : 'Cancel'}</button>
                            <button type="button" onClick={saveBlueprint} className="rounded-lg bg-cyan-500 px-4 py-2 font-black text-slate-950">{zh ? '保存' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showBlueprints && (
                <div className="fixed inset-0 z-[185] overflow-y-auto bg-slate-950/96 p-5 text-white backdrop-blur-xl">
                    <div className="mx-auto w-full max-w-6xl py-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-[0.35em] text-violet-300">PERSONAL LIBRARY</div>
                                <h2 className="mt-2 text-4xl font-black">{zh ? '个人蓝图库' : 'Personal Blueprints'}</h2>
                            </div>
                            <button type="button" onClick={() => setShowBlueprints(false)} className="rounded-xl border border-slate-600 px-5 py-2 font-bold hover:bg-white/10">{zh ? '返回游戏' : 'Back to game'}</button>
                        </div>
                        <input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-7 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 outline-none focus:border-violet-400" placeholder={zh ? '搜索名称或标签……' : 'Search names or tags…'} />
                        {filteredBlueprints.length === 0 ? (
                            <div className="mt-8 rounded-3xl border border-dashed border-slate-700 p-16 text-center text-slate-500">{zh ? '还没有匹配的蓝图。框选电路后从工作台保存。' : 'No matching blueprints. Box-select a circuit and save it from the workbench.'}</div>
                        ) : (
                            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredBlueprints.map((blueprint) => (
                                    <article key={blueprint.id} className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-slate-900 to-violet-950/25 p-5 shadow-xl">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-xl font-black text-violet-100">{blueprint.name}</h3>
                                                <p className="mt-1 text-xs text-slate-500">{new Date(blueprint.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</p>
                                            </div>
                                            <div className="rounded-full bg-violet-400/15 px-3 py-1 text-xs text-violet-200">{blueprint.nodes.length} nodes</div>
                                        </div>
                                        <div className="mt-4 flex min-h-7 flex-wrap gap-2">{blueprint.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300">#{tag}</span>)}</div>
                                        <div className="mt-5 flex gap-2">
                                            <button type="button" onClick={() => { props.onInsertBlueprint({ nodes: blueprint.nodes, wires: blueprint.wires }); setShowBlueprints(false); }} className="flex-1 rounded-xl bg-violet-500 px-4 py-2 font-black hover:bg-violet-400">{zh ? '放置' : 'Place'}</button>
                                            <button type="button" onClick={() => persistBlueprints(blueprints.filter((item) => item.id !== blueprint.id))} className="rounded-xl border border-red-400/25 px-4 py-2 text-red-300 hover:bg-red-500/10">{zh ? '删除' : 'Delete'}</button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
