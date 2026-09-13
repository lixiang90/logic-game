import type { NodeData } from '@/types/game';
import type { IslandHarbor, Stage2IslandDefinition, Stage2LevelConfig, Stage2MetaProgress } from '@/types/stage2';
import { boundsOverlap, getNodeBounds } from './gameUtils';

export const HARBOR_W = 4, HARBOR_H = 3;
export const harborBounds = (port: Pick<IslandHarbor, 'x' | 'y'>) => ({ x: port.x, y: port.y, w: HARBOR_W, h: HARBOR_H });
export const harborNormal = (port: Pick<IslandHarbor, 'facing'>) => ({ north: {x:0,y:-1}, east:{x:1,y:0}, south:{x:0,y:1}, west:{x:-1,y:0} })[port.facing];
export const harborAnchor = (port: IslandHarbor) => {
    const n = harborNormal(port);
    return { x: (port.x + HARBOR_W/2 + n.x*HARBOR_W/2)*25, y: (port.y + HARBOR_H/2 + n.y*HARBOR_H/2)*25 };
};
const candidateCache = new WeakMap<Stage2IslandDefinition, Array<Pick<IslandHarbor,'x'|'y'|'facing'>>>();

/** A harbor occupies twelve real land cells and has a quay facing the sky. */
export function harborSites(island: Stage2IslandDefinition) {
    const cached = candidateCache.get(island); if (cached) return cached;
    const tiles = new Set(island.buildTiles.map(p=>`${p.x},${p.y}`));
    const obstacles = [...(island.goalBounds ? [island.goalBounds] : []), ...(island.premiseNodes ?? [])];
    const sites: Array<Pick<IslandHarbor,'x'|'y'|'facing'>> = [];
    for (const {x,y} of island.buildTiles) {
        const rect=harborBounds({x,y});
        if (obstacles.some(b=>boundsOverlap(rect,b))) continue;
        let valid=true;
        for(let dx=0;dx<HARBOR_W && valid;dx++) for(let dy=0;dy<HARBOR_H;dy++) if(!tiles.has(`${x+dx},${y+dy}`)){valid=false;break;}
        if(!valid) continue;
        const exposed: Array<[IslandHarbor['facing'],number]> = [
            ['south',Array.from({length:HARBOR_W},(_,i)=>!tiles.has(`${x+i},${y+HARBOR_H}`)).filter(Boolean).length],
            ['north',Array.from({length:HARBOR_W},(_,i)=>!tiles.has(`${x+i},${y-1}`)).filter(Boolean).length],
            ['east',Array.from({length:HARBOR_H},(_,i)=>!tiles.has(`${x+HARBOR_W},${y+i}`)).filter(Boolean).length],
            ['west',Array.from({length:HARBOR_H},(_,i)=>!tiles.has(`${x-1},${y+i}`)).filter(Boolean).length],
        ];
        exposed.sort((a,b)=>b[1]-a[1]);
        if(exposed[0][1]>=2) sites.push({x,y,facing:exposed[0][0]});
    }
    const centerX=island.mapBounds.x+island.mapBounds.w/2;
    sites.sort((a,b)=>((a.facing==='south'?0:1000)+Math.abs(a.x-centerX)-a.y*.1)-((b.facing==='south'?0:1000)+Math.abs(b.x-centerX)-b.y*.1));
    candidateCache.set(island,sites);return sites;
}
export function defaultHarbor(island: Stage2IslandDefinition): IslandHarbor | undefined {
    const site=harborSites(island)[0];
    return site ? {...site,id:`${island.id}:default`,name:'1'} : undefined;
}
export function islandHarbors(island: Stage2IslandDefinition, progress: Stage2MetaProgress): IslandHarbor[] {
    const saved=progress.harbors?.[island.id];
    if(saved?.length) return saved;
    const port=defaultHarbor(island);return port?[port]:[];
}
export function ensureHarbors(progress: Stage2MetaProgress, config: Stage2LevelConfig, nodes: NodeData[]) {
    let harbors=progress.harbors ?? {};
    const occupied=nodes.map(getNodeBounds);
    for(const id of new Set([...config.initialUnlockedIslandIds,...progress.unlockedIslandIds,...progress.completedIslandIds])) {
        if(harbors[id]?.length) continue;
        const island=config.world.getIslandById(id);if(!island?.rewardTheorem)continue;
        const site=harborSites(island).find(p=>!occupied.some(b=>boundsOverlap(harborBounds(p),b)));
        if(site) harbors={...harbors,[id]:[{...site,id:`${id}:default`,name:'1'}]};
    }
    return harbors===progress.harbors ? progress : {...progress,harbors};
}
export function validateHarborSite(island: Stage2IslandDefinition, progress: Stage2MetaProgress, nodes: NodeData[], x:number,y:number,movingId?:string) {
    const site=harborSites(island).find(p=>p.x===x && p.y===y);if(!site)return null;
    const bounds=harborBounds(site);
    if(nodes.some(n=>boundsOverlap(bounds,getNodeBounds(n)))) return null;
    if(islandHarbors(island,progress).some(p=>p.id!==movingId && boundsOverlap(bounds,harborBounds(p)))) return null;
    return site;
}
export function putHarbor(progress:Stage2MetaProgress, island:Stage2IslandDefinition, nodes:NodeData[], x:number,y:number,id?:string) {
    const site=validateHarborSite(island,progress,nodes,x,y,id);if(!site)return progress;
    const ports=islandHarbors(island,progress);
    const existing=ports.find(p=>p.id===id);
    if(id && !existing)return progress;
    const port:IslandHarbor={...site,id:existing?.id ?? crypto.randomUUID(),name:existing?.name ?? String(Math.max(0,...ports.map(p=>Number(p.name)||0))+1)};
    return {...progress,harbors:{...progress.harbors,[island.id]:existing ? ports.map(p=>p.id===id?port:p) : [...ports,port]}};
}
export function removeHarbor(progress:Stage2MetaProgress,island:Stage2IslandDefinition,id:string) {
    const ports=islandHarbors(island,progress);
    if(ports.length<=1 || !ports.some(p=>p.id===id)) return progress;
    const routePorts=Object.fromEntries(Object.entries(progress.routePorts ?? {}).map(([key,binding])=>[key,{
        sourcePortId:binding.sourcePortId===id?undefined:binding.sourcePortId,
        targetPortId:binding.targetPortId===id?undefined:binding.targetPortId,
    }]));
    return {...progress,harbors:{...progress.harbors,[island.id]:ports.filter(p=>p.id!==id)},routePorts};
}
