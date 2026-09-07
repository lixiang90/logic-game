const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.ART_PLAYWRIGHT || 'playwright');
const { fixture } = require('./art-fixtures.cjs');
const { STAGE2_STORIES } = require('../src/data/story.ts');
const { STORY_ART, AURELIA_PORTRAITS } = require('../src/data/story-art.ts');
const { getStage2LevelConfig } = require('../src/data/stage2.ts');

const output = path.resolve('artifacts/art-upgrade/qa/story');
const url = process.env.ART_URL || 'http://127.0.0.1:4175/logicgame-test/';
const report = { date: new Date().toISOString(), url, checks: [], lines: [], pageErrors: [], failedResources: [], failures: [] };
fs.mkdirSync(output, { recursive: true });
function pass(name, detail) { report.checks.push({ name, detail }); console.log('PASS ' + name); }
async function frame(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }

async function isolatedContext(browser, level, options = {}) {
    const context = await browser.newContext({ viewport: { width: options.width || 1366, height: options.height || 768 }, reducedMotion: options.fullMotion ? 'no-preference' : 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => report.pageErrors.push({ level, message: error.message }));
    page.on('response', response => { if (response.status() >= 400) report.failedResources.push({ level, status: response.status(), url: response.url() }); });
    await page.addInitScript(({ save, language, fullMotion }) => {
        localStorage.setItem('logic_game_save_1', JSON.stringify(save));
        localStorage.setItem('completed_tutorials', JSON.stringify(Array.from({ length: 20 }, (_, i) => i)));
        localStorage.setItem('language', language);
        localStorage.setItem('logic-game-visual-settings-v1', JSON.stringify({ quality: 'standard', motion: fullMotion ? 'full' : 'reduced' }));
    }, { save: options.save || fixture(level, options.story !== false), language: options.language || 'zh', fullMotion: !!options.fullMotion });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.getByRole('button', { name: options.language === 'en' ? /^Continue/ : /^继续游戏/ }).click();
    await page.locator('canvas').first().waitFor();
    await frame(page);
    return { context, page };
}

async function inspectLine(page, sceneId, lineIndex, language = 'zh') {
    const art = STORY_ART[sceneId];
    const line = STAGE2_STORIES[sceneId].lines[lineIndex];
    await page.waitForFunction(({ sceneId, lineIndex }) => {
        const scene = document.querySelector('.story-scene');
        return scene?.getAttribute('data-scene-id') === sceneId && scene.getAttribute('data-line-index') === String(lineIndex);
    }, { sceneId, lineIndex });
    await page.locator('.story-scene img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const images = await page.locator('.story-scene img').evaluateAll(images => images.map(image => ({ className: image.className, src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight })));
    assert.ok(images.every(image => image.width > 0 && image.height > 0), sceneId + ' undecoded image');
    const background = images.find(image => image.className.includes('story-scene__background'));
    const portrait = images.find(image => image.className.includes('story-scene__portrait'));
    assert.ok(background.src.endsWith(art.background), sceneId + ' wrong scenic location');
    assert.ok(portrait.src.endsWith(AURELIA_PORTRAITS[art.lines[lineIndex].expression]), sceneId + ' wrong expression');
    const rendered = await page.locator('.story-dialogue__text').innerText();
    assert.equal(rendered.trim(), line[language], sceneId + ' dialogue changed');
    const halo = await page.locator('.story-scene__portrait-stage').getAttribute('data-halo');
    assert.equal(halo, art.lines[lineIndex].halo);
    const result = { sceneId, lineIndex, language, background: background.src, portrait: portrait.src, halo, imagesDecoded: images.length };
    report.lines.push(result);
    return result;
}

async function finishIntoMap(page, sceneId, language = 'zh') {
    await page.locator('.story-dialogue__continue').click();
    await page.locator('.story-scene').waitFor({ state: 'detached' });
    const introClose = page.getByRole('button', { name: language === 'zh' ? '返回' : 'Back', exact: true });
    if (await introClose.count()) await introClose.first().click();
    assert.equal(await page.locator('.story-scene').count(), 0);
    assert.ok(await page.locator('canvas').first().isVisible());
    pass(sceneId + ' final line completes into map');
}

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.ART_BROWSER });
    try {
        for (let chapter = 1; chapter <= 10; chapter++) {
            const sceneId = 'stage2-' + chapter;
            const { context, page } = await isolatedContext(browser, chapter + 9);
            try {
                await page.locator('.story-scene').waitFor();
                const lines = STAGE2_STORIES[sceneId].lines;
                for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                    await inspectLine(page, sceneId, lineIndex);
                    if (chapter >= 9 && lineIndex === lines.length - 1) await page.screenshot({ path: path.join(output, `chapter-${chapter}-scene.png`) });
                    if (lineIndex < lines.length - 1) await page.locator('.story-dialogue__continue').click();
                }
                pass(sceneId + ' all dialogue/background/portrait/halo files match', { lines: lines.length });
                await finishIntoMap(page, sceneId);
            } finally { await context.close(); }
        }
        for (const language of ['zh', 'en']) {
            const { context, page } = await isolatedContext(browser, 18, { fullMotion: true, language });
            try {
                await page.locator('.story-scene').waitFor();
                assert.equal(await page.locator('.story-scene__portrait-stage').getAttribute('data-halo'), 'intact');
                assert.equal(await page.locator('.story-scene').getAttribute('data-line-index'), '0');
                await page.locator('.story-dialogue__continue').click();
                assert.equal(await page.locator('.story-scene').getAttribute('data-line-index'), '0');
                await inspectLine(page, 'stage2-9', 0, language);
                await page.keyboard.press('Space');
                assert.equal(await page.locator('.story-scene').getAttribute('data-line-index'), '1');
                assert.equal(await page.locator('.story-scene__portrait-stage').getAttribute('data-halo'), 'cracked');
                await page.keyboard.press('Enter');
                await inspectLine(page, 'stage2-9', 1, language);
                pass('actual ' + language + ' typewriter: intact before cue, reveal click fractures, next line persists');
            } finally { await context.close(); }
        }
        for (const complete of [false, true]) {
            const save = fixture(19, false);
            const config = getStage2LevelConfig('level-20', save.metaProgress.mapSeed);
            if (complete) save.metaProgress.completedIslandIds.push(config.focusIslandId);
            const { context, page } = await isolatedContext(browser, 19, { story: false, save });
            try {
                const gate = page.locator('.art-gate-response');
                if (complete) {
                    await gate.waitFor({ state: 'visible' });
                    assert.ok((await gate.innerText()).includes('证明完成'));
                    const style = await gate.evaluate(element => getComputedStyle(element).backgroundImage);
                    assert.ok(style.includes('/logicgame-test/art/scenes/second-gate.webp'));
                    await page.screenshot({ path: path.join(output, 'chapter-10-completed-gate.png') });
                } else {
                    assert.equal(await gate.count(), 0);
                }
                pass('chapter-10 gate response ' + (complete ? 'appears for completed focus island' : 'absent before completion'));
            } finally { await context.close(); }
        }
        assert.deepEqual(report.pageErrors, []);
        assert.deepEqual(report.failedResources, []);
        pass('production subpath: no missing resources or browser exceptions');
    } catch (error) {
        report.failures.push({ message: error.message, stack: error.stack });
        throw error;
    } finally {
        await browser.close();
        fs.writeFileSync(path.join(output, 'story-report.json'), JSON.stringify(report, null, 2));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
