/* Reproducible same-machine rendering probe, not a cross-machine FPS guarantee.
 * ART_PLAYWRIGHT / ART_BROWSER use the same overrides as art-verify.cjs.
 * ART_BASELINE_URL defaults to the OLD static export on :4173; preserve it until
 * BASELINE_CAPTURED is printed. ART_CURRENT_URL defaults to the dev app on :3000.
 * ART_REUSE_BASELINE=1 reads performance-baseline.json without visiting its URL.
 * Set ART_CURRENT_RUNTIME=production when ART_CURRENT_URL serves a production build.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { chromium } = require(process.env.ART_PLAYWRIGHT || 'playwright');
const { fixture } = require('./art-fixtures.cjs'); // Shared TS require hook.
const { solveCircuit } = require('../src/lib/circuit-solver.ts');
const { getNodeBounds } = require('../src/lib/gameUtils.ts');
const levels = require('../src/data/levels.json');

const output = path.resolve('artifacts/art-upgrade');
const reportPath = path.join(output, 'performance.json');
const baselinePath = path.join(output, 'performance-baseline.json');
const reuseBaseline = process.env.ART_REUSE_BASELINE === '1';
const currentRuntime = process.env.ART_CURRENT_RUNTIME || (process.env.ART_CURRENT_URL ? 'unspecified' : 'development');
fs.mkdirSync(output, { recursive: true });
const viewport = { width: 1366, height: 768 };
const nodes = [];
// 100 independent, powered atom -> NOT -> display modules. The central aisle
// keeps the real goal untouched. This models a large circuit spanning screens.
for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) {
    const id = row * 10 + col;
    const x = col < 5 ? -100 + col * 18 : 14 + (col - 5) * 18;
    const y = -48 + row * 10;
    nodes.push(
        { id: `p${id}`, type: 'atom', subType: ['P', 'Q', 'R'][id % 3], x, y, w: 2, h: 2 },
        { id: `a${id}`, type: 'wire', subType: 'formula', x: x + 2, y: y + 1, w: 2, h: 1, rotation: 0 },
        { id: `n${id}`, type: 'gate', subType: 'not', x: x + 4, y: y - 1, w: 4, h: 4 },
        { id: `b${id}`, type: 'wire', subType: 'formula', x: x + 8, y: y + 1, w: 2, h: 1, rotation: 0 },
        { id: `d${id}`, type: 'display', subType: 'small', x: x + 10, y: y - 1, w: 4, h: 4 },
    );
}
const save = fixture(8);
save.levelStates[8] = { nodes, wires: [] };
const goal = levels[8].goal.formula;
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)];
const round = value => Math.round(value * 1000) / 1000;
const summarize = samples => ({ samples: samples.length, p50Ms: round(percentile(samples, .5)), p95Ms: round(percentile(samples, .95)), minMs: round(Math.min(...samples)), maxMs: round(Math.max(...samples)), rawMs: samples.map(round) });
const report = {
    date: new Date().toISOString(), complete: false,
    machine: { hostname: os.hostname(), platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0]?.model, logicalCpuCount: os.cpus().length, totalMemoryBytes: os.totalmem(), node: process.version },
    methodology: {
        viewport, deviceScaleFactor: 1, headless: true, frameCount: 120, warmupFrameCount: 60,
        scene: 'Level index 8; 500 saved nodes / 100 powered atom-NOT-display modules; large multi-screen layout; fixed 50% zoom, central camera.',
        timing: '120 consecutive requestAnimationFrame intervals after warmup; cadence includes scheduling and page work, not isolated drawing CPU time or confirmed screen presentation.',
        wheel: 'Real Playwright wheel; browser wheel capture timestamp to the next and second requestAnimationFrame callbacks. Reverse wheel restores the measured camera transform.',
        heap: 'CDP JSHeapUsedSize without forced GC; JS heap only, excludes GPU/backing canvas memory.',
        forcedGc: false,
        caveats: ['Same machine/browser, fresh context per case, sequential runs; no cross-machine frame-rate guarantee.', 'Build mode is recorded per case from the known baseline provenance or ART_CURRENT_RUNTIME; unrelated machine load and samples taken at different times may influence comparisons.', 'Heap is sampled without forced GC in every case. Do not infer retained-memory improvements or regressions from these snapshots.', 'Low quality disables decorative animation, so idle rAF cadence alone does not measure saved drawing work.', 'Pure solver timings use unchanged current source in Node, independently of browser rendering; not an old/new solver comparison.'],
    },
    scene: { levelIndex: 8, nodeCount: nodes.length, goal, types: { atom: 100, gate: 100, display: 100, wire: 200 } },
    cases: [],
};
function persist() { fs.writeFileSync(reportPath, JSON.stringify(report, null, 2)); }
async function frames(page, count) {
    return page.evaluate(count => new Promise(resolve => {
        const samples = []; let last;
        function frame(now) {
            if (last !== undefined) samples.push(now - last);
            last = now;
            if (samples.length < count) requestAnimationFrame(frame); else resolve(samples);
        }
        requestAnimationFrame(frame);
    }), count);
}
async function heap(cdp) {
    if (!cdp) return { available: false };
    try {
        const { metrics } = await cdp.send('Performance.getMetrics');
        const read = name => metrics.find(metric => metric.name === name)?.value ?? null;
        return { available: true, usedBytes: read('JSHeapUsedSize'), totalBytes: read('JSHeapTotalSize'), taskDurationSeconds: read('TaskDuration') };
    } catch (error) { return { available: false, reason: error.message }; }
}
async function camera(page) {
    return page.locator('canvas').first().evaluate(canvas => ({ ...canvas.__artCamera, backingWidth: canvas.width, backingHeight: canvas.height }));
}
async function wheel(page, deltaY) {
    await page.evaluate(() => {
        window.__artWheelResult = new Promise(resolve => {
            window.addEventListener('wheel', () => {
                const eventTime = performance.now();
                requestAnimationFrame(() => {
                    const firstFrameMs = performance.now() - eventTime;
                    requestAnimationFrame(() => resolve({ firstFrameMs, secondFrameMs: performance.now() - eventTime }));
                });
            }, { capture: true, once: true });
        });
    });
    await page.mouse.wheel(0, deltaY);
    return page.evaluate(() => window.__artWheelResult);
}
async function runCase(browser, name, url, quality) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const result = { name, url, quality, date: new Date().toISOString(), forcedGc: false, errors };
    try {
        await page.addInitScript(({ save, quality }) => {
            localStorage.setItem('logic_game_save_1', JSON.stringify(save));
            localStorage.setItem('completed_tutorials', JSON.stringify(Array.from({ length: 20 }, (_, i) => i)));
            localStorage.setItem('language', 'zh');
            localStorage.setItem('logic-game-visual-settings-v1', JSON.stringify({ quality, motion: 'full' }));
            // Observe the existing first-stage Canvas camera without altering it.
            const scale = CanvasRenderingContext2D.prototype.scale;
            CanvasRenderingContext2D.prototype.scale = function (x, y) {
                scale.call(this, x, y);
                if (this.canvas.isConnected && this.canvas.clientWidth > 1000) {
                    const { a, b, c, d, e, f } = this.getTransform();
                    this.canvas.__artCamera = { a, b, c, d, e, f };
                }
            };
        }, { save, quality });
        await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
        await page.getByRole('button', { name: /^继续游戏/ }).click();
        await page.locator('canvas').first().waitFor();
        await frames(page, 8);
        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        await wheel(page, 500); // 1 -> .5, same handler and camera in both versions.
        await frames(page, 60);
        result.camera = await camera(page);
        assert.ok(Math.abs(result.camera.a - .5) < .001, 'Scenario must use the same 50% zoom');
        result.visibleNodeBounds = nodes.filter(node => {
            const b = getNodeBounds(node), t = result.camera;
            return (b.x + b.w) * 25 * t.a + t.e > 0 && b.x * 25 * t.a + t.e < viewport.width && (b.y + b.h) * 25 * t.d + t.f > 0 && b.y * 25 * t.d + t.f < viewport.height;
        }).length;
        let cdp;
        try { cdp = await context.newCDPSession(page); await cdp.send('Performance.enable'); } catch { /* CDP is optional. */ }
        result.heapBefore = await heap(cdp);
        result.raf = summarize(await frames(page, 120));
        result.heapAfter = await heap(cdp);
        result.wheel = await wheel(page, 120);
        result.zoomedCamera = await camera(page);
        result.restoreWheel = await wheel(page, -120 / .88);
        result.restoredCamera = await camera(page);
        result.cameraRestored = ['a', 'b', 'c', 'd', 'e', 'f'].every(key => Math.abs(result.camera[key] - result.restoredCamera[key]) < .001);
        assert.equal(result.cameraRestored, true);
        result.runtime = await page.evaluate(() => ({ userAgent: navigator.userAgent, visibility: document.visibilityState, hardwareConcurrency: navigator.hardwareConcurrency, quality: document.documentElement.dataset.quality ?? 'legacy', motion: document.documentElement.dataset.motion ?? 'legacy' }));
        result.runtime.buildMode = name === 'baseline' ? 'production' : currentRuntime;
        result.runtime.buildModeSource = name === 'baseline' ? 'Known pre-upgrade static export' : process.env.ART_CURRENT_RUNTIME ? 'ART_CURRENT_RUNTIME' : 'Default development URL or unspecified override';
        await page.screenshot({ path: path.join(output, `performance-${name}.png`) });
        assert.deepEqual(errors, []);
    } catch (error) { result.failure = error.stack; }
    finally { await context.close(); }
    report.cases.push(result); persist();
    console.log(JSON.stringify({ name, raf: result.raf && { p50Ms: result.raf.p50Ms, p95Ms: result.raf.p95Ms }, wheel: result.wheel, heap: result.heapAfter, cameraRestored: result.cameraRestored, failure: result.failure }));
    return result;
}

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.ART_BROWSER });
    report.machine.browser = browser.version();
    report.machine.browserExecutable = process.env.ART_BROWSER ?? 'Playwright default';
    try {
        if (reuseBaseline) {
            const saved = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
            const baseline = saved.cases?.find(item => item.name === 'baseline');
            assert.ok(saved.baselineCaptured && baseline && !baseline.failure, 'A successful preserved baseline is required');
            assert.deepEqual(saved.scene, report.scene, 'Preserved baseline must use the identical scene');
            assert.deepEqual(saved.methodology.viewport, viewport, 'Preserved baseline viewport must match');
            for (const key of ['deviceScaleFactor', 'frameCount', 'warmupFrameCount', 'headless']) assert.equal(saved.methodology[key], report.methodology[key], `Preserved baseline ${key} must match`);
            assert.equal(saved.machine.hostname, report.machine.hostname, 'Baseline must come from this machine');
            assert.equal(saved.machine.browser, report.machine.browser, 'Baseline browser version must match');
            report.baselineReuse = { path: baselinePath, capturedAt: baseline.date, machine: saved.machine, visitedBaselineUrl: false };
            // Metadata is added only to this report; the preserved file and its measurements stay untouched.
            baseline.runtime = { ...baseline.runtime, buildMode: baseline.runtime?.buildMode ?? 'production', buildModeSource: baseline.runtime?.buildModeSource ?? 'Preserved pre-upgrade static export' };
            baseline.forcedGc = baseline.forcedGc ?? false;
            report.cases.push(baseline); persist();
            console.log('BASELINE_REUSED: preserved old-export samples loaded; baseline URL was not visited.');
        } else {
            const baseline = await runCase(browser, 'baseline', process.env.ART_BASELINE_URL || 'http://127.0.0.1:4173/', 'standard');
            if (baseline.failure) throw new Error('Baseline failed; preserve old export and inspect performance.json');
            fs.writeFileSync(baselinePath, JSON.stringify({ ...report, baselineCaptured: true }, null, 2));
            console.log('BASELINE_CAPTURED: old-export results persisted; its server may now be replaced.');
        }
        await runCase(browser, 'current-standard', process.env.ART_CURRENT_URL || 'http://127.0.0.1:3000/', 'standard');
        await runCase(browser, 'current-low', process.env.ART_CURRENT_URL || 'http://127.0.0.1:3000/', 'low');
    } finally { await browser.close(); persist(); }
    // Warm once, then time exactly five fresh real solves separately from rendering.
    solveCircuit(nodes, goal);
    const timings = []; let solved;
    for (let i = 0; i < 5; i++) { const start = performance.now(); solved = solveCircuit(nodes, goal); timings.push(performance.now() - start); }
    report.pureSolver = { ...summarize(timings), activeNodeCount: solved.activeNodeIds.size, valuedWireCount: solved.wireValues.size, errorWireCount: solved.errorWireIds.size, goalSolved: solved.isSolved };
    assert.equal(solved.errorWireIds.size, 0);
    assert.equal(solved.isSolved, false);
    assert.ok(solved.activeNodeIds.size >= 300, 'Fixture must contain powered devices/wires');
    report.comparison = { sameMachineAndBrowser: true, productionToProduction: report.cases.every(item => item.runtime?.buildMode === 'production'), forcedGcInAnyCase: report.cases.some(item => item.forcedGc), retainedMemoryComparisonValid: false };
    report.complete = !report.cases.some(item => item.failure); persist();
    if (!report.complete) process.exitCode = 1;
    console.log(JSON.stringify({ reportPath, complete: report.complete, pureSolver: report.pureSolver }));
})().catch(error => { report.failure = error.stack; persist(); console.error(error); process.exitCode = 1; });
