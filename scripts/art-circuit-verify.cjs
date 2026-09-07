const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.ART_PLAYWRIGHT||'playwright');
const {fixture}=require('./art-fixtures.cjs');
const {solveCircuit}=require('../src/lib/circuit-solver.ts');
const dir=path.resolve('artifacts/art-upgrade/qa');fs.mkdirSync(dir,{recursive:true});
const initial=[{id:'p',type:'atom',subType:'P',x:-16,y:-1,w:4,h:4},{id:'n',type:'gate',subType:'not',x:-10,y:-1,w:4,h:4},...[-12,-11,-6].map(x=>({id:'w'+x,type:'wire',subType:'formula',x,y:1,w:1,h:1,rotation:0}))];
assert.equal(solveCircuit(initial,'-.P').isSolved,false);
assert.equal(solveCircuit([...initial,{id:'final',type:'wire',subType:'formula',x:-5,y:1,w:1,h:1,rotation:0}],'-.P').isSolved,true);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ART_BROWSER});
 try{
 const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const save=fixture(0);save.levelStates[0]={nodes:initial,wires:[]};
 await page.addInitScript(save=>{localStorage.setItem('logic_game_save_1',JSON.stringify(save));localStorage.setItem('completed_tutorials',JSON.stringify(Array.from({length:20},(_,i)=>i)));},save);
 await page.goto(process.env.ART_URL||'http://127.0.0.1:3000/',{waitUntil:'networkidle',timeout:90000});
 await page.getByRole('button',{name:/^继续游戏/}).click();
 await page.locator('canvas').first().waitFor();
 await page.screenshot({path:path.join(dir,'circuit-unfinished.png')});
 await page.locator('#tool-wire').click();
 await page.mouse.click(558,409);
 await page.getByRole('button',{name:'下一关',exact:true}).waitFor();
 await page.screenshot({path:path.join(dir,'circuit-complete.png')});
 await page.getByRole('button',{name:'下一关',exact:true}).click();
 await page.locator('#tool-atom-Q').waitFor();
 assert.equal(await page.getByRole('button',{name:'下一关',exact:true}).count(),0);
 // Actual placement, undo, modal shortcut isolation, then persisted geometry.
 await page.locator('#tool-atom-P').click();await page.mouse.click(383,259);
 await page.keyboard.press('Control+z');
 await page.keyboard.press('Control+y');
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.keyboard.press('Control+z');await page.keyboard.press('ArrowRight');
 await page.keyboard.press('Escape');
 await page.locator('.art-game-actions button[title="存档"]').click();
 await page.getByRole('button',{name:'存档 · 存档 3',exact:true}).click();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('logic_game_save_3')));
 assert.equal(stored.levelIndex,1);
 assert.equal(stored.levelStates[1].nodes.length,1);
 assert.equal(stored.levelStates[1].nodes[0].subType,'P');
 assert.equal(stored.levelStates[1].nodes[0].x,-12);
 assert.equal(stored.levelStates[1].nodes[0].y,-5);
 assert.deepEqual(errors,[]);
 const report={date:new Date().toISOString(),checks:['real wire placement completes first proof','next chapter clears/completes transition','real atom placement, undo and redo','settings intercept undo/arrows','manual save retains exact node coordinates'],errors};
 fs.writeFileSync(path.join(dir,'circuit-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
