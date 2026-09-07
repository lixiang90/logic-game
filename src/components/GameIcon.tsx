import type { CSSProperties } from 'react';

const paths = {
    seed: 'M12 21v-9M12 15C4 15 3 9 3 5c6 0 9 3 9 10Zm0-3C12 5 16 3 21 3c0 6-3 9-9 9Z',
    coin: 'M9 8h6m-6 8h6m-3-10v12M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0',
    insight: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
    close: 'm6 6 12 12M18 6 6 18',
    'arrow-left': 'M20 12H4m6-6-6 6 6 6',
    'arrow-right': 'M4 12h16m-6-6 6 6-6 6',
    check: 'm5 12 4 4L19 6',
    clock: 'M12 8v5l3 2M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0',
    sparkles: 'm9 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm10 12 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Zm7 4v3',
    plus: 'M12 5v14M5 12h14',
    settings: 'm9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3ZM8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
    home: 'm3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10',
    save: 'M4 3h13l4 4v14H3V3Zm3 0v7h10V3M7 21v-7h10v7',
    folder: 'M3 6h7l2 3h9v12H3ZM3 9V4h6l2 2h9v3',
    book: 'M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-1-6-2-10 1Zm0 0v15',
    help: 'M9 8a3 3 0 0 1 6 1c0 2-3 2-3 4m0 3v1M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0',
    reset: 'M4 5v5h5M4 10a8 8 0 1 1 0 6',
    compass: 'm16 8-3 5-5 3 3-5ZM3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0',
    map: 'm2 5 6-2 8 2 6-2v16l-6 2-8-2-6 2Zm6-2v16m8-14v16',
    chevron: 'm8 4 8 8-8 8',
    sound: 'M3 9h4l5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16',
    moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
    sun: 'M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M20 4l-2 2M6 18l-2 2',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm7 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
    search: 'M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0m12 5 6 6',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    upload: 'M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5',
    tool: 'm14 4 4 4 4-4c2 6-2 9-6 8L6 22l-4-4 10-10c-1-4 2-8 8-6Z',
    layers: 'm2 8 10-6 10 6-10 6Zm0 5 10 6 10-6M2 18l10 6 10-6',
    target: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0m5 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 2v3m0 14v3M2 12h3m14 0h3',
    play: 'm8 4 12 8-12 8Z',
} as const;

export type GameIconName = keyof typeof paths;
export default function GameIcon({ name, size = 20, className, style }: { name: GameIconName; size?: number; className?: string; style?: CSSProperties }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}><path d={paths[name]} /></svg>;
}
