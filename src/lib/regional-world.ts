import type { Stage2IslandDefinition, Stage2MapBounds, Stage2WorldConfig } from '@/types/stage2';
import type { IslandProfile, WorldIslandAddress, WorldRegion, RegionalWorldDefinition,WorldCluster } from '@/types/world';
import { WORLD_BIOMES, WORLD_ISLAND_ADDRESSES, WORLD_POINTS_OF_INTEREST, WORLD_REGIONS,WORLD_CLUSTERS } from '@/data/world-regions';
import { boundsOverlap } from './gameUtils';

const hash=(text:string,seed:number)=>{let n=seed|0;for(const char of text)n=Math.imul(n^char.charCodeAt(0),16777619);return n>>>0;};
const random=(key:string,seed:number)=>(hash(key,seed)%100003)/100003;
type Center={x:number;y:number};
export const DEFAULT_REGIONAL_WORLD:RegionalWorldDefinition={regions:WORLD_REGIONS,biomes:WORLD_BIOMES,addresses:WORLD_ISLAND_ADDRESSES,clusters:WORLD_CLUSTERS,pointsOfInterest:WORLD_POINTS_OF_INTEREST};
const dimensions=(id:string,seed:number)=>({w:162+hash(id+'width',seed)%89,h:124+hash(id+'height',seed)%61});

/** Layout receives the complete stable address registry, never just discovered
 * islands. Visibility and chapter order cannot change existing coordinates. */
export function createAtlasPositions(seed:number,addresses:WorldIslandAddress[]=WORLD_ISLAND_ADDRESSES,regions:WorldRegion[]=WORLD_REGIONS,clusters:WorldCluster[]=WORLD_CLUSTERS) {
    const positions=new Map<string,Center>();
    const sizes=new Map(addresses.map(address=>[address.id,dimensions(address.id,seed)]));
    for(const address of addresses) {
        const region=regions.find(r=>r.id===address.regionId);
        if(!region)throw new Error(`Unknown region ${address.regionId}`);
        const cluster=clusters.find(c=>c.id===address.clusterId);if(!cluster)throw new Error(`Unknown cluster ${address.clusterId}`);
        const center={x:region.center.x+cluster.offset.x,y:region.center.y+cluster.offset.y};
        const i=address.order;
        const angle=cluster.angle+i*cluster.step;
        const radius=i===0&&cluster.centerIsland?0:cluster.radius+(i%(cluster.centerIsland?2:3))*cluster.radiusVariation;
        positions.set(address.id,{x:center.x+Math.cos(angle)*radius+(random(address.id+'x',seed)-.5)*34,y:center.y+Math.sin(angle)*radius*cluster.stretchY+(random(address.id+'y',seed)-.5)*26});
    }
    // Separate occupied envelopes, with space left for coastline and docks.
    for(let pass=0;pass<180;pass++) {
        let moved=false;
        for(let i=0;i<addresses.length;i++)for(let j=i+1;j<addresses.length;j++) {
            const a=positions.get(addresses[i].id)!,b=positions.get(addresses[j].id)!;
            const sizeA=sizes.get(addresses[i].id)!,sizeB=sizes.get(addresses[j].id)!;
            const dx=b.x-a.x,dy=b.y-a.y,overlapX=(sizeA.w+sizeB.w)/2+28-Math.abs(dx),overlapY=(sizeA.h+sizeB.h)/2+28-Math.abs(dy);
            if(overlapX<=0||overlapY<=0)continue;
            if(overlapX<overlapY){const step=(overlapX+1)*.5*(dx>=0?1:-1);a.x-=step;b.x+=step;}
            else {const step=(overlapY+1)*.5*(dy>=0?1:-1);a.y-=step;b.y+=step;}
            moved=true;
        }
        if(!moved)break;
    }
    for(const p of positions.values()){p.x=Math.round(p.x);p.y=Math.round(p.y);}
    return positions;
}

function coastline(profile:IslandProfile,x:number,y:number,w:number,h:number,phase:number) {
    const ellipse=(cx:number,cy:number,rx:number,ry:number)=>((x-cx)/rx)**2+((y-cy)/ry)**2;
    const angle=Math.atan2((y-h*.5)/h,(x-w*.5)/w);
    const edge=1+.065*Math.sin(angle*5+phase)+.035*Math.sin(angle*9-phase);
    let inside=ellipse(w*.49,h*.5,w*.49,h*.49)<edge;
    if(profile==='twin')inside=ellipse(w*.32,h*.45,w*.33,h*.46)<edge||ellipse(w*.69,h*.57,w*.30,h*.41)<edge;
    if(profile==='ridge')inside=ellipse(w*.49,h*.49,w*.49,h*.35)<edge||ellipse(w*.68,h*.60,w*.29,h*.35)<edge;
    if(profile==='crescent')inside=inside&&ellipse(w*.97,h*.43,w*.34,h*.34)>1;
    if(profile==='cove')inside=inside&&ellipse(w*.74,h*.99,w*.14,h*.28)>1;
    if(profile==='shattered')inside=inside&&ellipse(w*.98,h*.64,w*.21,h*.12)>1&&ellipse(w*.65,h*.02,w*.10,h*.15)>1;
    return inside;
}

