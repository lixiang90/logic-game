/* Isolated production-art verification. Run with ART_URL / ART_PLAYWRIGHT / ART_BROWSER. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.ART_PLAYWRIGHT || 'playwright');
const { fixture } = require('./art-fixtures.cjs');
const output = path.resolve('artifacts/art-upgrade/qa');
const report = { date: new Date().toISOString(), url: process.env.ART_URL || 'http://127.0.0.1:4175/logicgame-test/', checks: [], failures: [], errors: [], failedResources: [], screenshots: [] };
fs.mkdirSync(output, { recursive: true });
const legacyBlueprint = {
    id: 'legacy-art-blueprint', name: '旧版样例 · P 与否定门', createdAt: 1710000000000, tags: ['legacy', 'rotation'],
    nodes: [
        { id: 'legacy-p', type: 'atom', subType: 'P', x: 0, y: 0, w: 4, h: 4 },
        { id: 'legacy-not', type: 'gate', subType: 'not', x: 7, y: 0, w: 4, h: 4, rotation: 1 },
    ],
    wires: [{ id: 'legacy-wire', startNodeId: 'legacy-p', startPortId: 'out', endNodeId: 'legacy-not', endPortId: 'in0', type: 'formula', path: [{ x: 4, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 0 }, { x: 9, y: 0 }] }],
};
function pass(name, detail) { report.checks.push({ name, detail }); console.log('PASS ' + name); }
async function frame(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function screenshot(page, name) { const filename = 'archive-' + name + '.png'; await page.screenshot({ path: path.join(output, filename) }); report.screenshots.push(filename); }
async function canvasInk(canvas) {
    return canvas.evaluate(element => {
        const ctx = element.getContext('2d'); const pixels = ctx.getImageData(0, 0, element.width, element.height).data;
        let signalPixels = 0;
        for (let i = 0; i < pixels.length; i += 4) if ((pixels[i + 1] > 145 && pixels[i + 2] > 145 && pixels[i] < 155) || (pixels[i] > 155 && pixels[i + 1] > 120 && pixels[i + 2] < 155)) signalPixels++;
        const bounds = element.getBoundingClientRect();
        return { width: element.width, height: element.height, cssWidth: bounds.width, cssHeight: bounds.height, signalPixels };
    });
}
async function inViewport(locator, page, message) {
    await locator.scrollIntoViewIfNeeded();
    await frame(page);
    const bounds = await locator.boundingBox(); const viewport = page.viewportSize();
    assert.ok(bounds && bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1, message + ' ' + JSON.stringify(bounds));
    return bounds;
}

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.ART_BROWSER });
    try {
        for (const [width, height] of [[1366, 768], [390, 844]]) {
            const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
            const page = await context.newPage(); page.setDefaultTimeout(15000);
            page.on('pageerror', error => report.errors.push({ width, message: error.message }));
            page.on('response', response => { if (response.status() >= 400) report.failedResources.push({ width, url: response.url(), status: response.status() }); });
            let phase = 'open';
            try {
                const save = fixture(10); save.blueprints = [legacyBlueprint];
                save.levelStates[10] = { nodes: legacyBlueprint.nodes.map(node => ({ ...node, id: 'base-' + node.id })), wires: legacyBlueprint.wires.map(wire => ({ ...wire, id: 'base-' + wire.id, startNodeId: 'base-' + wire.startNodeId, endNodeId: 'base-' + wire.endNodeId })) };
                const oldSave = { timestamp: 1710000000000, levelIndex: 0, levelStates: { 0: { nodes: legacyBlueprint.nodes, wires: legacyBlueprint.wires } } };
                const sceneFallbackSave = fixture(14);
                await page.addInitScript(({ save, oldSave, sceneFallbackSave, blueprint }) => {
                    localStorage.setItem('logic_game_save_1', JSON.stringify(save));
                    localStorage.setItem('logic_game_save_2', JSON.stringify(oldSave));
                    localStorage.setItem('logic_game_save_3', JSON.stringify(sceneFallbackSave));
                    localStorage.setItem('logic_game_blueprints_v1', JSON.stringify([blueprint]));
                    localStorage.setItem('completed_tutorials', JSON.stringify(Array.from({ length: 20 }, (_, index) => index)));
                    localStorage.setItem('language', 'zh');
                    localStorage.setItem('logic-game-visual-settings-v1', JSON.stringify({ quality: 'low', motion: 'reduced' }));
                }, { save, oldSave, sceneFallbackSave, blueprint: legacyBlueprint });
                await page.goto(report.url, { waitUntil: 'networkidle', timeout: 90000 });
                await page.getByRole('button', { name: /^继续游戏/ }).click();
                await page.locator('canvas').first().waitFor();
                const intro = page.getByRole('button', { name: '返回', exact: true });
                if (await intro.count()) await intro.first().click();
                await frame(page);

                phase = 'save archive';
                await page.locator('.art-game-actions button[title="存档"]').click();
                const saveDialog = page.getByRole('dialog', { name: '学宫存档', exact: true });
                await saveDialog.waitFor(); await frame(page);
                assert.equal(await saveDialog.locator('.art-game-save-card').count(), 6);
                const saveInk = await canvasInk(saveDialog.locator('canvas').first()); assert.ok(saveInk.signalPixels > 10, 'saved geometry is drawn');
                assert.ok(await saveDialog.locator('.art-save-preview img').count() >= 1, 'chapter fallback exists');
                await screenshot(page, 'save-' + width + '-top');
                const reached = [];
                for (let index = 0; index < 6; index++) reached.push(await inViewport(saveDialog.locator('.art-game-save-card button').nth(index), page, 'save slot ' + (index + 1) + ' is reachable'));
                await inViewport(saveDialog.locator('.art-dialog-footer button'), page, 'archive return control is reachable');
                await screenshot(page, 'save-' + width + '-bottom');
                assert.equal(await saveDialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
                await saveDialog.locator('.art-save-tabs button').nth(1).click();
                assert.equal(await saveDialog.locator('.art-game-save-card button:disabled').count(), 3);
                await saveDialog.locator('.art-save-tabs button').nth(2).click();
                assert.equal(await saveDialog.locator('input[type="file"]').count(), 1);
                await inViewport(saveDialog.locator('input[type="file"]').locator('..'), page, 'import control reachable');
                await screenshot(page, 'data-' + width);
                await page.keyboard.press('Escape'); assert.equal(await saveDialog.count(), 0);
                pass(width + ' save/load/data archive, six reachable cards, old-save canvas and scene fallback, Esc', { saveInk, reached });

                // Persist a baseline before inserting the old personal blueprint.
                await page.locator('.art-game-actions button[title="存档"]').click();
                await page.locator('.art-save-tabs button').first().click();
                await page.getByRole('button', { name: '存档 · 存档 5', exact: true }).click();
                await page.waitForFunction(() => Boolean(localStorage.getItem('logic_game_save_5')));
                const before = await page.evaluate(() => JSON.parse(localStorage.getItem('logic_game_save_5')).levelStates[10]);
                if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape');

                phase = 'theorem archive';
                await page.getByRole('button', { name: '定理库', exact: true }).click();
                const theoremDialog = page.getByRole('dialog', { name: '定理库', exact: true });
                await theoremDialog.waitFor();
                const theorem = Object.values(save.metaProgress.collectedTheorems)[0]; assert.ok(theorem, 'fixture includes a collected theorem');
                await theoremDialog.getByRole('textbox', { name: '搜索定理名称、公式或前提' }).fill(theorem.name);
                await theoremDialog.locator('.theorem-archive-list-scroll button').first().click();
                assert.equal(await theoremDialog.locator('.theorem-archive-record-name').innerText(), theorem.name);
                await inViewport(theoremDialog.locator('.theorem-archive-previews canvas').first(), page, 'entire theorem canvas is reachable');
                const theoremInk = await canvasInk(theoremDialog.locator('.theorem-archive-previews canvas').first()); assert.ok(theoremInk.signalPixels > 10, 'theorem device and ports rendered');
                await screenshot(page, 'theorem-' + width);
                await theoremDialog.getByRole('button', { name: '新建文件夹', exact: true }).first().click();
                await page.getByRole('dialog', { name: '新建文件夹', exact: true }).waitFor();
                await page.keyboard.press('Escape');
                assert.equal(await page.getByRole('dialog', { name: '新建文件夹', exact: true }).count(), 0);
                assert.equal(await theoremDialog.count(), 1, 'Esc closes only child modal');
                await theoremDialog.getByRole('button', { name: '新建文件夹', exact: true }).first().click();
                const folderDialog = page.getByRole('dialog', { name: '新建文件夹', exact: true });
                const folderName = '美术验收档案 ' + width;
                await folderDialog.getByRole('textbox', { name: '文件夹名称', exact: true }).fill(folderName);
                await screenshot(page, 'folder-' + width);
                await folderDialog.getByRole('button', { name: '创建', exact: true }).click();
                await page.waitForFunction(name => JSON.parse(localStorage.getItem('logic_game_theorem_library_tree_v1')).root.children.some(folder => folder.name === name), folderName);
                await theoremDialog.getByRole('button', { name: '选择标准芯片', exact: true }).click();
                assert.equal(await theoremDialog.count(), 0);
                await page.keyboard.press('Escape');
                pass(width + ' theorem search/select, real canvas/ports, folder creation and nested Esc', { theorem: theorem.name, theoremInk, folderName });

                phase = 'personal blueprint archive';
                await page.getByRole('button', { name: '电路工作台', exact: true }).click();
                await page.getByRole('button', { name: '蓝图库 1', exact: true }).click();
                const blueprintDialog = page.getByRole('dialog', { name: '个人蓝图库', exact: true }); await blueprintDialog.waitFor();
                assert.equal(await blueprintDialog.locator('article').count(), 1);
                assert.equal(await blueprintDialog.getByRole('heading', { level: 3 }).innerText(), legacyBlueprint.name);
                await frame(page); const blueprintInk = await canvasInk(blueprintDialog.locator('canvas')); assert.ok(blueprintInk.signalPixels > 10);
                await screenshot(page, 'blueprints-' + width);
                await blueprintDialog.getByRole('button', { name: '放置电路', exact: true }).click();
                assert.equal(await blueprintDialog.count(), 0);
                await page.locator('.art-game-actions button[title="存档"]').click();
                await page.locator('.art-save-tabs button').first().click();
                await page.getByRole('button', { name: '存档 · 存档 4', exact: true }).click();
                await page.waitForFunction(() => Boolean(localStorage.getItem('logic_game_save_4')));
                const after = await page.evaluate(() => JSON.parse(localStorage.getItem('logic_game_save_4')).levelStates[10]);
                const newNodes = after.nodes.filter(node => !before.nodes.some(old => old.id === node.id));
                assert.equal(newNodes.length, 2); assert.ok(newNodes.some(node => node.type === 'gate' && node.rotation === 1));
                assert.equal(after.wires.length, before.wires.length + 1);
                pass(width + ' legacy blueprint restored, real thumbnail and placed two nodes plus saved wire', { blueprintInk, beforeNodes: before.nodes.length, afterNodes: after.nodes.length, newNodes, wires: after.wires.length });
            } catch (error) {
                report.failures.push({ width, phase, message: error.message, stack: error.stack });
                await screenshot(page, 'failure-' + width + '-' + phase.replaceAll(' ', '-')).catch(() => {});
                console.error('FAIL ' + width + ' ' + phase + ': ' + error.message);
            } finally { await context.close(); }
        }
    } finally { await browser.close(); fs.writeFileSync(path.join(output, 'archive-report.json'), JSON.stringify(report, null, 2)); }
    assert.equal(report.failures.length, 0, 'archive verification failures');
    assert.deepEqual(report.errors, [], 'browser runtime errors');
    assert.deepEqual(report.failedResources, [], 'failed resources');
    console.log(JSON.stringify({ checks: report.checks.length, failures: report.failures.length, errors: report.errors.length, failedResources: report.failedResources.length }));
})().catch(error => { console.error(error); process.exitCode = 1; });
