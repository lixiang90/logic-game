import { NodeData, Port, Wire } from '@/types/game';

// Helper to get ports for a node based on its type and subtype
export const getNodePorts = (node: NodeData): Port[] => {
    const ports: Port[] = [];
    const { type, subType, w, h } = node;

    // Output Port (Right side)
    if (type === 'atom') {
        ports.push({
            id: 'out',
            x: w,
            y: h / 2,
            type: 'formula',
            isInput: false
        });
    } else if (type === 'gate') {
        ports.push({
            id: 'out',
            x: w,
            y: h / 2,
            type: 'formula',
            isInput: false
        });
        
        // Inputs
        if (subType === 'implies') {
            // Implies: 2 inputs at 1.0 and 3.0 (h=4)
            ports.push({ id: 'in0', x: 0, y: 1.0, type: 'formula', isInput: true });
            ports.push({ id: 'in1', x: 0, y: 3.0, type: 'formula', isInput: true });
        } else if (subType === 'not') {
            // Not: 1 input at h/2 (h=4 -> 2.0)
            ports.push({ id: 'in0', x: 0, y: h / 2, type: 'formula', isInput: true });
        }
    } else if (type === 'axiom') {
        // Output - Provable
        ports.push({
            id: 'out',
            x: w,
            y: h / 2,
            type: 'provable',
            isInput: false
        });

        // Inputs - Formula
        if (subType === '2') {
            // Axiom 2 (h=6): Inputs at 1.0, 3.0, 5.0
            ports.push({ id: 'in0', x: 0, y: 1.0, type: 'formula', isInput: true });
            ports.push({ id: 'in1', x: 0, y: 3.0, type: 'formula', isInput: true });
            ports.push({ id: 'in2', x: 0, y: 5.0, type: 'formula', isInput: true });
        } else {
            // Axiom 1, 3 (h=4): Inputs at 1.0, 3.0
            ports.push({ id: 'in0', x: 0, y: 1.0, type: 'formula', isInput: true });
            ports.push({ id: 'in1', x: 0, y: 3.0, type: 'formula', isInput: true });
        }
    } else if (type === 'mp') {
        // Output - Provable
        ports.push({
            id: 'out',
            x: w,
            y: h / 2,
            type: 'provable',
            isInput: false
        });

        // Inputs
        // 1.0, 2.0 -> Formula
        // 4.0, 5.0 -> Provable
        // h=6
        ports.push({ id: 'in0', x: 0, y: 1.0, type: 'formula', isInput: true });
        ports.push({ id: 'in1', x: 0, y: 2.0, type: 'formula', isInput: true });
        ports.push({ id: 'in2', x: 0, y: 4.0, type: 'provable', isInput: true });
        ports.push({ id: 'in3', x: 0, y: 5.0, type: 'provable', isInput: true });
    } else if (type === 'premise') {
        // Chip Style: Output ports on all 4 sides
        // Top and Bottom
        for (let x = 1; x < w; x++) {
            // Top
            ports.push({ id: `out_t_${x}`, x: x, y: 0, type: 'provable', isInput: false });
            // Bottom
            ports.push({ id: `out_b_${x}`, x: x, y: h, type: 'provable', isInput: false });
        }
        // Left and Right
        for (let y = 1; y < h; y++) {
            // Left
            ports.push({ id: `out_l_${y}`, x: 0, y: y, type: 'provable', isInput: false });
            // Right
            ports.push({ id: `out_r_${y}`, x: w, y: y, type: 'provable', isInput: false });
        }
    }

    return ports;
};

