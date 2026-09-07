'use client';

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tool, NodeData, Wire } from '@/types/game';
import { boundsOverlap, getNodeBounds, getNodePorts, getAbsolutePortPosition } from '@/lib/gameUtils';
import { getGoalPortsForRect, solveCircuit, solveCircuitGoals } from '@/lib/circuit-solver';
import { Provable } from '@/lib/logic-engine';
import { formulaRenderer } from '@/lib/formula-renderer';
import { useTutorial } from '@/contexts/TutorialContext';
import { SelectMode } from '@/components/Toolbar';
import { Stage2IslandDefinition, Stage2LevelConfig, Stage2MetaProgress } from '@/types/stage2';
import { getTheoremChipHeight } from '@/lib/theorem-chips';
import { useVisualSettings } from '@/contexts/VisualSettingsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ART_THEME } from '@/lib/art-theme';
import { drawCircuitItem, fitLabel, resolveDisplayValues } from '@/lib/render/circuit-art';
import { CHAPTER_LANDMARKS, drawIslandGround, drawLandmark, drawStarWorkshop, worldLod } from '@/lib/render/world-art';

interface Point {
    x: number;
    y: number;
}

// A modal owns the keyboard even before its focus effect runs. Nonmodal readers
// and form controls own shortcuts while focus is inside them.
function isCanvasKeyboardBlocked(target: EventTarget | null): boolean {
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return true;
    const element = target instanceof HTMLElement ? target : null;
    return Boolean(element?.closest('[role="dialog"], [data-formula-reader]')
        || element?.isContentEditable
        || element?.matches('input, textarea, select'));
}

interface InfiniteCanvasProps {
    activeTool: Tool | null;
    selectMode?: SelectMode;
    onToolClear: () => void;
    onToolRotate?: () => void;
    onToolSetRotation?: (rotation: number) => void;
    onToolToggleType?: () => void;
    goalFormula?: string;
    onLevelComplete?: () => void;
    initialState?: { nodes: NodeData[], wires: Wire[] };
    canPlaceNode?: (node: NodeData) => boolean;
    onNodePlaced?: (node: NodeData) => void;
    onStage2IslandComplete?: (islandId: string) => void;
    stage2Config?: Stage2LevelConfig;
    stage2Progress?: Stage2MetaProgress;
    selectedStage2IslandId?: string | null;
}

export interface InfiniteCanvasHandle {
    resetView: () => void;
    getState: () => { nodes: NodeData[], wires: Wire[] };
    loadState: (state: { nodes: NodeData[], wires: Wire[] }) => void;
    jumpToStage2Island: (islandId: string) => void;
    undo: () => boolean;
    redo: () => boolean;
    copySelection: () => number;
    pasteSelection: () => number;
    autoArrangeSelection: () => number;
    alignSelection: (axis: 'left' | 'top' | 'center-x' | 'center-y') => number;
    distributeSelection: (axis: 'horizontal' | 'vertical') => number;
    annotateSelection: (note: string) => number;
    traceGoalDependencies: () => number;
    toggleFocusMode: () => boolean;
    getSelectionState: () => { nodes: NodeData[], wires: Wire[] };
    insertBlueprint: (state: { nodes: NodeData[], wires: Wire[] }) => number;
}