export function createRegionalWorld(seed:number,legacy:Stage2WorldConfig,definition:RegionalWorldDefinition=DEFAULT_REGIONAL_WORLD):Stage2WorldConfig {
    const positions=createAtlasPositions(seed,definition.addresses,definition.regions,definition.clusters),cache=new Map<string,Stage2IslandDefinition>();
    const addresses=new Map(definition.addresses.map(a=>[a.id,a]));
    const getIslandById=(id:string):Stage2IslandDefinition|null=>{
        if(cache.has(id))return cache.get(id)!;
        const address=addresses.get(id),center=positions.get(id);
        if(!address||!center)return null;
        const original=legacy.getIslandById(id);if(!original)return null;
        const region=definition.regions.find(r=>r.id===address.regionId)!,biome=definition.biomes[region.biomeId];
        const profile=biome.profiles[hash(id+'profile',seed)%biome.profiles.length];
        const {w,h}=dimensions(id,seed);
        const bounds={x:Math.round(center.x-w/2),y:Math.round(center.y-h/2),w,h};
        const dx=bounds.x+27-original.mapBounds.x,dy=bounds.y+25-original.mapBounds.y;
        const goalBounds=original.goalBounds?{...original.goalBounds,x:original.goalBounds.x+dx,y:original.goalBounds.y+dy}:undefined;
        const premiseNodes=original.premiseNodes?.map(p=>({...p,x:p.x+dx,y:p.y+dy}));
        const obstacles=[...(goalBounds?[goalBounds]:[]),...(premiseNodes??[])];
        const protectedRects=[{x:bounds.x+24,y:bounds.y+24,w:100,h:80},...obstacles.map(p=>({x:p.x-4,y:p.y-4,w:p.w+8,h:p.h+8}))];
        const mask=new Uint8Array(w*h);
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
            const world={x:bounds.x+x,y:bounds.y+y};
            const protectedCell=protectedRects.some(r=>world.x>=r.x&&world.x<r.x+r.w&&world.y>=r.y&&world.y<r.y+r.h);
            if(protectedCell||coastline(profile,x+.5,y+.5,w,h,random(id,seed)*6))mask[y*w+x]=1;
        }
        // Remove disconnected single-cell artifacts; protected workshop stays connected.
        const queue=new Int32Array(w*h);let head=0,tail=1;queue[0]=30*w+30;mask[queue[0]]=2;
        const enqueue=(index:number)=>{if(mask[index]===1){mask[index]=2;queue[tail++]=index;}};
        while(head<tail){const index=queue[head++],x=index%w,y=Math.floor(index/w);if(x>0)enqueue(index-1);if(x<w-1)enqueue(index+1);if(y>0)enqueue(index-w);if(y<h-1)enqueue(index+w);}
        const tiles=[],coastlineEdges=[];
        for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]===2){
            const wx=bounds.x+x,wy=bounds.y+y;tiles.push({x:wx,y:wy});
            if(y===0||mask[(y-1)*w+x]!==2)coastlineEdges.push({ax:wx,ay:wy,bx:wx+1,by:wy});
            if(x===w-1||mask[y*w+x+1]!==2)coastlineEdges.push({ax:wx+1,ay:wy,bx:wx+1,by:wy+1});
            if(y===h-1||mask[(y+1)*w+x]!==2)coastlineEdges.push({ax:wx+1,ay:wy+1,bx:wx,by:wy+1});
            if(x===0||mask[y*w+x-1]!==2)coastlineEdges.push({ax:wx,ay:wy+1,bx:wx,by:wy});
        }
        const island={...original,mapBounds:bounds,buildTiles:tiles,coastlineEdges,goalBounds,premiseNodes,regionId:region.id,biomeId:biome.id,biome,contentDomainId:region.contentDomainId,profile};
        cache.set(id,island);return island;
    };
    // Keep waymarks in clear cloudwater, outside construction and port footprints.
    const pointsOfInterest=definition.pointsOfInterest.map(point=>{
        let position=point.position;
        const free=(p:Center)=>definition.addresses.every(address=>{const center=positions.get(address.id)!,size=dimensions(address.id,seed);return !boundsOverlap({x:p.x-12,y:p.y-12,w:24,h:24},{x:center.x-size.w/2,y:center.y-size.h/2,...size});});
        search:for(let radius=0;radius<=720;radius+=24)for(let step=0;step<24;step++){
            const angle=step*Math.PI/12,candidate={x:Math.round(point.position.x+radius*Math.cos(angle)),y:Math.round(point.position.y+radius*Math.sin(angle))};
            if(free(candidate)){position=candidate;break search;}
        }
        return {...point,position};
    });
    const allBounds=[...positions.values(),...pointsOfInterest.map(point=>point.position)];
    const left=Math.min(...allBounds.map(p=>p.x))-230,top=Math.min(...allBounds.map(p=>p.y))-190;
    const bounds={x:left,y:top,w:Math.max(...allBounds.map(p=>p.x))+230-left,h:Math.max(...allBounds.map(p=>p.y))+190-top};
    return {chunkW:214,chunkH:164,getIslandById,
        getIslandsInBounds:(view:Stage2MapBounds)=>definition.addresses.filter(a=>{
            const p=positions.get(a.id)!;return boundsOverlap({x:p.x-130,y:p.y-100,w:260,h:200},view);
        }).map(a=>getIslandById(a.id)!).filter(Boolean),
        atlas:{version:2,regions:definition.regions,biomes:definition.biomes,pointsOfInterest,bounds},
    };
}
