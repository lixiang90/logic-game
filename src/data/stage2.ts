import levels from '@/data/levels.json';
import { Stage2GridPoint, Stage2IslandCategory, Stage2IslandDefinition, Stage2IslandPremiseDefinition, Stage2LevelConfig, Stage2MapBounds, Stage2WorldConfig, TheoremChipDefinition } from '@/types/stage2';

export const STAGE2_START_LEVEL_INDEX = 10;

type Point = { x: number; y: number };

const makeIslandId = (cx: number, cy: number) => `i_${cx}_${cy}`;
const parseIslandId = (id: string): { cx: number; cy: number } | null => {
    const match = /^i_(-?\d+)_(-?\d+)$/.exec(id);
    if (!match) return null;
    return { cx: Number(match[1]), cy: Number(match[2]) };
};

const mulberry32 = (seed: number) => {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
};

const hash2D = (seed: number, x: number, y: number) => {
    let h = seed >>> 0;
    h ^= Math.imul(x, 374761393);
    h = (h << 13) | (h >>> 19);
    h ^= Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return (h ^ (h >>> 16)) >>> 0;
};

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

const convexHull = (points: Point[]) => {
    if (points.length <= 1) return points;
    const sorted = [...points].sort((p1, p2) => (p1.x === p2.x ? p1.y - p2.y : p1.x - p2.x));
    const lower: Point[] = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }
    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }
    lower.pop();
    upper.pop();
    return [...lower, ...upper];
};

const polygonArea = (poly: Point[]) => {
    if (poly.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < poly.length; i += 1) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        sum += a.x * b.y - b.x * a.y;
    }
    return Math.abs(sum) / 2;
};

const pointInConvexPolygon = (poly: Point[], p: Point) => {
    if (poly.length < 3) return false;
    let sign = 0;
    for (let i = 0; i < poly.length; i += 1) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const c = cross(a, b, p);
        if (c === 0) continue;
        const nextSign = c > 0 ? 1 : -1;
        if (sign === 0) sign = nextSign;
        else if (sign !== nextSign) return false;
    }
    return true;
};

const makeGoalBounds = (mapBounds: Stage2MapBounds): Stage2MapBounds => ({
    x: Math.round(mapBounds.x + mapBounds.w / 2 - 4),
    y: Math.round(mapBounds.y + mapBounds.h / 2 - 4),
    w: 8,
    h: 8,
});

const estimatePremiseWidth = (formula: string) => {
    const len = formula.replace(/\s+/g, '').length;
    if (len <= 2) return 6;
    if (len <= 6) return 6;
    if (len <= 10) return 8;
    return 10;
};

const placePremiseNodes = (islandBounds: Stage2MapBounds, formulas: string[], baseId: string) => {
    const nodes: Stage2IslandPremiseDefinition[] = [];
    const startX = islandBounds.x + 8;
    const startY = islandBounds.y + 8;
    const gapY = 14;
    for (let i = 0; i < formulas.length; i += 1) {
        const w = estimatePremiseWidth(formulas[i]);
        nodes.push({
            id: `${baseId}-${i + 1}`,
            formula: formulas[i],
            x: startX,
            y: startY + i * gapY,
            w,
            h: 6,
        });
    }
    return nodes;
};

type IslandMeta = {
    name?: string;
    category?: Stage2IslandCategory;
    description?: string;
    descriptionKey?: string;
    goalFormula?: string;
    premiseFormulas?: string[];
    rewardCoins?: number;
    rewardTheorem?: TheoremChipDefinition;
};

