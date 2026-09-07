const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.ART_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ART_BROWSER});
 try {
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('logic_game_save_1',JSON.stringify({version:2,timestamp:Date.now(),levelIndex:1,levelStates:{1:{nodes:[],wires:[]}}}));
   localStorage.setItem('completed_tutorials',JSON.stringify(Array.from({length:20},(_,i)=>i)));
   const original=CanvasRenderingContext2D.prototype.fillText;
   const clear=CanvasRenderingContext2D.prototype.clearRect;
   window.placementWarnings=0;
   CanvasRenderingContext2D.prototype.clearRect=function(...args){
    if(this.canvas.width>=1000)window.placementWarnings=0;
    return clear.apply(this,args);
   };
   CanvasRenderingContext2D.prototype.fillText=function(text,...args){
    if(text==='此处无法放置'||text==='PLACEMENT BLOCKED')window.placementWarnings++;
    return original.call(this,text,...args);
   };
  });
  await page.goto(process.env.ART_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/^继续游戏/}).click();
  await page.locator('canvas').first().waitFor();
  async function warnings(){
   return page.evaluate(()=>new Promise(resolve=>{
    let frames=0;function frame(){if(++frames<4)requestAnimationFrame(frame);else resolve(window.placementWarnings);}requestAnimationFrame(frame);
   }));
  }
  await page.locator('#tool-atom-P').click();
  await page.mouse.click(383,259);
  assert.equal(await warnings(),0,'Successful placement must not show a blocked preview');
  const dir=path.resolve('artifacts/art-upgrade/placement');fs.mkdirSync(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,'placed.png')});
  await page.mouse.move(386,262);
  assert.equal(await warnings(),0,'Sub-cell jitter must remain quiet');
  await page.mouse.click(386,262);
  assert.ok(await warnings()>0,'A repeated click must explain the real collision');
  await page.mouse.move(283,409);
  assert.equal(await warnings(),0,'Empty position must allow the next placement');
  await page.mouse.move(383,259);
  assert.ok(await warnings()>0,'Returning to an occupied cell must show collision');
  await page.mouse.click(283,409);
  assert.equal(await warnings(),0,'A subsequent success must clear warning again');
  await page.locator('#tool-atom-Q').click();
  await page.mouse.move(283,409);
  assert.ok(await warnings()>0,'A different tool at the occupied cell must warn');
  await page.locator('.art-game-actions button[title="存档"]').click();
  await page.getByRole('button',{name:'存档 · 存档 2',exact:true}).click();
  const nodes=await page.evaluate(()=>JSON.parse(localStorage.getItem('logic_game_save_2')).levelStates[1].nodes);
  assert.equal(nodes.length,2,'Failed repeats must not add extra nodes');
  assert.ok(nodes.every(n=>n.subType==='P'));
  assert.deepEqual(errors,[]);
  const report={checks:['success stationary','sub-cell jitter','repeat click failure','move to free cell','return to occupied cell','second success','switch tool','saved node count'],errors};
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
