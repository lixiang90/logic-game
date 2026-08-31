import { FarmCropId } from '@/types/stage2';

export interface FarmCropDefinition {
    id: FarmCropId;
    name: { en: string; zh: string };
    description: { en: string; zh: string };
    growMs: number;
    seedCost: number;
    coinYield: number;
    insightYield: number;
    color: string;
}

export const FARM_CROPS: FarmCropDefinition[] = [
    {
        id: 'axiom-wheat',
        name: { en: 'Axiom Wheat', zh: '公理麦' },
        description: { en: 'A reliable crop woven from first principles.', zh: '从第一原理中生长出的稳定作物。' },
        growMs: 60_000,
        seedCost: 4,
        coinYield: 10,
        insightYield: 0,
        color: '#facc15',
    },
    {
        id: 'implication-vine',
        name: { en: 'Implication Vine', zh: '蕴含藤' },
        description: { en: 'Its branches always lead from one idea to the next.', zh: '枝蔓沿着前件通往后件。' },
        growMs: 5 * 60_000,
        seedCost: 14,
        coinYield: 34,
        insightYield: 0,
        color: '#22d3ee',
    },
    {
        id: 'contradiction-berry',
        name: { en: 'Contradiction Berry', zh: '矛盾莓' },
        description: { en: 'A tart fruit that thrives beside negated signals.', zh: '在否定信号附近结出的酸甜果实。' },
        growMs: 20 * 60_000,
        seedCost: 32,
        coinYield: 76,
        insightYield: 1,
        color: '#f472b6',
    },
    {
        id: 'theorem-lotus',
        name: { en: 'Theorem Lotus', zh: '定理莲' },
        description: { en: 'A slow, luminous bloom rich in proof insight.', zh: '缓慢开放、凝聚证明灵感的发光莲花。' },
        growMs: 60 * 60_000,
        seedCost: 70,
        coinYield: 150,
        insightYield: 3,
        color: '#a78bfa',
    },
];

export const getFarmCrop = (cropId?: FarmCropId) => FARM_CROPS.find((crop) => crop.id === cropId);

