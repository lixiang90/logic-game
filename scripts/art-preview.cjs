const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.ART_PLAYWRIGHT || 'playwright');
const { fixture } = require('./art-fixtures.cjs');
(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.ART_BROWSER });
    try {
        const page = await browser.newPage({ viewport: { width: Number(process.env.ART_WIDTH || 1366), height: Number(process.env.ART_HEIGHT || 768) } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const dir = path.join(process.cwd(), 'artifacts/art-upgrade/current'); fs.mkdirSync(dir, { recursive: true });
        const url = process.env.ART_URL || 'http://127.0.0.1:3000/';
        const levelIndex = Number(process.env.ART_LEVEL || 10);
        const save = fixture(levelIndex, process.env.ART_STORY === '1');
        await page.addInitScript(save => {
            localStorage.setItem('logic_game_save_1', JSON.stringify(save));
            localStorage.setItem('completed_tutorials', JSON.stringify(Array.from({length:20},(_,i)=>i)));
        }, save);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.screenshot({ path: path.join(dir, 'menu-' + page.viewportSize().width + '.png') });
        await page.getByRole('button', { name: /^继续游戏/ }).click();
        await page.locator('canvas').first().waitFor();
        const enter = page.getByRole('button', { name: '返回', exact: true });
        if (await enter.count() && process.env.ART_STORY !== '1') await enter.first().click();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({ path: path.join(dir, 'level-' + (levelIndex+1) + '-' + page.viewportSize().width + '.png') });
        console.log(JSON.stringify({ errors, text: (await page.locator('body').innerText()).slice(0,3500) }));
        if (process.env.ART_STORY !== '1' && levelIndex >= 10) {
            await page.getByRole('button', { name: '逻辑农场', exact: true }).click();
            await page.screenshot({ path: path.join(dir, 'farm-' + page.viewportSize().width + '.png') });
            console.log((await page.locator('body').innerText()).slice(0,1500));
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
