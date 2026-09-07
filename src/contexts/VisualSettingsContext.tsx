'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Quality = 'standard' | 'low';
type Motion = 'system' | 'reduced' | 'full';
interface VisualSettings {
    quality: Quality;
    motion: Motion;
    reducedMotion: boolean;
    setQuality: (quality: Quality) => void;
    setMotion: (motion: Motion) => void;
}
const STORAGE_KEY = 'logic-game-visual-settings-v1';
const VisualSettingsContext = createContext<VisualSettings | null>(null);

export function VisualSettingsProvider({ children }: { children: React.ReactNode }) {
    const [quality, updateQuality] = useState<Quality>('standard');
    const [motion, updateMotion] = useState<Motion>('system');
    const [systemReduced, setSystemReduced] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onPreference = () => setSystemReduced(media.matches);
        const frame = requestAnimationFrame(() => {
            onPreference();
            try {
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
                if (saved.quality === 'standard' || saved.quality === 'low') updateQuality(saved.quality);
                if (['system', 'reduced', 'full'].includes(saved.motion)) updateMotion(saved.motion);
            } catch { /* Invalid or unavailable storage uses the accessible defaults. */ }
            setLoaded(true);
        });
        media.addEventListener('change', onPreference);
        return () => { cancelAnimationFrame(frame); media.removeEventListener('change', onPreference); };
    }, []);

    const reducedMotion = motion === 'reduced' || (motion === 'system' && systemReduced);
    useEffect(() => {
        document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
        document.documentElement.dataset.quality = quality;
        if (loaded) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ quality, motion })); } catch { /* Settings still work for this session. */ }
        }
    }, [quality, motion, reducedMotion, loaded]);

    const setQuality = useCallback((value: Quality) => updateQuality(value), []);
    const setMotion = useCallback((value: Motion) => updateMotion(value), []);
    const value = useMemo(() => ({ quality, motion, reducedMotion, setQuality, setMotion }), [quality, motion, reducedMotion, setQuality, setMotion]);
    return <VisualSettingsContext.Provider value={value}>{children}</VisualSettingsContext.Provider>;
}

export function useVisualSettings() {
    const settings = useContext(VisualSettingsContext);
    if (!settings) throw new Error('useVisualSettings requires VisualSettingsProvider');
    return settings;
}
