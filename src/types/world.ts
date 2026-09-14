import type { Stage2MapBounds } from './stage2';

export type LocalizedText = { zh: string; en: string };
export type WorldVersion = 1 | 2;
export type IslandProfile = 'cove' | 'crescent' | 'ridge' | 'twin' | 'terrace' | 'shattered';
export interface BiomeDefinition {
    id: string;
    name: LocalizedText;
    ground: string;
    detail: string;
    rock: string;
    edge: string;
    accent: string;
    motif: 'grass' | 'strata' | 'crystal' | 'sand' | 'frost' | 'basalt';
    profiles: IslandProfile[];
}
export interface WorldRegion {
    id: string;
    name: LocalizedText;
    description: LocalizedText;
    biomeId: string;
    center: { x: number; y: number };
    contentDomainId: string;
    landmark: LocalizedText;
}
/** Content domains describe mathematical content, independently of geography. */
export interface MathContentDomain {
    id: string;
    name: LocalizedText;
    source: string;
    symbolProfileId: string;
}
export interface WorldIslandAddress {
    id: string;
    regionId: string;
    clusterId: string;
    order: number;
}
export interface WorldCluster {
    id:string; offset:{x:number;y:number}; radius:number; angle:number; step:number;
    stretchY:number; centerIsland:boolean; radiusVariation:number;
}
export interface WorldPointOfInterest {
    id: string;
    regionId: string;
    position: { x: number; y: number };
    name: LocalizedText;
    description: LocalizedText;
    kind: 'beacon' | 'garden' | 'archive';
}
export interface RegionalWorldInfo {
    version: WorldVersion;
    regions: WorldRegion[];
    biomes:Record<string,BiomeDefinition>;
    pointsOfInterest: WorldPointOfInterest[];
    bounds: Stage2MapBounds;
}
export interface RegionalWorldDefinition {
    regions:WorldRegion[];
    biomes:Record<string,BiomeDefinition>;
    addresses:WorldIslandAddress[];
    clusters:WorldCluster[];
    pointsOfInterest:WorldPointOfInterest[];
}
