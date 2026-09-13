const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.ART_PLAYWRIGHT||'playwright');
const {fixture}=require('./art-fixtures.cjs');
const {getStage2LevelConfig}=require('../src/data/stage2.ts');
const {encodeSave,decodeSave}=require('../src/lib/saveSystem.ts');
const {theoremTool}=require('../src/lib/shipping.ts');
const {solveCircuitGoals}=require('../src/lib/circuit-solver.ts');
const dir=path.resolve('artifacts/shipping');fs.mkdirSync(dir,{recursive:true});
const config=getStage2LevelConfig('level-16',42), main=config.world.getIslandById(config.focusIslandId), source=config.world.getIslandById('i_0_-22');
const b=main.goalBounds,mp={id:'mp',type:'mp',subType:'mp',x:b.x-12,y:b.y-2,w:10,h:6};
const chip={...source.rewardTheorem,premises:[],sourceIslandId:source.id,virtual:true,freeUsesRemaining:0,useCount:1};
const a={...theoremTool(chip),id:'virtual-con3',x:mp.x-14,y:mp.y+2};
// Prewired evaluation fixture: formula sources feed an ordinary MP and the
// island's P→Q premise. This verifies the dependency lifecycle, not proof discovery.
const input=(id,formula,x,y)=>({id,type:'premise',subType:formula,customLabel:formula,x:x-1,y:y-1,w:1,h:2});
const wire=(id,x,y,w=1)=>({id,type:'wire',subType:'provable',x,y,w,h:1,rotation:0});
const nodes=[mp,a,input('var-p','P',a.x,a.y+1),input('var-q','Q',a.x,a.y+3),
 input('mp-formula-a','(P->Q)',mp.x,mp.y+1),input('mp-formula-b','(-.Q->-.P)',mp.x,mp.y+2),
 input('island-premise','|-(P->Q)',mp.x,mp.y+4),wire('major',a.x+10,a.y+3,4),wire('goal',b.x-2,b.y+1,2)];
const target={id:main.id,formula:main.goalFormula,bounds:b};
const before=solveCircuitGoals(nodes,[target],new Set());
assert(before.pendingGoalIds.has(main.id));assert(!before.completedGoalIds.has(main.id));
assert.deepEqual([...before.goalTheoremIds.get(main.id)],['con3']);
assert(solveCircuitGoals(nodes,[target],new Set(['con3'])).completedGoalIds.has(main.id));
// Feed a pre-established source proof with its final wire missing. The browser
// supplies that wire so the actual game completion handler must resolve A, then B.
const sb=source.goalBounds;
nodes.push(input('source-proof-fixture',source.goalFormula,sb.x-2,sb.y+1),wire('source-start',sb.x-2,sb.y+1));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ART_BROWSER});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  const save=fixture(15);save.version=3;save.metaProgress.collectedTheorems={con3:chip};save.levelStates[15]={nodes,wires:[]};
  await page.addInitScript(()=>{
    const fill=CanvasRenderingContext2D.prototype.fillText,clear=CanvasRenderingContext2D.prototype.clearRect;window.virtualPaints=0;
    CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.width>=1000)window.virtualPaints=0;return clear.apply(this,args);};
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(String(text).includes('虚 · 待源定理证明'))window.virtualPaints++;return fill.call(this,text,...args);};
  });
  await page.addInitScript(encoded=>{localStorage.setItem('logic_game_save_1',encoded);localStorage.setItem('completed_tutorials',JSON.stringify(Array.from({length:20},(_,i)=>i)));},encodeSave(save));
  await page.goto(process.env.ART_URL||'http://127.0.0.1:4177/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/^继续游戏/}).click();
  const back=page.getByRole('button',{name:'返回',exact:true});if(await back.count())await back.first().click();
  assert((await page.evaluate(()=>window.virtualPaints))>0,'pending theorem has a virtual canvas appearance');
  await page.getByRole('button',{name:/⚓ 航线/}).click();
  await page.getByText('电路推导已接通，等待虚芯片的源定理完成证明后正式结算。',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'下一关',exact:true}).count(),0);
  await page.screenshot({path:path.join(dir,'pending-proof.png')});
  await page.getByLabel('查看定理',{exact:true}).selectOption('con3');
  await page.getByRole('button',{name:'前往证明源定理',exact:true}).click();
  await page.locator('#tool-wire').click();await page.keyboard.press('t');
  const x=683+(sb.x-1-source.mapBounds.x-source.mapBounds.w/2)*25;
  const y=384+(sb.y+1-source.mapBounds.y-source.mapBounds.h/2)*25;
  await page.mouse.click(x,y);
  await page.getByRole('button',{name:'下一关',exact:true}).waitFor();
  await page.locator('.art-game-actions button[title="存档"]').click();
  await page.getByRole('button',{name:'存档 · 存档 3',exact:true}).click();
  const stored=decodeSave(await page.evaluate(()=>localStorage.getItem('logic_game_save_3')));
  assert(stored.metaProgress.completedIslandIds.includes(source.id));assert(stored.metaProgress.completedIslandIds.includes(main.id));
  assert.equal(stored.metaProgress.collectedTheorems.con3.virtual,false);
  assert.equal(stored.metaProgress.collectedTheorems.con3.freeUsesRemaining,5);
  assert.deepEqual(stored.metaProgress.proofDependencies[main.id],['con3']);
  assert.equal(stored.metaProgress.coins,500+source.rewardCoins+main.rewardCoins);
  assert(stored.levelStates[15].nodes.some(node=>node.id==='virtual-con3'));
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/⚓ 航线/}).click();
  await page.getByLabel('查看港口',{exact:true}).selectOption(main.id);
  assert.equal(await page.locator('.shipping-chip.is-proved').count(),1);
  await page.getByRole('button',{name:'定位群岛',exact:true}).click();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.evaluate(()=>window.virtualPaints),0,'the same saved chip renders real after the source proof');
  await page.getByRole('button',{name:/⚓ 航线/}).click();
  await page.getByRole('button',{name:'查看航线全景',exact:true}).click();
  await page.screenshot({path:path.join(dir,'resolved-routes.png')});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(dir,'resolution-report.json'),JSON.stringify({fixture:'prewired MP proof; source proof fixture completed by a real browser wire placement',pendingBefore:true,sourceResolved:true,dependentCompleted:true,coins:stored.metaProgress.coins,proofDependencies:stored.metaProgress.proofDependencies,errors},null,2));
 }finally{await browser.close();}
 console.log('PASS: source proof resolves virtual chip, dependent proof, rewards and saved dependency route');
})().catch(error=>{console.error(error);process.exitCode=1;});
