const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const project = path.resolve(__dirname, '../src');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
    return originalResolve.call(this, name.startsWith('@/') ? path.join(project, name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const { getStage2LevelConfig } = require('../src/data/stage2.ts');
const { createDefaultStage2MetaProgress } = require('../src/types/stage2.ts');

function fixture(levelIndex = 10, story = false) {
    const meta = createDefaultStage2MetaProgress(42);
    const config = getStage2LevelConfig('level-' + (levelIndex + 1), 42);
    const now = Date.now();
    meta.coins = 500; meta.insight = 10; meta.quickMpUnlocked = true; meta.quickMpUses = 10;
    meta.seenStoryIds = Array.from({ length: 10 }, (_, i) => 'stage2-' + (i + 1)).filter(id => !story || id !== config?.storyId);
    meta.farm.unlocked = true;
    const crops = ['axiom-wheat', 'implication-vine', 'contradiction-berry', 'theorem-lotus'];
    const durations = [60000,300000,1200000,3600000];
    meta.farm.plots = Array.from({ length: 6 }, (_, i) => i === 5 ? { id: 'plot-6' } : { id: 'plot-' + (i+1), cropId: crops[i%4], plantedAt: now - durations[i%4] * [1.2,.4,.7,.2,1.1][i], readyAt: now + durations[i%4] * [ -.2,.6,.3,.8,-.1][i] });
    if (config) {
        meta.unlockedIslandIds = [...new Set([...config.initialUnlockedIslandIds, ...config.goalIslandIds])];
        for (const id of config.goalIslandIds) {
            const island = config.world.getIslandById(id);
            if (island?.rewardTheorem) meta.collectedTheorems[island.rewardTheorem.theoremId] = { ...island.rewardTheorem, freeUsesRemaining: 1, useCount: 0, sourceIslandId: id, collectedInLevelId: config.levelId };
        }
    }
    return { version: 2, timestamp: now, levelIndex, levelStates: {}, metaProgress: meta, blueprints: [] };
}
module.exports = { fixture };
