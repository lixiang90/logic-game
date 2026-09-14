const assert=require('node:assert/strict');
const {fixture}=require('./art-fixtures.cjs');
const {getStage2LevelConfig}=require('../src/data/stage2.ts');
const {WORLD_ISLAND_ADDRESSES,WORLD_REGIONS}=require('../src/data/world-regions.ts');
const {createAtlasPositions,createRegionalWorld,DEFAULT_REGIONAL_WORLD}=require('../src/lib/regional-world.ts');
const {harborSites,validateHarborSite,ensureHarbors,putHarbor,islandHarbors}=require('../src/lib/harbors.ts');
const {boundsOverlap}=require('../src/lib/gameUtils.ts');
const {encodeSave,decodeSave,SaveSystem}=require('../src/lib/saveSystem.ts');
const {STORY_SCENES}=require('../src/data/story.ts');
const {isStoryAvailable,chooseStoryOption,finishStory,normalizeStoryProgress}=require('../src/lib/story-engine.ts');
const {createDefaultStage2MetaProgress}=require('../src/types/stage2.ts');
let islands=0,ports=0;const profiles=new Set(),sizes=new Set();
assert.equal(new Set(WORLD_ISLAND_ADDRESSES.map(a=>a.id)).size,WORLD_ISLAND_ADDRESSES.length);
for(const seed of [42,731,991]){
 const first=getStage2LevelConfig('level-11',seed,2),last=getStage2LevelConfig('level-20',seed,2);
 const positions=createAtlasPositions(seed);assert.deepEqual(positions,createAtlasPositions(seed));
 for(let chapter=1;chapter<=10;chapter++){
  const config=getStage2LevelConfig(`level-${10+chapter}`,seed,2);
  for(const id of [...config.goalIslandIds,...config.initialUnlockedIslandIds])assert(config.world.getIslandById(id),`${chapter}: missing ${id}`);
 }
 const generated=WORLD_ISLAND_ADDRESSES.map(a=>last.world.getIslandById(a.id));
 assert.deepEqual(first.world.atlas.pointsOfInterest,last.world.atlas.pointsOfInterest);
 for(const point of last.world.atlas.pointsOfInterest)for(const island of generated)assert(!boundsOverlap({x:point.position.x-8,y:point.position.y-8,w:16,h:16},island.mapBounds),'waymarks stay clear of construction');
 for(let i=0;i<generated.length;i++)for(let j=i+1;j<generated.length;j++)assert(!boundsOverlap(generated[i].mapBounds,generated[j].mapBounds),'island envelopes do not overlap');
 for(const island of generated){
  islands++;profiles.add(island.profile);sizes.add(`${island.mapBounds.w}x${island.mapBounds.h}`);
  assert.deepEqual(first.world.getIslandById(island.id).mapBounds,island.mapBounds,'positions stable across chapters');
  assert.deepEqual(first.world.getIslandById(island.id).buildTiles,island.buildTiles,'coast stable before content unlock');
  const tiles=new Set(island.buildTiles.map(p=>`${p.x},${p.y}`)),b=island.mapBounds;
  for(let x=24;x<124;x++)for(let y=24;y<104;y++)assert(tiles.has(`${b.x+x},${b.y+y}`),'continuous workshop');
  for(const rect of [...(island.premiseNodes||[]),...(island.goalBounds?[island.goalBounds]:[])])for(let x=rect.x;x<rect.x+rect.w;x++)for(let y=rect.y;y<rect.y+rect.h;y++)assert(tiles.has(`${x},${y}`),`${island.id} premise/goal on land`);
  const connected=new Set(),queue=[island.buildTiles[0]];
  for(let j=0;j<queue.length;j++){const p=queue[j],key=`${p.x},${p.y}`;if(connected.has(key)||!tiles.has(key))continue;connected.add(key);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:p.x+dx,y:p.y+dy});}
  assert.equal(connected.size,tiles.size,'connected buildable land');
  const sites=harborSites(island);assert(sites.length>5,`${island.id} supports multiple shore ports`);ports+=sites.length;
 }
}
assert.equal(profiles.size,6);assert(sizes.size>20);
const {showIslandTheorem}=require('../src/lib/render/world-art.ts');
const visibleIsland=getStage2LevelConfig('level-16',42,2).world.getIslandById('i_0_-20');assert(showIslandTheorem(visibleIsland,.075,true));assert(!showIslandTheorem(visibleIsland,.008,true));
const old=fixture(15),oldConfig=getStage2LevelConfig('level-16',42,1);delete old.metaProgress.worldVersion;delete old.metaProgress.story;
const restored=decodeSave(encodeSave(old));assert.equal(restored.metaProgress.worldVersion,1);assert.deepEqual(restored.metaProgress.story,{version:1,choices:{},reading:{},skippedIds:[]});
assert.deepEqual(getStage2LevelConfig('level-16',42,restored.metaProgress.worldVersion).world.getIslandById(oldConfig.focusIslandId),oldConfig.world.getIslandById(oldConfig.focusIslandId));
const regional=fixture(15,false,2),config=getStage2LevelConfig('level-16',42,2),main=config.world.getIslandById(config.focusIslandId);
let progress=ensureHarbors(regional.metaProgress,config,[]);const site=harborSites(main).find(s=>validateHarborSite(main,progress,[],s.x,s.y));progress=putHarbor(progress,main,[],site.x,site.y);assert.equal(islandHarbors(main,progress).length,2);
assert.deepEqual(decodeSave(encodeSave({...regional,metaProgress:progress})).metaProgress,progress);
let story=createDefaultStage2MetaProgress(42);
assert(!isStoryAvailable(STORY_SCENES['companion-first-harvest'],story,5));
story={...story,seenStoryIds:['stage2-5'],farm:{...story.farm,unlocked:true}};assert(!isStoryAvailable(STORY_SCENES['companion-first-harvest'],story,5));
story.farm.harvestedCount=1;assert(isStoryAvailable(STORY_SCENES['companion-first-harvest'],story,5));
story=chooseStoryOption(story,'stage2-1','journal-purpose','moments');assert.equal(story.story.choices['journal-purpose'],'moments');assert.equal(chooseStoryOption(story,'stage2-1','journal-purpose','invalid'),story);
const coins=story.coins;story=finishStory(story,'stage2-1',true);assert(story.seenStoryIds.includes('stage2-1'));assert(story.story.skippedIds.includes('stage2-1'));assert.equal(story.coins,coins);story=finishStory(story,'stage2-1',false);assert(!story.story.skippedIds.includes('stage2-1'));
story={...story,seenStoryIds:[...story.seenStoryIds,'stage2-10']};assert(!isStoryAvailable(STORY_SCENES['epilogue-second-gate'],story,10));story.completedIslandIds=['i_0_-36'];assert(isStoryAvailable(STORY_SCENES['epilogue-second-gate'],story,10));
const normalized=normalizeStoryProgress({choices:{'journal-purpose':'invalid',unknown:'yes'},reading:{'stage2-1':999,'stage2-2':-1},skippedIds:['unknown']});assert.deepEqual(normalized.choices,{});assert.equal(normalized.reading['stage2-2'],0);assert.equal(normalized.reading['stage2-1'],STORY_SCENES['stage2-1'].lines.length-1);
const choiceIds=[];let lines=0;
for(const scene of Object.values(STORY_SCENES)){assert(scene.lines.length>=4);for(const line of scene.lines){lines++;assert(line.zh&&line.en);if(line.choice){choiceIds.push(line.choice.id);assert.equal(new Set(line.choice.options.map(o=>o.id)).size,line.choice.options.length);for(const option of line.choice.options)assert(option.text.zh&&option.text.en&&option.reply.zh&&option.reply.en);}}}
assert.equal(new Set(choiceIds).size,choiceIds.length);
assert.equal(SaveSystem.normalizeSaveData({...regional,metaProgress:{...progress,worldVersion:3}}),null,'reject unknown future map version');
assert.equal(SaveSystem.normalizeSaveData({...regional,metaProgress:{...progress,story:{...progress.story,version:2}}}),null,'reject unknown future story version');
let events=createDefaultStage2MetaProgress(42);events.seenStoryIds=Array.from({length:10},(_,i)=>`stage2-${i+1}`);
for(const id of ['companion-garden-seat','companion-harbor','companion-proof-reuse','explore-first-light','explore-three-regions','epilogue-second-gate'])assert(!isStoryAvailable(STORY_SCENES[id],events,10),id+' not premature');
events.farm.unlocked=true;assert(isStoryAvailable(STORY_SCENES['companion-garden-seat'],events,4));
events.harbors={a:[{id:'1'}],b:[{id:'2'}]};assert(!isStoryAvailable(STORY_SCENES['companion-harbor'],events,2),'two defaults are not a second harbor');events.harbors.a.push({id:'3'});assert(isStoryAvailable(STORY_SCENES['companion-harbor'],events,2));
events.plannedRoutes=[{sourceIslandId:'a',targetIslandId:'b'}];assert(!isStoryAvailable(STORY_SCENES['companion-proof-reuse'],events,3),'planned routes are not proof reuse');events.proofDependencies={b:['a']};assert(isStoryAvailable(STORY_SCENES['companion-proof-reuse'],events,3));
events.discoveredLandmarkIds=['landmark:haven','landmark:haven','landmark:haven'];assert(!isStoryAvailable(STORY_SCENES['explore-three-regions'],events,3));events.discoveredLandmarkIds=['landmark:haven','landmark:prism','landmark:rift'];assert(isStoryAvailable(STORY_SCENES['explore-three-regions'],events,3));
const domainScene={...STORY_SCENES['stage2-1'],condition:{minChapter:1,contentDomainId:'test-domain'}};assert(!isStoryAvailable(domainScene,events,10));assert(isStoryAvailable(domainScene,events,10,'test-domain'));
const custom={...DEFAULT_REGIONAL_WORLD,regions:[{...WORLD_REGIONS[0],id:'test-region',biomeId:'test-biome',contentDomainId:'test-domain'}],biomes:{'test-biome':{...DEFAULT_REGIONAL_WORLD.biomes.meadow,id:'test-biome',ground:'#123456'}},addresses:[{id:'i_0_0',regionId:'test-region',clusterId:'test-cluster',order:0}],clusters:[{...DEFAULT_REGIONAL_WORLD.clusters[0],id:'test-cluster'}],pointsOfInterest:[]};
const customWorld=createRegionalWorld(42,getStage2LevelConfig('level-11',42,1).world,custom);assert.equal(customWorld.getIslandById('i_0_0').biome.ground,'#123456');assert.equal(customWorld.getIslandById('i_0_0').contentDomainId,'test-domain');assert.equal(customWorld.getIslandById('i_0_0').regionId,'test-region');
console.log(JSON.stringify({islands,coastalSites:ports,profiles:[...profiles],sizes:sizes.size,regions:WORLD_REGIONS.length,scenes:Object.keys(STORY_SCENES).length,lines,choices:choiceIds.length,checks:['stable coordinates and coastline','all chapter identities','connected workshop/goal/premise land','multiple coastal ports','legacy and regional saves','event prerequisites','validated choices and skip','ending only after real proof']}));
