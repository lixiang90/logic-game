const assert=require('node:assert/strict');
const {fixture}=require('./art-fixtures.cjs');
const {getStage2LevelConfig}=require('../src/data/stage2.ts');
const {harborSites,harborBounds,harborAnchor,islandHarbors,ensureHarbors,validateHarborSite,putHarbor,removeHarbor}=require('../src/lib/harbors.ts');
const {buildShippingRoutes,shippingIslands}=require('../src/lib/shipping.ts');
const {boundsOverlap}=require('../src/lib/gameUtils.ts');
const {encodeSave,decodeSave}=require('../src/lib/saveSystem.ts');
const {shippingPanels}=require('../src/lib/render/shipping-art.ts');
let checked=0;
for(const seed of [42,731]) for(let chapter=1;chapter<=10;chapter++) {
    const config=getStage2LevelConfig(`level-${10+chapter}`,seed);
    const progress=fixture(9+chapter).metaProgress;
    progress.mapSeed=seed; progress.unlockedIslandIds=[...new Set([...config.goalIslandIds,...config.initialUnlockedIslandIds])];
    const initialized=ensureHarbors(progress,config,[]);
    assert.equal(ensureHarbors(initialized,config,[]),initialized,'defaults stabilize');
    for(const island of shippingIslands(config,initialized)) {
        const port=islandHarbors(island,initialized)[0];assert(port,`${island.name} has shore site`);
        const tiles=new Set(island.buildTiles.map(p=>`${p.x},${p.y}`));
        for(let dx=0;dx<4;dx++)for(let dy=0;dy<3;dy++)assert(tiles.has(`${port.x+dx},${port.y+dy}`));
        assert(validateHarborSite(island,initialized,[],port.x,port.y,port.id));
        assert(!validateHarborSite(island,initialized,[],port.x,port.y));
        if(island.goalBounds)assert(!boundsOverlap(harborBounds(port),island.goalBounds));
        checked++;
    }
}
const config=getStage2LevelConfig('level-16',42),save=fixture(15),main=config.world.getIslandById(config.focusIslandId);
let progress=ensureHarbors(save.metaProgress,config,[]);
const first=islandHarbors(main,progress)[0];
const extra=harborSites(main).find(p=>validateHarborSite(main,progress,[],p.x,p.y));assert(extra);
const obstacle={id:'circuit',type:'atom',subType:'P',x:extra.x,y:extra.y,w:4,h:4};
assert.equal(putHarbor(progress,main,[obstacle],extra.x,extra.y),progress);
assert.equal(putHarbor(progress,main,[],main.goalBounds.x,main.goalBounds.y),progress);
progress=putHarbor(progress,main,[],extra.x,extra.y);
const second=islandHarbors(main,progress)[1]; assert(second);
const sources=config.goalIslandIds.filter(id=>id!==main.id);
progress={...progress,plannedRoutes:sources.map(sourceIslandId=>({sourceIslandId,targetIslandId:main.id}))};
const key=`${sources[0]}>${main.id}`;
progress={...progress,routePorts:{[key]:{targetPortId:second.id}}};
let routes=buildShippingRoutes(config,progress,[],new Map());
for(const scale of [.1,.3,.75,1,2]) {
    const cards=[...shippingPanels(shippingIslands(config,progress),routes,progress,scale).values()].flat();
    for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++)assert(!boundsOverlap(cards[i],cards[j]),'nearby harbor cards do not overlap');
}
assert.equal(routes.find(r=>r.sourceIslandId===sources[0]).targetPortId,second.id);
const move=harborSites(main).find(p=>p.x!==second.x&&validateHarborSite(main,progress,[],p.x,p.y,second.id));assert(move);
const before=harborAnchor(second);
progress=putHarbor(progress,main,[],move.x,move.y,second.id);
assert.notDeepEqual(harborAnchor(islandHarbors(main,progress)[1]),before);
assert.equal(buildShippingRoutes(config,progress,[],new Map()).find(r=>r.sourceIslandId===sources[0]).targetPortId,second.id);
assert.deepEqual(decodeSave(encodeSave({...save,metaProgress:progress})).metaProgress.harbors,progress.harbors);
assert.deepEqual(decodeSave(encodeSave({...save,metaProgress:progress})).metaProgress.routePorts,progress.routePorts);
progress=removeHarbor(progress,main,second.id);
assert.equal(progress.routePorts[key].targetPortId,undefined);
assert.equal(buildShippingRoutes(config,progress,[],new Map()).find(r=>r.sourceIslandId===sources[0]).targetPortId,first.id);
assert.equal(removeHarbor(progress,main,first.id),progress);
const old=fixture(15).metaProgress;
const occupied={...obstacle,x:first.x,y:first.y,w:4,h:3};
const migrated=ensureHarbors(old,config,[occupied]);
assert(!boundsOverlap(harborBounds(islandHarbors(main,migrated)[0]),occupied),'old circuit preserved');
console.log(JSON.stringify({shorelineDefaults:checked,checks:['12 real coastal cells','goal/premise/circuit collisions','add/move/remove','stable route binding after move','removed binding auto-reassigned','minimum one harbor','old save circuit preserved','Base64 port/binding roundtrip']}));
