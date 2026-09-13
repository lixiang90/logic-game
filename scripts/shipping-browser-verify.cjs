const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.ART_PLAYWRIGHT || 'playwright');
const { fixture } = require('./art-fixtures.cjs');
const { encodeSave, decodeSave } = require('../src/lib/saveSystem.ts');
const { getStage2LevelConfig } = require('../src/data/stage2.ts');
const { virtualChipCost, shippingIslands, buildShippingRoutes } = require('../src/lib/shipping.ts');
const { islandHarbors, harborAnchor } = require('../src/lib/harbors.ts');
const { shippingPanels } = require('../src/lib/render/shipping-art.ts');
const dir = path.resolve('artifacts/shipping'); fs.mkdirSync(dir, { recursive: true });
(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.ART_BROWSER });
    const report = { checks: [], errors: [] };
    try {
        const config = getStage2LevelConfig('level-16',42), main = config.world.getIslandById(config.focusIslandId), source = config.world.getIslandById(config.goalIslandIds[1]);
        const save = fixture(15); save.version = 3; save.metaProgress.collectedTheorems = {};
        const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
        const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
        await page.addInitScript(encoded => {
            if (!localStorage.getItem('shipping-test-seeded')) {
                localStorage.setItem('logic_game_save_1', encoded);
                localStorage.setItem('shipping-test-seeded','1');
            }
            localStorage.setItem('completed_tutorials', JSON.stringify(Array.from({length:20},(_,i)=>i)));
        }, encodeSave(save));
        await page.goto(process.env.ART_URL || 'http://127.0.0.1:4177/', { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /^继续游戏/ }).click();
        const back = page.getByRole('button',{name:'返回',exact:true});
        if (await back.count()) await back.first().click();
        await page.getByRole('button', { name: /⚓ 航线/ }).click();
        await page.screenshot({path:path.join(dir,'opened.png')});
        fs.writeFileSync(path.join(dir,'opened.txt'),await page.locator('body').innerText());
        await page.getByLabel('源定理 A',{exact:true}).selectOption(source.id);
        await page.getByRole('button', { name: '建立航线', exact:true }).click();
        await page.getByRole('button', { name: new RegExp(source.name+' → '+main.name) }).waitFor();
        assert(await page.getByRole('button', { name: '建立航线',exact:true }).isDisabled());
        await page.getByLabel('查看定理',{exact:true}).selectOption(source.rewardTheorem.theoremId);
        await page.getByRole('button', { name: /购买虚芯片/ }).click();
        await page.getByText('已购虚芯片次数: 1', {exact:true}).waitFor();
        await page.screenshot({path:path.join(dir,'harbor-desktop.png')});
        await page.setViewportSize({width:390,height:844});
        await page.screenshot({path:path.join(dir,'harbor-mobile.png')});
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.setViewportSize({width:1366,height:768});
        await page.getByRole('button',{name:'选用此芯片',exact:true}).click();
        // Locate an unoccupied build rectangle without using a production debug hook.
        const tiles = new Set(main.buildTiles.map(tile=>`${tile.x},${tile.y}`));
        const blocked = [main.goalBounds,...main.premiseNodes];
        const w=10,h=8; let placement;
        for (const tile of main.buildTiles) {
            if (blocked.some(b=>tile.x < b.x+b.w && tile.x+w>b.x && tile.y<b.y+b.h && tile.y+h>b.y)) continue;
            if (!Array.from({length:w*h},(_,i)=>`${tile.x+i%w},${tile.y+Math.floor(i/w)}`).every(key=>tiles.has(key))) continue;
            const x = 683+(tile.x-main.mapBounds.x-main.mapBounds.w/2)*25;
            const y = 384+(tile.y-main.mapBounds.y-main.mapBounds.h/2)*25;
            if (x>80 && x<900 && y>140 && y<600) { placement={x,y}; break; }
        }
        assert(placement,'a visible place for the virtual chip');
        await page.mouse.click(placement.x,placement.y);
        await page.getByRole('button',{name:/⚓ 航线/}).click();
        await page.getByLabel('查看定理',{exact:true}).selectOption(source.rewardTheorem.theoremId);
        await page.getByText('已购虚芯片次数: 0',{exact:true}).waitFor();
        await page.keyboard.press('Escape');
        await page.locator('.art-game-actions button[title="存档"]').click();
        await page.getByRole('button',{name:'存档 · 存档 2',exact:true}).click();
        const raw = await page.evaluate(()=>localStorage.getItem('logic_game_save_2'));
        assert.match(raw,/^[A-Za-z0-9+/]+=*$/);
        const saved = decodeSave(raw);
        assert.equal(saved.metaProgress.coins,500-virtualChipCost(source.rewardTheorem.cost));
        assert.equal(saved.metaProgress.collectedTheorems[source.rewardTheorem.theoremId].freeUsesRemaining,0);
        assert(saved.levelStates[15].nodes.some(node=>node.theoremId===source.rewardTheorem.theoremId));
        assert.deepEqual(saved.metaProgress.plannedRoutes,[{sourceIslandId:source.id,targetIslandId:main.id}]);
        await page.keyboard.press('Escape');
        await page.locator('.art-game-actions button[title="存档"]').click();
        await page.getByRole('button',{name:'数据',exact:true}).click();
        const downloadEvent=page.waitForEvent('download');
        await page.getByRole('button',{name:'导出存档',exact:true}).click();
        const download=await downloadEvent;
        assert(download.suggestedFilename().endsWith('.logic'));
        const exportPath=path.join(dir,'exported.logic');await download.saveAs(exportPath);
        const exportText=fs.readFileSync(exportPath,'utf8');
        assert.deepEqual(decodeSave(exportText).metaProgress,saved.metaProgress);
        page.on('dialog',dialog=>dialog.accept());
        await page.locator('input[type=file]').setInputFiles({name:'roundtrip.logic',mimeType:'text/plain',buffer:Buffer.from(exportText)});
        await page.locator('.shipping-dialog').waitFor({state:'hidden'});
        report.checks.push('exported Base64 .logic and in-game reimport');
        await page.getByRole('button',{name:/⚓ 航线/}).click();
        await page.getByRole('button',{name:'查看航线全景',exact:true}).click();
        await page.waitForTimeout(200);
        await page.mouse.move(30,700);
        await page.screenshot({path:path.join(dir,'routes-world.png')});
        const islands=config.goalIslandIds.map(id=>config.world.getIslandById(id));
        const left=Math.min(...islands.map(i=>i.mapBounds.x*25)),right=Math.max(...islands.map(i=>(i.mapBounds.x+i.mapBounds.w)*25));
        const top=Math.min(...islands.map(i=>i.mapBounds.y*25)),bottom=Math.max(...islands.map(i=>(i.mapBounds.y+i.mapBounds.h)*25+800));
        const scale=Math.max(.1,Math.min(.5,1266/(right-left),458/(bottom-top))),port=islandHarbors(main,saved.metaProgress)[0],p=harborAnchor(port);
        await page.mouse.click(683+(p.x-(left+right)/2)*scale,150+(p.y-20-top)*scale);
        await page.getByRole('dialog',{name:main.name+' · 星潮港'}).waitFor();
        await page.keyboard.press('Escape');
        const cards=shippingPanels(shippingIslands(config,saved.metaProgress),buildShippingRoutes(config,saved.metaProgress,saved.levelStates[15].nodes,new Map()),saved.metaProgress,scale).get(port.id);
        const card=cards[0];
        await page.mouse.click(683+(card.x+card.w/2-(left+right)/2)*scale,150+(card.y+card.h/2-top)*scale);
        await page.getByRole('dialog',{name:main.name+' · 星潮港'}).waitFor();
        assert.equal(await page.getByLabel('查看定理',{exact:true}).inputValue(),source.rewardTheorem.theoremId);
        report.checks.push('click dock chip opens its full theorem details');
        report.checks.push('manual route + duplicate prevention','virtual purchase and placement cost','Base64 save contains routes, chips, circuit','click canvas dock','desktop and mobile layout','no page errors');
        assert.deepEqual(report.errors,[]);
        await context.close();
        for (const [name,payload,valid] of [
            ['new-base64',encodeSave(saved),true],
            ['old-stage1',JSON.stringify({timestamp:1,levelIndex:0,levelStates:{0:{nodes:[],wires:[]}}}),true],
            ['old-stage2',JSON.stringify({...save,version:2}),false],
        ]) {
            const c=await browser.newContext(),p=await c.newPage();p.on('pageerror',error=>report.errors.push(error.message));
            await p.goto(process.env.ART_URL||'http://127.0.0.1:4177/',{waitUntil:'networkidle'});
            await p.getByRole('button',{name:/^读取存档/}).click();
            await p.locator('input[type=file]').setInputFiles({name:name+'.json',mimeType:'text/plain',buffer:Buffer.from(payload)});
            if(valid) { await p.locator('canvas').first().waitFor(); }
            else { await p.getByText('群岛地图已更新，旧版第二大关存档无法导入。旧版第一大关存档仍可使用。',{exact:true}).waitFor(); }
            report.checks.push('start-menu import: '+name);await c.close();
        }
        assert.deepEqual(report.errors,[]);
    } finally { await browser.close(); fs.writeFileSync(path.join(dir,'browser-report.json'),JSON.stringify(report,null,2)); }
    console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
