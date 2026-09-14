const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.ART_PLAYWRIGHT || 'playwright');
require('./art-fixtures.cjs');
const { SaveSystem, encodeSave, decodeSave } = require('../src/lib/saveSystem.ts');
const output = path.resolve('artifacts/save-world-policy');
fs.mkdirSync(output, { recursive: true });
(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.ART_BROWSER });
    const report = { checks: [], errors: [] };
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        page.on('pageerror', error => report.errors.push(error.message));
        page.on('dialog', dialog => dialog.accept());
        await page.addInitScript(() => { localStorage.setItem('language', 'zh'); localStorage.setItem('completed_tutorials', JSON.stringify(Array.from({ length: 20 }, (_, i) => i))); });
        await page.goto(process.env.ART_URL || 'http://127.0.0.1:4181/', { waitUntil: 'networkidle' });
        assert(await page.getByRole('button', { name: '新游戏', exact: true }).count());
        await page.getByRole('button', { name: '读取存档', exact: true }).click();
        const save = SaveSystem.createEmptySave(); save.levelIndex = 10; save.metaProgress.mapSeed = 42;
        const old = { ...save, metaProgress: { ...save.metaProgress, worldVersion: 1 } };
        await page.locator('input[type=file]').setInputFiles({ name: 'retired.logic', mimeType: 'text/plain', buffer: Buffer.from(encodeSave(old)) });
        await page.getByText('群岛地图已更新，旧版第二大关存档无法导入。旧版第一大关存档仍可使用。', { exact: true }).waitFor();
        assert.equal(await page.evaluate(() => localStorage.getItem('logic_game_save_1')), null);
        await page.screenshot({ path: path.join(output, 'retired-save-rejected.png') });
        report.checks.push('old map import rejected with clear message and no overwrite');
        await page.locator('input[type=file]').setInputFiles({ name: 'regional.logic', mimeType: 'text/plain', buffer: Buffer.from(encodeSave(save)) });
        await page.locator('.story-scene').waitFor();
        await page.getByRole('button', { name: '跳过本段', exact: true }).click();
        const back = page.getByRole('button', { name: '返回', exact: true }); if (await back.count()) await back.first().click();
        await page.locator('.world-atlas-launch').click();
        assert.equal(await page.locator('.atlas-regions article').count(), 6);
        await page.screenshot({ path: path.join(output, 'regional-save-atlas.png') });
        assert.equal(decodeSave(await page.evaluate(() => localStorage.getItem('logic_game_save_1'))).metaProgress.worldVersion, 2);
        report.checks.push('regional start save imports, opening story plays, six-region atlas renders');
        assert.deepEqual(report.errors, []);
        console.log(JSON.stringify(report));
    } finally {
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
