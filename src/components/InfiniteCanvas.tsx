'use client';

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tool, NodeData, NodeType, Wire, Port } from '@/types/game';
import { getNodePorts, getAbsolutePortPosition, findWirePath } from '@/lib/gameUtils';
import { getGoalPortsForRect, solveCircuit, solveCircuitGoals } from '@/lib/circuit-solver';
import { parseGoal, parseFormula, Provable } from '@/lib/logic-engine';
import { formulaRenderer } from '@/lib/formula-renderer';
import { useTutorial } from '@/contexts/TutorialContext';
import { SelectMode } from '@/components/Toolbar';
import { Stage2IslandDefinition, Stage2LevelConfig, Stage2MetaProgress } from '@/types/stage2';

interface Point {
    x: number;
    y: number;
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
    const [nodes, setNodes] = useState<NodeData[]>(initialState?.nodes || []);
    const [wires, setWires] = useState<Wire[]>(initialState?.wires || []);

    const GRID_SIZE = 25;
    const BLOCK_STRIDE = 16;
    const SUPER_BLOCK_STRIDE = 128;
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5.0;
    const LOD_THRESHOLD_SMALL = 0.4;
    const LOD_THRESHOLD_BLOCK = 0.2;
    
    const stage2UnlockedIslandIdSet = stage2Config
        ? new Set(
              stage2Progress?.unlockedIslandIds?.length ? stage2Progress.unlockedIslandIds : stage2Config.initialUnlockedIslandIds
          )
        : new Set<string>();

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
    }, [nodes, wires, goalFormula, stage2Config, stage2UnlockedIslandIdSet]);

    const [flashPhase, setFlashPhase] = useState<number>(0);
    const [hoveredWireValue, setHoveredWireValue] = useState<{ x: number, y: number, value: string } | null>(null);
    
    // Box selection state
    const [isBoxSelecting, setIsBoxSelecting] = useState<boolean>(false);
    const [boxSelectStart, setBoxSelectStart] = useState<Point | null>(null);
    const [boxSelectEnd, setBoxSelectEnd] = useState<Point | null>(null);
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectedWireIds, setSelectedWireIds] = useState<Set<string>>(new Set());

    const displayGoalFormula = React.useMemo(() => {
        if (!goalFormula) return '';
        const parsed = parseGoal(goalFormula);
        return parsed ? parsed.toString() : goalFormula;
    }, [goalFormula]);

    const STAGE2_MARKER_SCALE_THRESHOLD = 0.38;
    const STAGE2_DETAIL_SCALE_THRESHOLD = 0.95;

    const selectedStage2Island = React.useMemo(() => {
        if (!stage2Config) return null;
        const islandId = selectedStage2IslandId ?? stage2Config.focusIslandId;
        return stage2Config.world.getIslandById(islandId);
    }, [selectedStage2IslandId, stage2Config]);

    const showStage2InteriorDetails = scale >= STAGE2_DETAIL_SCALE_THRESHOLD;
    const showStage2IslandOverlayDetails = stage2Config ? scale >= STAGE2_MARKER_SCALE_THRESHOLD : false;

    useEffect(() => {
        stage2IslandRenderCacheRef.current.clear();
    }, [stage2Config?.levelId, stage2Progress?.mapSeed]);

    // Animation Loop for Flashing and Flow
    useEffect(() => {
        let animationFrameId: number;
        const animate = () => {
            const now = Date.now();
            // Flash Cycle 0 -> 1 -> 0 every ~1000ms
            const phase = (Math.sin(now / 150) + 1) / 2; 
            setFlashPhase(phase);
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);
    
    // Handle Level Completion
    useEffect(() => {
        if (isSolved) {
            onLevelComplete?.();
        }
    }, [isSolved, onLevelComplete]);
    
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
                    const conclusion = normalizeFormulaText(island.goalFormula ?? '');
                    const vars = extractVariables([...premises, conclusion]);
                    const portRows = Math.max(1, vars.length + premises.length);
                    const h = Math.max(6, portRows * 2 + 2);

                    return {
                        theoremName: island.rewardTheorem?.name ?? island.name ?? theoremId,
                        theoremVars: vars,
                        theoremPremises: premises,
                        theoremConclusion: conclusion,
                        w: 10,
                        h,
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
                            w: meta.w,
                            h: meta.h,
                        };
                    }
                    if (node.type === 'theorem') {
                        if (node.theoremVars && node.theoremPremises && node.theoremConclusion) return node;
                        const meta = resolveTheoremMeta(node.theoremId);
                        if (!meta) return node;
                        return {
                            ...node,
                            theoremName: meta.theoremName,
                            theoremVars: meta.theoremVars,
                            theoremPremises: meta.theoremPremises,
                            theoremConclusion: meta.theoremConclusion,
                            w: meta.w,
                            h: meta.h,
                        };
                    }
                    return node;
                });
            }

            setNodes(newNodes);
            setWires(state.wires);
        },
        jumpToStage2Island: (islandId: string) => {
            if (!stage2Config) return;
            const island = stage2Config.world.getIslandById(islandId);
            if (!island) return;
            const islandCenterX = (island.mapBounds.x + island.mapBounds.w / 2) * GRID_SIZE;
            const islandCenterY = (island.mapBounds.y + island.mapBounds.h / 2) * GRID_SIZE;
            requestAnimationFrame(() => {
                setOffset({
                    x: window.innerWidth / 2 - islandCenterX * scale,
                    y: window.innerHeight / 2 - islandCenterY * scale,
                });
            });
        },
    }), [GRID_SIZE, nodes, scale, wires, initialState, stage2Config]);

    useEffect(() => {
        if (!stage2Config) {
            stage2InitialViewKeyRef.current = null;
            return;
        }
        const key = stage2Config.levelId;
        if (stage2InitialViewKeyRef.current === key) return;
        stage2InitialViewKeyRef.current = key;

        const focusIsland = stage2Config.world.getIslandById(stage2Config.focusIslandId);
        if (!focusIsland) return;
        const islandCenterX = (focusIsland.mapBounds.x + focusIsland.mapBounds.w / 2) * GRID_SIZE;
        const islandCenterY = (focusIsland.mapBounds.y + focusIsland.mapBounds.h / 2) * GRID_SIZE;
        const raf = requestAnimationFrame(() => {
            setOffset({
                x: window.innerWidth / 2 - islandCenterX * scale,
                y: window.innerHeight / 2 - islandCenterY * scale,
            });
        });
        return () => cancelAnimationFrame(raf);
    }, [GRID_SIZE, scale, stage2Config]);

    useEffect(() => {
        if (!stage2Config || !stage2Progress) return;

        completedGoalIds.forEach((goalId) => {
            if (!stage2Progress.completedIslandIds.includes(goalId)) {
                onStage2IslandComplete?.(goalId);
            }
        });
    }, [completedGoalIds, onStage2IslandComplete, stage2Config, stage2Progress]);

    // Removed wire dragging state as requested

    // Helper: Draw Rounded Rectangle
    const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

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

    // Helper: Draw Pentagon (for MP)
    const drawPentagon = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
        ctx.beginPath();
        // Shape: 
        // 1. Top-Left (0, 0)
        // 2. Top-Right-ish (60%, 0)
        // 3. Right Tip (100%, 50%)
        // 4. Bottom-Right-ish (60%, 100%)
        // 5. Bottom-Left (0, 100%)
        
        const pts = [
            { x: x, y: y },
            { x: x + w * 0.6, y: y },
            { x: x + w, y: y + h * 0.5 },
            { x: x + w * 0.6, y: y + h },
            { x: x, y: y + h }
        ];
        
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
    };

    const drawNode = useCallback((ctx: CanvasRenderingContext2D, node: NodeData | Tool, x: number, y: number, isGhost: boolean = false) => {
        const w = node.w * GRID_SIZE;
        const h = node.h * GRID_SIZE;
        const rotation = node.rotation || 0;
        
        ctx.save();
        
        // Glow Effect
        const shouldGlow = isGhost 
            ? (node.type === 'atom' && ('isActive' in node ? (node.isActive ?? true) : true))
            : ('id' in node && activeNodeIds.has(node.id));

        if (shouldGlow) {
             ctx.shadowBlur = 20;
             ctx.shadowColor = 'rgba(255, 255, 100, 0.6)';
        }

        if (isGhost) {
            ctx.globalAlpha = 0.5;
        }

        // --- Rotation Transform ---
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.translate(cx, cy);
        
        // Fix: Wires use CCW logic (1=Left), while Gates use CW logic (1=Bottom/Right-Down)
        // We invert rotation for wires to match their logic definition.
        const rotationDir = node.type === 'wire' ? -1 : 1;
        ctx.rotate(rotation * rotationDir * 90 * (Math.PI / 180));
        
        // Visual dimensions
        const drawW = w;
        const drawH = h;
        
        ctx.translate(-drawW / 2, -drawH / 2);
        
        // Local coordinates
        const dx = 0;
        const dy = 0;

        // Styles based on type
        let bgColor = '#fff';
        let borderColor = '#fff';
        let textColor = '#fff';
        
        const COLOR_FORMULA_PORT = '#38bdf8'; // Sky Blue
        const COLOR_PROVABLE_PORT = '#facc15'; // Yellow
        const COLOR_ANY_PORT = '#a855f7'; // Purple for any type

        // Helper to draw a port circle
        const drawPortCircle = (px: number, py: number, type: 'formula' | 'provable' | 'any', portId?: string) => {
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            
            let fillStyle = type === 'formula' ? COLOR_FORMULA_PORT : (type === 'provable' ? COLOR_PROVABLE_PORT : COLOR_ANY_PORT);
            
            // Check error
            if (!isGhost && portId && 'id' in node && errorNodePorts.get(node.id)?.has(portId)) {
                // Flash Red
                if (flashPhase > 0.5) {
                    fillStyle = '#ef4444'; // Red
                }
            }

            ctx.fillStyle = fillStyle;
            ctx.fill();
            ctx.strokeStyle = borderColor;
            ctx.stroke();
        };

        if (node.type === 'atom') {
            if (node.subType === 'P') { bgColor = '#0a1a2a'; borderColor = '#00d0ff'; textColor = '#00d0ff'; }
            else if (node.subType === 'Q') { bgColor = '#1a0a2a'; borderColor = '#d000ff'; textColor = '#d000ff'; }
            else if (node.subType === 'R') { bgColor = '#2a1a0a'; borderColor = '#ffaa00'; textColor = '#ffaa00'; }
            
            drawRoundedRect(ctx, dx + 2, dy + 2, drawW - 4, drawH - 4, 10);
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = borderColor;
            ctx.stroke();

            // Text
            ctx.fillStyle = textColor;
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.subType, dx + drawW/2, dy + drawH/2);

            // Output Port (Right) - Formula
            if (!isGhost) {
                drawPortCircle(dx + drawW, dy + drawH/2, 'formula', 'out');
            }

        } else if (node.type === 'wire') {
            // Wire Segment Rendering
            // Wires are lines on the edges of the block:
            // rotation 0: Top Edge (y), horizontal from x to x+w
            // rotation 1: Left Edge (x), vertical from y to y+h
            // rotation 2: Bottom Edge (y+h), horizontal from x to x+w
            // rotation 3: Right Edge (x+w), vertical from y to y+h
            
            // Restore transform since we're drawing directly
            ctx.restore();
            ctx.save();
            
            if (isGhost) {
                ctx.globalAlpha = 0.5;
            }
            
            // Glow effect for active wires
            const shouldGlowWire = isGhost 
                ? false 
                : ('id' in node && activeNodeIds.has(node.id));
            if (shouldGlowWire) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'rgba(255, 255, 100, 0.6)';
            }
            
            let strokeStyle = node.subType === 'formula' ? '#38bdf8' : '#facc15';
            
            // Check Error
            if (!isGhost && 'id' in node && errorWireIds.has(node.id)) {
                strokeStyle = node.subType === 'formula' ? '#d946ef' : '#f97316';
            }
            
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.setLineDash([]);
            
            // Calculate line position based on rotation
            let lineX1: number, lineY1: number, lineX2: number, lineY2: number;
            
            if (rotation === 0) {
                // Top Edge: horizontal line at y
                lineX1 = x; lineY1 = y;
                lineX2 = x + w; lineY2 = y;
            } else if (rotation === 1) {
                // Left Edge: vertical line at x
                lineX1 = x; lineY1 = y;
                lineX2 = x; lineY2 = y + h;
            } else if (rotation === 2) {
                // Bottom Edge: horizontal line at y+h
                lineX1 = x; lineY1 = y + h;
                lineX2 = x + w; lineY2 = y + h;
            } else {
                // rotation === 3: Right Edge: vertical line at x+w
                lineX1 = x + w; lineY1 = y;
                lineX2 = x + w; lineY2 = y + h;
            }
            
            ctx.beginPath();
            ctx.moveTo(lineX1, lineY1);
            ctx.lineTo(lineX2, lineY2);
            ctx.stroke();
            
            // Flow Animation Overlay for Active Wires
            if (!isGhost && 'id' in node && activeNodeIds.has(node.id) && !errorWireIds.has(node.id)) {
                ctx.save();
                const spacing = 15;
                const speed = 0.04;
                const time = Date.now();
                const offset = (time * speed) % spacing;
                ctx.shadowBlur = 8;
                ctx.shadowColor = strokeStyle;
                const particleColor = node.subType === 'formula' 
                    ? 'rgba(240, 171, 252, 0.8)'
                    : 'rgba(253, 186, 116, 0.8)';
                ctx.fillStyle = particleColor;
                
                const lineLen = Math.sqrt((lineX2 - lineX1) ** 2 + (lineY2 - lineY1) ** 2);
                const maxI = Math.ceil(lineLen / spacing) + 1;
                
                const dx = (lineX2 - lineX1) / lineLen;
                const dy = (lineY2 - lineY1) / lineLen;
                
                for (let i = -1; i <= maxI; i++) {
                    const pos1 = i * spacing + offset;
                    if (pos1 >= 0 && pos1 <= lineLen) {
                        ctx.beginPath();
                        ctx.arc(lineX1 + dx * pos1, lineY1 + dy * pos1, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    const pos2 = i * spacing + (spacing / 2) - offset;
                    if (pos2 >= 0 && pos2 <= lineLen) {
                        ctx.beginPath();
                        ctx.arc(lineX1 + dx * pos2, lineY1 + dy * pos2, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.restore();
            }
            
            // Draw connector dots at ends
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(lineX1, lineY1, 2, 0, Math.PI * 2);
            ctx.arc(lineX2, lineY2, 2, 0, Math.PI * 2);
            ctx.fill();

        } else if (node.type === 'gate') {
            if (node.subType === 'implies') {
                bgColor = '#1a1a1a'; borderColor = '#ff0055'; textColor = '#ff0055';
                // D-shape
                ctx.beginPath();
                ctx.moveTo(dx, dy);
                ctx.lineTo(dx + drawW * 0.6, dy);
                const cpX = dx + drawW * 1.135;
                ctx.bezierCurveTo(cpX, dy, cpX, dy + drawH, dx + drawW * 0.6, dy + drawH);
                ctx.lineTo(dx, dy + drawH);
                ctx.closePath();
            } else if (node.subType === 'not') {
                bgColor = 'rgba(255,68,0,0.1)'; borderColor = '#ff4400'; textColor = '#ff4400';
                // Triangle
                ctx.beginPath();
                ctx.moveTo(dx, dy);
                ctx.lineTo(dx + drawW, dy + drawH/2);
                ctx.lineTo(dx, dy + drawH);
                ctx.closePath();
            }

            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = borderColor;
            ctx.stroke();

            // Text
            ctx.fillStyle = textColor;
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const label = node.subType === 'implies' ? '→' : '¬';
            ctx.fillText(label, dx + drawW/2 - (node.subType === 'implies' ? 0 : 10), dy + drawH/2);

            // Ports
            if (!isGhost) {
                // Output (Right) - Formula
                const outX = node.subType === 'implies' ? dx + drawW : dx + drawW;
                drawPortCircle(outX, dy + drawH/2, 'formula', 'out');

                // Inputs (Left) - Formula
                if (node.subType === 'implies') {
                    // in0 (top), in1 (bottom)
                    drawPortCircle(dx, dy + drawH * 0.25, 'formula', 'in0');
                    drawPortCircle(dx, dy + drawH * 0.75, 'formula', 'in1');
                } else {
                    // in0
                    drawPortCircle(dx, dy + drawH * 0.5, 'formula', 'in0');
                }
            }

        } else if (node.type === 'axiom') {
            bgColor = '#0a1a15'; borderColor = '#00ffaa'; textColor = '#00ffaa';
            
            drawRoundedRect(ctx, dx, dy, drawW, drawH, 8);
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.lineWidth = 3; 
            ctx.strokeStyle = borderColor;
            ctx.stroke();
            
            ctx.lineWidth = 1;
            drawRoundedRect(ctx, dx + 4, dy + 4, drawW - 8, drawH - 8, 4);
            ctx.stroke();

            // Text
            ctx.fillStyle = textColor;
            ctx.font = 'italic bold 32px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let label = 'I';
            if (node.subType === '2') label = 'II';
            if (node.subType === '3') label = 'III';
            ctx.fillText(label, dx + drawW/2, dy + drawH/2);

            // Ports
            if (!isGhost) {
                // Output (Right) - Provable
                drawPortCircle(dx + drawW, dy + drawH/2, 'provable', 'out');

                // Inputs (Left) - Formula
                if (node.subType === '2') {
                    // in0, in1, in2
                    drawPortCircle(dx, dy + drawH * (0.5/3), 'formula', 'in0');
                    drawPortCircle(dx, dy + drawH * (1.5/3), 'formula', 'in1');
                    drawPortCircle(dx, dy + drawH * (2.5/3), 'formula', 'in2');
                } else {
                    // in0, in1
                    drawPortCircle(dx, dy + drawH * 0.25, 'formula', 'in0');
                    drawPortCircle(dx, dy + drawH * 0.75, 'formula', 'in1');
                }
            }

        } else if (node.type === 'mp') {
            bgColor = '#1a1a00'; borderColor = '#ffff00'; textColor = '#ffff00';
            
            drawPentagon(ctx, dx, dy, drawW, drawH);
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = borderColor;
            ctx.stroke();

            // Text
            ctx.fillStyle = textColor;
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("MP", dx + drawW * 0.4, dy + drawH/2);

            // Ports
            if (!isGhost) {
                // Inputs: Left edge (0.5, 1.0, 2.0, 2.5) -> in0, in1, in2, in3
                const inputs = [
                    { y: dy + drawH * (0.5/3), type: 'formula' as const, id: 'in0' },
                    { y: dy + drawH * (1.0/3), type: 'formula' as const, id: 'in1' },
                    { y: dy + drawH * (2.0/3), type: 'provable' as const, id: 'in2' },
                    { y: dy + drawH * (2.5/3), type: 'provable' as const, id: 'in3' }
                ];
                
                inputs.forEach(p => {
                    drawPortCircle(dx, p.y, p.type, p.id);
                });

                // Output: Rightmost vertex
                drawPortCircle(dx + drawW, dy + drawH/2, 'provable', 'out');
            }
        } else if (node.type === 'theorem') {
            bgColor = '#1a1226';
            borderColor = '#fbbf24';
            textColor = '#fde68a';

            drawRoundedRect(ctx, dx, dy, drawW, drawH, 10);
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = borderColor;
            ctx.stroke();

            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
            drawRoundedRect(ctx, dx + 4, dy + 4, drawW - 8, drawH - 8, 6);
            ctx.stroke();

            const name = node.theoremName || node.subType || 'THM';
            ctx.fillStyle = textColor;
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(name.toUpperCase(), dx + drawW / 2, dy + 8);

            const normalize = (text: string) => text.replace(/^\s*(\|-|⊢)\s*/, '').trim();
            const premises = node.theoremPremises ?? [];
            const conclusion = node.theoremConclusion ? normalize(node.theoremConclusion) : normalize(node.customLabel ?? '');

            const contentX = dx + 10;
            const contentY = dy + 36;
            const contentW = drawW - 20;
            const contentH = drawH - 48;
            const leftW = contentW * 0.44;
            const midW = contentW * 0.14;
            const rightW = contentW - leftW - midW;

            ctx.save();
            ctx.globalAlpha = 0.9;
            drawRoundedRect(ctx, contentX, contentY, contentW, contentH, 10);
            ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
            ctx.fill();
            ctx.restore();

            const renderProvable = (formulaText: string, cx: number, cy: number, w: number, h: number, sizeScale: number) => {
                const parsed = parseGoal(`|-${normalize(formulaText)}`);
                if (!parsed) return;
                const renderSize = Math.min(w, h) * sizeScale;
                formulaRenderer.render(ctx, parsed, cx, cy, renderSize, scale);
            };

            const renderPremiseCount = Math.min(2, premises.length);
            if (renderPremiseCount > 0) {
                const slotGap = 8;
                const slotH = (contentH - slotGap * (renderPremiseCount - 1)) / renderPremiseCount;
                for (let i = 0; i < renderPremiseCount; i += 1) {
                    const sx = contentX + 6;
                    const sy = contentY + i * (slotH + slotGap) + 6;
                    const sw = leftW - 12;
                    const sh = slotH - 12;
                    drawRoundedRect(ctx, sx, sy, sw, sh, 8);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
                    ctx.fill();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
                    ctx.stroke();
                    renderProvable(premises[i], sx + sw / 2, sy + sh / 2, sw, sh, 0.9);
                }

                if (premises.length > renderPremiseCount) {
                    ctx.save();
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
                    ctx.font = `bold ${Math.max(10, 12 / Math.max(0.12, scale))}px sans-serif`;
                    ctx.fillText(`+${premises.length - renderPremiseCount}`, contentX + 8, contentY + contentH - 8);
                    ctx.restore();
                }
            }

            ctx.save();
            ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.max(18, Math.min(34, 26 / Math.max(0.12, scale)))}px sans-serif`;
            ctx.fillText('⇒', contentX + leftW + midW / 2, contentY + contentH / 2);
            ctx.restore();

            const cx = contentX + leftW + midW + rightW / 2;
            const cy = contentY + contentH / 2;
            renderProvable(conclusion, cx, cy, rightW, contentH, 0.95);

            if (!isGhost) {
                const nodePorts = getNodePorts(node as NodeData);
                for (const port of nodePorts) {
                    drawPortCircle(dx + port.x * GRID_SIZE, dy + port.y * GRID_SIZE, port.type, port.id);
                }
            }
        } else if (node.type === 'premise') {
            // Dark Teal / Cyan Theme (Chip Style)
            bgColor = '#0a2a2a'; 
            borderColor = '#00ffcc'; 
            textColor = '#00ffcc';
            
            const inset = 4; // Inset for the body to allow pins to stick out
            const pinWidth = 8; // Width of the visual pin
            const bodyR = 8; // Corner radius of the chip body

            // 1. Draw Pins (underneath body)
            if (!isGhost) {
                const w = node.w;
                const h = node.h;

                const drawPinShape = (px: number, py: number, side: 't'|'b'|'l'|'r') => {
                    ctx.fillStyle = borderColor;
                    if (side === 't') {
                         ctx.fillRect(px - pinWidth/2, dy, pinWidth, inset + 2); // +2 to overlap slightly with body
                    } else if (side === 'b') {
                         ctx.fillRect(px - pinWidth/2, dy + drawH - inset - 2, pinWidth, inset + 2);
                    } else if (side === 'l') {
                         ctx.fillRect(dx, py - pinWidth/2, inset + 2, pinWidth);
                    } else if (side === 'r') {
                         ctx.fillRect(dx + drawW - inset - 2, py - pinWidth/2, inset + 2, pinWidth);
                    }
                };

                // Top (y=0)
                for (let x = 1; x < w; x++) {
                    const px = dx + x * GRID_SIZE;
                    drawPinShape(px, dy, 't');
                }
                // Bottom (y=h)
                for (let x = 1; x < w; x++) {
                    const px = dx + x * GRID_SIZE;
                    drawPinShape(px, dy + drawH, 'b');
                }
                // Left (x=0)
                for (let y = 1; y < h; y++) {
                    const py = dy + y * GRID_SIZE;
                    drawPinShape(dx, py, 'l');
                }
                // Right (x=w)
                for (let y = 1; y < h; y++) {
                    const py = dy + y * GRID_SIZE;
                    drawPinShape(dx + drawW, py, 'r');
                }
            }

            // 2. Draw Body (Chip)
            drawRoundedRect(ctx, dx + inset, dy + inset, drawW - inset*2, drawH - inset*2, bodyR);
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = borderColor;
            ctx.stroke();

            // Inner chip detail (Decorative Rect)
            const innerW = drawW * 0.7;
            const innerH = drawH * 0.7;
            ctx.lineWidth = 1;
            drawRoundedRect(ctx, dx + (drawW - innerW)/2, dy + (drawH - innerH)/2, innerW, innerH, 4);
            ctx.stroke();

            const label = ('customLabel' in node ? node.customLabel : undefined) || node.subType || '?';
            let formulaStr = label
                .replace(/->/g, '→')
                .replace(/-\./g, '¬')
                .replace('|-', '⊢');
            
            if (!formulaStr.startsWith('⊢') && !formulaStr.startsWith('|-')) {
                formulaStr = '⊢ ' + formulaStr;
            }

            const parsedFormula = parseGoal(formulaStr);
            if (parsedFormula) {
                const renderSize = Math.min(innerW, innerH) * 0.85;
                formulaRenderer.render(ctx, parsedFormula, dx + drawW/2, dy + drawH/2, renderSize, scale);
            } else {
                ctx.fillStyle = textColor;
                const fontSize = formulaStr.length > 8 ? 16 : 22;
                ctx.font = `bold ${fontSize}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(formulaStr, dx + drawW/2, dy + drawH/2);
            }

            // 3. Ports (Interaction Circles)
            if (!isGhost) {
                const w = node.w;
                const h = node.h;
                
                // Top
                for (let x = 1; x < w; x++) {
                    drawPortCircle(dx + x * GRID_SIZE, dy, 'provable', `out_t_${x}`);
                }
                // Bottom
                for (let x = 1; x < w; x++) {
                    drawPortCircle(dx + x * GRID_SIZE, dy + drawH, 'provable', `out_b_${x}`);
                }
                // Left
                for (let y = 1; y < h; y++) {
                    drawPortCircle(dx, dy + y * GRID_SIZE, 'provable', `out_l_${y}`);
                }
                // Right
                for (let y = 1; y < h; y++) {
                    drawPortCircle(dx + drawW, dy + y * GRID_SIZE, 'provable', `out_r_${y}`);
                }
            }
        } else if (node.type === 'display') {
            // Display Node - renders connected formula/provable
            bgColor = '#1a1a2e';
            borderColor = '#6366f1';
            
            // Check for errors
            const hasError = !isGhost && 'id' in node && 
                Array.from(errorNodePorts.keys()).includes(node.id);
            if (hasError) {
                borderColor = '#ef4444';
                bgColor = '#2a1a1a';
            }
            
            const isLarge = w > 4;
            const bodyR = isLarge ? 12 : 8;
            
            // Draw body
            drawRoundedRect(ctx, dx, dy, drawW, drawH, bodyR);
            ctx.fillStyle = bgColor;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = borderColor;
            ctx.stroke();
            
            // Inner screen area
            const screenInset = isLarge ? 8 : 4;
            drawRoundedRect(ctx, dx + screenInset, dy + screenInset, drawW - screenInset * 2, drawH - screenInset * 2, 4);
            ctx.fillStyle = '#0a0a15';
            ctx.fill();
            ctx.strokeStyle = hasError ? '#ef4444' : '#4f46e5';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Show error message or connected value
            if (!isGhost && 'id' in node) {
                if (hasError) {
                    // Show error indicator with flashing effect
                    const errorSize = isLarge ? 48 : 32;
                    const alpha = 0.5 + flashPhase * 0.5; // Flash between 0.5 and 1.0
                    
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#ef4444';
                    ctx.fillStyle = '#ef4444';
                    ctx.font = `bold ${errorSize}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('!', dx + drawW / 2, dy + drawH / 2);
                    ctx.restore();
                } else {
                    // Get connected value and render
                    const nodePorts = getNodePorts(node as NodeData);
                    let connectedValue: { formula: ReturnType<typeof parseGoal>, type: string } | null = null;
                    
                    for (const port of nodePorts) {
                        const absPos = getAbsolutePortPosition(node as NodeData, port);
                        // Check for connected wire
                        const wireNodes = nodes.filter(n => n.type === 'wire');
                        for (const wire of wireNodes) {
                            const s = { 
                                vertical: (wire.rotation === 1 || wire.rotation === 3), 
                                c: wire.rotation === 1 ? wire.x : (wire.rotation === 3 ? wire.x + wire.w : (wire.rotation === 0 ? wire.y : wire.y + wire.h)),
                                min: wire.rotation === 1 || wire.rotation === 3 ? wire.y : wire.x,
                                max: wire.rotation === 1 || wire.rotation === 3 ? wire.y + wire.h : wire.x + wire.w
                            };
                            const EPS = 0.5;
                            let touch = false;
                            if (s.vertical) {
                                touch = Math.abs(absPos.x - s.c) < EPS && absPos.y >= s.min - EPS && absPos.y <= s.max + EPS;
                            } else {
                                touch = Math.abs(absPos.y - s.c) < EPS && absPos.x >= s.min - EPS && absPos.x <= s.max + EPS;
                            }
                            if (touch) {
                                const val = wireValues.get(wire.id);
                                if (val && val !== 'Error') {
                                    const parsed = parseGoal(val);
                                    if (parsed) {
                                        connectedValue = { formula: parsed, type: wire.subType };
                                        break;
                                    }
                                }
                            }
                        }
                        if (connectedValue) break;
                    }
                    
                    if (connectedValue && connectedValue.formula) {
                        const renderSize = Math.min(drawW - screenInset * 2, drawH - screenInset * 2) * 0.85;
                        formulaRenderer.render(ctx, connectedValue.formula, dx + drawW / 2, dy + drawH / 2, renderSize, scale);
                    }
                }
            }
            
            // Draw ports
            if (!isGhost) {
                const nodePorts = getNodePorts(node as NodeData);
                for (const port of nodePorts) {
                    // Use local coordinates like other nodes (port.x, port.y are relative to node)
                    drawPortCircle(dx + port.x * GRID_SIZE, dy + port.y * GRID_SIZE, 'any', port.id);
                }
            }
        } else if (node.type === 'bridge') {
            // Wire Bridge - small 2x2 node that allows wires to cross
            // Visual: One wire appears to go over the other (overpass effect)
            
            const bridgeActive = !isGhost && 'id' in node && activeNodeIds.has(node.id);
            
            const bridgeColor = '#374151';
            const activeColor = '#4b5563';
            const bottomLineColor = bridgeActive ? '#9ca3af' : '#6b7280';
            const topLineColor = bridgeActive ? '#f3f4f6' : '#d1d5db';
            
            ctx.fillStyle = bridgeActive ? activeColor : bridgeColor;
            ctx.strokeStyle = bridgeActive ? '#9ca3af' : '#4b5563';
            ctx.lineWidth = 1;
            
            // Draw bridge body - rounded rectangle
            const br = 4;
            drawRoundedRect(ctx, dx, dy, drawW, drawH, br);
            ctx.fill();
            ctx.stroke();
            
            const cx = dx + drawW / 2;
            const cy = dy + drawH / 2;
            const gapSize = 6;
            const lineThickness = 3;
            
            // First, draw the "bottom" horizontal wire with a gap at intersection
            ctx.strokeStyle = bottomLineColor;
            ctx.lineWidth = lineThickness;
            ctx.lineCap = 'butt';
            
            // Horizontal line (left part, up to gap)
            ctx.beginPath();
            ctx.moveTo(dx + drawW * 0.15, cy);
            ctx.lineTo(cx - gapSize / 2, cy);
            ctx.stroke();
            
            // Horizontal line (right part, from gap)
            ctx.beginPath();
            ctx.moveTo(cx + gapSize / 2, cy);
            ctx.lineTo(dx + drawW * 0.85, cy);
            ctx.stroke();
            
            // Draw shadow/depth under the vertical bridge (pillow effect)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, gapSize / 2 + 1, gapSize / 2 + 1, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw the "top" vertical wire that goes over (the bridge)
            ctx.strokeStyle = topLineColor;
            ctx.lineWidth = lineThickness;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(cx, dy + drawH * 0.15);
            ctx.lineTo(cx, dy + drawH * 0.85);
            ctx.stroke();
            
            // Draw highlight on the vertical wire to enhance 3D effect
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 1, dy + drawH * 0.2);
            ctx.lineTo(cx - 1, dy + drawH * 0.8);
            ctx.stroke();
            
            // Draw ports
            if (!isGhost) {
                const nodePorts = getNodePorts(node as NodeData);
                for (const port of nodePorts) {
                    drawPortCircle(dx + port.x * GRID_SIZE, dy + port.y * GRID_SIZE, 'any', port.id);
                }
            }
        }

        ctx.restore();
    }, [GRID_SIZE, activeNodeIds, errorWireIds, errorNodePorts, flashPhase, wireValues, nodes, scale]);

    const drawStage2Backdrop = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!stage2Config) return;

        const selectedIslandId = selectedStage2Island?.id ?? stage2Config.focusIslandId;
        const focusIsland = stage2Config.world.getIslandById(selectedIslandId);

        const completedIslandIds = new Set(stage2Progress?.completedIslandIds ?? []);

        const getCenter = (island: Stage2IslandDefinition) => ({
            x: island.mapBounds.x + island.mapBounds.w / 2,
            y: island.mapBounds.y + island.mapBounds.h / 2,
        });

        const lod: 'coarse' | 'markers' | 'tiles' =
            showStage2InteriorDetails ? 'tiles' : scale >= STAGE2_MARKER_SCALE_THRESHOLD ? 'markers' : 'coarse';

        const palette = {
            main: {
                fill: 'rgba(12, 18, 34, 0.82)',
                edge: 'rgba(148, 163, 184, 0.55)',
            },
            support: {
                fill: 'rgba(10, 14, 28, 0.78)',
                edge: 'rgba(148, 163, 184, 0.45)',
            },
            optional: {
                fill: 'rgba(8, 10, 20, 0.72)',
                edge: 'rgba(148, 163, 184, 0.35)',
            },
            completed: {
                fill: 'rgba(6, 36, 30, 0.78)',
                edge: 'rgba(52, 211, 153, 0.55)',
            },
            selectedGlow: 'rgba(14, 165, 233, 0.18)',
            selectedEdge: 'rgba(56, 189, 248, 0.65)',
            link: 'rgba(56, 189, 248, 0.12)',
        } as const;

        const getCoarseLabel = (island: Stage2IslandDefinition) => {
            if (!island.goalFormula) return '';
            const goalText = parseGoal(island.goalFormula)?.toString() ?? island.goalFormula;
            const premiseText = (island.premiseNodes ?? []).map((premise) => premise.formula).join(', ');
            const summary = premiseText.length > 0 ? `${premiseText} ⇒ ${goalText}` : goalText;
            return summary.length > 64 ? `${summary.slice(0, 64)}...` : summary;
        };

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

        const getIslandColors = (island: Stage2IslandDefinition, completed: boolean, selected: boolean) => {
            if (completed) {
                return {
                    fill: palette.completed.fill,
                    edge: selected ? palette.selectedEdge : palette.completed.edge,
                };
            }
            const base = island.category === 'main' ? palette.main : island.category === 'support' ? palette.support : palette.optional;
            return {
                fill: base.fill,
                edge: selected ? palette.selectedEdge : base.edge,
            };
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
            stage2IslandRenderCacheRef.current.set(island.id, result);
            return result;
        };

        const drawIslandCoarse = (island: Stage2IslandDefinition, unlocked: boolean, completed: boolean, selected: boolean) => {
            const { x, y, w } = island.mapBounds;
            const alpha = unlocked ? 1 : 0.18;
            const colors = getIslandColors(island, completed, selected);
            const { outlinePath } = getIslandCachedArtifacts(island);

            ctx.save();
            ctx.globalAlpha = alpha;

            if (selected && unlocked) {
                ctx.save();
                ctx.fillStyle = palette.selectedGlow;
                ctx.shadowBlur = 24 / Math.max(0.12, scale);
                ctx.shadowColor = palette.selectedGlow;
                ctx.fill(outlinePath, 'evenodd');
                ctx.restore();
            }

            ctx.fillStyle = colors.fill;
            ctx.fill(outlinePath, 'evenodd');

            ctx.lineWidth = Math.max(1 / scale, GRID_SIZE * 0.035);
            ctx.strokeStyle = colors.edge;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke(outlinePath);

            if (unlocked && island.name) {
                const { coarseLabel } = getIslandCachedArtifacts(island);
                const centerX = (x + w / 2) * GRID_SIZE;
                const centerY = (island.mapBounds.y + island.mapBounds.h * 0.56) * GRID_SIZE;
                const titleFontSize = Math.max(22, Math.min(58, 30 / Math.max(0.12, scale)));
                const labelFontSize = Math.max(18, Math.min(46, 24 / Math.max(0.12, scale)));

                const titleColor = completed
                    ? 'rgba(110, 231, 183, 0.92)'
                    : island.category === 'main'
                      ? 'rgba(165, 243, 252, 0.95)'
                      : island.category === 'support'
                        ? 'rgba(196, 181, 253, 0.92)'
                        : 'rgba(226, 232, 240, 0.85)';
                const labelColor = completed ? 'rgba(167, 243, 208, 0.9)' : 'rgba(253, 230, 138, 0.92)';

                ctx.save();
                ctx.globalAlpha = 0.92;
                ctx.shadowBlur = 10 / Math.max(0.12, scale);
                ctx.shadowColor = 'rgba(2, 6, 23, 0.8)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
                const padX = 14 / Math.max(0.12, scale);
                const padY = 10 / Math.max(0.12, scale);
                const boxW = Math.max(280 / Math.max(0.12, scale), w * GRID_SIZE * 0.78);
                const boxH = titleFontSize * 2.35 + labelFontSize * 1.4 + padY * 2;
                drawRoundedRect(ctx, centerX - boxW / 2, centerY - boxH / 2, boxW, boxH, 18 / Math.max(0.12, scale));
                ctx.fill();

                ctx.fillStyle = titleColor;
                ctx.font = `bold ${titleFontSize}px sans-serif`;
                ctx.fillText(island.name, centerX, centerY - titleFontSize * 0.9);
                if (coarseLabel) {
                    ctx.fillStyle = labelColor;
                    ctx.font = `bold ${labelFontSize}px sans-serif`;
                    ctx.fillText(coarseLabel, centerX, centerY + labelFontSize * 0.3);
                }
                ctx.restore();
            }

            ctx.restore();
        };

        const canvasW = ctx.canvas.width;
        const canvasH = ctx.canvas.height;
        const worldMinX = (-offset.x / scale) / GRID_SIZE;
        const worldMaxX = ((canvasW - offset.x) / scale) / GRID_SIZE;
        const worldMinY = (-offset.y / scale) / GRID_SIZE;
        const worldMaxY = ((canvasH - offset.y) / scale) / GRID_SIZE;
        const marginTilesX = stage2Config.world.chunkW * 2;
        const marginTilesY = stage2Config.world.chunkH * 2;
        const viewBounds = {
            x: Math.floor(worldMinX - marginTilesX),
            y: Math.floor(worldMinY - marginTilesY),
            w: Math.ceil(worldMaxX - worldMinX + marginTilesX * 2),
            h: Math.ceil(worldMaxY - worldMinY + marginTilesY * 2),
        };

        const islandsInView = stage2Config.world.getIslandsInBounds(viewBounds);
        const selectedId = selectedIslandId;

        if (lod !== 'coarse' && focusIsland) {
            const focusCenter = getCenter(focusIsland);
            stage2Config.goalIslandIds
                .filter((id) => id !== focusIsland.id && stage2UnlockedIslandIdSet.has(id))
                .map((id) => stage2Config.world.getIslandById(id))
                .filter((item): item is NonNullable<typeof item> => Boolean(item))
                .forEach((island) => {
                    const center = getCenter(island);
                    ctx.save();
                    ctx.beginPath();
                    ctx.strokeStyle = palette.link;
                    ctx.lineWidth = 0.25 * GRID_SIZE;
                    ctx.setLineDash([0.5 * GRID_SIZE, 0.6 * GRID_SIZE]);
                    const controlY = Math.min(center.y, focusCenter.y) - 4;
                    ctx.moveTo(center.x * GRID_SIZE, center.y * GRID_SIZE);
                    ctx.quadraticCurveTo(
                        ((center.x + focusCenter.x) / 2) * GRID_SIZE,
                        controlY * GRID_SIZE,
                        focusCenter.x * GRID_SIZE,
                        focusCenter.y * GRID_SIZE
                    );
                    ctx.stroke();
                    ctx.restore();
                });
        }

        islandsInView.forEach((islandBase) => {
            const island: Stage2IslandDefinition = {
                ...islandBase,
                unlocked: stage2UnlockedIslandIdSet.has(islandBase.id),
            };
            const { x, y, w, h } = island.mapBounds;
            const unlocked = island.unlocked;
            const completed = completedIslandIds.has(island.id);
            const selected = island.id === selectedId;

            if (lod === 'tiles') {
                const colors = getIslandColors(island, completed, selected);
                const alpha = unlocked ? 1 : 0.22;
                const { tilesPath } = getIslandCachedArtifacts(island);

                ctx.save();
                ctx.globalAlpha = alpha;
                if (selected && unlocked) {
                    ctx.save();
                    ctx.shadowBlur = 26 / Math.max(0.12, scale);
                    ctx.shadowColor = palette.selectedGlow;
                    ctx.fillStyle = palette.selectedGlow;
                    ctx.fill(tilesPath);
                    ctx.restore();
                }

                ctx.fillStyle = colors.fill;
                ctx.fill(tilesPath);
                ctx.lineWidth = Math.max(1 / scale, GRID_SIZE * 0.035);
                ctx.strokeStyle = colors.edge;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.stroke(tilesPath);
                ctx.restore();
            } else {
                drawIslandCoarse(island, unlocked, completed, selected);
            }

            if (unlocked && island.name && scale >= 0.26 && lod !== 'coarse') {
                ctx.save();
                ctx.globalAlpha = 1;
                ctx.fillStyle = completed ? 'rgba(110, 231, 183, 0.7)' : 'rgba(226, 232, 240, 0.62)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.font = `bold ${Math.max(11, Math.min(18, w * GRID_SIZE * 0.06))}px sans-serif`;
                ctx.fillText(island.name, (x + w / 2) * GRID_SIZE, (y - 0.8) * GRID_SIZE);
                ctx.restore();
            }
        });
    }, [
        GRID_SIZE,
        offset.x,
        offset.y,
        scale,
        selectedStage2Island?.id,
        showStage2InteriorDetails,
        stage2Config,
        stage2Progress?.completedIslandIds,
        stage2UnlockedIslandIdSet,
    ]);

    const drawGoalBlock = useCallback((
        ctx: CanvasRenderingContext2D,
        bounds: { x: number; y: number; w: number; h: number },
        goalFormulaText: string,
        solved: boolean,
        errorPorts: Set<string>
    ) => {
        const targetX = bounds.x * GRID_SIZE;
        const targetY = bounds.y * GRID_SIZE;
        const targetW = bounds.w * GRID_SIZE;
        const targetH = bounds.h * GRID_SIZE;
        const radius = 20;

        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = solved ? 'rgba(0, 255, 100, 0.6)' : 'rgba(255, 255, 255, 0.1)';
        drawRoundedRect(ctx, targetX, targetY, targetW, targetH, radius);
        ctx.fillStyle = solved ? '#0d2a1a' : '#0d0d12';
        ctx.fill();
        ctx.lineWidth = 3 / scale;
        ctx.strokeStyle = solved ? '#00ff66' : '#666';
        ctx.save();
        ctx.setLineDash([5 / scale, 5 / scale]);
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;

        ctx.fillStyle = solved ? '#00ff66' : '#888';
        ctx.font = 'bold 32px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GOAL', targetX + targetW / 2, targetY + 40);

        const parsedGoalFormula = parseGoal(goalFormulaText);
        if (parsedGoalFormula) {
            const renderSize = Math.min(targetW, targetH) * 0.55;
            formulaRenderer.render(ctx, parsedGoalFormula, targetX + targetW / 2, targetY + targetH / 2 + 25, renderSize, scale);
        } else {
            ctx.fillStyle = '#fff';
            ctx.font = `italic ${goalFormulaText.length > 15 ? 18 : 24}px "Times New Roman", serif`;
            ctx.fillText(goalFormulaText, targetX + targetW / 2, targetY + targetH / 2 + 20);
        }

        const portR = 6;
        getGoalPortsForRect(bounds).forEach((port) => {
            const cx = port.x * GRID_SIZE;
            const cy = port.y * GRID_SIZE;
            let fillStyle = '#444';
            if (errorPorts.has(`${port.x},${port.y}`) && flashPhase > 0.5) {
                fillStyle = '#ef4444';
            }
            ctx.beginPath();
            ctx.arc(cx, cy, portR, 0, Math.PI * 2);
            ctx.fillStyle = fillStyle;
            ctx.fill();
            ctx.lineWidth = 2 / scale;
            ctx.strokeStyle = solved ? '#00ff66' : '#666';
            ctx.stroke();
        });
        ctx.restore();
    }, [GRID_SIZE, flashPhase, scale]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear screen
        ctx.clearRect(0, 0, width, height);
        
        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        // --- Grid Drawing Start ---
        const margin = GRID_SIZE * SUPER_BLOCK_STRIDE;
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
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1 / scale;
            vLines.small.forEach(x => { ctx.moveTo(x, startY); ctx.lineTo(x, endY); });
            hLines.small.forEach(y => { ctx.moveTo(startX, y); ctx.lineTo(endX, y); });
            ctx.stroke();
        }

        // 2. Block Grid
        if (showBlockGrid && (vLines.block.length > 0 || hLines.block.length > 0)) {
            ctx.beginPath();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2 / scale;
            vLines.block.forEach(x => { ctx.moveTo(x, startY); ctx.lineTo(x, endY); });
            hLines.block.forEach(y => { ctx.moveTo(startX, y); ctx.lineTo(endX, y); });
            ctx.stroke();
        }

        // 3. Super Block Grid
        if (vLines.superBlock.length > 0 || hLines.superBlock.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 4 / scale;
            vLines.superBlock.forEach(x => { ctx.moveTo(x, startY); ctx.lineTo(x, endY); });
            hLines.superBlock.forEach(y => { ctx.moveTo(startX, y); ctx.lineTo(endX, y); });
            ctx.stroke();
        }
        // --- Grid Drawing End ---

        drawStage2Backdrop(ctx);

        if (!stage2Config && goalFormula) {
            drawGoalBlock(ctx, { x: -4, y: -4, w: 8, h: 8 }, goalFormula, isSolved, errorGoalPorts);
        }

        if (stage2Config && showStage2IslandOverlayDetails) {
            stage2Config.goalIslandIds.forEach((islandId) => {
                if (!stage2UnlockedIslandIdSet.has(islandId)) return;
                const island = stage2Config.world.getIslandById(islandId);
                if (!island?.goalBounds || !island.goalFormula) return;
                drawGoalBlock(
                    ctx,
                    island.goalBounds,
                    island.goalFormula,
                    completedGoalIds.has(island.id),
                    goalErrorsById.get(island.id) ?? new Set<string>()
                );
            });
        }

        // --- Nodes ---
        nodes.forEach(node => {
            if (stage2Config) {
                if (!showStage2InteriorDetails) {
                    if (
                        node.type !== 'premise' ||
                        !node.locked ||
                        !node.sourceIslandId ||
                        !stage2UnlockedIslandIdSet.has(node.sourceIslandId) ||
                        !showStage2IslandOverlayDetails
                    ) {
                        return;
                    }
                } else if (node.type === 'premise' && node.locked && node.sourceIslandId) {
                    if (!stage2UnlockedIslandIdSet.has(node.sourceIslandId)) {
                        return;
                    }
                }
            }

            drawNode(ctx, node, node.x * GRID_SIZE, node.y * GRID_SIZE);
        });

        // --- Ghost Nodes from Tutorial ---
        if (currentStep && currentStep.ghostNodes) {
            currentStep.ghostNodes.forEach(ghost => {
                drawNode(ctx, ghost as Tool, ghost.x * GRID_SIZE, ghost.y * GRID_SIZE, true);
            });
        }

        // --- Ghost Node (Active Tool) ---
        if (activeTool && mouseGridPos) {
            drawNode(ctx, activeTool, mouseGridPos.x * GRID_SIZE, mouseGridPos.y * GRID_SIZE, true);
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
                    const nx = node.x * GRID_SIZE;
                    const ny = node.y * GRID_SIZE;
                    const nw = node.w * GRID_SIZE;
                    const nh = node.h * GRID_SIZE;
                    
                    ctx.strokeStyle = '#22c55e';
                    ctx.lineWidth = 3 / scale;
                    ctx.setLineDash([]);
                    ctx.strokeRect(nx - 2, ny - 2, nw + 4, nh + 4);
                }
            });
        }

        ctx.restore();

        // Debug Info
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Offset: ${Math.round(offset.x)}, ${Math.round(offset.y)}`, 10, 20);
        ctx.fillText(`Scale: ${scale.toFixed(2)}`, 10, 40);
        if (mouseGridPos) {
            ctx.fillText(`Grid: ${mouseGridPos.x}, ${mouseGridPos.y}`, 10, 60);
        }
        if (isSolved) {
            // Level Solved indicator handled by HTML overlay in parent
        }

    }, [offset, scale, nodes, activeTool, mouseGridPos, drawNode, drawGoalBlock, drawStage2Backdrop, goalFormula, isSolved, errorGoalPorts, currentStep, isBoxSelecting, boxSelectStart, boxSelectEnd, selectedNodeIds, stage2Config, showStage2InteriorDetails, showStage2IslandOverlayDetails, stage2UnlockedIslandIdSet, completedGoalIds, goalErrorsById]);

    // Handle Window Resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                draw();
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [draw]);

    // Animation Loop
    useEffect(() => {
        draw();
    }, [draw]);

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
            const key = e.key.toLowerCase();
            if (key === 'q') {
                onToolClear();
            } else if (key === 'r') {
                onToolRotate?.();
            } else if (key === 't') {
                onToolToggleType?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onToolClear, onToolRotate, onToolToggleType]);

    useEffect(() => {
        const isEditableTarget = (target: EventTarget | null) => {
            const el = target as HTMLElement | null;
            if (!el) return false;
            if (el.isContentEditable) return true;
            const tag = el.tagName?.toLowerCase();
            if (!tag) return false;
            return tag === 'input' || tag === 'textarea' || tag === 'select';
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
            if (isEditableTarget(e.target)) return;
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

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            if (wasdRafRef.current != null) {
                cancelAnimationFrame(wasdRafRef.current);
                wasdRafRef.current = null;
            }
            wasdLastFrameRef.current = 0;
            wasdStateRef.current = { w: false, a: false, s: false, d: false, shift: false };
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
                };

                if (canPlaceNode && !canPlaceNode(newNode)) {
                    return;
                }

                // Collision check
                const stage2GoalRects = stage2Config
                    ? stage2Config.goalIslandIds
                          .filter((id) => stage2UnlockedIslandIdSet.has(id))
                          .map((id) => stage2Config.world.getIslandById(id))
                          .filter((item): item is NonNullable<typeof item> => Boolean(item?.goalBounds))
                          .map((island) => island.goalBounds!)
                    : [];
                const goalRects = stage2GoalRects.length > 0 ? stage2GoalRects : [{ x: -4, y: -4, w: 8, h: 8 }];
                const goalCollision = goalRects.some((goalRect) => !(
                    newNode.x >= goalRect.x + goalRect.w || 
                    newNode.x + newNode.w <= goalRect.x || 
                    newNode.y >= goalRect.y + goalRect.h || 
                    newNode.y + newNode.h <= goalRect.y
                ));

                const overlappingNodes = nodes.filter(n => {
                    const isOverlapping = !(newNode.x >= n.x + n.w || 
                        newNode.x + newNode.w <= n.x || 
                        newNode.y >= n.y + n.h || 
                        newNode.y + newNode.h <= n.y);
                    return isOverlapping;
                });

                // 2. Check against existing nodes
                // Separate "Hard" collision (blocking types) from "Duplicate" (same wire)
                const hardCollision = overlappingNodes.some(n => {
                    if (newNode.type === 'bridge' && n.type === 'wire') {
                        return false;
                    }

                    if (newNode.type === 'wire' && n.type === 'bridge') {
                        return false;
                    }

                    // Allow wire overlapping if rotations are different (crossing/junctions)
                    if (newNode.type === 'wire' && n.type === 'wire') {
                        return false; // Treat ALL wire-wire overlaps as non-hard (handled by duplicate check)
                    }

                    return true; // Block overlap for other types (Gate/Atom)
                });

                const isDuplicate = nodes.some(n => {
                    if (newNode.type !== 'wire' || n.type !== 'wire') return false;
                    const isOverlapping = !(newNode.x >= n.x + n.w || 
                        newNode.x + newNode.w <= n.x || 
                        newNode.y >= n.y + n.h || 
                        newNode.y + newNode.h <= n.y);
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
                
                let newRotation = activeTool.rotation || 0;
                let targetX = lastWireGridPos.x;
                let targetY = lastWireGridPos.y;

                // Determine rotation and target position based on direction
                // We always try to connect from the previous position to the current one
                
                // Horizontal move
                if (Math.abs(dx) > Math.abs(dy)) {
                    newRotation = 0; // Top Edge (Horizontal)
                    if (dx > 0) {
                        // Moving Right: Place at Prev (connects Prev -> Curr)
                        targetX = lastWireGridPos.x;
                    } else {
                        // Moving Left: Place at Curr (connects Curr -> Prev)
                        targetX = effectiveGx;
                    }
                    targetY = lastWireGridPos.y; // Keep Y stable
                } 
                // Vertical move
                else {
                    newRotation = 1; // Left Edge (Vertical)
                    if (dy > 0) {
                        // Moving Down: Place at Prev (connects Prev -> Curr)
                        targetY = lastWireGridPos.y;
                    } else {
                        // Moving Up: Place at Curr (connects Curr -> Prev)
                        targetY = effectiveGy;
                    }
                    targetX = lastWireGridPos.x; // Keep X stable
                }

                // If rotation changed, update tool state for ghost/next segment
                if (newRotation !== activeTool.rotation) {
                    onToolSetRotation?.(newRotation);
                }
                
                // Place wire
                const newNode: NodeData = {
                    id: crypto.randomUUID(),
                    type: activeTool.type,
                    subType: activeTool.subType,
                    x: targetX,
                    y: targetY,
                    w: activeTool.w,
                    h: activeTool.h,
                    rotation: newRotation
                };

                // Collision check
                const collision = nodes.some(n => {
                    const isOverlapping = !(newNode.x >= n.x + n.w || 
                        newNode.x + newNode.w <= n.x || 
                        newNode.y >= n.y + n.h || 
                        newNode.y + newNode.h <= n.y);
                    
                    if (!isOverlapping) return false;

                    // Allow wire overlapping if rotations are different (crossing/junctions)
                    if (newNode.type === 'wire' && n.type === 'wire') {
                        return n.rotation === newNode.rotation; // Block only if same rotation (duplicate)
                    }

                    return true; // Block overlap for other types
                });

                const goalRect = { x: -4, y: -4, w: 8, h: 8 };
                const goalCollision = !(newNode.x >= goalRect.x + goalRect.w || 
                                        newNode.x + newNode.w <= goalRect.x || 
                                        newNode.y >= goalRect.y + goalRect.h || 
                                        newNode.y + newNode.h <= goalRect.y);

                if (!collision && !goalCollision) {
                    setNodes(prev => [...prev, newNode]);
                    if (newNode.type === 'wire') {
                         dispatchAction('CONNECT_WIRE', { 
                             x: newNode.x, 
                             y: newNode.y, 
                             w: newNode.w, 
                             h: newNode.h, 
                             rotation: newNode.rotation 
                         });
                    }
                }
                
                // Update last pos to CURRENT effective mouse pos, ready for next step
                setLastWireGridPos({ x: effectiveGx, y: effectiveGy });
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
                if (gx >= n.x && gx < n.x + n.w && gy >= n.y && gy < n.y + n.h) {
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
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                onWheel={handleWheel}
            />
            {hoveredWireValue && (
                 <div style={{
                     position: 'absolute',
                     left: hoveredWireValue.x + 15,
                     top: hoveredWireValue.y + 15,
                     backgroundColor: hoveredWireValue.value === 'Error' ? 'rgba(127, 29, 29, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                     border: hoveredWireValue.value === 'Error' ? '1px solid #ef4444' : '1px solid #334155',
                     padding: '6px 10px',
                     borderRadius: '6px',
                     color: hoveredWireValue.value === 'Error' ? '#ef4444' : '#e2e8f0',
                     fontSize: '12px',
                     fontFamily: hoveredWireValue.value === 'Error' ? 'monospace' : '"Times New Roman", serif',
                     fontStyle: hoveredWireValue.value === 'Error' ? 'normal' : 'italic',
                     fontWeight: hoveredWireValue.value === 'Error' ? 'bold' : 'normal',
                     pointerEvents: 'none',
                     whiteSpace: 'nowrap',
                     zIndex: 100,
                     boxShadow: hoveredWireValue.value === 'Error' 
                         ? '0 0 10px rgba(239, 68, 68, 0.5)' 
                         : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                 }}>
                     {hoveredWireValue.value}
                 </div>
            )}
        </div>
    );
});

InfiniteCanvas.displayName = 'InfiniteCanvas';
export default InfiniteCanvas;
