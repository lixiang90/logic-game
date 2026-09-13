import type { NodeData, Tool } from '@/types/game';
import type { Stage2IslandDefinition, Stage2LevelConfig, Stage2MetaProgress, TheoremChipInventoryEntry } from '@/types/stage2';
import { islandHarbors, harborAnchor } from './harbors';
import { getTheoremChipHeight, getTheoremVariables, normalizeTheoremFormula } from './theorem-chips';

export type ShippingRoute = { sourceIslandId: string; targetIslandId: string; theoremId: string; sourcePortId?: string; targetPortId?: string; status: 'planned' | 'building' | 'pending' | 'proved' };
export const virtualChipCost = (cost: number) => cost * 2 + 20;
export const knownTheorems = (progress: Stage2MetaProgress) => new Set(Object.values(progress.collectedTheorems).filter(chip => !chip.virtual).map(chip => chip.theoremId));

export const shippingIslands = (config: Stage2LevelConfig, progress: Stage2MetaProgress) =>
    [...new Set([...config.initialUnlockedIslandIds, ...progress.unlockedIslandIds, ...progress.completedIslandIds])]
        .map(id => config.world.getIslandById(id)).filter((island): island is Stage2IslandDefinition => Boolean(island?.rewardTheorem));

export function theoremTool(chip: TheoremChipInventoryEntry): Tool {
    const vars = getTheoremVariables(chip);
    return { type: 'theorem', subType: chip.theoremId, w: 10, h: getTheoremChipHeight(vars.length, chip.premises?.length ?? 0),
        theoremId: chip.theoremId, sourceIslandId: chip.sourceIslandId, theoremName: chip.name,
        theoremVars: vars, theoremPremises: chip.premises ?? [], theoremConclusion: normalizeTheoremFormula(chip.formula),
        theoremIsFormulaOnly: !/^\s*(\|-|⊢)/.test(chip.formula), placementCost: chip.cost };
}

export function buyVirtualChip(progress: Stage2MetaProgress, config: Stage2LevelConfig, islandId: string): Stage2MetaProgress {
    if (config.chapterLevel < 6) return progress;
    const island = shippingIslands(config, progress).find(item => item.id === islandId);
    const reward = island?.rewardTheorem;
    if (!island || !reward || progress.completedIslandIds.includes(islandId)) return progress;
    const existing = progress.collectedTheorems[reward.theoremId];
    if (existing && !existing.virtual) return progress;
    const cost = virtualChipCost(reward.cost);
    if (progress.coins < cost) return progress;
    return { ...progress, coins: progress.coins - cost, collectedTheorems: { ...progress.collectedTheorems,
        [reward.theoremId]: { ...reward, sourceIslandId: islandId, premises: (island.premiseNodes ?? []).map(premise => premise.formula),
            collectedInLevelId: config.levelId, virtual: true, freeUsesRemaining: (existing?.freeUsesRemaining ?? 0) + 1, useCount: existing?.useCount ?? 0 },
    } };
}

