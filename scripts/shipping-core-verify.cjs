require('./art-fixtures.cjs');
const assert = require('node:assert/strict');
const { solveCircuitGoals } = require('../src/lib/circuit-solver.ts');
const { encodeSave, decodeSave, SaveSystem, LegacyStage2SaveError } = require('../src/lib/saveSystem.ts');
const { getStage2LevelConfig } = require('../src/data/stage2.ts');
const { boundsOverlap } = require('../src/lib/gameUtils.ts');
const { buyVirtualChip, buildShippingRoutes, knownTheorems, virtualChipCost, consumeVirtualCopies } = require('../src/lib/shipping.ts');

const atom = { id: 'P', type: 'atom', subType: 'P', x: -4, y: -1, w: 4, h: 4 };
const a = { id: 'a', type: 'theorem', subType: 'A', theoremId: 'A', theoremVars: ['P'], theoremPremises: [], theoremConclusion: 'P', x: 0, y: 0, w: 6, h: 6 };
const wire = (id, x, y, w, h = 1, rotation = 0) => ({ id, type: 'wire', subType: 'provable', x, y, w, h, rotation });
const goal = (x, y, formula = '|-P') => [{ id: 'destination', formula, bounds: { x, y, w: 8, h: 8 } }];
const unused = { ...a, id: 'unused', theoremId: 'unused', x: -20, y: -20, theoremVars: [] };
const nodes = [atom, a, wire('route', 6, 3, 2), unused];
let result = solveCircuitGoals(nodes, goal(8, 2), new Set());
assert.deepEqual([...result.goalTheoremIds.get('destination')], ['A']);
assert(result.pendingGoalIds.has('destination'));
assert(!result.completedGoalIds.has('destination'));
result = solveCircuitGoals(nodes, goal(8, 2), new Set(['A']));
assert(result.completedGoalIds.has('destination'));
assert.equal(result.pendingGoalIds.size, 0);
assert.equal(solveCircuitGoals([atom, a, unused], goal(8, 2), new Set(['A'])).goalTheoremIds.size, 0);

const b = { ...a, id: 'b', theoremId: 'B', x: 8, y: 2, theoremVars: [], theoremPremises: ['|-P'], theoremConclusion: 'Q' };
result = solveCircuitGoals([...nodes, b, wire('b-out', 14, 5, 2)], goal(16, 4, '|-Q'), new Set(['B']));
assert.deepEqual([...result.goalTheoremIds.get('destination')].sort(), ['A', 'B']);
assert(result.pendingGoalIds.has('destination'));

// A bridge forwards the horizontal proof without importing the vertical theorem.
const crossing = { ...unused, id: 'crossing', theoremId: 'C', x: 2, y: -3, theoremConclusion: 'Q' };
result = solveCircuitGoals([
    atom, a, crossing, { id: 'bridge', type: 'bridge', subType: 'bridge', x: 7, y: 2, w: 2, h: 2 },
    wire('left', 6, 3, 1), wire('right', 9, 3, 7), wire('top', 8, 0, 1, 2, 1),
], goal(16, 2), new Set(['A']));
assert.deepEqual([...result.goalTheoremIds.get('destination')], ['A']);
assert(result.completedGoalIds.has('destination'));

const save = SaveSystem.normalizeSaveData(SaveSystem.createEmptySave());
save.levelStates[0] = { nodes: [{ ...atom, note: '星图港口 ⊢ P 🚢' }], wires: [] };
const encoded = encodeSave(save);
assert.match(encoded, /^[A-Za-z0-9+/]+=*$/);
assert.deepEqual(decodeSave(encoded), save);
assert.equal(decodeSave(JSON.stringify({ timestamp: 1, levelIndex: 0, levelStates: save.levelStates })).version, 3);
assert.throws(() => decodeSave(JSON.stringify({ ...save, version: 2, levelIndex: 10 })), LegacyStage2SaveError);
assert.throws(() => decodeSave('e30='));
assert.throws(() => decodeSave(JSON.stringify({ ...save, version: 99 })));
const storage = new Map();
global.window = {};
global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
SaveSystem.save(2, save);
assert.equal(storage.get('logic_game_save_2'), encoded);
assert.deepEqual(SaveSystem.load(2), save);
SaveSystem.autoSave(save);
assert.deepEqual(SaveSystem.loadAutoSave(), save);