// Helper to transform port position based on node position and rotation
export const getAbsolutePortPosition = (node: NodeData, port: Port) => {
    const rotation = node.rotation || 0;
    
    // Center of node in world space
    const worldCx = node.x + node.w / 2;
    const worldCy = node.y + node.h / 2;
    
    // Port relative to center (unrotated)
    const relX = port.x - node.w / 2;
    const relY = port.y - node.h / 2;
    
    // Rotate vector (relX, relY)
    let rotX = relX;
    let rotY = relY;
    
    if (rotation === 1) { // 90 deg
        rotX = -relY;
        rotY = relX;
    } else if (rotation === 2) { // 180 deg
        rotX = -relX;
        rotY = -relY;
    } else if (rotation === 3) { // 270 deg
        rotX = relY;
        rotY = -relX;
    }
    
    return {
        x: worldCx + rotX,
        y: worldCy + rotY
    };
};

interface Point {
    x: number;
    y: number;
}

// A* Pathfinding
export const findWirePath = (
    start: Point, 
    end: Point, 
    nodes: NodeData[], 
    wires: Wire[], 
    currentWireType: 'formula' | 'provable'
): Point[] => {
    // Grid step
    const step = 1;
    
    // Heuristic: Manhattan
    const h = (p: Point) => Math.abs(p.x - end.x) + Math.abs(p.y - end.y);
    
    // Key generator
    const k = (p: Point) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    
    // Open set: [f, g, x, y, parentKey]
    // We'll use a simple array and sort for now (optimization possible later)
    const open: { f: number, g: number, x: number, y: number, parent: Point | null }[] = [];
    const closed = new Set<string>();
    const parents = new Map<string, Point>();
    
    open.push({ f: h(start), g: 0, x: start.x, y: start.y, parent: null });
    
    // Collision Helpers
    
    // 1. Check if point is inside a node (with margin)
    const isNodeBlocked = (x: number, y: number) => {
        // Allow start and end (ports are on edges)
        if ((Math.abs(x - start.x) < 0.1 && Math.abs(y - start.y) < 0.1) ||
            (Math.abs(x - end.x) < 0.1 && Math.abs(y - end.y) < 0.1)) {
            return false;
        }
        
        const margin = 0.1; 
        for (const node of nodes) {
            if (x > node.x + margin && x < node.x + node.w - margin &&
                y > node.y + margin && y < node.y + node.h - margin) {
                return true;
            }
        }
        return false;
    };

    // 2. Check if point is on a wire of specific type (prevents crossing/overlap)
    const isWirePointBlocked = (x: number, y: number, type: 'formula' | 'provable') => {
        // Allow start and end
        if ((Math.abs(x - start.x) < 0.1 && Math.abs(y - start.y) < 0.1) ||
            (Math.abs(x - end.x) < 0.1 && Math.abs(y - end.y) < 0.1)) {
            return false;
        }

        for (const w of wires) {
            if (w.type === type) {
                for (let i = 0; i < w.path.length - 1; i++) {
                    const p1 = w.path[i];
                    const p2 = w.path[i+1];
                    // Check if (x,y) is on segment p1-p2
                    // Vertical segment
                    if (Math.abs(p1.x - p2.x) < 0.1 && Math.abs(p1.x - x) < 0.1) {
                        const minY = Math.min(p1.y, p2.y);
                        const maxY = Math.max(p1.y, p2.y);
                        if (y >= minY - 0.1 && y <= maxY + 0.1) return true;
                    }
                    // Horizontal segment
                    if (Math.abs(p1.y - p2.y) < 0.1 && Math.abs(p1.y - y) < 0.1) {
                        const minX = Math.min(p1.x, p2.x);
                        const maxX = Math.max(p1.x, p2.x);
                        if (x >= minX - 0.1 && x <= maxX + 0.1) return true;
                    }
                }
            }
        }
        return false;
    };

    // 3. Check if edge (from->to) overlaps with ANY wire segment (prevents overlap)
    const isEdgeBlocked = (from: Point, to: Point) => {
        // We assume from and to are adjacent on grid (dist = step)
        // Check if this segment is part of any existing wire segment
        
        for (const w of wires) {
            for (let i = 0; i < w.path.length - 1; i++) {
                const p1 = w.path[i];
                const p2 = w.path[i+1];
                
                // Check if from->to is collinear and overlapping with p1->p2
                
                // Vertical Wire Segment
                if (Math.abs(p1.x - p2.x) < 0.1) {
                    // Current step must be vertical
                    if (Math.abs(from.x - to.x) < 0.1 && Math.abs(from.x - p1.x) < 0.1) {
                        // Check Y overlap
                        const wMinY = Math.min(p1.y, p2.y);
                        const wMaxY = Math.max(p1.y, p2.y);
                        const sMinY = Math.min(from.y, to.y);
                        const sMaxY = Math.max(from.y, to.y);
                        
                        // If segment is within wire segment
                        // Strict inequality to allow touching at endpoints? 
                        // Overlap means they share a non-zero length.
                        // Since we move in discrete steps, if the step is INSIDE the wire segment, it's blocked.
                        if (sMinY >= wMinY - 0.01 && sMaxY <= wMaxY + 0.01) {
                            return true;
                        }
                    }
                }
                
                // Horizontal Wire Segment
                if (Math.abs(p1.y - p2.y) < 0.1) {
                    // Current step must be horizontal
                    if (Math.abs(from.y - to.y) < 0.1 && Math.abs(from.y - p1.y) < 0.1) {
                        // Check X overlap
                        const wMinX = Math.min(p1.x, p2.x);
                        const wMaxX = Math.max(p1.x, p2.x);
                        const sMinX = Math.min(from.x, to.x);
                        const sMaxX = Math.max(from.x, to.x);
                        
                        if (sMinX >= wMinX - 0.01 && sMaxX <= wMaxX + 0.01) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };
    
    // Limit iterations to prevent freeze
    let ops = 0;
    const MAX_OPS = 3000;
    
    while (open.length > 0 && ops < MAX_OPS) {
        ops++;
        // Pop lowest f
        open.sort((a, b) => a.f - b.f);
        const current = open.shift()!;
        
        const cKey = k(current);
        if (closed.has(cKey)) continue;
        closed.add(cKey);
        
        if (current.parent) {
            parents.set(cKey, current.parent);
        }
        
        // Check goal (within small distance)
        if (Math.abs(current.x - end.x) < 0.1 && Math.abs(current.y - end.y) < 0.1) {
            // Reconstruct path
            const path: Point[] = [];
            let curr: Point | undefined = { x: current.x, y: current.y };
            while (curr) {
                path.push(curr);
                curr = parents.get(k(curr));
            }
            return path.reverse();
        }
        
        // Neighbors (Up, Down, Left, Right)
        const neighbors = [
            { x: current.x + step, y: current.y },
            { x: current.x - step, y: current.y },
            { x: current.x, y: current.y + step },
            { x: current.x, y: current.y - step }
        ];
        
        for (const n of neighbors) {
            if (closed.has(k(n))) continue;
            
            // 1. Node Check
            if (isNodeBlocked(n.x, n.y)) continue;
            
            // 2. Same Type Check (Prevent Crossing/Overlap)
            // We strictly forbid stepping onto a point occupied by a same-type wire.
            if (isWirePointBlocked(n.x, n.y, currentWireType)) continue;
            
            // 3. Edge Check (Prevent Overlap with ANY wire)
            // Even if the point is free (e.g. crossing a different type wire), 
            // we cannot walk ALONG it.
            if (isEdgeBlocked(current, n)) continue;
            
            const gScore = current.g + step;
            const existing = open.find(o => k(o) === k(n));
            
            if (!existing || gScore < existing.g) {
                if (existing) {
                    existing.g = gScore;
                    existing.f = gScore + h(n);
                    existing.parent = { x: current.x, y: current.y };
                } else {
                    open.push({
                        f: gScore + h(n),
                        g: gScore,
                        x: n.x,
                        y: n.y,
                        parent: { x: current.x, y: current.y }
                    });
                }
            }
        }
    }
    
    // If no path found or max ops reached, return empty array (failure)
    // This enforces the "no crossing/overlap" rule strictly.
    return [];
};
