const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.ART_PLAYWRIGHT || 'playwright');
const { fixture } = require('./art-fixtures.cjs');
const output = path.resolve('artifacts/art-upgrade/qa');
const report = { date: new Date().toISOString(), url: process.env.ART_URL || 'http://127.0.0.1:3000/', checks: [], errors: [], failedResources: [] };
fs.mkdirSync(output, { recursive: true });
function check(name, detail) { report.checks.push({ name, detail }); console.log('PASS ' + name); }
async function frame(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: process.env.ART_BROWSER });
 try {
  async function open(level=10, opts={}) {
   const context=await browser.newContext({viewport:{width:opts.width||1366,height:opts.height||768},deviceScaleFactor:opts.dpr||1,reducedMotion:opts.motion||'reduce'});
   const page=await context.newPage();
   page.on('pageerror',error=>report.errors.push(error.message));
   page.on('response',response=>{ if(response.status()>=400) report.failedResources.push({url:response.url(),status:response.status()}); });
   await page.addInitScript(({save,language})=>{
    localStorage.setItem('logic_game_save_1',JSON.stringify(save));
    localStorage.setItem('completed_tutorials',JSON.stringify(Array.from({length:20},(_,i)=>i)));
    if(language) localStorage.setItem('language',language);
   },{save:opts.save||fixture(level,!!opts.story),language:opts.language});
   await page.goto(report.url,{waitUntil:'networkidle',timeout:90000});
   await page.getByRole('button',{name:opts.language==='en'?/^Continue/:/^继续游戏/}).click();
   await page.locator('canvas').first().waitFor();
   if(!opts.story) {
    const intro=page.getByRole('button',{name:opts.language==='en'?'Back':'返回',exact:true});
    if(await intro.count()) await intro.first().click();
   }
   await frame(page);
   return {context,page};
  }
  // All shipped chapters restore from isolated version-2 save fixtures.
  for(let level=0;level<(process.env.ART_SKIP_CHAPTERS ? 0 : 20);level++){
   const {context,page}=await open(level);
   assert.ok(await page.locator('canvas').first().isVisible());
   if([0,9,10,19].includes(level)) await page.screenshot({path:path.join(output,'chapter-'+(level+1)+'.png')});
   await context.close();
  }
  if(!process.env.ART_SKIP_CHAPTERS) check('20 chapters restore and render');
  {
   const {context,page}=await open(10);
   await page.getByRole('button',{name:'逻辑农场',exact:true}).click();
   await page.locator('.farm-modal').waitFor();
   assert.equal(await page.locator('.farm-plot').count(),6);
   assert.equal(await page.locator('.farm-resource-coins b').innerText(),'500');
   await page.locator('[data-plot-id="plot-1"]').click();
   assert.equal(await page.locator('.farm-resource-coins b').innerText(),'510');
   assert.equal(await page.locator('[data-plot-id="plot-1"]').getAttribute('data-stage'),'empty');
   await page.locator('[data-plot-id="plot-6"]').click();
   assert.equal(await page.locator('.farm-resource-coins b').innerText(),'506');
   assert.equal(await page.locator('[data-plot-id="plot-6"]').getAttribute('data-stage'),'0');
   await page.locator('.farm-seed-choice').nth(1).click();
   await page.locator('[data-plot-id="plot-1"]').click();
   assert.equal(await page.locator('.farm-resource-coins b').innerText(),'492');
   await page.screenshot({path:path.join(output,'farm-interactions.png')});
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('.farm-modal').count(),0);
   await page.getByRole('button',{name:'证明交易所',exact:true}).click();
   assert.equal(await page.locator('.foundry-use-counter b').innerText(),'10');
   await page.locator('.foundry-pack').first().click();
   assert.equal(await page.locator('.foundry-use-counter b').innerText(),'15');
   assert.equal(await page.locator('.farm-resource-coins b').innerText(),'432');
   await page.locator('.foundry-pack').nth(2).click();
   assert.equal(await page.locator('.farm-resource-coins b').innerText(),'72');
   assert.equal(await page.locator('.foundry-pack').nth(1).isDisabled(),true);
   assert.equal(await page.locator('.foundry-pack').nth(2).isDisabled(),true);
   await page.screenshot({path:path.join(output,'exchange-interactions.png')});
   await page.keyboard.press('Escape');
   await page.locator('.art-game-actions button[title="存档"]').click();
   await page.getByRole('button',{name:'存档 · 存档 2',exact:true}).click();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('logic_game_save_2')));
   assert.equal(saved.metaProgress.coins,72);
   assert.equal(saved.metaProgress.quickMpUses,55);
   assert.equal(saved.metaProgress.farm.plots[5].cropId,'axiom-wheat');
   check('farm harvest/plant, exchange purchase/insufficient coins, manual save', {coins:72,mpUses:55});
   await context.close();
  }
  for(const dims of [[1920,1080],[1366,768],[1024,768],[390,844]]){
   const {context,page}=await open(13,{story:true,width:dims[0],height:dims[1]});
   await page.locator('.story-scene').waitFor();
   const dialogue=page.locator('.story-dialogue');
   const bounds=await dialogue.boundingBox();
   assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=dims[0]+1&&bounds.y+bounds.height<=dims[1]+1);
   await page.screenshot({path:path.join(output,'story-'+dims[0]+'.png')});
   await page.keyboard.press('Tab');
   assert.equal(await page.locator('.story-dialogue__continue').evaluate(el=>el===document.activeElement),true);
   await page.keyboard.press('Space');
   assert.equal(await page.locator('.story-scene').getAttribute('data-line-index'),'1');
   await context.close();
  }
  check('story layouts 1920/1366/1024/390 and keyboard focus');
  {
   const {context,page}=await open(18,{story:true,motion:'no-preference'});
   assert.equal(await page.locator('.story-scene__portrait-stage').getAttribute('data-halo'),'intact');
   await page.locator('.story-dialogue__continue').click();
   assert.ok((await page.locator('.story-dialogue__text').innerText()).length>5);
   assert.equal(await page.locator('.story-scene').getAttribute('data-line-index'),'0');
   await page.locator('.story-dialogue__continue').click();
   assert.equal(await page.locator('.story-scene').getAttribute('data-line-index'),'1');
   check('typewriter first click reveals; second advances');
   await context.close();
  }
  {
   const oldSave={version:2,timestamp:Date.now(),levelIndex:0,levelStates:{0:{nodes:[],wires:[]}}};
   const {context,page}=await open(0,{dpr:2,save:oldSave});
   const canvas=page.locator('canvas').first();
   assert.equal(await canvas.evaluate(el=>el.width),2732);
   await page.getByRole('button',{name:'设置',exact:true}).click();
   await page.getByRole('button',{name:'轻量',exact:true}).click();
   await page.getByRole('button',{name:'减少动态',exact:true}).click();
   await page.getByRole('button',{name:'English',exact:true}).click();
   await page.keyboard.press('Escape');
   await frame(page);
   assert.equal(await canvas.evaluate(el=>el.width),1366);
   const prefs=await page.evaluate(()=>({lang:document.documentElement.lang,prefs:JSON.parse(localStorage.getItem('logic-game-visual-settings-v1')),motion:document.documentElement.dataset.motion}));
   assert.equal(prefs.lang,'en'); assert.equal(prefs.motion,'reduced'); assert.equal(prefs.prefs.quality,'low');
   await page.screenshot({path:path.join(output,'english-low-dpr2.png')});
   check('legacy save without meta; DPR 2/low 1; English/reduced-motion persisted',prefs);
   await context.close();
  }
  {
   const {context,page}=await open(10);
   await page.mouse.move(610,390);
   await page.mouse.wheel(0,450); await frame(page);
   await page.screenshot({path:path.join(output,'world-medium.png')});
   await page.mouse.wheel(0,700); await frame(page);
   await page.screenshot({path:path.join(output,'world-far.png')});
   const timing=await page.evaluate(()=>new Promise(resolve=>{
    const times=[];let last=performance.now();
    function tick(now){times.push(now-last);last=now;if(times.length<120)requestAnimationFrame(tick);else {times.sort((a,b)=>a-b);resolve({medianFrameMs:times[60],p95FrameMs:times[114],samples:120});}}
    requestAnimationFrame(tick);
   }));
   check('world zoom/idle timing',timing);
   await context.close();
  }
  assert.deepEqual(report.errors,[]);
  assert.deepEqual(report.failedResources,[]);
  check('no page errors or failed resource responses');
 } finally {
  await browser.close();
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
