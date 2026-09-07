const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.ART_PLAYWRIGHT || 'playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.ART_BROWSER });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const dir = path.join(process.cwd(), 'artifacts/art-upgrade/baseline');
    fs.mkdirSync(dir, { recursive: true });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(dir, 'menu.png') });
    await page.evaluate(() => {
        localStorage.setItem('completed_tutorials', JSON.stringify(Array.from({ length: 20 }, (_, i) => i)));
        localStorage.setItem('logic_game_save_1', JSON.stringify({ version: 2, timestamp: Date.now(), levelIndex: 0, levelStates: { 0: { nodes: [], wires: [] } } }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '继续游戏', exact: true }).click();
    await page.locator('canvas').waitFor();
    await page.screenshot({ path: path.join(dir, 'circuit.png') });
    const timing = await page.evaluate(() => new Promise(resolve => {
        const samples = []; let last = performance.now();
        function frame(now) { samples.push(now - last); last = now; if (samples.length < 90) requestAnimationFrame(frame); else { samples.sort((a,b)=>a-b); resolve({ medianFrameMs: samples[45], p95FrameMs: samples[85], samples: samples.length }); } }
        requestAnimationFrame(frame);
    }));
    const report = { date: new Date().toISOString(), source: 'pre-existing static export (2026-09-03), isolated browser context', viewport: '1366x768', timing, errors };
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
