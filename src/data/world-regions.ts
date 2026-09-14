import type { BiomeDefinition, MathContentDomain, WorldIslandAddress, WorldRegion, WorldPointOfInterest,WorldCluster } from '@/types/world';

export const MATH_CONTENT_DOMAINS: MathContentDomain[] = [{
    id: 'propositional-logic', name: { zh: '命题逻辑', en: 'Propositional logic' },
    source: 'set.mm', symbolProfileId: 'proposition-circuits',
}];

export const WORLD_BIOMES: Record<string, BiomeDefinition> = {
    meadow: { id:'meadow',name:{zh:'草甸与白石',en:'Meadow & limestone'},ground:'#647b63',detail:'#293c37',rock:'#7a796a',edge:'#b8c69c',accent:'#c9dfaf',motif:'grass',profiles:['cove','terrace','twin'] },
    chalk: { id:'chalk',name:{zh:'白垩断崖',en:'Chalk escarpments'},ground:'#81999b',detail:'#2c424c',rock:'#96a4ac',edge:'#d2e5df',accent:'#a7e4e8',motif:'strata',profiles:['ridge','crescent','cove'] },
    amber: { id:'amber',name:{zh:'琥珀砂岩',en:'Amber sandstone'},ground:'#a08b5d',detail:'#453d30',rock:'#89704e',edge:'#dbc88d',accent:'#f2d992',motif:'sand',profiles:['cove','shattered','terrace'] },
    basalt: { id:'basalt',name:{zh:'玄岩裂谷',en:'Basalt rifts'},ground:'#666783',detail:'#302e43',rock:'#4b465d',edge:'#a8a1c7',accent:'#d0b0ed',motif:'basalt',profiles:['twin','ridge','shattered'] },
    frost: { id:'frost',name:{zh:'霜原台地',en:'Frost plateaus'},ground:'#9baeb1',detail:'#304652',rock:'#758993',edge:'#dde9e5',accent:'#bcf0ed',motif:'frost',profiles:['terrace','crescent','ridge'] },
    crystal: { id:'crystal',name:{zh:'晶簇悬岩',en:'Crystal crags'},ground:'#807d9a',detail:'#393750',rock:'#645c83',edge:'#c9bde6',accent:'#e7c4f4',motif:'crystal',profiles:['crescent','twin','shattered'] },
};

/** Geography has no story prerequisite and does not name future math branches. */
export const WORLD_REGIONS: WorldRegion[] = [
    {id:'haven',name:{zh:'青庭内海',en:'Verdant Haven'},description:{zh:'草甸围绕平静云湾，白石小岛散落在学宫外。',en:'Meadows surround a quiet cloud bay; limestone islets lie beyond the academy.'},biomeId:'meadow',center:{x:0,y:0},contentDomainId:'propositional-logic',landmark:{zh:'归航灯塔',en:'Homeward Beacon'}},
    {id:'crescent',name:{zh:'白岬环湾',en:'Whitecape Bight'},description:{zh:'高低断崖环抱开阔云域，岛链沿弧线向外延伸。',en:'Tiered cliffs embrace open cloudwater, with chains of islands curving outward.'},biomeId:'chalk',center:{x:1100,y:-380},contentDomainId:'propositional-logic',landmark:{zh:'风刻石环',en:'Wind-carved Ring'}},
    {id:'amber-reach',name:{zh:'琥珀浅滩',en:'Amber Reaches'},description:{zh:'暖色砂岩长岛与细碎浮石交错，远处地层清晰可见。',en:'Long sandstone islands mingle with small floating stones and exposed strata.'},biomeId:'amber',center:{x:1400,y:650},contentDomainId:'propositional-logic',landmark:{zh:'层岩观景台',en:'Strata Overlook'}},
    {id:'rift',name:{zh:'暮岩双峡',en:'Duskstone Narrows'},description:{zh:'两组玄岩群岛隔云峡相望，凹岸和裂谷构成深浅不同的港湾。',en:'Twin basalt clusters face across a cloud strait, with rifts and coves along their shores.'},biomeId:'basalt',center:{x:550,y:1250},contentDomainId:'propositional-logic',landmark:{zh:'双峰路标',en:'Twin-peak Marker'}},
    {id:'frostfield',name:{zh:'银霜高原',en:'Silverfrost Heights'},description:{zh:'浅色台地漂浮在疏朗云海中，冰纹沿边缘展开。',en:'Pale plateaus float in spacious cloud seas, frost patterns spreading along their edges.'},biomeId:'frost',center:{x:-550,y:950},contentDomainId:'propositional-logic',landmark:{zh:'霜纹镜台',en:'Frostglass Platform'}},
    {id:'prism',name:{zh:'星晶远环',en:'Prismatic Verge'},description:{zh:'晶簇点亮破碎的外环岛链，大片空域保留着尚未绘制的航图。',en:'Crystal clusters illuminate a broken outer chain, beyond which the charts remain unwritten.'},biomeId:'crystal',center:{x:-1000,y:-150},contentDomainId:'propositional-logic',landmark:{zh:'无名航标',en:'Unnamed Waymark'}},
];

