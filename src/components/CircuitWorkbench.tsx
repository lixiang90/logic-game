'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircuitBlueprint, LevelState } from '@/lib/saveSystem';
import CircuitThumbnail from '@/components/CircuitThumbnail';
import GameIcon from '@/components/GameIcon';
import ArtModal from '@/components/ArtModal';

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
    const archiveRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = () => setBlueprints(readBlueprints());
        const frame = requestAnimationFrame(load);
        window.addEventListener('logic_game_save_loaded', load);
        return () => { cancelAnimationFrame(frame); window.removeEventListener('logic_game_save_loaded', load); };
    }, []);

    const announce = (message: string) => {
        setToast(message);
    };

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(''), 1800);
        return () => window.clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        if (!showBlueprints) return;
        const archive = archiveRef.current;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        archive?.focus();
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setShowBlueprints(false); }
            if (event.key !== 'Tab' || !archive) return;
            const controls = Array.from(archive.querySelectorAll<HTMLElement>('button:not([disabled]),input'));
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === archive)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && (document.activeElement === last || document.activeElement === archive)) { event.preventDefault(); first?.focus(); }
        };
        archive?.addEventListener('keydown', handleKey);
        return () => { archive?.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
    }, [showBlueprints]);

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
        <button key={label} type="button" onClick={() => fn()} className="min-h-9 rounded border border-[#ae986342] bg-[#1b2d40] px-3 py-2 text-left text-xs text-[#d7d9cb] transition hover:border-[#bda779] hover:bg-[#2b4050]">
            {label}
        </button>
    );

    return (
        <>
            <div className="art-workbench fixed bottom-32 left-4 z-[70] flex items-end gap-2 text-white">
                {expanded && (
                    <div className="art-workbench-panel w-72 rounded-2xl border border-slate-600/70 bg-slate-950/92 p-3 shadow-2xl backdrop-blur-xl">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <div className="text-[9px] uppercase tracking-[0.25em] text-[#c7b187]">ACADEMY WORKBENCH</div>
                                <div className="mt-1 font-medium text-[#ede1c7]">{zh ? '电路工作台' : 'Circuit Workbench'}</div>
                            </div>
                            <button type="button" onClick={() => setExpanded(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label={zh ? '收起工作台' : 'Collapse workbench'}><GameIcon name="close" size={17}/></button>
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
                            <button type="button" onClick={() => setAnnotation('')} className="min-h-9 rounded border border-[#ae986342] bg-[#1b2d40] px-3 py-2 text-left text-xs text-[#d7d9cb] hover:border-[#bda779]">{zh ? '添加注释' : 'Add note'}</button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
                            <button type="button" onClick={startBlueprintSave} className="flex min-h-10 items-center justify-center gap-1.5 rounded border border-[#d5bf8e] bg-[#d3bc8d] px-2 py-2 text-[11px] font-semibold text-[#203242] hover:bg-[#e5d1a6]"><GameIcon name="save" size={14}/>{zh ? '保存为蓝图' : 'Save blueprint'}</button>
                            <button type="button" onClick={() => setShowBlueprints(true)} className="flex min-h-10 items-center justify-center gap-1.5 rounded border border-[#bba37175] bg-[#354c5a] px-2 py-2 text-[11px] text-[#eddfbc] hover:bg-[#466372]"><GameIcon name="book" size={15}/>{zh ? `蓝图库 ${blueprints.length}` : `Blueprints ${blueprints.length}`}</button>
                        </div>
                        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">{zh ? '框选后可用方向键批量移动；Shift + 方向键每次移动 4 格。' : 'After box-selecting, use arrow keys to move as a group; Shift moves 4 cells.'}</p>
                    </div>
                )}
                {!expanded && (
                    <button type="button" onClick={() => setExpanded(true)} className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/30 bg-slate-950/90 text-xl text-cyan-200 shadow-xl hover:bg-cyan-950" title={zh ? '电路工作台' : 'Circuit Workbench'} aria-label={zh ? '电路工作台' : 'Circuit Workbench'}><GameIcon name="tool" size={23}/></button>
                )}
            </div>

            {toast && <div className="fixed left-1/2 top-24 z-[220] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-lg border border-[#b9a06c80] bg-[#172d40f5] px-5 py-2 text-xs text-[#efe4c8] shadow-xl" role="status">{toast}</div>}

            {annotation !== null && (
                <ArtModal
                    title={zh ? '为电路留下注释' : 'Annotate the circuit'}
                    eyebrow="ACADEMY WORKBENCH · NOTES"
                    closeLabel={zh ? '取消' : 'Cancel'}
                    onClose={() => setAnnotation(null)}
                    footer={<div className="art-common-actions"><button type="button" onClick={() => setAnnotation(null)} className="art-button">{zh ? '取消' : 'Cancel'}</button><button type="button" onClick={() => { const count = props.onAnnotate(annotation.trim()); setAnnotation(null); announce(zh ? `已注释 ${count} 个对象。` : `Annotated ${count} items.`); }} className="art-button art-button-primary"><GameIcon name="check" size={16}/>{zh ? '保存' : 'Save'}</button></div>}
                >
                    <p className="art-common-description">{zh ? '这条注释将添加到已选中的节点或线路。' : 'This note will be added to the selected nodes or wires.'}</p>
                    <label htmlFor="workbench-annotation" className="mt-5 block text-xs text-[#cbb995]">{zh ? '注释内容' : 'Note'}</label>
                    <textarea id="workbench-annotation" value={annotation} onChange={(event) => setAnnotation(event.target.value)} autoFocus className="mt-2 min-h-32 w-full resize-y rounded-md border border-[#b8a17066] bg-[#0f2132] p-3 text-sm leading-relaxed text-[#e5e3d4] outline-none placeholder:text-[#8296a3] focus:border-[#78cad4]" placeholder={zh ? '输入注释……' : 'Write a note…'} />
                </ArtModal>
            )}

            {draftState && (
                <ArtModal
                    title={zh ? '保存个人蓝图' : 'Save personal blueprint'}
                    eyebrow="THE ACADEMY · NEW ARCHIVE"
                    closeLabel={zh ? '取消' : 'Cancel'}
                    onClose={() => setDraftState(null)}
                    footer={<div className="art-common-actions"><button type="button" onClick={() => setDraftState(null)} className="art-button">{zh ? '取消' : 'Cancel'}</button><button type="button" onClick={saveBlueprint} className="art-button art-button-primary"><GameIcon name="save" size={16}/>{zh ? '保存' : 'Save'}</button></div>}
                >
                    <p className="art-common-description">{zh ? `${draftState.nodes.length} 个节点将被保存。` : `${draftState.nodes.length} nodes will be saved.`}</p>
                    <CircuitThumbnail nodes={draftState.nodes} wires={draftState.wires} language={language} height={135}/>
                    <label htmlFor="workbench-blueprint-name" className="mt-5 block text-xs text-[#cbb995]">{zh ? '蓝图名称' : 'Blueprint name'}</label>
                    <input id="workbench-blueprint-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} autoFocus className="mt-2 w-full rounded-md border border-[#b8a17066] bg-[#0f2132] px-3 py-3 text-sm text-[#e5e3d4] outline-none focus:border-[#78cad4]" />
                    <label htmlFor="workbench-blueprint-tags" className="mt-4 block text-xs text-[#cbb995]">{zh ? '标签，用逗号分隔' : 'Tags, comma separated'}</label>
                    <input id="workbench-blueprint-tags" value={draftTags} onChange={(event) => setDraftTags(event.target.value)} className="mt-2 w-full rounded-md border border-[#b8a17066] bg-[#0f2132] px-3 py-3 text-sm text-[#e5e3d4] outline-none placeholder:text-[#8296a3] focus:border-[#78cad4]" placeholder={zh ? '例如：公理, 推理' : 'e.g. axioms, inference'} />
                </ArtModal>
            )}

            {showBlueprints && (
                <div ref={archiveRef} tabIndex={-1} className="fixed inset-0 z-[185] overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,#274554_0%,#0e1e30_50%,#0b1425_100%)] p-4 text-white outline-none sm:p-7" role="dialog" aria-modal="true" aria-labelledby="blueprint-archive-title">
                    <div className="mx-auto w-full max-w-6xl py-4 sm:py-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-[#c7b187]"><GameIcon name="book" size={17}/>THE ACADEMY · PERSONAL ARCHIVE</div>
                                <h2 id="blueprint-archive-title" className="mt-2 text-3xl font-medium tracking-wide text-[#efe5ce] sm:text-4xl" style={{ fontFamily: 'var(--art-serif)' }}>{zh ? '个人蓝图库' : 'Personal Blueprints'}</h2>
                                <p className="mt-2 text-xs leading-relaxed text-[#a5b8bf]">{zh ? '将自己的证明电路收进学宫档案，随时取出继续构建。' : 'Preserve your proof circuits in the academy archive, ready to build upon.'}</p>
                            </div>
                            <button type="button" onClick={() => setShowBlueprints(false)} className="flex min-h-10 items-center gap-2 rounded-md border border-[#bca47380] bg-[#233b4b] px-4 py-2 text-xs text-[#e8dcc1] hover:bg-[#354e5d]"><GameIcon name="arrow-left" size={15}/>{zh ? '返回游戏' : 'Back to game'}</button>
                        </div>
                        <label className="mt-7 flex items-center gap-3 rounded-lg border border-[#b49c684d] bg-[#102233] px-4 py-3 text-[#a9b9bf]"><GameIcon name="search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#82949f]" placeholder={zh ? '搜索名称或标签……' : 'Search names or tags…'} aria-label={zh ? '搜索名称或标签' : 'Search names or tags'} /><span className="shrink-0 text-[10px] text-[#bdaa83]">{filteredBlueprints.length} / {blueprints.length}</span></label>
                        {filteredBlueprints.length === 0 ? (
                            <div className="mt-8 rounded-xl border border-dashed border-[#bba16b4d] bg-[#172c3b80] px-6 py-14 text-center text-sm leading-loose text-[#b6c3c4]"><GameIcon name="layers" size={32} className="mx-auto mb-4 text-[#c2ad7c]"/>{zh ? '还没有匹配的蓝图。框选电路后从工作台保存。' : 'No matching blueprints. Box-select a circuit and save it from the workbench.'}</div>
                        ) : (
                            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredBlueprints.map((blueprint) => (
                                    <article key={blueprint.id} className="min-w-0 rounded-lg border border-[#b8a2714d] bg-gradient-to-br from-[#243b4c] to-[#122437] p-4 shadow-lg sm:p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="break-words text-lg font-medium text-[#efe2c4]" style={{ fontFamily: 'var(--art-serif)' }}>{blueprint.name}</h3>
                                                <p className="mt-1 text-[10px] leading-relaxed text-[#95aab5]">{new Date(blueprint.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</p>
                                            </div>
                                            <div className="shrink-0 rounded border border-[#bca5723b] bg-[#bca16b14] px-2 py-1 text-[10px] text-[#d5c292]">{blueprint.nodes.length} {zh ? '节点' : 'nodes'}</div>
                                        </div>
                                        <CircuitThumbnail nodes={blueprint.nodes} wires={blueprint.wires} language={language} height={155} label={zh ? `${blueprint.name}：真实电路布局` : `${blueprint.name}: saved circuit layout`}/>
                                        <div className="mt-4 flex min-h-7 flex-wrap gap-2">{blueprint.tags.map((tag) => <span key={tag} className="max-w-full break-all rounded border border-[#97a9a43b] bg-[#173143] px-2 py-1 text-[10px] text-[#b5c7c8]">#{tag}</span>)}</div>
                                        <div className="mt-5 flex gap-2">
                                            <button type="button" onClick={() => { props.onInsertBlueprint({ nodes: blueprint.nodes, wires: blueprint.wires }); setShowBlueprints(false); }} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded border border-[#d5bd88] bg-[#d3bd92] px-4 py-2 text-xs font-semibold text-[#233141] hover:bg-[#e8d3a6]"><GameIcon name="plus" size={16}/>{zh ? '放置电路' : 'Place circuit'}</button>
                                            <button type="button" onClick={() => persistBlueprints(blueprints.filter((item) => item.id !== blueprint.id))} className="min-h-10 rounded border border-[#c18d8052] px-3 py-2 text-xs text-[#d9a99a] hover:bg-[#9a53451a]" aria-label={zh ? `删除蓝图 ${blueprint.name}` : `Delete blueprint ${blueprint.name}`}>{zh ? '删除' : 'Delete'}</button>
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
