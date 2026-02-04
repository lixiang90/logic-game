import { TranslationKey } from "@/data/translations";

export type TutorialTriggerType = 
    | 'START_LEVEL'
    | 'SELECT_TOOL'
    | 'PLACE_NODE'
    | 'CONNECT_WIRE'
    | 'LEVEL_COMPLETE'
    | 'CUSTOM'; // For specialized checks

export interface TutorialStep {
    id: string;
    textKey: TranslationKey; // Key for translation
    trigger: TutorialTriggerType;
    triggerParams?: Record<string, unknown>; // e.g., { toolType: 'wire' }
    highlightElementId?: string; // DOM ID to highlight
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    ghostNodes?: {
        type: string; // 'atom', 'gate'
        subType: string;
        x: number;
        y: number;
        w: number;
        h: number;
        rotation?: number;
    }[];
}

export interface LevelTutorial {
    levelIndex: number;
    steps: TutorialStep[];
}
