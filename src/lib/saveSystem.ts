
import { NodeData, Wire } from '@/types/game';
import { normalizeStoryProgress } from './story-engine';
import { Stage2MetaProgress, createDefaultStage2MetaProgress } from '@/types/stage2';

export interface LevelState {
    nodes: NodeData[];
    wires: Wire[];
}

export interface CircuitBlueprint {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    nodes: NodeData[];
    wires: Wire[];
    tags: string[];
}

export type TheoremFolderNode = {
    id: string;
    name: string;
    children: TheoremFolderNode[];
};

export type TheoremLibrarySaveState = {
    version: 1;
    root: TheoremFolderNode;
    theoremFolderById: Record<string, string | undefined>;
};

export interface SaveData {
    version?: 2 | 3;
    timestamp: number;
    levelIndex: number;
    levelStates: Record<number, LevelState>; // Store state for each level index
    metaProgress: Stage2MetaProgress;
    theoremLibrary?: TheoremLibrarySaveState;
    theoremToolbarPins?: Array<string | null>;
    levelStartStates?: Record<number, { levelState: LevelState, metaProgress: Stage2MetaProgress }>;
    blueprints?: CircuitBlueprint[];
}

const STORAGE_KEY_PREFIX = 'logic_game_save_';
export class LegacyStage2SaveError extends Error {
    constructor() { super('The island map has changed. Only legacy Stage 1 saves can be imported.'); }
}

// Old island coordinates cannot be loaded onto the regional world. Check all
// stored chapters, including restart snapshots, even when Stage 1 is selected.
const hasIncompatibleStage2 = (data: Partial<SaveData>): boolean => {
    const hasStage2 = (data.levelIndex ?? 0) >= 10 ||
        Object.keys(data.levelStates ?? {}).some(key => Number(key) >= 10) ||
        Object.keys(data.levelStartStates ?? {}).some(key => Number(key) >= 10);
    return hasStage2 && (data.version !== 3 || data.metaProgress?.worldVersion !== 2 ||
        Object.entries(data.levelStartStates ?? {}).some(([key, snapshot]) =>
            Number(key) >= 10 && snapshot.metaProgress?.worldVersion !== 2));
};

// UTF-8 before Base64 preserves Chinese notes, theorem names and emoji.
export const encodeSave = (data: SaveData): string => {
    const bytes = new TextEncoder().encode(JSON.stringify({ ...data, version: 3 }));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
};

export const decodeSave = (text: string): SaveData => {
    const trimmed = text.trim();
    const json = trimmed.startsWith('{') ? trimmed : new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(atob(trimmed.replace(/\s/g, '')), char => char.charCodeAt(0)),
    );
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        !Number.isInteger(data.levelIndex) || data.levelIndex < 0 || data.levelIndex > 19 ||
        !data.levelStates || typeof data.levelStates !== 'object' || Array.isArray(data.levelStates)) {
        throw new Error('Invalid save data');
    }
    if (data.version !== undefined && data.version !== 1 && data.version !== 2 && data.version !== 3) {
        throw new Error('Unsupported save version');
    }
    if (hasIncompatibleStage2(data)) {
        throw new LegacyStage2SaveError();
    }
    for (const state of Object.values(data.levelStates) as LevelState[]) {
        if (!state || !Array.isArray(state.nodes) || !Array.isArray(state.wires)) throw new Error('Invalid circuit state');
    }
    const normalized = SaveSystem.normalizeSaveData(data);
    if (!normalized) throw new Error('Invalid save data');
    return normalized;
};

export const SaveSystem = {
    createEmptySave: (): SaveData => ({
        version: 3,
        timestamp: Date.now(),
        levelIndex: 0,
        levelStates: {},
        metaProgress: createDefaultStage2MetaProgress(),
        blueprints: [],
    }),

    normalizeSaveData: (data: Partial<SaveData> | null): SaveData | null => {
        if (!data || hasIncompatibleStage2(data)) return null;
        const baseSeed = 42; // Fixed map seed for everyone
        const defaultMeta = createDefaultStage2MetaProgress(baseSeed);
        const savedMeta = data.metaProgress;
        // Stage 1 saves can enter the new world; unknown future versions cannot.
        const supportedMeta=(meta?:Stage2MetaProgress)=>(meta?.worldVersion===undefined||meta.worldVersion===1||meta.worldVersion===2)
            && (meta?.story?.version===undefined||meta.story.version===1);
        if(!supportedMeta(savedMeta)||Object.values(data.levelStartStates??{}).some(snapshot=>!supportedMeta(snapshot.metaProgress)))return null;
        const normalizeMeta = (meta?: Stage2MetaProgress): Stage2MetaProgress => ({
            ...defaultMeta, ...meta, mapSeed: baseSeed,
            worldVersion: 2,
            discoveredLandmarkIds: Array.isArray(meta?.discoveredLandmarkIds) ? [...new Set(meta.discoveredLandmarkIds.filter(id=>typeof id==='string'))] : [],
            story: normalizeStoryProgress(meta?.story),
            plannedRoutes: meta?.plannedRoutes ?? [],
            proofDependencies: meta?.proofDependencies ?? {},
            harbors: meta?.harbors ?? {},
            routePorts: meta?.routePorts ?? {},
            farm: { ...defaultMeta.farm, ...meta?.farm, plots: meta?.farm?.plots?.length ? meta.farm.plots : defaultMeta.farm.plots },
        });
        return {
            version: 3,
            timestamp: data.timestamp ?? Date.now(),
            levelIndex: data.levelIndex ?? 0,
            levelStates: data.levelStates ?? {},
            metaProgress: normalizeMeta(savedMeta),
            theoremLibrary: data.theoremLibrary,
            theoremToolbarPins: data.theoremToolbarPins,
            levelStartStates: Object.fromEntries(Object.entries(data.levelStartStates ?? {}).map(([key, snapshot]) => [key, { ...snapshot, metaProgress: normalizeMeta(snapshot.metaProgress) }])),
            blueprints: data.blueprints ?? [],
        };
    },

    save: (slot: number, data: SaveData) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${slot}`, encodeSave(data));
        } catch (e) {
            console.error("Save failed", e);
        }
    },

    autoSave: (data: SaveData) => {
        // Auto-save now writes to Slot 1
        SaveSystem.save(1, data);
    },

    load: (slot: number): SaveData | null => {
        if (typeof window === 'undefined') return null;
        try {
            const item = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slot}`);
            return item ? decodeSave(item) : null;
        } catch (e) {
            console.error("Load failed", e);
            return null;
        }
    },

    loadAutoSave: (): SaveData | null => {
        // Load from Slot 1
        return SaveSystem.load(1);
    },

    hasAutoSave: (): boolean => {
        // Check if Slot 1 exists
        return !!SaveSystem.load(1);
    },

    getSlotInfo: (slot: number): { timestamp: number, levelIndex: number } | null => {
        const data = SaveSystem.load(slot);
        if (!data) return null;
        return { timestamp: data.timestamp, levelIndex: data.levelIndex };
    }
};
