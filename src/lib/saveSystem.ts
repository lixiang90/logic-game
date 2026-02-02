
import { NodeData, Wire } from '@/types/game';

export interface LevelState {
    nodes: NodeData[];
    wires: Wire[];
}

export interface SaveData {
    timestamp: number;
    levelIndex: number;
    levelStates: Record<number, LevelState>; // Store state for each level index
}

const STORAGE_KEY_PREFIX = 'logic_game_save_';
const AUTO_SAVE_KEY = 'logic_game_autosave';

export const SaveSystem = {
    save: (slot: number, data: SaveData) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${slot}`, JSON.stringify(data));
        } catch (e) {
            console.error("Save failed", e);
        }
    },

    autoSave: (data: SaveData) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Auto-save failed", e);
        }
    },

    load: (slot: number): SaveData | null => {
        if (typeof window === 'undefined') return null;
        try {
            const item = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slot}`);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error("Load failed", e);
            return null;
        }
    },

    loadAutoSave: (): SaveData | null => {
        if (typeof window === 'undefined') return null;
        try {
            const item = localStorage.getItem(AUTO_SAVE_KEY);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error("Load auto-save failed", e);
            return null;
        }
    },

    hasAutoSave: (): boolean => {
        if (typeof window === 'undefined') return false;
        return !!localStorage.getItem(AUTO_SAVE_KEY);
    },

    getSlotInfo: (slot: number): { timestamp: number, levelIndex: number } | null => {
        const data = SaveSystem.load(slot);
        if (!data) return null;
        return { timestamp: data.timestamp, levelIndex: data.levelIndex };
    }
};
