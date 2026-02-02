
import React, { useEffect, useState } from 'react';
import { SaveSystem } from '@/lib/saveSystem';

interface StartMenuProps {
    onNewGame: () => void;
    onContinue: () => void;
    onLoadGame: (slot: number) => void;
}

export default function StartMenu({ onNewGame, onContinue, onLoadGame }: StartMenuProps) {
    const [hasAutoSave, setHasAutoSave] = useState(false);
    const [slots, setSlots] = useState<({timestamp: number, levelIndex: number} | null)[]>([]);

    useEffect(() => {
        setHasAutoSave(SaveSystem.hasAutoSave());
        const loadedSlots = [];
        for (let i = 1; i <= 4; i++) {
            const info = SaveSystem.getSlotInfo(i);
            loadedSlots.push(info);
        }
        setSlots(loadedSlots);
    }, []);

    return (
        <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center text-white">
            <h1 className="text-6xl font-bold mb-12 text-blue-400">Logic Game</h1>
            
            <div className="flex flex-col gap-4 w-64">
                <button 
                    onClick={onNewGame}
                    className="bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold text-lg transition-colors"
                >
                    New Game
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
                    Continue
                </button>
            </div>

            <div className="mt-12 w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-6 text-center text-slate-300">Load Game</h2>
                <div className="grid grid-cols-2 gap-4">
                    {slots.map((slot, index) => (
                        <div 
                            key={index}
                            className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-2"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-slate-400">Slot {index + 1}</span>
                                {slot && (
                                    <span className="text-xs text-slate-500">
                                        {new Date(slot.timestamp).toLocaleString()}
                                    </span>
                                )}
                            </div>
                            
                            {slot ? (
                                <>
                                    <p className="text-slate-300">Level {slot.levelIndex + 1}</p>
                                    <button 
                                        onClick={() => onLoadGame(index + 1)}
                                        className="mt-2 bg-slate-700 hover:bg-slate-600 py-2 px-4 rounded transition-colors text-sm"
                                    >
                                        Load
                                    </button>
                                </>
                            ) : (
                                <p className="text-slate-600 italic py-4 text-center">Empty Slot</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
