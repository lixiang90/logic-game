/** Shared semantic colours. Decorative brass must never stand in for a proof signal. */
export const ART_THEME = {
    background: '#0B1425', panel: '#142137', panelDeep: '#0B1424', ivory: '#EEE8DB',
    muted: '#A7B1C2', brass: '#B69A66', brassDark: '#675A44',
    formula: '#59D6F0', provable: '#F4CC67', any: '#AB96DC',
    error: '#F18B88', success: '#A6D7B1', grid: 'rgba(157, 177, 196, .10)',
    font: '"Noto Sans SC", "Microsoft YaHei", "Segoe UI", sans-serif',
    mathFont: '"Cambria Math", "STIX Two Math", "Times New Roman", serif',
} as const;

export type AtomArt = { color: string; shape: 'circle' | 'square' | 'triangle' | 'diamond' };
export const ATOM_ART: Record<string, AtomArt> = {
    P: { color: '#3b82f6', shape: 'circle' },
    Q: { color: '#a855f7', shape: 'square' },
    R: { color: '#ffaa00', shape: 'triangle' },
    S: { color: '#f97316', shape: 'diamond' },
    T: { color: '#22c55e', shape: 'circle' },
};

export const atomArt = (name: string): AtomArt => ATOM_ART[name] ?? { color: '#BCCCDD', shape: 'circle' };
export const signalColor = (type: 'formula' | 'provable' | 'any') => ART_THEME[type];