const late = getStage2LevelConfig('level-16', 42), early = getStage2LevelConfig('level-15', 42);
const virtualSource = late.world.getIslandById(late.goalIslandIds[1]);
let progress = { ...save.metaProgress, coins: 500, unlockedIslandIds: late.initialUnlockedIslandIds };
assert.equal(buyVirtualChip(progress, early, virtualSource.id), progress, 'virtual chips unlock in chapter 6');
assert.equal(buyVirtualChip({ ...progress, coins: 0 }, late, virtualSource.id).coins, 0);
progress = buyVirtualChip(progress, late, virtualSource.id);
const purchased = progress.collectedTheorems[virtualSource.rewardTheorem.theoremId];
assert.equal(progress.coins, 500 - virtualChipCost(virtualSource.rewardTheorem.cost));
assert.equal(purchased.freeUsesRemaining, 1);
assert.equal(purchased.virtual, true);
assert(!knownTheorems(progress).has(purchased.theoremId));
progress = buyVirtualChip(progress, late, virtualSource.id);
assert.equal(progress.collectedTheorems[purchased.theoremId].freeUsesRemaining, 2);
const copied = consumeVirtualCopies(progress, [{ ...a, theoremId: purchased.theoremId }, { ...a, id: 'copy2', theoremId: purchased.theoremId }]);
assert.equal(copied.collectedTheorems[purchased.theoremId].freeUsesRemaining, 0);
assert.equal(consumeVirtualCopies(copied, [{ ...a, theoremId: purchased.theoremId }]), null);
assert.equal(consumeVirtualCopies(progress, [{ ...a, theoremId: 'not-purchased' }]), null);
progress.plannedRoutes = [{ sourceIslandId: virtualSource.id, targetIslandId: late.focusIslandId }];
assert.equal(buildShippingRoutes(late, progress, [], new Map())[0].status, 'planned');
const proofRoutes = buildShippingRoutes(late, progress, [], new Map([[late.focusIslandId, new Set([purchased.theoremId])]]));
assert.equal(proofRoutes[0].sourceIslandId, virtualSource.id);
assert.equal(proofRoutes[0].targetIslandId, late.focusIslandId);
assert.equal(proofRoutes[0].status, 'pending');
const restoredProgress = decodeSave(encodeSave({ ...save, levelIndex: 15, metaProgress: progress })).metaProgress;
assert.deepEqual(restoredProgress, progress);
const legacySnapshot = decodeSave(JSON.stringify({ timestamp: 1, levelIndex: 0, levelStates: {}, levelStartStates: { 0: { levelState: { nodes: [], wires: [] } } } }));
assert.deepEqual(legacySnapshot.levelStartStates[0].metaProgress.plannedRoutes, []);
// A↔B cannot create a trusted seed; only an independently established theorem resolves a call.
for (const [theorem, target] of [['A','B'], ['B','A']]) {
    const cycle = solveCircuitGoals([atom, { ...a, theoremId: theorem }, wire('cycle',6,3,2)], [{ ...goal(8,2)[0], id: target }], new Set());
    assert.equal(cycle.completedGoalIds.size, 0);
    assert(cycle.pendingGoalIds.has(target));
}

const previousBounds = new Map();
let islandChecks = 0;
for (let chapter = 1; chapter <= 10; chapter++) {
    const config = getStage2LevelConfig(`level-${chapter + 10}`, 42);
    for (const [id, bounds] of previousBounds) assert.deepEqual(config.world.getIslandById(id).mapBounds, bounds, `island ${id} moved in chapter ${chapter}`);
    for (const id of config.goalIslandIds) previousBounds.set(id, config.world.getIslandById(id).mapBounds);
    const entries = [...previousBounds.entries()];
    for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
        assert(!boundsOverlap(entries[i][1], entries[j][1]), `${entries[i][0]} overlaps ${entries[j][0]}`);
        islandChecks++;
    }
    const main = config.world.getIslandById(config.focusIslandId);
    const neighbors = config.recommendedTheoremIds.map(theorem => config.goalIslandIds.map(id => config.world.getIslandById(id)).find(island => island.rewardTheorem?.theoremId === theorem)).filter(Boolean);
    for (const island of neighbors) {
        const dx = main.mapBounds.x + main.mapBounds.w / 2 - island.mapBounds.x - island.mapBounds.w / 2;
        const dy = main.mapBounds.y + main.mapBounds.h / 2 - island.mapBounds.y - island.mapBounds.h / 2;
        assert(Math.hypot(dx, dy) < 155, `chapter ${chapter}: support island too distant`);
    }
    const visible = config.world.getIslandsInBounds(main.mapBounds);
    assert(visible.some(island => island.id === main.id), 'cluster must be discoverable by viewport');
}
console.log(JSON.stringify({ provenance: 'passed: used, unused, disconnected, unresolved, resolved, transitive, bridge channels', saves: 'passed: Unicode Base64, slots, autosave, old Stage 1, rejected old Stage 2', layout: { chapters: 10, islandChecks, stable: true, noOverlap: true, closeSupports: true } }, null, 2));
