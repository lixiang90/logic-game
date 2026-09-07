'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useArtModal } from '@/lib/use-art-modal';
import { SaveSystem, type LevelState } from '@/lib/saveSystem';
import { chapterArtwork } from '@/lib/art-assets';
import { STAGE2_START_LEVEL_INDEX } from '@/data/stage2';
import CircuitThumbnail from '@/components/CircuitThumbnail';
import GameIcon from '@/components/GameIcon';
import '@/styles/common-art-modal.css';

interface ArtModalProps {
    title: string;
    eyebrow?: string;
    closeLabel: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    wide?: boolean;
    className?: string;
}

/** Shared archive / confirmation shell with keyboard containment and restored focus. */
export default function ArtModal({ title, eyebrow, closeLabel, onClose, children, footer, wide = false, className = '' }: ArtModalProps) {
    const modalRef = useRef<HTMLElement>(null);
    const titleId = useId();
    useArtModal(modalRef, onClose);
    return <div className="art-modal-backdrop"><section ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`art-dialog art-common-dialog${wide ? ' art-common-dialog-wide' : ''} ${className}`}>
        <header className="art-dialog-header"><div>{eyebrow && <p className="art-eyebrow">{eyebrow}</p>}<h2 id={titleId}>{title}</h2></div><button type="button" className="art-icon-button" onClick={onClose} aria-label={closeLabel}><GameIcon name="close" size={19}/></button></header>
        {children}
        {footer && <footer className="art-dialog-footer">{footer}</footer>}
    </section></div>;
}

/** Reads an existing save only when its slot/timestamp changes; never writes or normalizes it back. */
export function SavedSlotArtwork({ slot, timestamp, levelIndex, language }: { slot: number; timestamp: number; levelIndex: number; language: 'zh' | 'en' }) {
    const [state, setState] = useState<LevelState | null>(null);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const saved = SaveSystem.load(slot);
            if (!saved) { setState(null); return; }
            if (saved.levelIndex < STAGE2_START_LEVEL_INDEX) { setState(saved.levelStates[saved.levelIndex] ?? null); return; }
            const nodes = new Map<string, LevelState['nodes'][number]>();
            const wires = new Map<string, LevelState['wires'][number]>();
            for (let index = STAGE2_START_LEVEL_INDEX; index <= saved.levelIndex; index++) {
                saved.levelStates[index]?.nodes.forEach(node => nodes.set(node.id, node));
                saved.levelStates[index]?.wires.forEach(wire => wires.set(wire.id, wire));
            }
            setState({ nodes: [...nodes.values()], wires: [...wires.values()] });
        });
        return () => cancelAnimationFrame(frame);
    }, [slot, timestamp]);
    return <div className="art-save-preview">{state?.nodes.length ? <CircuitThumbnail nodes={state.nodes} wires={state.wires} language={language} height={92} label={language === 'zh' ? '存档中的真实电路布局' : 'Saved circuit layout'}/> : <Image src={chapterArtwork(levelIndex)} alt="" width={480} height={184} unoptimized/>}</div>;
}
