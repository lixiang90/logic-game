const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.ART_PLAYWRIGHT||'playwright');
const {fixture}=require('./art-fixtures.cjs');
const {STORY_SCENES}=require('../src/data/story.ts');
const {decodeSave}=require('../src/lib/saveSystem.ts');
const output=path.resolve('artifacts/region-story');fs.mkdirSync(output,{recursive:true});
const report={checks:[],errors:[],resources:[],timings:{}};
const pass=(s)=>{report.checks.push(s);console.log('PASS '+s);};
async function frame(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function saved(page){return decodeSave(await page.evaluate(()=>localStorage.getItem('logic_game_save_1')));}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ART_BROWSER});try{
async function open(level=10,options={}){
 const context=await browser.newContext({viewport:{width:options.width||1440,height:options.height||960},reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.resources.push(r.url());});
 await page.addInitScript(({save,language})=>{if(!sessionStorage.getItem('fixture-seeded')){localStorage.setItem('logic_game_save_1',JSON.stringify(save));sessionStorage.setItem('fixture-seeded','1');}localStorage.setItem('language',language);localStorage.setItem('completed_tutorials',JSON.stringify(Array.from({length:20},(_,i)=>i)));localStorage.setItem('logic-game-visual-settings-v1',JSON.stringify({quality:'standard',motion:'reduced'}));},{save:options.save||fixture(level,!!options.story,2),language:options.language||'zh'});
 await page.goto(process.env.ART_URL||'http://127.0.0.1:4177/',{waitUntil:'networkidle',timeout:90000});await page.getByRole('button',{name:options.language==='en'?/^Continue/:/^继续游戏/}).click();await page.locator('canvas').first().waitFor();await frame(page);
 if(!options.story){const back=page.getByRole('button',{name:options.language==='en'?'Back':'返回',exact:true});if(await back.count())await back.first().click();}return {context,page};
}
{
 const {context,page}=await open();assert(await page.locator('body').innerText());pass('production page loads with canvas and navigation');
 await page.screenshot({path:path.join(output,'island-detail.png')});
 await page.locator('.world-atlas-launch').click();assert.equal(await page.locator('.atlas-regions article').count(),6);await page.screenshot({path:path.join(output,'atlas.png')});
 const start=Date.now();await page.getByRole('button',{name:'展开真实世界地图',exact:true}).click();await frame(page);report.timings.firstOverviewMs=Date.now()-start;
 await page.screenshot({path:path.join(output,'world-overview.png')});pass('six-region atlas and actual world overview');
 await page.locator('.world-atlas-launch').click();await page.getByRole('button',{name:'归航灯塔',exact:false}).click();await page.getByRole('button',{name:'定位航标',exact:true}).click();await frame(page);
 await page.mouse.click(720,499);await page.getByRole('button',{name:'记入航行手记',exact:true}).click();assert(await page.getByText('你已经把这里记入航行手记。',{exact:true}).count());await page.screenshot({path:path.join(output,'landmark.png')});await page.getByRole('button',{name:'关闭航图',exact:true}).click();
 await page.locator('.story-journal-launch').click();assert(await page.getByText('路标的另一面',{exact:true}).count());await page.screenshot({path:path.join(output,'journal.png')});pass('waymark discovery unlocks optional exploration scene');
 await context.close();
}
if(process.env.ART_SMOKE_ONLY){assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);return;}
{
 const {context,page}=await open(10,{story:true});
 for(let i=0;i<6;i++)await page.locator('.story-dialogue__continue').click();
 assert.equal(await page.locator('.story-options button').count(),2);await page.screenshot({path:path.join(output,'story-choice.png')});
 await page.getByRole('button',{name:'记下路上遇见的事。',exact:true}).click();assert((await page.locator('.story-dialogue__text').innerText()).includes('追纸'));
 await page.getByRole('button',{name:'本段回看',exact:true}).click();assert((await page.locator('.story-transcript').innerText()).includes('记下路上遇见的事。'));await page.locator('.story-transcript').getByRole('button',{name:'返回对白',exact:true}).click();
 await page.waitForTimeout(900);const before=await saved(page);assert.equal(before.metaProgress.story.choices['journal-purpose'],'moments');
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/^继续游戏/}).click();await page.locator('.story-scene[data-line-index="6"]').waitFor();assert((await page.locator('.story-dialogue__text').innerText()).includes('追纸'));pass('choice saved, transcript accurate, reading resumes after reload');
 await page.getByRole('button',{name:'跳过本段',exact:true}).click();await page.getByRole('button',{name:'返回',exact:true}).click();await page.waitForTimeout(900);assert((await saved(page)).metaProgress.story.skippedIds.includes('stage2-1'));pass('skip is saved without inventing choices');
 await page.locator('.story-journal-launch').click();await page.getByRole('button',{name:'补读本段',exact:true}).click();
 while(await page.locator('.story-scene').count())await page.locator('.story-dialogue__continue').click();
 await page.waitForTimeout(900);const recorded=(await saved(page)).metaProgress.story;assert(!recorded.skippedIds.includes('stage2-1'));
 await page.locator('.story-journal-launch').click();await page.getByRole('button',{name:'回忆',exact:true}).click();
 for(let i=0;i<6;i++)await page.locator('.story-dialogue__continue').click();await page.getByRole('button',{name:'回忆中换个回答',exact:true}).click();await page.getByRole('button',{name:'记下走通的路。',exact:true}).click();assert((await page.locator('.story-dialogue__text').innerText()).includes('画岸线'));
 await page.getByRole('button',{name:'结束回忆',exact:true}).click();await page.waitForTimeout(900);assert.deepEqual((await saved(page)).metaProgress.story,recorded);pass('skipped story can be completed; alternate replay choice never changes progress');
 await context.close();
}
for(let chapter=2;chapter<=10;chapter++){
 const {context,page}=await open(9+chapter,{story:true,language:chapter===10?'en':'zh',width:chapter===10?390:1440,height:chapter===10?844:960});
 const scene=STORY_SCENES[`stage2-${chapter}`];
 for(let i=0;i<scene.lines.length;i++){
  assert.equal(await page.locator('.story-scene').getAttribute('data-line-index'),String(i));
  const imgs=await page.locator('.story-scene img').evaluateAll(imgs=>Promise.all(imgs.map(async img=>{await img.decode();return img.naturalWidth>0;})));assert(imgs.every(Boolean));
  if(scene.lines[i].choice){await page.locator('.story-options button').first().click();}
  if((chapter===9&&i===4)||(chapter===10&&i===6))await page.screenshot({path:path.join(output,`story-${chapter}.png`)});
  await page.locator('.story-dialogue__continue').click();
 }
 await page.locator('.story-scene').waitFor({state:'detached'});pass(`chapter ${chapter}: all lines and choices readable, artwork decoded`);await context.close();
}
{
 const {context,page}=await open(15);await page.locator('.world-atlas-launch').click();assert.equal(await page.locator('.atlas-regions article').count(),6);pass('continued saves use regional atlas');await context.close();
}
{
 const save=fixture(19,false,2);save.metaProgress.farm.harvestedCount=1;save.metaProgress.completedIslandIds=['i_0_-36'];save.metaProgress.discoveredLandmarkIds=['landmark:haven','landmark:prism','landmark:rift'];save.metaProgress.proofDependencies={'i_0_-36':['i_0_-32']};
 const {getStage2LevelConfig}=require('../src/data/stage2.ts');const {ensureHarbors,putHarbor,harborSites,validateHarborSite}=require('../src/lib/harbors.ts');
 const config=getStage2LevelConfig('level-20',42),main=config.world.getIslandById(config.focusIslandId);save.metaProgress=ensureHarbors(save.metaProgress,config,[]);const site=harborSites(main).find(p=>validateHarborSite(main,save.metaProgress,[],p.x,p.y));save.metaProgress=putHarbor(save.metaProgress,main,[],site.x,site.y);
 const {context,page}=await open(19,{save});
 for(const scene of Object.values(STORY_SCENES).filter(scene=>scene.kind!=='main')){
  await page.locator('.story-journal-launch').click();await page.locator('.story-journal article').filter({has:page.getByText(scene.title.zh,{exact:true})}).getByRole('button',{name:'开始阅读',exact:true}).click();
  assert.equal(await page.locator('.story-scene__portrait-stage').getAttribute('data-halo'),'cracked','late optional scenes keep halo state');
  for(let index=0;index<scene.lines.length;index++){if(index===1&&['companion-first-harvest','epilogue-second-gate'].includes(scene.id))await page.screenshot({path:path.join(output,`${scene.id}.png`)});await page.locator('.story-dialogue__continue').click();}
  await page.locator('.story-scene').waitFor({state:'detached'});
 }
 pass('eight optional scenes and post-proof ending playable from journal; late halo continuity');
 await context.close();
}
assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);
}finally{fs.writeFileSync(path.join(output,process.env.ART_SMOKE_ONLY?'map-smoke-report.json':'browser-report.json'),JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