export function buildShippingRoutes(config: Stage2LevelConfig, progress: Stage2MetaProgress, nodes: NodeData[], proofs: ReadonlyMap<string, ReadonlySet<string>>): ShippingRoute[] {
    const islands = shippingIslands(config, progress);
    const byTheorem = new Map(islands.map(island => [island.rewardTheorem!.theoremId, island.id]));
    Object.values(progress.collectedTheorems).forEach(chip => byTheorem.set(chip.theoremId, chip.sourceIslandId));
    const routes = new Map<string, ShippingRoute>();
    const add = (sourceIslandId: string, targetIslandId: string, status: ShippingRoute['status'], theoremId?: string) => {
        if (sourceIslandId === targetIslandId) return;
        const source = config.world.getIslandById(sourceIslandId);
        if (!source?.rewardTheorem || !config.world.getIslandById(targetIslandId)?.rewardTheorem) return;
        routes.set(`${sourceIslandId}>${targetIslandId}`, { sourceIslandId, targetIslandId, status, theoremId: theoremId ?? source.rewardTheorem.theoremId });
    };
    progress.plannedRoutes.forEach(route => add(route.sourceIslandId, route.targetIslandId, 'planned'));
    // A placed chip opens a working route immediately, before its circuit is complete.
    nodes.filter(node => node.theoremId && node.sourceIslandId).forEach(node => {
        const target = islands.find(island => {
            const b = island.mapBounds;
            return node.x + node.w / 2 >= b.x && node.x + node.w / 2 < b.x + b.w && node.y + node.h / 2 >= b.y && node.y + node.h / 2 < b.y + b.h;
        });
        if (target) add(node.sourceIslandId!, target.id, progress.collectedTheorems[node.theoremId!]?.virtual ? 'pending' : 'building', node.theoremId);
    });
    const known = knownTheorems(progress);
    const record = (target: string, dependencies: Iterable<string>, completed: boolean) => {
        for (const theorem of dependencies) {
            const source = byTheorem.get(theorem);
            if (source) add(source, target, completed ? 'proved' : known.has(theorem) ? 'building' : 'pending', theorem);
        }
    };
    proofs.forEach((dependencies, target) => record(target, dependencies, progress.completedIslandIds.includes(target)));
    Object.entries(progress.proofDependencies).forEach(([target, dependencies]) => record(target, dependencies, true));
    const loads = new Map<string, number>();
    const routed=[...routes.values()].map(route=>{
        const binding=progress.routePorts?.[`${route.sourceIslandId}>${route.targetIslandId}`];
        const choose=(islandId:string,peerId:string,preferred?:string)=>{
            const island=config.world.getIslandById(islandId)!, peer=config.world.getIslandById(peerId)!;
            const ports=islandHarbors(island,progress);
            const center={x:(peer.mapBounds.x+peer.mapBounds.w/2)*25,y:(peer.mapBounds.y+peer.mapBounds.h/2)*25};
            const score=(port:typeof ports[number])=>{const p=harborAnchor(port);return Math.hypot(p.x-center.x,p.y-center.y)+(loads.get(port.id)??0)*450;};
            const selected=ports.find(p=>p.id===preferred) ?? [...ports].sort((a,b)=>score(a)-score(b))[0];
            if(selected)loads.set(selected.id,(loads.get(selected.id)??0)+1);
            return selected?.id;
        };
        return {...route,sourcePortId:choose(route.sourceIslandId,route.targetIslandId,binding?.sourcePortId),targetPortId:choose(route.targetIslandId,route.sourceIslandId,binding?.targetPortId)};
    });
    return routed.sort((a, b) => `${a.sourceIslandId}>${a.targetIslandId}`.localeCompare(`${b.sourceIslandId}>${b.targetIslandId}`));
}

export const portArtScale = (scale: number) => Math.max(1, .75 / scale);

/** Copying a circuit spends virtual uses too; a multi-chip paste is all-or-nothing. */
export function consumeVirtualCopies(progress: Stage2MetaProgress, nodes: NodeData[]): Stage2MetaProgress | null {
    const counts = new Map<string, number>();
    for (const node of nodes) {
        if (!node.theoremId) continue;
        const chip = progress.collectedTheorems[node.theoremId];
        if (!chip) return null;
        if (chip.virtual) counts.set(chip.theoremId, (counts.get(chip.theoremId) ?? 0) + 1);
    }
    if (!counts.size) return progress;
    for (const [id, count] of counts) if (progress.collectedTheorems[id].freeUsesRemaining < count) return null;
    const collectedTheorems = { ...progress.collectedTheorems };
    for (const [id, count] of counts) {
        const chip = collectedTheorems[id];
        collectedTheorems[id] = { ...chip, freeUsesRemaining: chip.freeUsesRemaining - count, useCount: chip.useCount + count };
    }
    return { ...progress, collectedTheorems };
}
