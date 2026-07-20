import React, { useEffect, useState } from 'react';
import { SaveSystem } from '@/lib/saveSystem';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/data/translations';
import SettingsModal from './SettingsModal';

interface StartMenuProps {
    onNewGame: () => void;
    onContinue: () => void;
    onLoadGame: (slot: number) => void;
    bgmVolume: number;
    onBgmVolumeChange: (volume: number) => void;
}

export default function StartMenu({
    onNewGame,
    onContinue,
    onLoadGame,
    bgmVolume,
    onBgmVolumeChange,
}: StartMenuProps) {
    const { t, language } = useLanguage();
    const [hasAutoSave, setHasAutoSave] = useState(false);
    const [slots, setSlots] = useState<({timestamp: number, levelIndex: number} | null)[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showLoadMenu, setShowLoadMenu] = useState(false);
    const [loadMenuTab, setLoadMenuTab] = useState<'load' | 'data'>('load');

    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            setHasAutoSave(SaveSystem.hasAutoSave());
            const loadedSlots: ({ timestamp: number; levelIndex: number } | null)[] = [];
            for (let i = 1; i <= 6; i++) {
                const info = SaveSystem.getSlotInfo(i);
                loadedSlots.push(info);
            }
            setSlots(loadedSlots);
        });
        return () => cancelAnimationFrame(raf);
    }, [showLoadMenu]);

    const handleImportSave = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const parsed = JSON.parse(json);
                const normalized = SaveSystem.normalizeSaveData(parsed);
                if (!normalized) throw new Error("Invalid save data");
                
                // Set to auto-save to be used as current session
                SaveSystem.autoSave(normalized);
                
                alert(t('importSuccess' as TranslationKey));
                setShowLoadMenu(false);
                onContinue(); // Trigger the continue flow using the newly imported auto-save
            } catch (err) {
                alert(t('importFailed' as TranslationKey));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    if (showSettings) {
        return (
            <SettingsModal
                onClose={() => setShowSettings(false)}
                bgmVolume={bgmVolume}
                onBgmVolumeChange={onBgmVolumeChange}
            />
        );
    }

    if (showLoadMenu) {
        return (
            <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center text-white p-4">
                <div className="w-full max-w-2xl bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl">
                    <div className="mb-8 flex rounded-lg bg-slate-900 p-1">
                        <button
                            onClick={() => setLoadMenuTab('load')}
                            className={`flex-1 rounded-md py-3 text-sm font-bold transition-colors ${
                                loadMenuTab === 'load' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {t('loadGame')}
                        </button>
                        <button
                            onClick={() => setLoadMenuTab('data')}
                            className={`flex-1 rounded-md py-3 text-sm font-bold transition-colors ${
                                loadMenuTab === 'data' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {t('importExport' as TranslationKey)}
                        </button>
                    </div>
                    
                    {loadMenuTab === 'load' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 overflow-y-auto max-h-[50vh] pr-2">
                            {slots.map((slot, index) => (
                                <div 
                                    key={index}
                                    className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col gap-2 hover:border-slate-500 transition-colors"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-400">
                                            {t('slot')} {index + 1}
                                            {index === 0 && <span className="text-sm text-yellow-500 ml-2">({t('autoSave')})</span>}
                                        </span>
                                        {slot && (
                                            <span className="text-xs text-slate-500">
                                                {new Date(slot.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {slot ? (
                                        <>
                                            <p className="text-slate-300">{t('level')} {slot.levelIndex + 1}</p>
                                            <button 
                                                onClick={() => onLoadGame(index + 1)}
                                                className="game-action mt-2 bg-cyan-500/15 hover:bg-cyan-400/25 py-2 px-4 text-sm w-full font-bold text-cyan-100"
                                            >
                                                {t('load')}
                                            </button>
                                        </>
                                    ) : (
                                        <p className="text-slate-600 italic py-4 text-center">{t('emptySlot')}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 mb-8">
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
                                <h3 className="text-xl text-white font-bold mb-2">{t('importSave' as TranslationKey)}</h3>
                                <p className="text-sm text-slate-400 mb-6">{t('importSaveDesc' as TranslationKey)}</p>
                                <label className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold text-lg transition-colors cursor-pointer flex items-center justify-center">
                                    {t('importSave' as TranslationKey)}
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        onChange={handleImportSave}
                                    />
                                </label>
                            </div>
                            <div className="text-center text-slate-500 text-sm">
                                {language === 'zh' ? '（注：由于在主菜单无法获取当前游戏进度，导出存档请进入游戏后在右上角的存档菜单中操作）' : '(Note: Exporting saves is only available in-game via the top-right save menu)'}
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={() => setShowLoadMenu(false)}
                        className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-lg transition-colors"
                    >
                        {t('back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="menu-shell absolute inset-0 z-50 flex flex-col items-center text-white overflow-y-auto">
            <div className="menu-content min-h-full flex flex-col items-center justify-center w-full py-12 px-4">
                <div className="flex flex-col items-center w-full">
                    <div className="menu-mark" aria-hidden="true">∴</div>
                    <p className="menu-subtitle mb-3">{language === 'zh' ? '演绎推理 · 建造 · 证明' : 'DEDUCTION · BUILD · PROVE'}</p>
                    <h1 className="menu-title text-5xl sm:text-6xl font-bold mb-3 text-cyan-200 text-center">{t('gameTitle')}</h1>
                    <p className="mb-10 text-center text-sm text-slate-400">{language === 'zh' ? '把每一步推理，连接成清晰的证明。' : 'Connect every inference into a clear proof.'}</p>
                    
                    <div className="menu-panel game-chrome flex flex-col gap-3">
                        <button  
                        onClick={onNewGame}
                        className="game-action bg-cyan-500/15 hover:bg-cyan-400/25 py-3.5 text-cyan-100 font-bold text-lg"
                    >
                        {t('newGame')}
                    </button>

                    <button 
                        onClick={onContinue}
                        disabled={!hasAutoSave}
                        className={`game-action py-3.5 font-bold text-lg ${
                            hasAutoSave 
                            ? 'bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200'
                            : 'bg-slate-800/70 text-slate-600 cursor-not-allowed'
                        }`}
                    >
                        {t('continue')}
                    </button>

                    <button 
                        onClick={() => setShowLoadMenu(true)}
                        className="game-action bg-white/5 hover:bg-white/10 py-3.5 text-slate-200 font-bold text-lg"
                    >
                        {t('loadGame')}
                    </button>

                    <button 
                        onClick={() => setShowSettings(true)}
                        className="game-action bg-white/5 hover:bg-white/10 py-3.5 text-slate-200 font-bold text-lg"
                    >
                        {t('settings')}
                    </button>
                    <div className="menu-footer mt-4 text-center">{language === 'zh' ? '逻辑游戏 · 版本 2.0' : 'LOGIC GAME · VERSION 2.0'}</div>
                </div>
            </div>
        </div>
    </div>
    );
}
