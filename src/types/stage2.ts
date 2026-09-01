export type Stage2IslandCategory = 'main' | 'support' | 'optional';
export type Stage2IslandShape = 'main' | 'support' | 'optional';

export interface Stage2MapBounds {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Stage2GridPoint {
    x: number;
    y: number;
}

export interface Stage2IslandPremiseDefinition {
    id: string;
    formula: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface TheoremChipDefinition {
    theoremId: string;
    name: string;
    formula: string;
    premises?: string[];
    cost: number;
}

export interface TheoremChipInventoryEntry extends TheoremChipDefinition {
    sourceIslandId: string;
    collectedInLevelId?: string;
    freeUsesRemaining: number;
    useCount: number;
    simplifiedUsesRemaining?: number;
}

export interface Stage2IslandDefinition {
    id: string;
    mapBounds: Stage2MapBounds;
    buildTiles: Stage2GridPoint[];
    unlocked: boolean;
    name?: string;
    category?: Stage2IslandCategory;
    description?: string;
    descriptionKey?: string;
    goalFormula?: string;
    goalBounds?: Stage2MapBounds;
    premiseNodes?: Stage2IslandPremiseDefinition[];
    rewardCoins?: number;
    rewardTheorem?: TheoremChipDefinition;
}

export interface Stage2WorldConfig {
    chunkW: number;
    chunkH: number;
    getIslandsInBounds: (bounds: Stage2MapBounds) => Stage2IslandDefinition[];
    getIslandById: (id: string) => Stage2IslandDefinition | null;
}

export interface Stage2LevelConfig {
    levelId: string;
    stageNumber: number;
    chapterLevel: number;
    focusIslandId: string;
    introTitle: string;
    introText: string;
    introTitleKey?: string;
    introTextKey?: string;
    world: Stage2WorldConfig;
    initialUnlockedIslandIds: string[];
    recommendedTheoremIds: string[];
    goalIslandIds: string[];
    storyId?: string;
    unlockFarmOnComplete?: boolean;
    unlockQuickMpOnComplete?: boolean;
    insightReward?: number;
    newSymbols?: Array<'not' | 'and' | 'or' | 'equiv'>;
    metamathSourceUrl?: string;
}

export type FarmCropId = 'axiom-wheat' | 'implication-vine' | 'contradiction-berry' | 'theorem-lotus';

export interface FarmPlotState {
    id: string;
    cropId?: FarmCropId;
    plantedAt?: number;
    readyAt?: number;
}

export interface LogicFarmProgress {
    unlocked: boolean;
    plots: FarmPlotState[];
    harvestedCount: number;
}

export interface Stage2MetaProgress {
    mapSeed: number;
    coins: number;
    unlockedIslandIds: string[];
    completedIslandIds: string[];
    collectedTheorems: Record<string, TheoremChipInventoryEntry>;
    insight: number;
    farm: LogicFarmProgress;
    quickMpUnlocked: boolean;
    quickMpUses: number;
    seenStoryIds: string[];
}

export const createDefaultStage2MetaProgress = (seed?: number): Stage2MetaProgress => ({
    mapSeed: seed ?? Date.now(),
    coins: 0,
    unlockedIslandIds: [],
    completedIslandIds: [],
    collectedTheorems: {},
    insight: 0,
    farm: {
        unlocked: false,
        plots: Array.from({ length: 6 }, (_, index) => ({ id: `plot-${index + 1}` })),
        harvestedCount: 0,
    },
    quickMpUnlocked: false,
    quickMpUses: 0,
    seenStoryIds: [],
});