const createStage2World = (mapSeed: number, metaById: Map<string, IslandMeta>): Stage2WorldConfig => {
    const chunkW = 160;
    const chunkH = 112;
    const cache = new Map<string, Stage2IslandDefinition>();

    const buildIslandGeometry = (cx: number, cy: number) => {
        const id = makeIslandId(cx, cy);
        const cached = cache.get(id);
        if (cached) return cached;

        const rng = mulberry32(hash2D(mapSeed, cx, cy));
        const originX = cx * chunkW;
        const originY = cy * chunkH;
        const margin = 18;

        const maxW = Math.max(60, chunkW - margin * 2);
        const maxH = Math.max(48, chunkH - margin * 2);
        const w = Math.round(maxW * (0.62 + rng() * 0.28));
        const h = Math.round(maxH * (0.62 + rng() * 0.28));

        const centerX = originX + chunkW / 2 + (rng() - 0.5) * chunkW * 0.18;
        const centerY = originY + chunkH / 2 + (rng() - 0.5) * chunkH * 0.18;
        const x = Math.round(centerX - w / 2);
        const y = Math.round(centerY - h / 2);

        const bounds: Stage2MapBounds = { x, y, w, h };

        const createConvexPolygon = () => {
            const sampleCount = 18 + Math.floor(rng() * 10);
            const pts: Point[] = [];
            const padX = 6;
            const padY = 6;
            for (let i = 0; i < sampleCount; i += 1) {
                pts.push({
                    x: padX + rng() * (w - padX * 2),
                    y: padY + rng() * (h - padY * 2),
                });
            }
            const hull = convexHull(pts);
            const area = polygonArea(hull);
            const targetArea = w * h * 0.46;
            if (hull.length < 3 || area < targetArea) return null;
            return hull;
        };

        let poly: Point[] | null = null;
        for (let attempt = 0; attempt < 6; attempt += 1) {
            poly = createConvexPolygon();
            if (poly) break;
        }
        if (!poly) {
            poly = [
                { x: w * 0.18, y: h * 0.32 },
                { x: w * 0.78, y: h * 0.18 },
                { x: w * 0.86, y: h * 0.74 },
                { x: w * 0.34, y: h * 0.86 },
            ];
        }

        const tiles: Stage2GridPoint[] = [];
        for (let ly = 0; ly < h; ly += 1) {
            for (let lx = 0; lx < w; lx += 1) {
                const p = { x: lx + 0.5, y: ly + 0.5 };
                if (!pointInConvexPolygon(poly, p)) continue;
                tiles.push({ x: bounds.x + lx, y: bounds.y + ly });
            }
        }

        const base: Stage2IslandDefinition = {
            id,
            mapBounds: bounds,
            buildTiles: tiles,
            unlocked: false,
        };

        const meta = metaById.get(id);
        if (meta) {
            const premiseFormulas = meta.premiseFormulas ?? [];
            const withMeta: Stage2IslandDefinition = {
                ...base,
                name: meta.name,
                category: meta.category,
                description: meta.description,
                descriptionKey: meta.descriptionKey,
                goalFormula: meta.goalFormula,
                goalBounds: meta.goalFormula ? makeGoalBounds(bounds) : undefined,
                premiseNodes: premiseFormulas.length > 0 ? placePremiseNodes(bounds, premiseFormulas, `premise-${id}`) : [],
                rewardCoins: meta.rewardCoins,
                rewardTheorem: meta.rewardTheorem,
            };
            cache.set(id, withMeta);
            return withMeta;
        }

        cache.set(id, base);
        return base;
    };

    const getIslandsInBounds = (bounds: Stage2MapBounds) => {
        const minCx = Math.floor((bounds.x - chunkW) / chunkW);
        const maxCx = Math.floor((bounds.x + bounds.w + chunkW) / chunkW);
        const minCy = Math.floor((bounds.y - chunkH) / chunkH);
        const maxCy = Math.floor((bounds.y + bounds.h + chunkH) / chunkH);
        const islands: Stage2IslandDefinition[] = [];
        for (let cy = minCy; cy <= maxCy; cy += 1) {
            for (let cx = minCx; cx <= maxCx; cx += 1) {
                islands.push(buildIslandGeometry(cx, cy));
            }
        }
        return islands;
    };

    const getIslandById = (id: string) => {
        const parsed = parseIslandId(id);
        if (!parsed) return null;
        return buildIslandGeometry(parsed.cx, parsed.cy);
    };

    return {
        chunkW,
        chunkH,
        getIslandsInBounds,
        getIslandById,
    };
};

type Stage1LevelNode = { type: string; subType: string; locked?: boolean };
type Stage1Level = {
    id: string;
    description?: string;
    goal?: { formula?: string };
    initialState?: { nodes?: Stage1LevelNode[] };
};

const getStage1LevelData = (levelId: string) => {
    const stage1Levels = levels as unknown as Stage1Level[];
    const level = stage1Levels.find((item) => item.id === levelId);
    if (!level) return null;
    const goalFormula = level.goal?.formula;
    const description = level.description;
    const premiseFormulas: string[] =
        level.initialState?.nodes?.filter((n) => n.type === 'premise' && n.locked).map((n) => n.subType) ?? [];
    return { goalFormula, description, premiseFormulas };
};