const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(({
    activeTool,
    selectMode = 'pointer',
    onToolClear,
    onToolRotate,
    onToolSetRotation,
    onToolToggleType,
    goalFormula,
    onLevelComplete,
    initialState,
    canPlaceNode,
    onNodePlaced,
    onStage2IslandComplete,
    stage2Config,
    stage2Progress,
    selectedStage2IslandId,
}, ref) => {
    const { dispatchAction, currentStep } = useTutorial();
    const { quality, reducedMotion } = useVisualSettings();
    const { language } = useLanguage();
    const animationTimeRef = useRef(0);
    const pixelRatioRef = useRef(1);
    const drawRef = useRef<() => void>(() => {});
    const backdropRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
    const visualEventsRef = useRef<Array<{ x: number; y: number; w: number; h: number; at: number; removed: boolean; proof?: boolean }>>([]);
    const previousVisualNodesRef = useRef<NodeData[] | null>(null);
    const previousSolvedVisualRef = useRef<Set<string> | null>(null);
    const animatedWiresRef = useRef(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stage2IslandRenderCacheRef = useRef<
        Map<
            string,
            {
                tilesPath: Path2D;
                outlinePath: Path2D;
                coarseLabel: string;
            }
        >
    >(new Map());
    const wasdStateRef = useRef<{ w: boolean; a: boolean; s: boolean; d: boolean; shift: boolean }>({
        w: false,
        a: false,
        s: false,
        d: false,
        shift: false,
    });
    const wasdRafRef = useRef<number | null>(null);
    const wasdLastFrameRef = useRef<number>(0);
    const stage2InitialViewKeyRef = useRef<string | null>(null);
    const [offset, setOffset] = useState<Point>(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0
    }));
    const [scale, setScale] = useState<number>(1);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isWirePainting, setIsWirePainting] = useState<boolean>(false);
    const [lastWireGridPos, setLastWireGridPos] = useState<Point | null>(null);
    const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
    const [mouseGridPos, setMouseGridPos] = useState<Point | null>(null);
    const [lastPlacement, setLastPlacement] = useState<{ nodeId: string; tool: Tool; x: number; y: number } | null>(null);
    const [nodes, setNodes] = useState<NodeData[]>(initialState?.nodes || []);
    const [wires, setWires] = useState<Wire[]>(initialState?.wires || []);

    const GRID_SIZE = 25;
    const BLOCK_STRIDE = 16;
    const SUPER_BLOCK_STRIDE = 128;
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5.0;
    const LOD_THRESHOLD_SMALL = 0.4;
    const LOD_THRESHOLD_BLOCK = 0.2;
    
    const unlockedStage2IslandIds = stage2Progress?.unlockedIslandIds;
    const stage2UnlockedIslandIdSet = React.useMemo(
        () => stage2Config
            ? new Set(
                  unlockedStage2IslandIds?.length
                      ? unlockedStage2IslandIds
                      : stage2Config.initialUnlockedIslandIds
              )
            : new Set<string>(),
        [stage2Config, unlockedStage2IslandIds]
    );
    const stage2DisplayedGoalIslandIds = React.useMemo(() => {
        if (!stage2Config) return [];
        return Array.from(new Set([
            ...stage2Config.goalIslandIds,
            ...(stage2Progress?.completedIslandIds ?? []),
        ])).filter((id) => Boolean(stage2Config.world.getIslandById(id)?.goalFormula));
    }, [stage2Config, stage2Progress?.completedIslandIds]);

    // Memoize circuit solution to avoid useEffect/setState cycle
    const { isSolved, activeNodeIds, errorWireIds, errorNodePorts, errorGoalPorts, wireValues, completedGoalIds, goalErrorsById } = React.useMemo(() => {
        if (stage2Config) {
            const goals = stage2Config.goalIslandIds
                .filter((id) => stage2UnlockedIslandIdSet.has(id))
                .map((id) => stage2Config.world.getIslandById(id))
                .filter((item): item is NonNullable<typeof item> => Boolean(item))
                .filter((island) => Boolean(island.goalFormula && island.goalBounds))
                .map((island) => ({
                    id: island.id,
                    formula: island.goalFormula!,
                    bounds: island.goalBounds!,
                }));

            return solveCircuitGoals(nodes, goals);
        }

        if (!goalFormula) return {
            isSolved: false,
            activeNodeIds: new Set<string>(),
            errorWireIds: new Set<string>(),
            errorNodePorts: new Map<string, Set<string>>(),
            errorGoalPorts: new Set<string>(),
            wireValues: new Map<string, string>(),
            completedGoalIds: new Set<string>(),
            goalErrorsById: new Map<string, Set<string>>()
        };
        return solveCircuit(nodes, goalFormula);
    }, [nodes, goalFormula, stage2Config, stage2UnlockedIslandIdSet]);

    const displayValues = React.useMemo(() => resolveDisplayValues(nodes, wireValues), [nodes, wireValues]);
    const [hoveredWireValue, setHoveredWireValue] = useState<{ x: number, y: number, value: string } | null>(null);
    const [inspectedFormula, setInspectedFormula] = useState<string | null>(null);

    useEffect(() => {
        animatedWiresRef.current = nodes.some(node => node.type === 'wire' && activeNodeIds.has(node.id) && !errorWireIds.has(node.id));
    }, [nodes, activeNodeIds, errorWireIds]);
    useEffect(() => {
        const previous = previousVisualNodesRef.current;
        previousVisualNodesRef.current = nodes;
        if (!previous || reducedMotion || quality === 'low') return;
        const before = new Set(previous.map(node => node.id)), after = new Set(nodes.map(node => node.id));
        const at = performance.now();
        const added = nodes.filter(node => !before.has(node.id) && !node.locked).slice(-12);
        const removed = previous.filter(node => !after.has(node.id) && !node.locked).slice(-12);
        visualEventsRef.current = [
            ...added.map(node => ({ ...getNodeBounds(node), at, removed: false })),
            ...removed.map(node => ({ ...getNodeBounds(node), at, removed: true })),
        ];
    }, [nodes, reducedMotion, quality]);
    useEffect(() => {
        const solved = stage2Config ? completedGoalIds : new Set(isSolved ? [goalFormula ?? 'goal'] : []);
        const previous = previousSolvedVisualRef.current;
        previousSolvedVisualRef.current = new Set(solved);
        if (!previous || reducedMotion || quality === 'low') return;
        const at = performance.now();
        solved.forEach(id => {
            if (previous.has(id)) return;
            const bounds = stage2Config ? stage2Config.world.getIslandById(id)?.goalBounds : { x: -4, y: -4, w: 8, h: 8 };
            if (bounds) visualEventsRef.current.push({ ...bounds, at, removed: false, proof: true });
        });
    }, [completedGoalIds, isSolved, goalFormula, stage2Config, reducedMotion, quality]);
    
    // Box selection state
    const [isBoxSelecting, setIsBoxSelecting] = useState<boolean>(false);
    const [boxSelectStart, setBoxSelectStart] = useState<Point | null>(null);
    const [boxSelectEnd, setBoxSelectEnd] = useState<Point | null>(null);
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [, setSelectedWireIds] = useState<Set<string>>(new Set());
    const [focusMode, setFocusMode] = useState(false);
    const clipboardRef = useRef<{ nodes: NodeData[], wires: Wire[] } | null>(null);
    const historyRef = useRef<{
        undo: Array<{ nodes: NodeData[], wires: Wire[] }>;
        redo: Array<{ nodes: NodeData[], wires: Wire[] }>;
    }>({ undo: [], redo: [] });
    const lastHistoryStateRef = useRef<{ nodes: NodeData[], wires: Wire[] }>({
        nodes: initialState?.nodes ?? [],
        wires: initialState?.wires ?? [],
    });
    const restoringHistoryRef = useRef(false);

    const STAGE2_MARKER_SCALE_THRESHOLD = 0.38;
    const STAGE2_DETAIL_SCALE_THRESHOLD = 0.95;

    const selectedStage2Island = React.useMemo(() => {
        if (!stage2Config) return null;
        const islandId = selectedStage2IslandId ?? stage2Config.focusIslandId;
        return stage2Config.world.getIslandById(islandId);
    }, [selectedStage2IslandId, stage2Config]);

    const showStage2IslandOverlayDetails = stage2Config ? scale >= STAGE2_MARKER_SCALE_THRESHOLD : false;
    const previewBuildTiles = React.useMemo(() => {
        if (!stage2Config) return null;
        const tiles = new Set<string>();
        stage2UnlockedIslandIdSet.forEach(id => stage2Config.world.getIslandById(id)?.buildTiles.forEach(tile => tiles.add(`${tile.x},${tile.y}`)));
        return tiles;
    }, [stage2Config, stage2UnlockedIslandIdSet]);
    // Show the placed item, not a conflicting preview of another copy at the same cell.
    const awaitingNextPlacement = Boolean(lastPlacement && lastPlacement.tool === activeTool
        && lastPlacement.x === mouseGridPos?.x && lastPlacement.y === mouseGridPos?.y
        && nodes.some(node => node.id === lastPlacement.nodeId));
    // This is a read-only preview. The existing placement handler remains authoritative.
    const previewBlocked = React.useMemo(() => {
        if (!activeTool || !mouseGridPos) return false;
        const candidate = { ...activeTool, ...mouseGridPos, id: 'preview' } as NodeData;
        const bounds = getNodeBounds(candidate);
        if (previewBuildTiles) {
            for (let x = Math.floor(bounds.x); x < Math.ceil(bounds.x + bounds.w); x++) {
                for (let y = Math.floor(bounds.y); y < Math.ceil(bounds.y + bounds.h); y++) {
                    if (!previewBuildTiles.has(`${x},${y}`)) return true;
                }
            }
        }
        const goals = stage2Config ? stage2DisplayedGoalIslandIds.filter(id => stage2UnlockedIslandIdSet.has(id)).map(id => stage2Config.world.getIslandById(id)?.goalBounds).filter((item): item is { x: number; y: number; w: number; h: number } => Boolean(item)) : [];
        if ((goals.length ? goals : [{ x: -4, y: -4, w: 8, h: 8 }]).some(goal => boundsOverlap(bounds, goal))) return true;
        return nodes.some(node => {
            if (!boundsOverlap(bounds, getNodeBounds(node))) return false;
            if (candidate.type === 'wire' && node.type === 'wire') return false;
            if (candidate.type === 'bridge' && node.type === 'wire') return false;
            return true;
        });
    }, [activeTool, mouseGridPos, nodes, previewBuildTiles, stage2Config, stage2DisplayedGoalIslandIds, stage2UnlockedIslandIdSet]);

    useEffect(() => {
        const current = { nodes, wires };
        if (restoringHistoryRef.current) {
            restoringHistoryRef.current = false;
            lastHistoryStateRef.current = current;
            return;
        }
        const previous = lastHistoryStateRef.current;
        if (previous.nodes === nodes && previous.wires === wires) return;
        historyRef.current.undo.push(structuredClone(previous));
        if (historyRef.current.undo.length > 100) historyRef.current.undo.shift();
        historyRef.current.redo = [];
        lastHistoryStateRef.current = current;
    }, [nodes, wires]);

    useEffect(() => {
        stage2IslandRenderCacheRef.current.clear();
    }, [stage2Config?.levelId, stage2Progress?.mapSeed]);

    useEffect(() => {
        if (!initialState || initialState.nodes.length === 0) return;
        const raf = requestAnimationFrame(() => {
            setNodes((prevNodes) => {
                let nextNodes = prevNodes;

                const initialLockedPremises = initialState.nodes.filter((node) => node.type === 'premise' && node.locked);
                if (initialLockedPremises.length > 0) {
                    const initialPremiseById = new Map(initialLockedPremises.map((node) => [node.id, node]));
                    let changed = false;

                    const filtered = nextNodes.filter((node) => {
                        if (node.type !== 'premise' || !node.locked) return true;
                        return initialPremiseById.has(node.id);
                    });
                    if (filtered.length !== nextNodes.length) changed = true;

                    const mapped = filtered.map((node) => {
                        if (node.type !== 'premise' || !node.locked) return node;
                        const fresh = initialPremiseById.get(node.id);
                        if (!fresh) return node;
                        if (
                            node.subType === fresh.subType &&
                            node.customLabel === fresh.customLabel &&
                            node.sourceIslandId === fresh.sourceIslandId &&
                            node.x === fresh.x &&
                            node.y === fresh.y &&
                            node.theoremIsFormulaOnly === fresh.theoremIsFormulaOnly
                        ) {
                            return node;
                        }
                        changed = true;
                        return {
                            ...node,
                            subType: fresh.subType,
                            customLabel: fresh.customLabel,
                            sourceIslandId: fresh.sourceIslandId,
                            x: fresh.x,
                            y: fresh.y,
                            theoremIsFormulaOnly: fresh.theoremIsFormulaOnly,
                        };
                    });

                    nextNodes = mapped;

                    const loadedIds = new Set(nextNodes.map((node) => node.id));
                    const missingNodes = initialState.nodes.filter((node) => !loadedIds.has(node.id));
                    if (missingNodes.length > 0) {
                        nextNodes = [...nextNodes, ...missingNodes];
                        changed = true;
                    }

                    return changed ? nextNodes : prevNodes;
                }

                const loadedIds = new Set(nextNodes.map((node) => node.id));
                const missingNodes = initialState.nodes.filter((node) => !loadedIds.has(node.id));
                if (missingNodes.length === 0) return prevNodes;
                return [...nextNodes, ...missingNodes];
            });
        });

        return () => cancelAnimationFrame(raf);
    }, [initialState]);

    // Handle Level Completion
    useEffect(() => {
        if (isSolved) {
            onLevelComplete?.();
        }
    }, [isSolved, onLevelComplete]);
    
    const makeSelectionState = useCallback(() => {
        const selected = nodes.filter((node) => selectedNodeIds.has(node.id) && !node.locked);
        if (selected.length === 0) return { nodes: [], wires: [] };
        const minX = Math.min(...selected.map((node) => node.x));
        const minY = Math.min(...selected.map((node) => node.y));
        const selectedIds = new Set(selected.map((node) => node.id));
        return {
            nodes: selected.map((node) => ({ ...structuredClone(node), x: node.x - minX, y: node.y - minY })),
            wires: wires
                .filter((wire) => selectedIds.has(wire.startNodeId) && selectedIds.has(wire.endNodeId))
                .map((wire) => ({
                    ...structuredClone(wire),
                    path: wire.path.map((point) => ({ x: point.x - minX, y: point.y - minY })),
                })),
        };
    }, [nodes, wires, selectedNodeIds]);

    const restoreHistoryState = (state: { nodes: NodeData[], wires: Wire[] }) => {
        restoringHistoryRef.current = true;
        lastHistoryStateRef.current = state;
        setNodes(structuredClone(state.nodes));
        setWires(structuredClone(state.wires));
        setSelectedNodeIds(new Set());
        setSelectedWireIds(new Set());
    };

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        resetView: () => {
            setOffset({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            });
            setScale(1);
        },
        getState: () => ({
            nodes,
            wires
        }),
        loadState: (state: { nodes: NodeData[], wires: Wire[] }) => {
            let newNodes = state.nodes;
            
            if (initialState && initialState.nodes.length > 0) {
                const initialLockedPremises = initialState.nodes.filter(
                    (node) => node.type === 'premise' && node.locked
                );

                if (initialLockedPremises.length > 0) {
                    const initialPremiseById = new Map(initialLockedPremises.map((node) => [node.id, node]));

                    newNodes = newNodes
                        .filter((node) => {
                            if (node.type !== 'premise' || !node.locked) return true;
                            return initialPremiseById.has(node.id);
                        })
                        .map((node) => {
                            if (node.type !== 'premise' || !node.locked) return node;
                            const fresh = initialPremiseById.get(node.id);
                            if (!fresh) return node;
                            return {
                                ...node,
                                subType: fresh.subType,
                                customLabel: fresh.customLabel,
                                sourceIslandId: fresh.sourceIslandId,
                                x: fresh.x,
                                y: fresh.y,
                                theoremIsFormulaOnly: fresh.theoremIsFormulaOnly,
                            };
                        });

                    const loadedIds = new Set(newNodes.map((node) => node.id));
                    const missingNodes = initialState.nodes.filter((node) => !loadedIds.has(node.id));
                    if (missingNodes.length > 0) {
                        newNodes = [...newNodes, ...missingNodes];
                    }
                } else {
                    const loadedIds = new Set(newNodes.map((node) => node.id));
                    const missingNodes = initialState.nodes.filter((node) => !loadedIds.has(node.id));
                    if (missingNodes.length > 0) {
                        newNodes = [...newNodes, ...missingNodes];
                    }
                }
            }

            if (stage2Config) {
                const normalizeFormulaText = (text: string) => text.replace(/^\s*(\|-|⊢)\s*/, '').trim();
                const extractVariables = (parts: string[]) => {
                    const vars = new Set<string>();
                    parts.forEach((part) => {
                        const matches = normalizeFormulaText(part).match(/[A-Z][A-Za-z0-9]*/g) ?? [];
                        matches.forEach((m) => vars.add(m));
                    });
                    return Array.from(vars);
                };

                const resolveTheoremMeta = (theoremId: string) => {
                    const islands = stage2Config.goalIslandIds
                        .map((id) => stage2Config.world.getIslandById(id))
                        .filter((item): item is NonNullable<typeof item> => Boolean(item));
                    const island =
                        islands.find((i) => i.rewardTheorem?.theoremId === theoremId) ??
                        islands.find((i) => i.name === theoremId);
                    if (!island) return null;

                    const premises = (island.premiseNodes ?? []).map((p) => p.formula);
                    const rawGoal = island.goalFormula ?? '';
                    const conclusion = normalizeFormulaText(rawGoal);
                    const isFormulaOnly = !rawGoal.trim().startsWith('|-') && !rawGoal.trim().startsWith('⊢');
                    const vars = extractVariables([...premises, conclusion]);
                    const portRows = Math.max(1, vars.length + premises.length);
                    const h = Math.max(6, portRows * 2 + 2);

                    return {
                        theoremName: island.rewardTheorem?.name ?? island.name ?? theoremId,
                        theoremVars: vars,
                        theoremPremises: premises,
                        theoremConclusion: conclusion,
                        theoremIsFormulaOnly: isFormulaOnly,
                        w: 10,
                        h,
                        simplifiedH: getTheoremChipHeight(vars.length, premises.length, true),
                    };
                };

                newNodes = newNodes.map((node) => {
                    if (!node.theoremId) return node;
                    if (node.type === 'premise' && !node.locked) {
                        const meta = resolveTheoremMeta(node.theoremId);
                        if (!meta) return node;
                        return {
                            ...node,
                            type: 'theorem',
                            subType: node.theoremId,
                            theoremName: meta.theoremName,
                            theoremVars: meta.theoremVars,
                            theoremPremises: meta.theoremPremises,
                            theoremConclusion: meta.theoremConclusion,
                            theoremIsFormulaOnly: meta.theoremIsFormulaOnly,
                            w: meta.w,
                            h: node.theoremSimplified ? meta.simplifiedH : meta.h,
                        };
                    }
                    if (node.type === 'theorem') {
                        const meta = resolveTheoremMeta(node.theoremId);
                        if (!meta) return node;
                        return {
                            ...node,
                            theoremName: meta.theoremName,
                            theoremVars: meta.theoremVars,
                            theoremPremises: meta.theoremPremises,
                            theoremConclusion: meta.theoremConclusion,
                            theoremIsFormulaOnly: meta.theoremIsFormulaOnly,
                            w: meta.w,
                            h: node.theoremSimplified ? meta.simplifiedH : meta.h,
                        };
                    }
                    return node;
                });
            }

            setNodes(newNodes);
            setWires(state.wires);
            historyRef.current = { undo: [], redo: [] };
            lastHistoryStateRef.current = { nodes: newNodes, wires: state.wires };
        },
        jumpToStage2Island: (islandId: string) => {
            if (!stage2Config) return;
            const island = stage2Config.world.getIslandById(islandId);
            if (!island) return;
            const islandCenterX = (island.mapBounds.x + island.mapBounds.w / 2) * GRID_SIZE;
            const islandCenterY = (island.mapBounds.y + island.mapBounds.h / 2) * GRID_SIZE;
            const targetScale = 1;
            requestAnimationFrame(() => {
                setScale(targetScale);
                setOffset({
                    x: window.innerWidth / 2 - islandCenterX * targetScale,
                    y: window.innerHeight / 2 - islandCenterY * targetScale,
                });
            });
        },
        undo: () => {
            const previous = historyRef.current.undo.pop();
            if (!previous) return false;
            historyRef.current.redo.push(structuredClone({ nodes, wires }));
            restoreHistoryState(previous);
            return true;
        },
        redo: () => {
            const next = historyRef.current.redo.pop();
            if (!next) return false;
            historyRef.current.undo.push(structuredClone({ nodes, wires }));
            restoreHistoryState(next);
            return true;
        },
        copySelection: () => {
            const state = makeSelectionState();
            if (state.nodes.length > 0) clipboardRef.current = structuredClone(state);
            return state.nodes.length;
        },
        pasteSelection: () => {
            const source = clipboardRef.current;
            if (!source || source.nodes.length === 0) return 0;
            const idMap = new Map<string, string>();
            source.nodes.forEach((node) => idMap.set(node.id, crypto.randomUUID()));
            const centerX = Math.round(((window.innerWidth / 2 - offset.x) / scale) / GRID_SIZE);
            const centerY = Math.round(((window.innerHeight / 2 - offset.y) / scale) / GRID_SIZE);
            const pastedNodes = source.nodes.map((node) => ({
                ...structuredClone(node),
                id: idMap.get(node.id)!,
                x: centerX + node.x + 2,
                y: centerY + node.y + 2,
                locked: false,
            }));
            const pastedWires = source.wires.map((wire) => ({
                ...structuredClone(wire),
                id: crypto.randomUUID(),
                startNodeId: idMap.get(wire.startNodeId) ?? wire.startNodeId,
                endNodeId: idMap.get(wire.endNodeId) ?? wire.endNodeId,
                path: wire.path.map((point) => ({ x: centerX + point.x + 2, y: centerY + point.y + 2 })),
            }));
            setNodes((previous) => [...previous, ...pastedNodes]);
            setWires((previous) => [...previous, ...pastedWires]);
            setSelectedNodeIds(new Set(pastedNodes.map((node) => node.id)));
            return pastedNodes.length;
        },
        autoArrangeSelection: () => {
            const selected = nodes.filter((node) => selectedNodeIds.has(node.id) && !node.locked && node.type !== 'wire');
            if (selected.length < 2) return selected.length;
            const ordered = [...selected].sort((a, b) => a.x - b.x || a.y - b.y);
            const startX = Math.min(...ordered.map((node) => node.x));
            const startY = Math.min(...ordered.map((node) => node.y));
            const positions = new Map(ordered.map((node, index) => [node.id, {
                x: startX + (index % 3) * 14,
                y: startY + Math.floor(index / 3) * 11,
            }]));
            setNodes((previous) => previous.map((node) => positions.has(node.id) ? { ...node, ...positions.get(node.id)! } : node));
            return selected.length;
        },
        alignSelection: (axis) => {
            const selected = nodes.filter((node) => selectedNodeIds.has(node.id) && !node.locked && node.type !== 'wire');
            if (selected.length < 2) return selected.length;
            const left = Math.min(...selected.map((node) => node.x));
            const top = Math.min(...selected.map((node) => node.y));
            const centerX = selected.reduce((sum, node) => sum + node.x + node.w / 2, 0) / selected.length;
            const centerY = selected.reduce((sum, node) => sum + node.y + node.h / 2, 0) / selected.length;
            const selectedIds = new Set(selected.map((node) => node.id));
            setNodes((previous) => previous.map((node) => {
                if (!selectedIds.has(node.id)) return node;
                if (axis === 'left') return { ...node, x: left };
                if (axis === 'top') return { ...node, y: top };
                if (axis === 'center-x') return { ...node, x: Math.round(centerX - node.w / 2) };
                return { ...node, y: Math.round(centerY - node.h / 2) };
            }));
            return selected.length;
        },
        distributeSelection: (axis) => {
            const selected = nodes.filter((node) => selectedNodeIds.has(node.id) && !node.locked && node.type !== 'wire');
            if (selected.length < 3) return selected.length;
            const ordered = [...selected].sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y);
            const first = axis === 'horizontal' ? ordered[0].x : ordered[0].y;
            const last = axis === 'horizontal' ? ordered.at(-1)!.x : ordered.at(-1)!.y;
            const step = (last - first) / (ordered.length - 1);
            const positions = new Map(ordered.map((node, index) => [node.id, Math.round(first + step * index)]));
            setNodes((previous) => previous.map((node) => {
                const value = positions.get(node.id);
                if (value == null) return node;
                return axis === 'horizontal' ? { ...node, x: value } : { ...node, y: value };
            }));
            return selected.length;
        },
        annotateSelection: (note: string) => {
            if (selectedNodeIds.size === 0) return 0;
            setNodes((previous) => previous.map((node) => selectedNodeIds.has(node.id) ? { ...node, note } : node));
            return selectedNodeIds.size;
        },
        traceGoalDependencies: () => {
            const traced = new Set(activeNodeIds);
            setSelectedNodeIds(traced);
            setFocusMode(true);
            return traced.size;
        },
        toggleFocusMode: () => {
            const next = !focusMode;
            setFocusMode(next);
            return next;
        },
        getSelectionState: makeSelectionState,
        insertBlueprint: (state) => {
            if (state.nodes.length === 0) return 0;
            clipboardRef.current = structuredClone(state);
            const source = clipboardRef.current;
            const idMap = new Map<string, string>();
            source.nodes.forEach((node) => idMap.set(node.id, crypto.randomUUID()));
            const centerX = Math.round(((window.innerWidth / 2 - offset.x) / scale) / GRID_SIZE);
            const centerY = Math.round(((window.innerHeight / 2 - offset.y) / scale) / GRID_SIZE);
            const pastedNodes = source.nodes.map((node) => ({ ...structuredClone(node), id: idMap.get(node.id)!, x: centerX + node.x, y: centerY + node.y, locked: false }));
            const pastedWires = source.wires.map((wire) => ({ ...structuredClone(wire), id: crypto.randomUUID(), startNodeId: idMap.get(wire.startNodeId) ?? wire.startNodeId, endNodeId: idMap.get(wire.endNodeId) ?? wire.endNodeId, path: wire.path.map((point) => ({ x: centerX + point.x, y: centerY + point.y })) }));
            setNodes((previous) => [...previous, ...pastedNodes]);
            setWires((previous) => [...previous, ...pastedWires]);
            setSelectedNodeIds(new Set(pastedNodes.map((node) => node.id)));
            return pastedNodes.length;
        },
    }), [GRID_SIZE, nodes, scale, wires, initialState, stage2Config, selectedNodeIds, activeNodeIds, focusMode, offset, makeSelectionState]);

    useEffect(() => {
        if (!stage2Config) {
            stage2InitialViewKeyRef.current = null;
            return;
        }
        const key = `${stage2Config.levelId}:${stage2Progress?.mapSeed ?? 0}`;
        if (stage2InitialViewKeyRef.current === key) return;

        const focusIsland = stage2Config.world.getIslandById(stage2Config.focusIslandId);
        if (!focusIsland) return;
        
        const targetScale = 1; // Default scale where grid is clearly visible
        const islandCenterX = (focusIsland.mapBounds.x + focusIsland.mapBounds.w / 2) * GRID_SIZE;
        const islandCenterY = (focusIsland.mapBounds.y + focusIsland.mapBounds.h / 2) * GRID_SIZE;
        const raf = requestAnimationFrame(() => {
            // Commit only when the frame runs. StrictMode may cancel the first scheduled frame.
            stage2InitialViewKeyRef.current = key;
            setScale(targetScale);
            setOffset({
                x: window.innerWidth / 2 - islandCenterX * targetScale,
                y: window.innerHeight / 2 - islandCenterY * targetScale,
            });
        });
        return () => cancelAnimationFrame(raf);
    }, [GRID_SIZE, stage2Config, stage2Progress?.mapSeed]);

    useEffect(() => {
        if (!stage2Config || !stage2Progress) return;

        completedGoalIds.forEach((goalId) => {
            if (!stage2Progress.completedIslandIds.includes(goalId)) {
                onStage2IslandComplete?.(goalId);
            }
        });
    }, [completedGoalIds, onStage2IslandComplete, stage2Config, stage2Progress]);

    // Removed wire dragging state as requested

    // Helper: Find Port at Position
    const findPortAt = (wx: number, wy: number) => {
        const threshold = 0.3;
        for (const node of nodes) {
            const ports = getNodePorts(node);
            for (const port of ports) {
                const absPos = getAbsolutePortPosition(node, port);
                if (Math.abs(wx - absPos.x) < threshold && Math.abs(wy - absPos.y) < threshold) {
                    return { node, port };
                }
            }
        }
        return null;
    };

    const drawNode = useCallback((ctx: CanvasRenderingContext2D, node: NodeData | Tool, x: number, y: number, isGhost = false) => {
        const id = 'id' in node ? node.id : '';
        drawCircuitItem(ctx, node, x, y, {
            scale, time: animationTimeRef.current, low: quality === 'low', reducedMotion, language,
            active: !isGhost && activeNodeIds.has(id),
            error: errorWireIds.has(id) || errorNodePorts.has(id),
            errorPorts: errorNodePorts.get(id), ghost: isGhost, displayValue: displayValues.get(id),
        });
    }, [scale, quality, reducedMotion, language, activeNodeIds, errorWireIds, errorNodePorts, displayValues]);

    const drawStage2Backdrop = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!stage2Config) return;
        const lod = worldLod(scale);
        const low = quality === 'low';
        const completed = new Set(stage2Progress?.completedIslandIds ?? []);
        const getCoarseLabel = (island: Stage2IslandDefinition) =>
            island.goalFormula ? formulaRenderer.parse(island.goalFormula)?.toString() ?? island.goalFormula : '';
        const buildIslandOutlinePath = (island: Stage2IslandDefinition) => {
            const edgeMap = new Map<string, { ax: number; ay: number; bx: number; by: number }>();
            const addOrToggleEdge = (ax: number, ay: number, bx: number, by: number) => {
                const key =
                    ax < bx || (ax === bx && ay <= by)
                        ? `${ax},${ay},${bx},${by}`
                        : `${bx},${by},${ax},${ay}`;
                if (edgeMap.has(key)) {
                    edgeMap.delete(key);
                    return;
                }
                edgeMap.set(key, { ax, ay, bx, by });
            };

            island.buildTiles.forEach((tile) => {
                const x0 = tile.x;
                const y0 = tile.y;
                const x1 = tile.x + 1;
                const y1 = tile.y + 1;
                addOrToggleEdge(x0, y0, x1, y0);
                addOrToggleEdge(x1, y0, x1, y1);
                addOrToggleEdge(x1, y1, x0, y1);
                addOrToggleEdge(x0, y1, x0, y0);
            });

            const pointToNeighbors = new Map<string, string[]>();
            const addNeighbor = (a: string, b: string) => {
                const arr = pointToNeighbors.get(a);
                if (arr) {
                    arr.push(b);
                } else {
                    pointToNeighbors.set(a, [b]);
                }
            };

            edgeMap.forEach((edge) => {
                const a = `${edge.ax},${edge.ay}`;
                const b = `${edge.bx},${edge.by}`;
                addNeighbor(a, b);
                addNeighbor(b, a);
            });

            const visitedUndirectedEdges = new Set<string>();
            const toUndirectedEdgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
            const parsePoint = (key: string) => {
                const [xs, ys] = key.split(',');
                return { x: Number(xs), y: Number(ys) };
            };

            const outline = new Path2D();
            const points = Array.from(pointToNeighbors.keys());
            for (const startPoint of points) {
                const neighbors = pointToNeighbors.get(startPoint);
                if (!neighbors || neighbors.length === 0) continue;

                for (const nextPoint of neighbors) {
                    const firstEdgeKey = toUndirectedEdgeKey(startPoint, nextPoint);
                    if (visitedUndirectedEdges.has(firstEdgeKey)) continue;

                    const start = startPoint;
                    let prev = startPoint;
                    let cur = nextPoint;

                    const startPos = parsePoint(start);
                    outline.moveTo(startPos.x * GRID_SIZE, startPos.y * GRID_SIZE);

                    visitedUndirectedEdges.add(firstEdgeKey);
                    while (true) {
                        const curPos = parsePoint(cur);
                        outline.lineTo(curPos.x * GRID_SIZE, curPos.y * GRID_SIZE);

                        const curNeighbors = pointToNeighbors.get(cur) ?? [];
                        let candidate: string | null = null;
                        if (curNeighbors.length === 1) {
                            candidate = curNeighbors[0];
                        } else {
                            for (const n of curNeighbors) {
                                if (n === prev) continue;
                                const edgeKey = toUndirectedEdgeKey(cur, n);
                                if (!visitedUndirectedEdges.has(edgeKey)) {
                                    candidate = n;
                                    break;
                                }
                            }
                            if (!candidate) {
                                candidate = curNeighbors.find((n) => n !== prev) ?? null;
                            }
                        }

                        if (!candidate) break;
                        if (candidate === start) {
                            outline.closePath();
                            break;
                        }

                        const edgeKey = toUndirectedEdgeKey(cur, candidate);
                        if (visitedUndirectedEdges.has(edgeKey)) {
                            outline.closePath();
                            break;
                        }
                        visitedUndirectedEdges.add(edgeKey);
                        prev = cur;
                        cur = candidate;
                    }
                }
            }

            return outline;
        };

        const getIslandCachedArtifacts = (island: Stage2IslandDefinition) => {
            const cached = stage2IslandRenderCacheRef.current.get(island.id);
            if (cached) return cached;

            const tilesPath = new Path2D();
            island.buildTiles.forEach((tile) => {
                tilesPath.rect(tile.x * GRID_SIZE, tile.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            });
            const outlinePath = buildIslandOutlinePath(island);
            const coarseLabel = getCoarseLabel(island);
            const result = { tilesPath, outlinePath, coarseLabel };
            if (stage2IslandRenderCacheRef.current.size >= 96) stage2IslandRenderCacheRef.current.clear();
            stage2IslandRenderCacheRef.current.set(island.id, result);
            return result;
        };


        const width = ctx.canvas.width / pixelRatioRef.current;
        const height = ctx.canvas.height / pixelRatioRef.current;
        const view = {
            x: -offset.x / scale / GRID_SIZE - 14,
            y: -offset.y / scale / GRID_SIZE - 18,
            w: width / scale / GRID_SIZE + 28,
            h: height / scale / GRID_SIZE + 36,
        };
        stage2Config.world.getIslandsInBounds(view).forEach((island) => {
            const unlocked = stage2UnlockedIslandIdSet.has(island.id);
            const solved = completed.has(island.id);
            const selected = island.id === (selectedStage2Island?.id ?? stage2Config.focusIslandId);
            const { outlinePath, tilesPath, coarseLabel } = getIslandCachedArtifacts(island);
            drawIslandGround(ctx, island, outlinePath, tilesPath, scale, lod, low, unlocked, solved, selected);
            const { x, y, w, h } = island.mapBounds;
            const centerX = (x + w / 2) * GRID_SIZE;
            if (!unlocked) {
                if (w * GRID_SIZE * scale > 70) {
                    ctx.save(); ctx.fillStyle = 'rgba(220,223,219,.42)'; ctx.font = `14px ${ART_THEME.font}`;
                    ctx.translate(centerX, (y + h / 2) * GRID_SIZE); ctx.scale(1 / scale, 1 / scale);
                    ctx.textAlign = 'center'; ctx.fillText(language === 'zh' ? '未揭示' : 'UNREVEALED', 0, 0); ctx.restore();
                }
                return;
            }
            const chapter = island.category === 'main' ? CHAPTER_LANDMARKS[island.name ?? ''] : undefined;
            if (chapter) {
                const size = (lod === 'coarse' ? 72 : lod === 'markers' ? 58 : 34) / scale;
                drawLandmark(ctx, chapter, centerX, y * GRID_SIZE - size * .55 - 22 / scale, size, solved, low);
            }
            if (!island.name) return;
            ctx.save();
            const font = lod === 'tiles' ? 12 : 14;
            const labelY = lod === 'coarse' ? (y + h * .52) * GRID_SIZE : (y - .6) * GRID_SIZE;
            ctx.translate(centerX, labelY); ctx.scale(1 / scale, 1 / scale);
            const boxW = Math.max(100, Math.min(240, w * GRID_SIZE * scale * .84));
            const boxH = lod === 'coarse' ? 72 : 34;
            ctx.fillStyle = 'rgba(10,21,36,.88)'; ctx.strokeStyle = selected ? ART_THEME.provable : 'rgba(182,154,102,.45)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 8); ctx.fill(); ctx.stroke();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 ${font}px ${ART_THEME.font}`;
            ctx.fillStyle = ART_THEME.ivory;
            ctx.fillText(fitLabel(ctx, `${solved ? '✓ ' : selected ? '◇ ' : ''}${island.name}`, boxW - 22), 0, lod === 'coarse' ? -18 : 0);
            if (lod === 'coarse') {
                ctx.font = `11px ${ART_THEME.mathFont}`; ctx.fillStyle = ART_THEME.provable;
                ctx.fillText(fitLabel(ctx, coarseLabel, boxW - 20), 0, 3);
                ctx.font = `9px ${ART_THEME.font}`; ctx.fillStyle = ART_THEME.muted;
                const kind = language === 'zh' ? island.category === 'main' ? '主岛' : island.category === 'support' ? '辅助岛' : '探索岛' : island.category === 'main' ? 'MAIN ISLAND' : island.category === 'support' ? 'SUPPORT ISLAND' : 'EXPLORATION';
                ctx.fillText(`${chapter ? String(chapter).padStart(2, '0') + ' · ' : ''}${kind}`, 0, 22);
            }
            ctx.restore();
        });
    }, [stage2Config, scale, quality, language, offset.x, offset.y, stage2Progress?.completedIslandIds, stage2UnlockedIslandIdSet, selectedStage2Island?.id]);

    const drawGoalBlock = useCallback((
        ctx: CanvasRenderingContext2D,
        bounds: { x: number; y: number; w: number; h: number },
        goalFormulaText: string, solved: boolean, errorPorts: Set<string>
    ) => {
        const x = bounds.x * GRID_SIZE, y = bounds.y * GRID_SIZE;
        const w = bounds.w * GRID_SIZE, h = bounds.h * GRID_SIZE;
        const cx = x + w / 2, cy = y + h / 2;
        const parsed = formulaRenderer.parse(goalFormulaText);
        const color = parsed instanceof Provable ? ART_THEME.provable : ART_THEME.formula;
        ctx.save();
        const fill = ctx.createLinearGradient(x, y, x + w, y + h);
        fill.addColorStop(0, solved ? '#29403E' : '#273347'); fill.addColorStop(1, '#101D30');
        ctx.fillStyle = fill; ctx.strokeStyle = solved ? ART_THEME.success : ART_THEME.brass;
        ctx.lineWidth = 2 / scale; ctx.beginPath(); ctx.roundRect(x+3,y+3,w-6,h-6,18); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = solved ? 'rgba(166,215,177,.38)' : 'rgba(182,154,102,.28)'; ctx.lineWidth = 1 / scale;
        for (const radius of [w * .33, w * .39]) { ctx.beginPath(); ctx.arc(cx,cy+6,radius,0,Math.PI*2);ctx.stroke(); }
        if (quality !== 'low') {
            for (let i=0;i<16;i++) { const angle=i*Math.PI/8;ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*w*.36,cy+6+Math.sin(angle)*w*.36);ctx.lineTo(cx+Math.cos(angle)*w*.39,cy+6+Math.sin(angle)*w*.39);ctx.stroke(); }
        }
        ctx.font = `600 13px ${ART_THEME.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = solved ? ART_THEME.success : ART_THEME.ivory;
        ctx.fillText(solved ? (parsed instanceof Provable ? language==='zh'?'✓ 已证明':'✓ VERIFIED' : language==='zh'?'✓ 已构造':'✓ CONSTRUCTED') : (language==='zh'?'目标星盘':'PROOF OBSERVATORY'),cx,y+25);
        if(parsed) formulaRenderer.render(ctx,parsed,cx,cy+10,Math.min(w,h)*.51,scale);
        else { ctx.font=`16px ${ART_THEME.mathFont}`;ctx.fillText(fitLabel(ctx,goalFormulaText,w-24),cx,cy); }
        getGoalPortsForRect(bounds).forEach(port=>{
            const px=port.x*GRID_SIZE,py=port.y*GRID_SIZE;
            ctx.fillStyle='#0A1323';ctx.strokeStyle=color;ctx.lineWidth=1.5/scale;
            ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();ctx.stroke();
            ctx.fillStyle=color;ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fill();
            if(errorPorts.has(`${port.x},${port.y}`)) {ctx.strokeStyle=ART_THEME.error;ctx.beginPath();ctx.arc(px,py,9,0,Math.PI*2);ctx.stroke();}
        });
        ctx.restore();
    }, [scale, language, quality]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width / pixelRatioRef.current;
        const height = canvas.height / pixelRatioRef.current;

        const backdropKey = [width, height, pixelRatioRef.current, offset.x, offset.y, scale, quality, language,
            stage2Config?.levelId, stage2Progress?.mapSeed, selectedStage2Island?.id,
            stage2Progress?.completedIslandIds.join(','), [...stage2UnlockedIslandIdSet].join(',')].join('|');
        if (!backdropRef.current || backdropRef.current.key !== backdropKey) {
            const surface = backdropRef.current?.canvas ?? document.createElement('canvas');
            surface.width = canvas.width; surface.height = canvas.height;
            const ctx = surface.getContext('2d');
            if (ctx) {
                ctx.setTransform(pixelRatioRef.current, 0, 0, pixelRatioRef.current, 0, 0);
        drawStarWorkshop(ctx, width, height, Boolean(stage2Config), quality === 'low');

        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        if (!stage2Config || scale >= STAGE2_DETAIL_SCALE_THRESHOLD) {
        // --- Grid Drawing Start ---
        const margin = GRID_SIZE * 2;
        const startX = Math.floor((-offset.x / scale) / GRID_SIZE) * GRID_SIZE - margin;
        const endX = Math.floor(((width - offset.x) / scale) / GRID_SIZE) * GRID_SIZE + margin;
        const startY = Math.floor((-offset.y / scale) / GRID_SIZE) * GRID_SIZE - margin;
        const endY = Math.floor(((height - offset.y) / scale) / GRID_SIZE) * GRID_SIZE + margin;

        const showSmallGrid = scale >= LOD_THRESHOLD_SMALL;
        const showBlockGrid = scale >= LOD_THRESHOLD_BLOCK;
        
        let step = GRID_SIZE;
        if (!showSmallGrid) step = GRID_SIZE * BLOCK_STRIDE;
        if (!showBlockGrid) step = GRID_SIZE * SUPER_BLOCK_STRIDE;

        // Collect grid lines by type
        const getGridLines = (vertical: boolean) => {
            const min = vertical ? startX : startY;
            const max = vertical ? endX : endY;
            
            // Shift super block grid by 4 blocks to avoid origin overlap
            const superBlockOffset = 4 * BLOCK_STRIDE * GRID_SIZE;

            let firstLine = Math.floor(min / step) * step;

            // Fix: When zoomed out (step is large), we must align firstLine to the superBlockOffset
            // otherwise we skip the actual super block lines (e.g. iterating 0, 128... but lines are at 64, 192...)
            if (step >= GRID_SIZE * SUPER_BLOCK_STRIDE) {
                 const strideUnit = GRID_SIZE * SUPER_BLOCK_STRIDE;
                 firstLine = Math.floor((min - superBlockOffset) / strideUnit) * strideUnit + superBlockOffset;
            }
            
            const small: number[] = [];
            const block: number[] = [];
            const superBlock: number[] = [];

            for (let pos = firstLine; pos <= max; pos += step) {
                const isSuperBlockLine = Math.abs((pos - superBlockOffset) % (GRID_SIZE * SUPER_BLOCK_STRIDE)) < 1;
                const isBlockLine = Math.abs(pos % (GRID_SIZE * BLOCK_STRIDE)) < 1;

                if (isSuperBlockLine) {
                    superBlock.push(pos);
                } else if (isBlockLine && showBlockGrid) {
                    block.push(pos);
                } else if (showSmallGrid) {
                    small.push(pos);
                }
            }
            return { small, block, superBlock };
        };

        const vLines = getGridLines(true);
        const hLines = getGridLines(false);

        // Draw in order: Small -> Block -> Super (Thickest on top)
        
        // 1. Small Grid
        if (showSmallGrid && (vLines.small.length > 0 || hLines.small.length > 0)) {
            ctx.beginPath();
            ctx.strokeStyle = ART_THEME.grid;
            ctx.lineWidth = 1 / scale;
            vLines.small.forEach(x => { ctx.moveTo(x, startY); ctx.lineTo(x, endY); });
            hLines.small.forEach(y => { ctx.moveTo(startX, y); ctx.lineTo(endX, y); });
            ctx.stroke();
        }

        // 2. Block Grid
        if (showBlockGrid && (vLines.block.length > 0 || hLines.block.length > 0)) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(182,154,102,.15)';
            ctx.lineWidth = 2 / scale;
            vLines.block.forEach(x => { ctx.moveTo(x, startY); ctx.lineTo(x, endY); });
            hLines.block.forEach(y => { ctx.moveTo(startX, y); ctx.lineTo(endX, y); });
            ctx.stroke();
        }

        // 3. Super Block Grid
        if (vLines.superBlock.length > 0 || hLines.superBlock.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(182,154,102,.24)';
            ctx.lineWidth = 1.5 / scale;
            vLines.superBlock.forEach(x => { ctx.moveTo(x, startY); ctx.lineTo(x, endY); });
            hLines.superBlock.forEach(y => { ctx.moveTo(startX, y); ctx.lineTo(endX, y); });
            ctx.stroke();
        }
        // --- Grid Drawing End ---
        }

        drawStage2Backdrop(ctx);

                ctx.restore();
                backdropRef.current = { key: backdropKey, canvas: surface };
            }
        }
        ctx.setTransform(pixelRatioRef.current, 0, 0, pixelRatioRef.current, 0, 0);
        ctx.clearRect(0, 0, width, height);
        if (backdropRef.current) ctx.drawImage(backdropRef.current.canvas, 0, 0, width, height);
        ctx.save(); ctx.translate(offset.x, offset.y); ctx.scale(scale, scale);
        const visibleBounds = { x: -offset.x / scale / GRID_SIZE - 3, y: -offset.y / scale / GRID_SIZE - 3,
            w: width / scale / GRID_SIZE + 6, h: height / scale / GRID_SIZE + 6 };
        if (!stage2Config && goalFormula) {
            drawGoalBlock(ctx, { x: -4, y: -4, w: 8, h: 8 }, goalFormula, isSolved, errorGoalPorts);
        }

        if (stage2Config && showStage2IslandOverlayDetails) {
            stage2DisplayedGoalIslandIds.forEach((islandId) => {
                if (!stage2UnlockedIslandIdSet.has(islandId)) return;
                const island = stage2Config.world.getIslandById(islandId);
                if (!island?.goalBounds || !island.goalFormula || !boundsOverlap(island.goalBounds, visibleBounds)) return;
                drawGoalBlock(
                    ctx,
                    island.goalBounds,
                    island.goalFormula,
                    completedGoalIds.has(island.id) || Boolean(stage2Progress?.completedIslandIds.includes(island.id)),
                    goalErrorsById.get(island.id) ?? new Set<string>()
                );
            });
        }

        // --- Nodes ---
        nodes.forEach(node => {
            if (!boundsOverlap(getNodeBounds(node), visibleBounds)) return;
            if (stage2Config && scale < STAGE2_MARKER_SCALE_THRESHOLD) return;
            if (stage2Config) {
                if (node.type === 'premise' && node.locked && node.sourceIslandId) {
                    if (!stage2UnlockedIslandIdSet.has(node.sourceIslandId)) return;
                }
            }

            ctx.save();
            if (focusMode && !activeNodeIds.has(node.id)) ctx.globalAlpha = 0.06;
            drawNode(ctx, node, node.x * GRID_SIZE, node.y * GRID_SIZE);
            if (node.note && scale >= 0.45) {
                const noteX = (node.x + node.w / 2) * GRID_SIZE;
                const noteY = (node.y + node.h) * GRID_SIZE + 10;
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const measured = Math.min(240, ctx.measureText(node.note).width + 16);
                ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
                ctx.fillRect(noteX - measured / 2, noteY, measured, 24);
                ctx.fillStyle = '#cbd5e1';
                ctx.fillText(node.note.length > 30 ? `${node.note.slice(0, 29)}…` : node.note, noteX, noteY + 6, measured - 10);
            }
            ctx.restore();
        });

        // --- Ghost Nodes from Tutorial ---
        if (currentStep && currentStep.ghostNodes) {
            currentStep.ghostNodes.forEach(ghost => {
                drawNode(ctx, ghost as Tool, ghost.x * GRID_SIZE, ghost.y * GRID_SIZE, true);
            });
        }

        // --- Ghost Node (Active Tool) ---
        if (activeTool && mouseGridPos && !awaitingNextPlacement) {
            drawNode(ctx, activeTool, mouseGridPos.x * GRID_SIZE, mouseGridPos.y * GRID_SIZE, true);
            const bounds = getNodeBounds({ ...activeTool, ...mouseGridPos });
            ctx.save(); ctx.strokeStyle = previewBlocked ? ART_THEME.error : ART_THEME.ivory;
            ctx.lineWidth = 1.5 / scale; ctx.setLineDash([5 / scale, 4 / scale]);
            ctx.strokeRect(bounds.x * GRID_SIZE - 3, bounds.y * GRID_SIZE - 3, bounds.w * GRID_SIZE + 6, bounds.h * GRID_SIZE + 6);
            if (previewBlocked) {
                ctx.fillStyle = ART_THEME.error; ctx.textAlign = 'center'; ctx.font = `600 ${12 / scale}px ${ART_THEME.font}`;
                ctx.fillText(language === 'zh' ? '此处无法放置' : 'PLACEMENT BLOCKED', (bounds.x + bounds.w / 2) * GRID_SIZE, bounds.y * GRID_SIZE - 12 / scale);
            }
            ctx.restore();
        }

        // --- Box Selection Rectangle ---
        if (isBoxSelecting && boxSelectStart && boxSelectEnd) {
            const x = Math.min(boxSelectStart.x, boxSelectEnd.x);
            const y = Math.min(boxSelectStart.y, boxSelectEnd.y);
            const w = Math.abs(boxSelectEnd.x - boxSelectStart.x);
            const h = Math.abs(boxSelectEnd.y - boxSelectStart.y);
            
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2 / scale;
            ctx.setLineDash([5 / scale, 5 / scale]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
            
            ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
            ctx.fillRect(x, y, w, h);
        }
        
        // --- Selected Nodes Highlight ---
        if (selectedNodeIds.size > 0) {
            nodes.forEach(node => {
                if (selectedNodeIds.has(node.id)) {
                    const bounds = getNodeBounds(node);
                    const nx = bounds.x * GRID_SIZE;
                    const ny = bounds.y * GRID_SIZE;
                    const nw = bounds.w * GRID_SIZE;
                    const nh = bounds.h * GRID_SIZE;
                    
                    ctx.strokeStyle = ART_THEME.ivory;
                    ctx.lineWidth = 3 / scale;
                    ctx.setLineDash([]);
                    const corner = Math.min(14 / scale, nw / 3, nh / 3);
                    for (const [cx, cy, sx, sy] of [[nx-4,ny-4,1,1],[nx+nw+4,ny-4,-1,1],[nx-4,ny+nh+4,1,-1],[nx+nw+4,ny+nh+4,-1,-1]]) {
                        ctx.beginPath();ctx.moveTo(cx+corner*sx,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+corner*sy);ctx.stroke();
                    }
                }
            });
        }

        if (!reducedMotion && quality !== 'low') {
            for (const event of visualEventsRef.current) {
                const progress = Math.min(1, Math.max(0, (animationTimeRef.current - event.at) / 480));
                ctx.save(); ctx.globalAlpha = 1 - progress; ctx.strokeStyle = event.proof ? ART_THEME.provable : event.removed ? ART_THEME.brass : ART_THEME.formula;
                ctx.lineWidth = 1.5 / scale; const spread = progress * 15;
                ctx.beginPath(); ctx.roundRect(event.x * GRID_SIZE - spread, event.y * GRID_SIZE - spread, event.w * GRID_SIZE + spread * 2, event.h * GRID_SIZE + spread * 2, 8); ctx.stroke(); ctx.restore();
            }
        }
        ctx.restore();

    }, [offset, scale, nodes, activeTool, mouseGridPos, drawNode, drawGoalBlock, drawStage2Backdrop, goalFormula, isSolved, errorGoalPorts, currentStep, isBoxSelecting, boxSelectStart, boxSelectEnd, selectedNodeIds, stage2Config, stage2Progress?.completedIslandIds, stage2DisplayedGoalIslandIds, showStage2IslandOverlayDetails, stage2UnlockedIslandIdSet, completedGoalIds, goalErrorsById, focusMode, activeNodeIds, quality, language, stage2Progress?.mapSeed, selectedStage2Island?.id, previewBlocked, reducedMotion, awaitingNextPlacement]);

    // Animation is a rendering concern. React updates only when game or interaction state changes.
    useEffect(() => { drawRef.current = draw; draw(); }, [draw]);
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : 2);
            pixelRatioRef.current = dpr;
            const width = Math.round(window.innerWidth * dpr), height = Math.round(window.innerHeight * dpr);
            if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
            backdropRef.current = null;
            drawRef.current();
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [quality]);
    useEffect(() => {
        if (reducedMotion || quality === 'low') return;
        let frame = 0;
        const tick = (time: number) => {
            animationTimeRef.current = time;
            const hadEffects = visualEventsRef.current.length > 0;
            visualEventsRef.current = visualEventsRef.current.filter(event => time - event.at < 480);
            if (!document.hidden && (animatedWiresRef.current || hadEffects)) drawRef.current();
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [reducedMotion, quality]);

    // Clear selection when tool or mode changes
    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            setSelectedNodeIds(new Set());
            setSelectedWireIds(new Set());
        });
        return () => cancelAnimationFrame(raf);
    }, [activeTool, selectMode]);

    // Key handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isCanvasKeyboardBlocked(e.target)) return;
            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && key === 'z') {
                e.preventDefault();
                const state = e.shiftKey ? historyRef.current.redo.pop() : historyRef.current.undo.pop();
                if (!state) return;
                if (e.shiftKey) historyRef.current.undo.push(structuredClone({ nodes, wires }));
                else historyRef.current.redo.push(structuredClone({ nodes, wires }));
                restoreHistoryState(state);
            } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
                e.preventDefault();
                const state = historyRef.current.redo.pop();
                if (!state) return;
                historyRef.current.undo.push(structuredClone({ nodes, wires }));
                restoreHistoryState(state);
            } else if ((e.ctrlKey || e.metaKey) && key === 'c') {
                e.preventDefault();
                const state = makeSelectionState();
                if (state.nodes.length > 0) clipboardRef.current = structuredClone(state);
            } else if ((e.ctrlKey || e.metaKey) && key === 'v') {
                e.preventDefault();
                const source = clipboardRef.current;
                if (!source || source.nodes.length === 0) return;
                const idMap = new Map<string, string>();
                source.nodes.forEach((node) => idMap.set(node.id, crypto.randomUUID()));
                const centerX = Math.round(((window.innerWidth / 2 - offset.x) / scale) / GRID_SIZE);
                const centerY = Math.round(((window.innerHeight / 2 - offset.y) / scale) / GRID_SIZE);
                const pastedNodes = source.nodes.map((node) => ({
                    ...structuredClone(node),
                    id: idMap.get(node.id)!,
                    x: centerX + node.x + 2,
                    y: centerY + node.y + 2,
                    locked: false,
                }));
                const pastedWires = source.wires.map((wire) => ({
                    ...structuredClone(wire),
                    id: crypto.randomUUID(),
                    startNodeId: idMap.get(wire.startNodeId) ?? wire.startNodeId,
                    endNodeId: idMap.get(wire.endNodeId) ?? wire.endNodeId,
                    path: wire.path.map((point) => ({ x: centerX + point.x + 2, y: centerY + point.y + 2 })),
                }));
                setNodes((previous) => [...previous, ...pastedNodes]);
                setWires((previous) => [...previous, ...pastedWires]);
                setSelectedNodeIds(new Set(pastedNodes.map((node) => node.id)));
            } else if (key.startsWith('arrow') && selectedNodeIds.size > 0) {
                e.preventDefault();
                const amount = e.shiftKey ? 4 : 1;
                const deltaX = key === 'arrowleft' ? -amount : key === 'arrowright' ? amount : 0;
                const deltaY = key === 'arrowup' ? -amount : key === 'arrowdown' ? amount : 0;
                setNodes((previous) => previous.map((node) => selectedNodeIds.has(node.id) && !node.locked ? { ...node, x: node.x + deltaX, y: node.y + deltaY } : node));
            } else if (key === 'q') {
                onToolClear();
            } else if (key === 'r') {
                onToolRotate?.();
            } else if (key === 't') {
                onToolToggleType?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onToolClear, onToolRotate, onToolToggleType, nodes, wires, selectedNodeIds, offset, scale, makeSelectionState]);

    useEffect(() => {
        const clearMovement = () => {
            if (wasdRafRef.current != null) cancelAnimationFrame(wasdRafRef.current);
            wasdRafRef.current = null;
            wasdLastFrameRef.current = 0;
            wasdStateRef.current = { w: false, a: false, s: false, d: false, shift: false };
        };

        const setKey = (key: string, pressed: boolean) => {
            const state = wasdStateRef.current;
            if (key === 'w') state.w = pressed;
            else if (key === 'a') state.a = pressed;
            else if (key === 's') state.s = pressed;
            else if (key === 'd') state.d = pressed;
            else if (key === 'shift') state.shift = pressed;
        };

        const hasMovement = () => {
            const s = wasdStateRef.current;
            return s.w || s.a || s.s || s.d;
        };

        const tick = (now: number) => {
            if (isCanvasKeyboardBlocked(document.activeElement)) {
                clearMovement();
                return;
            }
            if (!hasMovement()) {
                wasdRafRef.current = null;
                wasdLastFrameRef.current = 0;
                return;
            }

            const last = wasdLastFrameRef.current || now;
            wasdLastFrameRef.current = now;
            const dt = Math.min(48, now - last);

            const state = wasdStateRef.current;
            const baseSpeed = 760;
            const speed = state.shift ? baseSpeed * 2.2 : baseSpeed;
            const step = (speed * dt) / 1000;

            let dx = 0;
            let dy = 0;
            if (state.w) dy += step;
            if (state.s) dy -= step;
            if (state.a) dx += step;
            if (state.d) dx -= step;

            if (dx !== 0 || dy !== 0) {
                setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
            }

            wasdRafRef.current = requestAnimationFrame(tick);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (isCanvasKeyboardBlocked(e.target)) {
                clearMovement();
                return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const key = e.key.toLowerCase();
            if (key !== 'w' && key !== 'a' && key !== 's' && key !== 'd' && key !== 'shift') return;

            setKey(key, true);
            if (wasdRafRef.current == null && hasMovement()) {
                wasdLastFrameRef.current = 0;
                wasdRafRef.current = requestAnimationFrame(tick);
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key !== 'w' && key !== 'a' && key !== 's' && key !== 'd' && key !== 'shift') return;
            setKey(key, false);
        };

        const onFocusIn = (e: FocusEvent) => {
            if (isCanvasKeyboardBlocked(e.target)) clearMovement();
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('focusin', onFocusIn);
        window.addEventListener('blur', clearMovement);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('focusin', onFocusIn);
            window.removeEventListener('blur', clearMovement);
            clearMovement();
        };
    }, []);

    // Event Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        // Left click
        if (e.button === 0) {
            // Calculate grid pos immediately to ensure accuracy
            const worldX = (e.clientX - offset.x) / scale;
            const worldY = (e.clientY - offset.y) / scale;
            const snap = 1;
            const gx = Math.round((worldX / GRID_SIZE) / snap) * snap;
            const gy = Math.round((worldY / GRID_SIZE) / snap) * snap;

            if (activeTool) {
                // A new click is a new attempt; a genuine failure must remain visible.
                setLastPlacement(null);
                // Check if we are clicking on an existing node (to prevent overlap unless allowed?)
                // For wire segments, maybe we want to allow overlap with ports?
                // But for now, let's keep it simple: just place if space is empty-ish.
                // Or simply rely on the collision logic.

                // Try to place node (works for 'wire' tool too now)
                const newNode: NodeData = {
                    id: crypto.randomUUID(),
                    type: activeTool.type,
                    subType: activeTool.subType,
                    x: gx,
                    y: gy,
                    w: activeTool.w,
                    h: activeTool.h,
                    rotation: activeTool.rotation || 0,
                    customLabel: activeTool.customLabel,
                    theoremId: activeTool.theoremId,
                    sourceIslandId: activeTool.sourceIslandId,
                    placementCost: activeTool.placementCost,
                    theoremName: activeTool.theoremName,
                    theoremVars: activeTool.theoremVars,
                    theoremPremises: activeTool.theoremPremises,
                    theoremConclusion: activeTool.theoremConclusion,
                    theoremIsFormulaOnly: activeTool.theoremIsFormulaOnly,
                    theoremSimplified: activeTool.theoremSimplified,
                };

                if (canPlaceNode && !canPlaceNode(newNode)) {
                    return;
                }

                // Collision check
                const stage2GoalRects = stage2Config
                    ? stage2DisplayedGoalIslandIds
                          .filter((id) => stage2UnlockedIslandIdSet.has(id))
                          .map((id) => stage2Config.world.getIslandById(id))
                          .filter((item): item is NonNullable<typeof item> => Boolean(item?.goalBounds))
                          .map((island) => island.goalBounds!)
                    : [];
                const goalRects = stage2GoalRects.length > 0 ? stage2GoalRects : [{ x: -4, y: -4, w: 8, h: 8 }];
                const newNodeBounds = getNodeBounds(newNode);
                const goalCollision = goalRects.some((goalRect) => boundsOverlap(newNodeBounds, goalRect));

                const overlappingNodes = nodes.filter(n => {
                    return boundsOverlap(newNodeBounds, getNodeBounds(n));
                });

                // 2. Check against existing nodes
                // Separate "Hard" collision (blocking types) from "Duplicate" (same wire)
                const hardCollision = overlappingNodes.some(n => {
                    if (newNode.type === 'bridge' && n.type === 'wire') {
                        return false;
                    }

                    if (newNode.type === 'wire' && n.type === 'bridge') {
                        return true;
                    }

                    // Allow wire overlapping if rotations are different (crossing/junctions)
                    if (newNode.type === 'wire' && n.type === 'wire') {
                        return false; // Treat ALL wire-wire overlaps as non-hard (handled by duplicate check)
                    }

                    return true; // Block overlap for other types (Gate/Atom)
                });

                const isDuplicate = nodes.some(n => {
                    if (newNode.type !== 'wire' || n.type !== 'wire') return false;
                    const isOverlapping = boundsOverlap(newNodeBounds, getNodeBounds(n));
                    return isOverlapping && n.rotation === newNode.rotation;
                });

                if (!hardCollision && !goalCollision) {
                    // Only add if not duplicate
                    if (!isDuplicate) {
                        const replacedWireIds = new Set(
                            newNode.type === 'bridge'
                                ? overlappingNodes.filter(n => n.type === 'wire').map(n => n.id)
                                : []
                        );

                        setNodes(prev => [
                            ...prev.filter(n => !replacedWireIds.has(n.id)),
                            newNode
                        ]);
                        onNodePlaced?.(newNode);
                        setMouseGridPos({ x: gx, y: gy });
                        setLastPlacement({ nodeId: newNode.id, tool: activeTool, x: gx, y: gy });
                        if (newNode.type === 'wire') {
                             dispatchAction('CONNECT_WIRE', { 
                                 x: newNode.x, 
                                 y: newNode.y, 
                                 w: newNode.w, 
                                 h: newNode.h, 
                                 rotation: newNode.rotation 
                             });
                        } else {
                             dispatchAction('PLACE_NODE', { 
                                 type: newNode.type, 
                                 subType: newNode.subType,
                                 x: newNode.x,
                                 y: newNode.y
                             });
                        }
                    }
                    
                    // Start wire painting if wire tool
                    // Always allow painting for wires (User Request: Ctrl not needed for continuous draw)
                    if (activeTool.type === 'wire') {
                        setIsWirePainting(true);
                        setLastWireGridPos({ x: gx, y: gy });
                    }
                } else if (activeTool.type === 'wire') {
                    const hit = findPortAt(worldX / GRID_SIZE, worldY / GRID_SIZE);
                    if (hit) {
                        const absPos = getAbsolutePortPosition(hit.node, hit.port);
                        setIsWirePainting(true);
                        setLastWireGridPos({ x: Math.round(absPos.x), y: Math.round(absPos.y) });
                    }
                }
            } else {
                // Check for interactions (Toggle Atom)
                const clickedAtom = nodes.find(n => 
                    n.type === 'atom' && 
                    gx >= n.x && gx < n.x + n.w && 
                    gy >= n.y && gy < n.y + n.h
                );

                if (clickedAtom) {
                    setNodes(prev => prev.map(n => 
                        n.id === clickedAtom.id 
                            ? { ...n, isActive: !(n.isActive ?? true) } 
                            : n
                    ));
                    return; 
                }

                // Box select mode
                if (selectMode === 'box') {
                    setIsBoxSelecting(true);
                    setBoxSelectStart({ x: worldX, y: worldY });
                    setBoxSelectEnd({ x: worldX, y: worldY });
                    setSelectedNodeIds(new Set());
                    setSelectedWireIds(new Set());
                } else {
                    // Pan start (Only if no tool is active)
                    setIsDragging(true);
                    setLastMousePos({ x: e.clientX, y: e.clientY });
                }
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        // Update grid pos
        const worldX = (e.clientX - offset.x) / scale;
        const worldY = (e.clientY - offset.y) / scale;
        
        // Snap to 1.0 grid
        const snap = 1;
        const gx = Math.round((worldX / GRID_SIZE) / snap) * snap;
        const gy = Math.round((worldY / GRID_SIZE) / snap) * snap;
        
        setMouseGridPos({ x: gx, y: gy });
        setLastPlacement(previous => previous && (previous.x !== gx || previous.y !== gy) ? null : previous);

        if (isBoxSelecting && boxSelectStart) {
            // Update box selection end point
            setBoxSelectEnd({ x: worldX, y: worldY });
        } else if (isDragging) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        } else if (isWirePainting && activeTool?.type === 'wire' && lastWireGridPos) {
            // Axis Locking (Ctrl): Snap to the current wire axis to ensure straight lines
            let effectiveGx = gx;
            let effectiveGy = gy;
            
            if (e.ctrlKey) {
                 const currentRot = activeTool.rotation || 0;
                 // Rotation 0 or 2 implies Horizontal
                 const isHorizontal = (currentRot === 0 || currentRot === 2);
                 if (isHorizontal) {
                     effectiveGy = lastWireGridPos.y;
                 } else {
                     effectiveGx = lastWireGridPos.x;
                 }
            }

            // Check if grid pos changed (using effective coords)
            if (effectiveGx !== lastWireGridPos.x || effectiveGy !== lastWireGridPos.y) {
                const dx = effectiveGx - lastWireGridPos.x;
                const dy = effectiveGy - lastWireGridPos.y;

                const stage2GoalRects = stage2Config
                    ? stage2DisplayedGoalIslandIds
                          .filter((id) => stage2UnlockedIslandIdSet.has(id))
                          .map((id) => stage2Config.world.getIslandById(id))
                          .filter((item): item is NonNullable<typeof item> => Boolean(item?.goalBounds))
                          .map((island) => island.goalBounds!)
                    : [];
                const goalRects = stage2GoalRects.length > 0 ? stage2GoalRects : [{ x: -4, y: -4, w: 8, h: 8 }];

                const nodesToAdd: NodeData[] = [];
                const canAddWire = (candidate: NodeData): { blocked: boolean; duplicate: boolean } => {
                    if (canPlaceNode && !canPlaceNode(candidate)) return { blocked: true, duplicate: false };

                    const candidateBounds = getNodeBounds(candidate);
                    const goalCollision = goalRects.some((goalRect) => boundsOverlap(candidateBounds, goalRect));
                    if (goalCollision) return { blocked: true, duplicate: false };

                    for (const n of [...nodes, ...nodesToAdd]) {
                        const isOverlapping = boundsOverlap(candidateBounds, getNodeBounds(n));
                        if (!isOverlapping) continue;

                        if (candidate.type === 'wire' && n.type === 'wire') {
                            const sameRotation = (n.rotation || 0) === (candidate.rotation || 0);
                            if (!sameRotation) continue;
                            const sameType = n.subType === candidate.subType;
                            return { blocked: !sameType, duplicate: sameType };
                        }

                        if (candidate.type === 'wire' && n.type === 'bridge') {
                            return { blocked: true, duplicate: false };
                        }

                        return { blocked: true, duplicate: false };
                    }

                    return { blocked: false, duplicate: false };
                };

                let cursorX = lastWireGridPos.x;
                let cursorY = lastWireGridPos.y;

                const horizontal = Math.abs(dx) > Math.abs(dy);
                const nextRotation = horizontal ? 0 : 1;
                if (nextRotation !== activeTool.rotation) {
                    onToolSetRotation?.(nextRotation);
                }

                const stepCount = horizontal ? Math.abs(dx) : Math.abs(dy);
                const stepSign = horizontal ? Math.sign(dx) : Math.sign(dy);
                if (stepCount > 0 && stepSign !== 0) {
                    for (let step = 0; step < stepCount; step += 1) {
                        const nextX = horizontal ? cursorX + stepSign : cursorX;
                        const nextY = horizontal ? cursorY : cursorY + stepSign;

                        const targetX = horizontal ? (stepSign > 0 ? cursorX : nextX) : cursorX;
                        const targetY = horizontal ? cursorY : (stepSign > 0 ? cursorY : nextY);

                        const newNode: NodeData = {
                            id: crypto.randomUUID(),
                            type: activeTool.type,
                            subType: activeTool.subType,
                            x: targetX,
                            y: targetY,
                            w: activeTool.w,
                            h: activeTool.h,
                            rotation: nextRotation,
                        };

                        const placement = canAddWire(newNode);
                        if (placement.blocked) break;
                        if (!placement.duplicate) {
                            nodesToAdd.push(newNode);
                            dispatchAction('CONNECT_WIRE', { 
                                x: newNode.x, 
                                y: newNode.y, 
                                w: newNode.w, 
                                h: newNode.h, 
                                rotation: newNode.rotation,
                            });
                        }

                        cursorX = nextX;
                        cursorY = nextY;
                    }
                }

                if (nodesToAdd.length > 0) {
                    setNodes((prev) => [...prev, ...nodesToAdd]);
                }
                if (cursorX !== lastWireGridPos.x || cursorY !== lastWireGridPos.y) {
                    setLastWireGridPos({ x: cursorX, y: cursorY });
                }
            }
        } else {
             // Tooltip Check
             if (!activeTool) {
                 const mouseGx = worldX / GRID_SIZE;
                 const mouseGy = worldY / GRID_SIZE;
                 const WIRE_HIT_THRESHOLD = 0.3;
                 
                 const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
                    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
                    if (l2 === 0) return Math.hypot(px - x1, py - y1);
                    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
                 };

                 let foundValue: string | null = null;
                 
                 // Check wires
                 for (const n of nodes) {
                     if (n.type === 'wire') {
                         const r = n.rotation || 0;
                         let x1 = n.x, y1 = n.y, x2 = n.x, y2 = n.y;
                         if (r === 0) x2 += n.w;
                         else if (r === 1) y2 += n.h;
                         else if (r === 2) { y1 += n.h; y2 += n.h; x2 += n.w; }
                         else if (r === 3) { x1 += n.w; x2 += n.w; y2 += n.h; }
                         
                         if (distToSegment(mouseGx, mouseGy, x1, y1, x2, y2) <= WIRE_HIT_THRESHOLD) {
                             const val = wireValues.get(n.id);
                             if (val) {
                                 foundValue = val;
                                 break;
                             }
                         }
                     }
                 }
                 
                 if (!foundValue) {
                     const item = nodes.find(node => node.type !== 'wire' && boundsOverlap(getNodeBounds(node), { x: mouseGx, y: mouseGy, w: .001, h: .001 }));
                     if (item?.type === 'theorem') {
                         const premises = (item.theoremPremises ?? []).map((premise, index) => `${index + 1}. ${premise}`).join('\n');
                         foundValue = `${item.theoremName ?? item.subType}${item.theoremSimplified ? ' +' : ''}\n${premises ? premises + '\n────────\n' : ''}${item.theoremIsFormulaOnly ? '' : '⊢ '}${item.theoremConclusion ?? item.customLabel ?? ''}`;
                     } else if (item?.type === 'premise') foundValue = item.customLabel ?? item.subType;
                     else if (item?.type === 'display') foundValue = displayValues.get(item.id) ?? null;
                     if (!foundValue) {
                         const goals = stage2Config ? stage2DisplayedGoalIslandIds.filter(id => stage2UnlockedIslandIdSet.has(id)).map(id => stage2Config.world.getIslandById(id)).filter((island): island is Stage2IslandDefinition => Boolean(island?.goalBounds)) : [];
                         const target = goals.find(island => boundsOverlap(island.goalBounds!, { x: mouseGx, y: mouseGy, w: .001, h: .001 }));
                         if (target) foundValue = `${target.name ?? ''}\n${target.goalFormula ?? ''}`;
                         else if (!stage2Config && goalFormula && mouseGx >= -4 && mouseGx <= 4 && mouseGy >= -4 && mouseGy <= 4) foundValue = goalFormula;
                     }
                 }
                 if (foundValue) {
                     setHoveredWireValue({ x: e.clientX, y: e.clientY, value: foundValue });
                 } else {
                     setHoveredWireValue(null);
                 }
             } else {
                 setHoveredWireValue(null);
             }
        }
    };

    const handleMouseUp = () => {
        if (isBoxSelecting && boxSelectStart && boxSelectEnd) {
            // Calculate selected nodes
            const minX = Math.min(boxSelectStart.x, boxSelectEnd.x);
            const maxX = Math.max(boxSelectStart.x, boxSelectEnd.x);
            const minY = Math.min(boxSelectStart.y, boxSelectEnd.y);
            const maxY = Math.max(boxSelectStart.y, boxSelectEnd.y);
            
            const newSelectedNodeIds = new Set<string>();
            const newSelectedWireIds = new Set<string>();
            
            nodes.forEach(n => {
                const nodeCenterX = (n.x + n.w / 2) * GRID_SIZE;
                const nodeCenterY = (n.y + n.h / 2) * GRID_SIZE;
                
                if (nodeCenterX >= minX && nodeCenterX <= maxX && 
                    nodeCenterY >= minY && nodeCenterY <= maxY) {
                    if (!n.locked) {
                        newSelectedNodeIds.add(n.id);
                    }
                }
            });
            
            setSelectedNodeIds(newSelectedNodeIds);
            setSelectedWireIds(newSelectedWireIds);
            setIsBoxSelecting(false);
        }
        
        setIsDragging(false);
        setIsWirePainting(false);
        setLastWireGridPos(null);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        
        // If there are selected nodes (box select mode), delete all selected
        if (selectedNodeIds.size > 0) {
            setNodes(prev => prev.filter(n => !selectedNodeIds.has(n.id)));
            setSelectedNodeIds(new Set());
            setSelectedWireIds(new Set());
            return;
        }
        
        // Calculate world coordinates in grid units
        const worldX = (e.clientX - offset.x) / scale;
        const worldY = (e.clientY - offset.y) / scale;
        const gx = worldX / GRID_SIZE;
        const gy = worldY / GRID_SIZE;

        // Distance threshold for wires (in grid units)
        // 0.3 means you can click within ~30% of a cell size from the wire
        const WIRE_HIT_THRESHOLD = 0.3;

        // Helper: Distance from point (px, py) to segment (x1, y1)-(x2, y2)
        const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
            const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
            if (l2 === 0) return Math.hypot(px - x1, py - y1);
            let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
        };

        // Find the best candidate to delete
        let bestCandidate: { node: NodeData, dist: number } | null = null;

        for (const n of nodes) {
            let dist = Infinity;

            if (n.type === 'wire') {
                // Check distance to wire segment
                const r = n.rotation || 0;
                let x1 = n.x, y1 = n.y, x2 = n.x, y2 = n.y;
                
                // Determine segment endpoints based on rotation
                if (r === 0) { // Top
                    x2 += n.w;
                } else if (r === 1) { // Left
                    y2 += n.h;
                } else if (r === 2) { // Bottom
                    y1 += n.h; y2 += n.h; x2 += n.w;
                } else if (r === 3) { // Right
                    x1 += n.w; x2 += n.w; y2 += n.h;
                }

                dist = distToSegment(gx, gy, x1, y1, x2, y2);
                
                // Only consider if within threshold
                if (dist > WIRE_HIT_THRESHOLD) continue;

            } else {
                // Solid nodes: Check if point is inside bounding box
                const bounds = getNodeBounds(n);
                if (gx >= bounds.x && gx < bounds.x + bounds.w && gy >= bounds.y && gy < bounds.y + bounds.h) {
                    dist = 0; // Inside = distance 0 (highest priority)
                }
            }

            // Update best candidate
            // Prioritize closer objects. If dist is 0 (solid node click), it wins immediately unless we want to handle overlaps.
            // But usually nodes don't overlap.
            if (dist !== Infinity) {
                if (!bestCandidate || dist < bestCandidate.dist) {
                    bestCandidate = { node: n, dist };
                }
            }
        }

        if (bestCandidate) {
            const nodeToDelete = bestCandidate.node;
            if (nodeToDelete.locked) return; // Cannot delete locked nodes
            setNodes(prev => prev.filter(n => n.id !== nodeToDelete.id));
        } else if (activeTool) {
             // Optional: Cancel tool
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(MIN_SCALE, scale + delta * scale), MAX_SCALE);
        
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const worldX = (mouseX - offset.x) / scale;
        const worldY = (mouseY - offset.y) / scale;
        const newOffsetX = mouseX - worldX * newScale;
        const newOffsetY = mouseY - worldY * newScale;

        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#0f172a]">
            <canvas
                ref={canvasRef}
                className={`block w-full h-full ${activeTool ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseUp(); setHoveredWireValue(null); }}
                onDoubleClick={() => { if (hoveredWireValue) setInspectedFormula(hoveredWireValue.value); }}
                aria-label={language === 'zh' ? '电路画布；双击公式或定理查看完整详情' : 'Circuit canvas; double-click a formula or theorem for full details'}
                onContextMenu={handleContextMenu}
                onWheel={handleWheel}
            />
            {hoveredWireValue && (
                 <div style={{
                     position: 'absolute',
                     left: Math.max(12, Math.min(hoveredWireValue.x + 15, window.innerWidth - Math.min(420, window.innerWidth - 24) - 12)),
                     top: Math.max(12, Math.min(hoveredWireValue.y + 15, window.innerHeight - 260)),
                     backgroundColor: hoveredWireValue.value === 'Error' ? 'rgba(127, 29, 29, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                     border: hoveredWireValue.value === 'Error' ? '1px solid #ef4444' : '1px solid #334155',
                     padding: '6px 10px',
                     borderRadius: '6px',
                     color: hoveredWireValue.value === 'Error' ? '#ef4444' : '#e2e8f0',
                     fontSize: '12px',
                     fontFamily: ART_THEME.mathFont,
                     fontStyle: 'normal',
                     fontWeight: hoveredWireValue.value === 'Error' ? 'bold' : 'normal',
                     pointerEvents: 'none',
                     whiteSpace: 'pre-wrap',
                     overflowWrap: 'anywhere',
                     maxWidth: 'min(420px, calc(100vw - 24px))',
                     maxHeight: 240,
                     overflow: 'hidden',
                     zIndex: 100,
                     boxShadow: hoveredWireValue.value === 'Error' 
                         ? '0 0 10px rgba(239, 68, 68, 0.5)' 
                         : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                 }}>
                     {hoveredWireValue.value}
                     <div style={{ fontFamily: ART_THEME.font, fontSize: 10, color: ART_THEME.brass, marginTop: 8 }}>{language === 'zh' ? '双击打开完整详情' : 'Double-click for full details'}</div>
                 </div>
            )}
            {inspectedFormula && (
                <section data-formula-reader role="dialog" aria-modal="false" onKeyDown={event => { if (event.key === 'Escape') setInspectedFormula(null); }} aria-label={language === 'zh' ? '公式详情' : 'Formula details'} className="absolute right-4 top-24 z-[110] w-[min(460px,calc(100vw-32px))] rounded-2xl border border-[#B69A66]/50 bg-[#101D30]/95 p-5 text-[#EEE8DB] shadow-2xl backdrop-blur-xl">
                    <div className="mb-3 flex items-center justify-between border-b border-[#B69A66]/20 pb-3">
                        <strong className="text-sm">{language === 'zh' ? '定理与公式 · 完整文本' : 'THEOREM & FORMULA · FULL TEXT'}</strong>
                        <button type="button" autoFocus onClick={() => setInspectedFormula(null)} onKeyDown={event => { if (event.key === 'Escape') setInspectedFormula(null); }} className="rounded-lg px-3 py-1 hover:bg-white/10" aria-label={language === 'zh' ? '关闭详情' : 'Close details'}>×</button>
                    </div>
                    <pre className="max-h-[55vh] select-text overflow-auto whitespace-pre-wrap break-all text-base leading-relaxed" style={{ fontFamily: ART_THEME.mathFont }}>{inspectedFormula}</pre>
                </section>
            )}
        </div>
    );
});

InfiniteCanvas.displayName = 'InfiniteCanvas';
export default InfiniteCanvas;
