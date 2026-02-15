'use client';

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tool, NodeData, NodeType, Wire, Port } from '@/types/game';
import { getNodePorts, getAbsolutePortPosition, findWirePath } from '@/lib/gameUtils';
import { solveCircuit } from '@/lib/circuit-solver';
import { parseGoal, parseFormula, Provable } from '@/lib/logic-engine';
import { formulaRenderer } from '@/lib/formula-renderer';
import { useTutorial } from '@/contexts/TutorialContext';
import { SelectMode } from '@/components/Toolbar';

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
}

export interface InfiniteCanvasHandle {
    resetView: () => void;
    getState: () => { nodes: NodeData[], wires: Wire[] };
    loadState: (state: { nodes: NodeData[], wires: Wire[] }) => void;
}

const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(({ activeTool, selectMode = 'pointer', onToolClear, onToolRotate, onToolSetRotation, onToolToggleType, goalFormula, onLevelComplete, initialState }, ref) => {
    const { dispatchAction, currentStep } = useTutorial();
    const canvasRef = useRef<HTMLCanvasElement>(null);
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
    
    // Memoize circuit solution to avoid useEffect/setState cycle
    const { isSolved, activeNodeIds, errorWireIds, errorNodePorts, errorGoalPorts, wireValues } = React.useMemo(() => {
        if (!goalFormula) return {
            isSolved: false,
            activeNodeIds: new Set<string>(),
            errorWireIds: new Set<string>(),
            errorNodePorts: new Map<string, Set<string>>(),
            errorGoalPorts: new Set<string>(),
            wireValues: new Map<string, string>()
        };
        return solveCircuit(nodes, goalFormula);
    }, [nodes, wires, goalFormula]);

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
            
            // Merge missing nodes from initialState (e.g. locked/premise nodes added in updates)
            if (initialState && initialState.nodes.length > 0) {
                 const loadedIds = new Set(state.nodes.map(n => n.id));
                 const missingNodes = initialState.nodes.filter(n => !loadedIds.has(n.id));
                 if (missingNodes.length > 0) {
                     newNodes = [...state.nodes, ...missingNodes];
                 }
            }

            setNodes(newNodes);
            setWires(state.wires);
        }
    }), [nodes, wires, initialState]);

    // Removed wire dragging state as requested

    // Configuration
    const GRID_SIZE = 25; // 1 logical unit = 25px. 2 units = 50px (Visual Grid)
    const BLOCK_STRIDE = 16;
    const SUPER_BLOCK_STRIDE = 128; // 8 blocks
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5.0;
    const LOD_THRESHOLD_SMALL = 0.4;
    const LOD_THRESHOLD_BLOCK = 0.2;

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
        }

        ctx.restore();
    }, [GRID_SIZE, activeNodeIds, errorWireIds, errorNodePorts, flashPhase, wireValues, nodes, scale]);

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

        // --- Goal Block Start ---
        const TARGET_SIZE = 8;
        const targetW = TARGET_SIZE * GRID_SIZE;
        const targetH = TARGET_SIZE * GRID_SIZE;
        const targetX = -targetW / 2;
        const targetY = -targetH / 2;
        const radius = 20;

        ctx.shadowBlur = 30;
        ctx.shadowColor = isSolved ? 'rgba(0, 255, 100, 0.6)' : 'rgba(255, 255, 255, 0.1)';
        drawRoundedRect(ctx, targetX, targetY, targetW, targetH, radius);
        ctx.fillStyle = isSolved ? '#0d2a1a' : '#0d0d12';
        ctx.fill();
        ctx.lineWidth = 3 / scale;
        ctx.strokeStyle = isSolved ? '#00ff66' : '#666';
        ctx.save();
        ctx.setLineDash([5 / scale, 5 / scale]);
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;

        ctx.fillStyle = isSolved ? '#00ff66' : '#888';
        ctx.font = 'bold 32px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("GOAL", 0, -targetH/2 + 40);
        
        if (goalFormula) {
            const parsedGoalFormula = parseGoal(goalFormula);
            if (parsedGoalFormula) {
                const renderSize = Math.min(targetW, targetH) * 0.55;
                formulaRenderer.render(ctx, parsedGoalFormula, 0, 25, renderSize, scale);
            } else {
                ctx.fillStyle = '#fff';
                const fontSize = displayGoalFormula.length > 15 ? 18 : 24;
                ctx.font = `italic ${fontSize}px "Times New Roman", serif`;
                ctx.fillText(displayGoalFormula, 0, 20);
            }
        }

        const portR = 6;
        const drawPort = (cx: number, cy: number) => {
             ctx.beginPath();
             ctx.arc(cx, cy, portR, 0, Math.PI * 2);
             
             let fillStyle = '#444';
             // Check Error
             const lx = Math.round(cx / GRID_SIZE);
             const ly = Math.round(cy / GRID_SIZE);
             const key = `${lx},${ly}`;

             if (errorGoalPorts.has(key)) {
                  if (flashPhase > 0.5) {
                      fillStyle = '#ef4444'; // Red
                  }
             }

             ctx.fillStyle = fillStyle;
             ctx.fill();
             ctx.lineWidth = 2 / scale;
             ctx.strokeStyle = isSolved ? '#00ff66' : '#666';
             ctx.stroke();
        };

        // Draw goal ports - one per 2 grid cells, matching getGoalPorts() logic
        // Ports at -3, -1, 1, 3 relative to center (excluding corners at -4, 4)
        const portOffsets = [-3, -1, 1, 3];
        
        // Top and Bottom edges
        portOffsets.forEach(offset => {
            const px = offset * GRID_SIZE;
            drawPort(px, targetY);
            drawPort(px, targetY + targetH);
        });
        // Left and Right edges
        portOffsets.forEach(offset => {
            const py = offset * GRID_SIZE;
            drawPort(targetX, py);
            drawPort(targetX + targetW, py);
        });
        // --- Goal Block End ---

        // --- Nodes ---
        nodes.forEach(node => {
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

    }, [offset, scale, nodes, activeTool, mouseGridPos, drawNode, goalFormula, displayGoalFormula, isSolved, errorGoalPorts, flashPhase, currentStep, isBoxSelecting, boxSelectStart, boxSelectEnd, selectedNodeIds]);

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
        setSelectedNodeIds(new Set());
        setSelectedWireIds(new Set());
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
                    rotation: activeTool.rotation || 0
                };

                // Collision check
                // 1. Check against Goal (8x8 at center: -4, -4 to 4, 4)
                const goalRect = { x: -4, y: -4, w: 8, h: 8 };
                const goalCollision = !(newNode.x >= goalRect.x + goalRect.w || 
                                        newNode.x + newNode.w <= goalRect.x || 
                                        newNode.y >= goalRect.y + goalRect.h || 
                                        newNode.y + newNode.h <= goalRect.y);

                // 2. Check against existing nodes
                // Separate "Hard" collision (blocking types) from "Duplicate" (same wire)
                const hardCollision = nodes.some(n => {
                    const isOverlapping = !(newNode.x >= n.x + n.w || 
                        newNode.x + newNode.w <= n.x || 
                        newNode.y >= n.y + n.h || 
                        newNode.y + newNode.h <= n.y);
                    
                    if (!isOverlapping) return false;

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
                        setNodes(prev => [...prev, newNode]);
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
