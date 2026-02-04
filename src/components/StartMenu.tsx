import React, { useEffect, useState } from 'react';
import { SaveSystem } from '@/lib/saveSystem';
import { useLanguage } from '@/contexts/LanguageContext';
import SettingsModal from './SettingsModal';

interface StartMenuProps {
    onNewGame: () => void;
    onContinue: () => void;
    onLoadGame: (slot: number) => void;
}

export default function StartMenu({ onNewGame, onContinue, onLoadGame }: StartMenuProps) {
    const { t, language } = useLanguage();
    const [hasAutoSave, setHasAutoSave] = useState(false);
    const [slots, setSlots] = useState<({timestamp: number, levelIndex: number} | null)[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        // Ensure this runs only on client side to avoid hydration mismatch
        setHasAutoSave(SaveSystem.hasAutoSave());
        const loadedSlots = [];
        for (let i = 1; i <= 4; i++) {
            const info = SaveSystem.getSlotInfo(i);
            loadedSlots.push(info);
        }
        setSlots(loadedSlots);
    }, []);

    if (showSettings) {
        return <SettingsModal onClose={() => setShowSettings(false)} />;
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
                        onClick={() => setShowSettings(true)}
                        className="bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold text-lg transition-colors"
                    >
                        {t('settings')}
                    </button>
                </div>

                <div className="mt-12 w-full max-w-2xl px-4">
                    <h2 className="text-2xl font-bold mb-6 text-center text-slate-300">{t('loadGame')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {slots.map((slot, index) => (
                            <div 
                                key={index}
                                className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-2"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-400">{t('slot')} {index + 1}</span>
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
                                            className="mt-2 bg-slate-700 hover:bg-slate-600 py-2 px-4 rounded transition-colors text-sm"
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
                </div>
            </div>
        </div>
        </div>
    );
}
