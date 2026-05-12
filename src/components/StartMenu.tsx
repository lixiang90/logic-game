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
                                                className="mt-2 bg-blue-600 hover:bg-blue-500 py-2 px-4 rounded transition-colors text-sm w-full font-bold"
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
        <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center text-white overflow-y-auto">
            <div className="min-h-full flex flex-col items-center w-full py-12">
                <div className="my-auto flex flex-col items-center w-full">
                    <h1 className="text-6xl font-bold mb-12 text-blue-400 text-center px-4">{t('gameTitle')}</h1>
                    
                    <div className="flex flex-col gap-4 w-64">
                        <button  
                        onClick={onNewGame}
                        className="bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold text-lg transition-colors"
                    >
                        {t('newGame')}
                    </button>

                    <button 
                        onClick={onContinue}
                        disabled={!hasAutoSave}
                        className={`py-3 rounded-lg font-bold text-lg transition-colors ${
                            hasAutoSave 
                            ? 'bg-green-600 hover:bg-green-500' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        {t('continue')}
                    </button>

                    <button 
                        onClick={() => setShowLoadMenu(true)}
                        className="bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold text-lg transition-colors"
                    >
                        {t('loadGame')}
                    </button>

                    <button 
                        onClick={() => setShowSettings(true)}
                        className="bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold text-lg transition-colors"
                    >
                        {t('settings')}
                    </button>
                </div>
            </div>
        </div>
    </div>
    );
}
