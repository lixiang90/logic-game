const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.ART_PLAYWRIGHT||'playwright');
const {fixture}=require('./art-fixtures.cjs');
const {getStage2LevelConfig}=require('../src/data/stage2.ts');
const {solveCircuitGoals}=require('../src/lib/circuit-solver.ts');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ART_BROWSER});
 const report={date:new Date().toISOString(),fixture:'saved, already-proved focus island; tests completion effects, not player proof discovery',checks:[],errors:[]};
 try{
 for(const index of [13,16]){
  const save=fixture(index); const config=getStage2LevelConfig('level-'+(index+1),42);
  const island=config.world.getIslandById(config.focusIslandId),b=island.goalBounds;
  save.metaProgress.farm.unlocked=false;save.metaProgress.quickMpUnlocked=false;save.metaProgress.quickMpUses=0;save.metaProgress.collectedTheorems={};
  const nodes=[{id:'proof-fixture',type:'premise',subType:island.goalFormula,customLabel:island.goalFormula,x:b.x-8,y:b.y-2,w:6,h:6,locked:false},
   ...[b.x-2,b.x-1].map(x=>({id:'proof-wire'+x,type:'wire',subType:'provable',x,y:b.y+1,w:1,h:1,rotation:0}))];
  assert.equal(solveCircuitGoals(nodes,[{id:island.id,formula:island.goalFormula,bounds:b}]).completedGoalIds.has(island.id),true);
  save.levelStates[index]={nodes,wires:[]};
  const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(save=>{localStorage.setItem('logic_game_save_1',JSON.stringify(save));localStorage.setItem('completed_tutorials',JSON.stringify(Array.from({length:20},(_,i)=>i)));},save);
  await page.goto(process.env.ART_URL||'http://127.0.0.1:4175/logicgame-test/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/^继续游戏/}).click();
  await page.getByRole('button',{name:'下一关',exact:true}).waitFor();
  await page.locator('.art-discovery-notice').waitFor();
  assert.ok((await page.locator('.art-discovery-notice').innerText()).includes('新定理已归档'));
  await page.locator('.art-game-actions button[title="存档"]').click();
  await page.getByRole('button',{name:'存档 · 存档 4',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('logic_game_save_4')));
  assert.ok(saved.metaProgress.completedIslandIds.includes(island.id));
  if(index===13) assert.equal(saved.metaProgress.farm.unlocked,true);
  else {assert.equal(saved.metaProgress.quickMpUnlocked,true);assert.equal(saved.metaProgress.quickMpUses,3);}
  assert.ok(Object.keys(saved.metaProgress.collectedTheorems).length>0);
  report.checks.push({chapter:index-9,farm:saved.metaProgress.farm.unlocked,mp:saved.metaProgress.quickMpUnlocked,uses:saved.metaProgress.quickMpUses,theorems:Object.keys(saved.metaProgress.collectedTheorems)});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);
 }finally{await browser.close();fs.writeFileSync(path.resolve('artifacts/art-upgrade/qa/progression-report.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1;});
