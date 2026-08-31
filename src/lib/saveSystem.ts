
import { NodeData, Wire } from '@/types/game';
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
    version?: 2;
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
const AUTO_SAVE_KEY = 'logic_game_autosave';

export const SaveSystem = {
    createEmptySave: (): SaveData => ({
        version: 2,
        timestamp: Date.now(),
        levelIndex: 0,
        levelStates: {},
        metaProgress: createDefaultStage2MetaProgress(),
        blueprints: [],
    }),

    normalizeSaveData: (data: Partial<SaveData> | null): SaveData | null => {
        if (!data) return null;
        const baseSeed = 42; // Fixed map seed for everyone
        const defaultMeta = createDefaultStage2MetaProgress(baseSeed);
        const savedMeta = data.metaProgress;
        return {
            version: 2,
            timestamp: data.timestamp ?? Date.now(),
            levelIndex: data.levelIndex ?? 0,
            levelStates: data.levelStates ?? {},
            metaProgress: savedMeta
                ? {
                      ...defaultMeta,
                      ...savedMeta,
                      farm: {
                          ...defaultMeta.farm,
                          ...(savedMeta.farm ?? {}),
                          plots: savedMeta.farm?.plots?.length ? savedMeta.farm.plots : defaultMeta.farm.plots,
                      },
                      mapSeed: baseSeed, // Always force fixed map seed
                  }
                : defaultMeta,
            theoremLibrary: data.theoremLibrary,
            theoremToolbarPins: data.theoremToolbarPins,
            levelStartStates: data.levelStartStates ?? {},
            blueprints: data.blueprints ?? [],
        };
    },

    save: (slot: number, data: SaveData) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${slot}`, JSON.stringify(data));
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
            return item ? SaveSystem.normalizeSaveData(JSON.parse(item)) : null;
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
