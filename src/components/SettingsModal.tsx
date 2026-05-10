import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SettingsModalProps {
    onClose: () => void;
    bgmVolume: number;
    onBgmVolumeChange: (volume: number) => void;
}

export default function SettingsModal({ onClose, bgmVolume, onBgmVolumeChange }: SettingsModalProps) {
    const { t, language, setLanguage } = useLanguage();

    return (
        <div className="absolute inset-0 bg-black/60 z-100 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 shadow-2xl w-96">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">{t('settings')}</h2>
                
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">{t('language')}</span>
                        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                            <button 
                                onClick={() => setLanguage('en')}
                                className={`flex-1 py-2 rounded font-bold transition-all ${
                                    language === 'en' 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                            >
                                English
                            </button>
                            <button 
                                onClick={() => setLanguage('zh')}
                                className={`flex-1 py-2 rounded font-bold transition-all ${
                                    language === 'zh' 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                            >
                                中文
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">{t('bgmVolume')}</span>
                            <span className="text-sm text-slate-300">{Math.round(bgmVolume * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={Math.round(bgmVolume * 100)}
                            onChange={(event) => onBgmVolumeChange(Number(event.target.value) / 100)}
                            className="w-full accent-blue-500"
                        />
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    className="mt-8 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
                >
                    {t('back')} 
                </button>
            </div>
        </div>
    );
}
