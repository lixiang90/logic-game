const assert = require('node:assert/strict');
require('./art-fixtures.cjs');
const { SaveSystem, decodeSave, encodeSave, LegacyStage2SaveError } = require('../src/lib/saveSystem.ts');
const { getStage2LevelConfig } = require('../src/data/stage2.ts');
const stage2 = { ...SaveSystem.normalizeSaveData(SaveSystem.createEmptySave()), levelIndex: 10 };
const state = { nodes: [], wires: [] };
const storage = new Map();
global.window = {};
global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
let rejected = 0;
function reject(save) {
    const text = JSON.stringify(save);
    assert.throws(() => decodeSave(text), LegacyStage2SaveError);
    assert.equal(SaveSystem.normalizeSaveData(save), null);
    storage.set('logic_game_save_1', text);
    const previous = console.error;
    try {
        console.error = () => {};
        assert.equal(SaveSystem.loadAutoSave(), null);
        assert.equal(SaveSystem.getSlotInfo(1), null);
        assert.equal(SaveSystem.hasAutoSave(), false);
    } finally { console.error = previous; }
    assert.equal(storage.get('logic_game_save_1'), text, 'rejection does not overwrite the original');
    rejected++;
}
for (const version of [undefined, 1, 2, 3]) {
    for (const worldVersion of [undefined, 1]) {
        reject({ ...stage2, version, metaProgress: { ...stage2.metaProgress, worldVersion } });
    }
}
reject({ ...stage2, levelIndex: 0, metaProgress: { ...stage2.metaProgress, worldVersion: 1 }, levelStates: { 10: state } });
reject({ ...stage2, levelIndex: 0, levelStartStates: { 10: { levelState: state, metaProgress: { ...stage2.metaProgress, worldVersion: 1 } } } });
reject({ ...stage2, levelStartStates: { 10: { levelState: state, metaProgress: { ...stage2.metaProgress, worldVersion: undefined } } } });
for (const worldVersion of [undefined, 1, 2]) {
    const oldStage1 = { ...stage2, version: 2, levelIndex: 9, metaProgress: { ...stage2.metaProgress, worldVersion }, levelStates: { 9: state } };
    const restored = decodeSave(JSON.stringify(oldStage1));
    assert.equal(restored.levelIndex, 9);
    assert.equal(restored.metaProgress.worldVersion, 2);
    assert.deepEqual(restored.levelStates, oldStage1.levelStates);
}
const valid = { ...stage2, levelStartStates: { 10: { levelState: state, metaProgress: stage2.metaProgress } } };
const restored = decodeSave(encodeSave(valid));
assert.equal(restored.metaProgress.worldVersion, 2);
assert.deepEqual(restored.levelStartStates, valid.levelStartStates);
SaveSystem.autoSave(valid);
assert.equal(SaveSystem.hasAutoSave(), true);
assert.equal(SaveSystem.loadAutoSave().levelIndex, 10);
for (let chapter = 11; chapter <= 20; chapter++) assert.equal(getStage2LevelConfig(`level-${chapter}`, 42).world.atlas.version, 2);
const fs = require('node:fs');
const quickSave = 'artifacts/saves/stage2-start-regional-v2.logic';
if (fs.existsSync(quickSave)) assert.equal(decodeSave(fs.readFileSync(quickSave, 'utf8')).metaProgress.worldVersion, 2);
console.log(`PASS: ${rejected} retired-save cases rejected; original slots preserved; Stage 1 upgrades; regional saves and restart snapshots round-trip; all 10 chapters use regional maps.`);