const address = (coords:number[][], regionId:string,clusterId:string):WorldIslandAddress[] => coords.map(([x,y],order)=>({id:`i_${x}_${y}`,regionId,clusterId,order}));
const chapter = (y:number,regionId:string,clusterId:string)=>address([[0,y],[-2,y],[2,y],[0,y-2]],regionId,clusterId);
const cluster=(id:string,x:number,y:number,angle:number,step=2.23,stretchY=.8):WorldCluster=>({id,offset:{x,y},angle,step,stretchY,radius:218,centerIsland:true,radiusVariation:24});
export const WORLD_CLUSTERS:WorldCluster[]=[
    cluster('haven-core',-150,35,.4),cluster('crescent-core',-150,35,.9,1.95),
    {...cluster('haven-satellites',110,-90,-Math.PI*.85,.49),radius:310,centerIsland:false,radiusVariation:63},
    {...cluster('crescent-satellites',110,-90,-Math.PI*.75,.48),radius:330,centerIsland:false,radiusVariation:52},
    cluster('amber-west',-150,35,1.2,2.1,.65),cluster('amber-east',225,70,-1.3,1.85,.9),
    cluster('rift-west',-150,35,-.4,2.1,1.05),cluster('rift-east',225,70,1.1,2.4,1.05),
    cluster('frost-west',-150,35,3.2,2.3,.65),cluster('frost-east',225,70,2.9,2.1,.7),
    cluster('prism-west',-150,35,1.6,2.6,.95),cluster('prism-east',225,70,-.7,1.8,.85),
];
/** Stable content IDs are legacy IDs, not positions in this atlas. */
export const WORLD_ISLAND_ADDRESSES: WorldIslandAddress[] = [
    ...address([[0,0],[-3,0],[3,0],[0,3]],'haven','haven-core'),
    ...address([[2,-2],[3,-2],[4,-2],[2,-1],[3,-1],[4,-1],[2,1],[3,1],[4,1],[5,1]],'haven','haven-satellites'),
    ...address([[0,-3],[-2,-3],[2,-3],[0,-5]],'crescent','crescent-core'),
    ...address([[-1,-1],[0,-1],[1,-1],[-2,-1],[-1,-2],[0,-2],[1,-2],[-2,-2],[2,0],[-2,0]],'crescent','crescent-satellites'),
    ...chapter(-8,'amber-reach','amber-west'),...chapter(-12,'amber-reach','amber-east'),
    ...chapter(-16,'rift','rift-west'),...chapter(-20,'rift','rift-east'),
    ...chapter(-24,'frostfield','frost-west'),...chapter(-28,'frostfield','frost-east'),
    ...chapter(-32,'prism','prism-west'),...chapter(-36,'prism','prism-east'),
];

export const WORLD_POINTS_OF_INTEREST: WorldPointOfInterest[] = WORLD_REGIONS.map((region,index)=>({
    id:`landmark:${region.id}`,regionId:region.id,position:{x:region.center.x+35,y:region.center.y-115},
    name:region.landmark,description:region.description,kind:index%3===0?'beacon':index%3===1?'archive':'garden',
}));

export const getWorldRegion=(id?:string)=>WORLD_REGIONS.find(region=>region.id===id);
