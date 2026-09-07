import React, { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVisualSettings } from '@/contexts/VisualSettingsContext';
import GameIcon from './GameIcon';
import { useArtModal } from '@/lib/use-art-modal';
interface SettingsModalProps { onClose: () => void; bgmVolume: number; onBgmVolumeChange: (volume: number) => void; }
export default function SettingsModal({ onClose, bgmVolume, onBgmVolumeChange }: SettingsModalProps) {
    const { t, language, setLanguage } = useLanguage();
    const { quality, motion, setQuality, setMotion } = useVisualSettings();
    const zh = language === 'zh';
    const modalRef = useRef<HTMLElement>(null);
    useArtModal(modalRef, onClose);
    return <div className="art-modal-backdrop"><section ref={modalRef} tabIndex={-1} className="art-dialog art-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="art-dialog-header"><div><p className="art-eyebrow">PREFERENCES</p><h2 id="settings-title">{t('settings')}</h2></div><button className="art-icon-button" aria-label={t('back')} onClick={onClose} autoFocus><GameIcon name="close" /></button></header>
        <fieldset className="art-setting-group"><legend>{t('language')}</legend><div className="art-segmented">{(['zh', 'en'] as const).map(value => <button key={value} aria-pressed={language === value} onClick={() => setLanguage(value)}>{value === 'zh' ? '中文' : 'English'}</button>)}</div></fieldset>
        <div className="art-setting-group"><label htmlFor="music-volume" className="art-setting-label"><span><GameIcon name="sound" size={18} />{t('bgmVolume')}</span><output>{Math.round(bgmVolume * 100)}%</output></label><input id="music-volume" type="range" min="0" max="100" step="1" value={Math.round(bgmVolume * 100)} onChange={event => onBgmVolumeChange(Number(event.target.value) / 100)} /></div>
        <fieldset className="art-setting-group"><legend>{zh ? '画面质量' : 'Visual quality'}</legend><div className="art-segmented"><button aria-pressed={quality === 'standard'} onClick={() => setQuality('standard')}>{zh ? '精致' : 'Standard'}</button><button aria-pressed={quality === 'low'} onClick={() => setQuality('low')}>{zh ? '轻量' : 'Low'}</button></div><p>{zh ? '轻量模式减少辉光与环境效果，适合较大的电路。' : 'Low quality reduces glow and ambient effects for larger circuits.'}</p></fieldset>
        <fieldset className="art-setting-group"><legend>{zh ? '动态效果' : 'Motion'}</legend><div className="art-segmented">{(['system', 'reduced', 'full'] as const).map((value, i) => <button key={value} aria-pressed={motion === value} onClick={() => setMotion(value)}>{(zh ? ['跟随系统', '减少动态', '完整效果'] : ['System', 'Reduced', 'Full'])[i]}</button>)}</div><p>{zh ? '减少动态时保留所有状态提示，并直接显示剧情文字。' : 'Reduced motion keeps all status indicators and displays dialogue immediately.'}</p></fieldset>
        <footer className="art-dialog-footer"><span className="art-muted">{zh ? '偏好自动保存' : 'Preferences saved automatically'}</span><button className="art-button art-button-primary" onClick={onClose}>{t('back')}<GameIcon name="arrow-right" size={16} /></button></footer>
    </section></div>;
}
