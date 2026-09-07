import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { SaveSystem, type LevelState } from '@/lib/saveSystem';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/data/translations';
import { assetUrl, chapterArtwork } from '@/lib/art-assets';
import SettingsModal from './SettingsModal';
import GameIcon from './GameIcon';
import CircuitThumbnail from './CircuitThumbnail';

interface StartMenuProps {
    onNewGame: () => void; onContinue: () => void; onLoadGame: (slot: number) => void;
    bgmVolume: number; onBgmVolumeChange: (volume: number) => void;
}
export default function StartMenu({ onNewGame, onContinue, onLoadGame, bgmVolume, onBgmVolumeChange }: StartMenuProps) {
    const { t, language } = useLanguage();
    const zh = language === 'zh';
    const [slots, setSlots] = useState<({ timestamp: number; levelIndex: number } | null)[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showLoad, setShowLoad] = useState(false);
    const [importMessage, setImportMessage] = useState('');
    const [previews, setPreviews] = useState<Array<LevelState | undefined>>([]);
    const archiveRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!showLoad) return;
        const root = archiveRef.current;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        root?.focus();
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); setShowLoad(false); }
            if (event.key !== 'Tab' || !root) return;
            const controls = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), input'));
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) { event.preventDefault(); first?.focus(); }
        };
        root?.addEventListener('keydown', handleKey);
        return () => { root?.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
    }, [showLoad]);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const saves = Array.from({ length: 6 }, (_, i) => SaveSystem.load(i + 1));
            setSlots(saves.map(save => save ? { timestamp: save.timestamp, levelIndex: save.levelIndex } : null));
            setPreviews(saves.map(save => save?.levelStates[save.levelIndex]));
        });
        return () => cancelAnimationFrame(frame);
    }, [showLoad]);
    const importSave = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const save = SaveSystem.normalizeSaveData(JSON.parse(await file.text()));
            if (!save) throw new Error('Invalid save');
            SaveSystem.autoSave(save); setShowLoad(false); onContinue();
        } catch { setImportMessage(t('importFailed' as TranslationKey)); }
        event.target.value = '';
    };
    const chapter = (index: number) => zh ? '第' + (index < 10 ? '一' : '二') + '大关 · ' + (index % 10 + 1) + ' / 10' : 'Stage ' + (index < 10 ? 1 : 2) + ' · ' + (index % 10 + 1) + ' / 10';
    return <div className="academy-menu">
        <Image className="academy-menu-art" src={assetUrl('art/title-academy.webp')} alt="" fill priority sizes="100vw" unoptimized />
        <div className="academy-menu-shade" />
        <div className="academy-menu-top"><span className="academy-wordmark"><GameIcon name="compass" size={22} /> LOGIC CIRCUITS</span><span>{zh ? '星图学宫 · 演绎之旅' : 'THE CELESTIAL ACADEMY'}</span></div>
        <div className="academy-menu-content">
            <div className="academy-title-sigil" aria-hidden="true"><span>∴</span></div>
            <p className="art-eyebrow">{zh ? '每一条真理，都有回响' : 'EVERY TRUTH LEAVES A TRACE'}</p>
            <h1>{t('gameTitle')}</h1>
            <p className="academy-menu-description">{zh ? <>连接思想，点亮群星。<br />在证明之间，寻回世界的秩序。</> : <>Connect ideas. Awaken the stars.<br />Find the world’s order, one proof at a time.</>}</p>
            <nav className="academy-menu-actions" aria-label={zh ? '主菜单' : 'Main menu'}>
                {slots[0] && <button className="academy-primary-menu" onClick={onContinue}><span><GameIcon name="play" />{t('continue')}</span><small>{chapter(slots[0].levelIndex)}</small><GameIcon name="arrow-right" /></button>}
                <button className={!slots[0] ? 'academy-primary-menu' : ''} onClick={onNewGame}><span><GameIcon name="sparkles" />{t('newGame')}</span><GameIcon name="arrow-right" /></button>
                <button onClick={() => setShowLoad(true)}><span><GameIcon name="folder" />{t('loadGame')}</span><GameIcon name="chevron" size={16} /></button>
                <button onClick={() => setShowSettings(true)}><span><GameIcon name="settings" />{t('settings')}</span><GameIcon name="chevron" size={16} /></button>
            </nav>
            <p className="academy-menu-note">{zh ? '演绎推理 / 电路建造 / 群岛探索' : 'DEDUCTION / CIRCUITS / EXPLORATION'}</p>
        </div>
        <div className="academy-menu-caption"><i /><span>{zh ? '远方的群岛，正等待第一束证明之光。' : 'The islands await their first light of proof.'}</span></div>
        <footer className="academy-menu-footer"><span>SET.MM · METAMATH</span><span>{zh ? '星图与田园' : 'STARS & GARDENS'} <span aria-hidden="true">✧</span> {zh ? '二十章演绎之旅' : 'TWENTY CHAPTERS'}</span></footer>
        {showLoad && <div className="art-modal-backdrop"><section ref={archiveRef} tabIndex={-1} className="art-dialog academy-save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-title">
            <header className="art-dialog-header"><div><p className="art-eyebrow">ARCHIVES</p><h2 id="save-title">{t('loadGame')}</h2></div><button className="art-icon-button" aria-label={t('back')} onClick={() => setShowLoad(false)} autoFocus><GameIcon name="close" /></button></header>
            <div className="academy-save-grid">{slots.map((slot, i) => <article className={'academy-save-slot ' + (slot ? '' : 'is-empty')} key={i}>
                {slot && (previews[i]?.nodes.length ? <CircuitThumbnail nodes={previews[i]!.nodes} wires={previews[i]!.wires} language={language} height={82} label={zh ? '存档中的电路' : 'Saved circuit'} /> : <Image src={chapterArtwork(slot.levelIndex)} alt="" width={400} height={180} unoptimized />)}
                <div className="academy-save-slot-info"><span className="art-eyebrow">{t('slot')} {String(i + 1).padStart(2, '0')}{i === 0 ? ' · ' + t('autoSave') : ''}</span>
                    {slot ? <><h3>{chapter(slot.levelIndex)}</h3><time>{new Date(slot.timestamp).toLocaleString(zh ? 'zh-CN' : 'en-US')}</time><button className="art-button" onClick={() => onLoadGame(i + 1)}>{t('load')}<GameIcon name="arrow-right" size={16} /></button></> : <p>{t('emptySlot')}</p>}
                </div>
            </article>)}</div>
            <footer className="art-dialog-footer"><label className="art-button"><GameIcon name="upload" size={16} />{t('importSave' as TranslationKey)}<input type="file" accept=".json" onChange={importSave} className="sr-only" /></label><button className="art-button" onClick={() => setShowLoad(false)}>{t('back')}</button></footer>
            {importMessage && <p role="alert" className="art-error">{importMessage}</p>}
        </section></div>}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} bgmVolume={bgmVolume} onBgmVolumeChange={onBgmVolumeChange} />}
    </div>;
}