const createLevel11 = (mapSeed: number): Stage2LevelConfig => {
    const metaById = new Map<string, IslandMeta>();

    const sylId = makeIslandId(0, 0);
    const a1iId = makeIslandId(-3, 0);
    const a2iId = makeIslandId(3, 0);
    const mpdId = makeIslandId(0, 3);

    metaById.set(sylId, {
        name: 'syl',
        category: 'main',
        descriptionKey: 'stage2-island-desc-main',
        goalFormula: '|-(P->R)',
        premiseFormulas: ['P->Q', 'Q->R'],
        rewardCoins: 60,
        rewardTheorem: { theoremId: 'syl', name: 'syl', formula: '|-(P->R)', cost: 45 },
    });

    metaById.set(a1iId, {
        name: 'a1i',
        category: 'support',
        descriptionKey: 'stage2-island-desc-support',
        goalFormula: '|-(Q->P)',
        premiseFormulas: ['P'],
        rewardCoins: 20,
        rewardTheorem: { theoremId: 'a1i', name: 'a1i', formula: '|-(Q->P)', cost: 15 },
    });

    metaById.set(a2iId, {
        name: 'a2i',
        category: 'support',
        descriptionKey: 'stage2-island-desc-support',
        goalFormula: '|-((P->Q)->(P->R))',
        premiseFormulas: ['P->(Q->R)'],
        rewardCoins: 25,
        rewardTheorem: { theoremId: 'a2i', name: 'a2i', formula: '|-((P->Q)->(P->R))', cost: 25 },
    });

    metaById.set(mpdId, {
        name: 'mpd',
        category: 'support',
        descriptionKey: 'stage2-island-desc-support',
        goalFormula: '|-(P->R)',
        premiseFormulas: ['P->Q', 'P->(Q->R)'],
        rewardCoins: 30,
        rewardTheorem: { theoremId: 'mpd', name: 'mpd', formula: '|-(P->R)', cost: 30 },
    });

    const stage1IslandChunks: Array<{ cx: number; cy: number; levelId: string; name: string }> = [
        { cx: 2, cy: -2, levelId: 'level-1', name: 'level1' },
        { cx: 3, cy: -2, levelId: 'level-2', name: 'level2' },
        { cx: 4, cy: -2, levelId: 'level-3', name: 'level3' },
        { cx: 2, cy: -1, levelId: 'level-4', name: 'level4' },
        { cx: 3, cy: -1, levelId: 'level-5', name: 'level5' },
        { cx: 4, cy: -1, levelId: 'level-6', name: 'level6' },
        { cx: 2, cy: 1, levelId: 'level-7', name: 'mp2' },
        { cx: 3, cy: 1, levelId: 'level-8', name: 'level8' },
        { cx: 4, cy: 1, levelId: 'level-9', name: 'level9' },
        { cx: 5, cy: 1, levelId: 'level-10', name: 'id' },
    ];

    for (const item of stage1IslandChunks) {
        const id = makeIslandId(item.cx, item.cy);
        const data = getStage1LevelData(item.levelId);
        if (!data?.goalFormula) continue;
        const theoremFormula = data.goalFormula.trim().startsWith('|-') || data.goalFormula.trim().startsWith('⊢')
            ? data.goalFormula
            : `|-${data.goalFormula}`;
        metaById.set(id, {
            name: item.name,
            category: 'optional',
            descriptionKey: `${item.levelId}-desc`,
            goalFormula: data.goalFormula,
            premiseFormulas: data.premiseFormulas,
            rewardCoins: 14,
            rewardTheorem: { theoremId: item.name, name: item.name, formula: theoremFormula, cost: 12 },
        });
    }

    const world = createStage2World(mapSeed, metaById);

    const goalIslandIds = [sylId, a1iId, a2iId, mpdId, ...stage1IslandChunks.map((item) => makeIslandId(item.cx, item.cy))];
    const initialUnlockedIslandIds = goalIslandIds;

    return {
        levelId: 'level-11',
        stageNumber: 2,
        chapterLevel: 1,
        focusIslandId: sylId,
        introTitle: 'Stage 2',
        introText: 'The world extends infinitely. Unlock islands, prove goals, and collect theorem chips.',
        introTextKey: 'stage2-intro-text',
        world,
        initialUnlockedIslandIds,
        recommendedTheoremIds: ['a1i', 'a2i', 'mpd'],
        goalIslandIds,
    };
};

export const getStage2LevelConfig = (levelId: string, mapSeed: number = 0): Stage2LevelConfig | undefined => {
    if (levelId === 'level-11') return createLevel11(mapSeed);
    return undefined;
};
