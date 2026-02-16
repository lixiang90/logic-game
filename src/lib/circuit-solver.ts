
import { NodeData, Port } from '../types/game';
import { getNodePorts, getAbsolutePortPosition } from './gameUtils';
import { Atom, Formula, Implies, Not, Provable, createAxiom1, createAxiom2, createAxiom3, checkModusPonens, parseGoal, parseFormula } from './logic-engine';

// --- Types ---

type CircuitState = Map<string, Formula | Provable | null>;

// --- Helpers ---

// Helper: Get wire segment (line) for connection
// Wires are visually lines on the edges of the block.
const getWireSegment = (node: NodeData) => {
    const { x, y, w, h, rotation = 0 } = node;
    // Rot 0: Top Edge (y)
    // Rot 1: Left Edge (x)
    // Rot 2: Bottom Edge (y+h)
    // Rot 3: Right Edge (x+w)
    
    if (rotation === 0) return { vertical: false, c: y, min: x, max: x + w };
    if (rotation === 1) return { vertical: true, c: x, min: y, max: y + h };
    if (rotation === 2) return { vertical: false, c: y + h, min: x, max: x + w };
    if (rotation === 3) return { vertical: true, c: x + w, min: y, max: y + h };
    return { vertical: false, c: y, min: x, max: x + w };
};

// --- Main Solver Function ---

export function solveCircuit(nodes: NodeData[], goalFormulaStr: string): { 
    isSolved: boolean, 
    activeNodeIds: Set<string>,
    errorWireIds: Set<string>,
    errorNodePorts: Map<string, Set<string>>,
    errorGoalPorts: Set<string>,
    wireValues: Map<string, string>
} {
    // console.log("Solving circuit for goal:", goalFormulaStr);
    
    // 1. Parse Goal Formula
    const goalObject = parseGoal(goalFormulaStr);
    if (!goalObject) {
        console.error("Failed to parse goal formula:", goalFormulaStr);
        return { 
            isSolved: false, 
            activeNodeIds: new Set(), 
            errorWireIds: new Set(), 
            errorNodePorts: new Map(),
            errorGoalPorts: new Set(),
            wireValues: new Map()
        };
    }
    // console.log("Parsed goal object:", goalObject.toString());

    // 2. Build Connectivity Graph (Nets)
    const nets: NodeData[][] = []; // NetID -> Array of Wire Nodes
    
    // Filter wire nodes
    const wireNodes = nodes.filter(n => n.type === 'wire');
    
    // Union-Find for wires
    const parent = new Array(wireNodes.length).fill(0).map((_, i) => i);
    const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
    const union = (i: number, j: number) => {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) parent[rootI] = rootJ;
    };

    // Helper: Check if two wires touch/overlap
    const wiresTouch = (w1: NodeData, w2: NodeData) => {
        // Strict Type Check: Wires of different types cannot connect
        if (w1.subType !== w2.subType) return false;

        const s1 = getWireSegment(w1);
        const s2 = getWireSegment(w2);
        
        const EPS = 0.1;

        // If parallel
        if (s1.vertical === s2.vertical) {
            // Must be collinear (same c)
            if (Math.abs(s1.c - s2.c) > EPS) return false;
            // Must overlap in range
            return Math.max(s1.min, s2.min) <= Math.min(s1.max, s2.max) + EPS;
        } 
        // Perpendicular
        else {
            // Intersection point (s1.c, s2.c) or (s2.c, s1.c)
            // If s1 is vert, x=s1.c. s2 is horz, y=s2.c. Point (s1.c, s2.c)
            // Check if point is in both ranges
            const x = s1.vertical ? s1.c : s2.c;
            const y = s1.vertical ? s2.c : s1.c;
            
            const inS1 = s1.vertical ? (y >= s1.min - EPS && y <= s1.max + EPS) : (x >= s1.min - EPS && x <= s1.max + EPS);
            const inS2 = s2.vertical ? (y >= s2.min - EPS && y <= s2.max + EPS) : (x >= s2.min - EPS && x <= s2.max + EPS);
            
            return inS1 && inS2;
        }
    };

    // Connect touching wires (O(N^2))
    for (let i = 0; i < wireNodes.length; i++) {
        for (let j = i + 1; j < wireNodes.length; j++) {
            if (wiresTouch(wireNodes[i], wireNodes[j])) {
                union(i, j);
            }
        }
    }

    // Group wires into Nets
    const netMap = new Map<number, number>(); // RootID -> NetIndex
    wireNodes.forEach((_, i) => {
        const root = find(i);
        if (!netMap.has(root)) {
            netMap.set(root, nets.length);
            nets.push([]);
        }
        const netIdx = netMap.get(root)!;
        nets[netIdx].push(wireNodes[i]);
    });

    // Map each wire node to its Net Index
    const nodeToNetIdx = new Map<string, number>();
    wireNodes.forEach((n, i) => {
        const root = find(i);
        nodeToNetIdx.set(n.id, netMap.get(root)!);
    });

    // 3. Simulation Loop
    const state: CircuitState = new Map();
    // NetState: NetIndex -> Value
    const netState = new Array<Formula | Provable | null>(nets.length).fill(null);
    const conflictNetIndices = new Set<number>(); // Track short-circuited nets

    // Bridge channel states: bridge.id -> { horizontalFormula, horizontalProvable, verticalFormula, verticalProvable }
    const bridgeChannels = new Map<string, { 
        hf: Formula | null, 
        hp: Provable | null, 
        vf: Formula | null, 
        vp: Provable | null 
    }>();

    let changed = true;
    let iterations = 0;
    const MAX_ITERATIONS = 50;

    // Helper to get port absolute position
    const getPortAbsPos = (node: NodeData, portId: string) => {
        const ports = getNodePorts(node);
        const port = ports.find(p => p.id === portId);
        if (!port) return null;
        return getAbsolutePortPosition(node, port);
    };

    // Helper to find net touching a bridge port
    const findNetAtPort = (node: NodeData, portId: string, wireType?: string): number | null => {
        const absPos = getPortAbsPos(node, portId);
        if (!absPos) return null;
        const idx = findTouchingWire(absPos, wireNodes, wireType);
        if (idx === -1) return null;
        return nodeToNetIdx.get(wireNodes[idx].id) ?? null;
    };

    while (changed && iterations < MAX_ITERATIONS) {
        changed = false;
        iterations++;

        // Step 1: Process source nodes (Atom, Premise) FIRST so bridges can read from them
        for (const node of nodes) {
            if (node.type === 'wire' || node.type === 'bridge') continue;
            if (node.type !== 'atom' && node.type !== 'premise') continue;

            const oldVal = state.get(node.id);
            const newVal = computeNodeOutput(node, nodes, state, netState, nodeToNetIdx, bridgeChannels);

            if (!isEqual(oldVal, newVal)) {
                state.set(node.id, newVal);
                changed = true;
                
                // Push output to connected wires
                const outputPorts = getNodePorts(node).filter(p => !p.isInput);
                for (const port of outputPorts) {
                    const absPos = getAbsolutePortPosition(node, port);
                    const touchingWireIdx = findTouchingWire(absPos, wireNodes, port.type);
                    if (touchingWireIdx !== -1) {
                        const wire = wireNodes[touchingWireIdx];
                        if (wire.subType === port.type || port.type === 'any') {
                            const netIdx = nodeToNetIdx.get(wire.id);
                            if (netIdx !== undefined) {
                                if (netState[netIdx] === null) {
                                    netState[netIdx] = newVal;
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Step 2: Process bridges so MP and gates can read from them
        for (const node of nodes) {
            if (node.type !== 'bridge') continue;

            // Initialize bridge channels with 4 separate tracks
            if (!bridgeChannels.has(node.id)) {
                bridgeChannels.set(node.id, { hf: null, hp: null, vf: null, vp: null });
            }
            const channels = bridgeChannels.get(node.id)!;

            // Helper to get value and type at a bridge port - reads from node state directly
            const getPortConnection = (portId: string): { value: Formula | Provable | null; type: 'formula' | 'provable' | null; source: 'wire' | 'node' | 'bridge' | null; netIdx?: number } => {
                const portPos = getPortAbsPos(node, portId);
                if (!portPos) return { value: null, type: null, source: null };

                const EPS = 0.1;

                // 1. Check for touching wire
                for (let i = 0; i < wireNodes.length; i++) {
                    const wire = wireNodes[i];
                    const s = getWireSegment(wire);
                    let touch = false;
                    if (s.vertical) {
                        touch = Math.abs(portPos.x - s.c) < EPS && portPos.y >= s.min - EPS && portPos.y <= s.max + EPS;
                    } else {
                        touch = Math.abs(portPos.y - s.c) < EPS && portPos.x >= s.min - EPS && portPos.x <= s.max + EPS;
                    }
                    if (touch) {
                        const netIdx = nodeToNetIdx.get(wire.id);
                        if (netIdx !== undefined) {
                            return { 
                                value: netState[netIdx], 
                                type: wire.subType === 'formula' ? 'formula' : 'provable',
                                source: 'wire',
                                netIdx: netIdx
                            };
                        }
                    }
                }

                // 2. Check for direct node output connection - READ FROM STATE
                for (const otherNode of nodes) {
                    if (otherNode.id === node.id || otherNode.type === 'wire') continue;

                    // For bridges, read from their channels
                    if (otherNode.type === 'bridge') {
                        const otherPorts = getNodePorts(otherNode);
                        for (const otherPort of otherPorts) {
                            const otherPos = getAbsolutePortPosition(otherNode, otherPort);
                            if (Math.abs(otherPos.x - portPos.x) < EPS && Math.abs(otherPos.y - portPos.y) < EPS) {
                                const otherChannels = bridgeChannels.get(otherNode.id);
                                if (otherChannels) {
                                    const isHorizontal = otherPort.id === 'left' || otherPort.id === 'right';
                                    if (isHorizontal) {
                                        if (otherChannels.hf !== null) return { value: otherChannels.hf, type: 'formula', source: 'bridge' };
                                        if (otherChannels.hp !== null) return { value: otherChannels.hp, type: 'provable', source: 'bridge' };
                                    } else {
                                        if (otherChannels.vf !== null) return { value: otherChannels.vf, type: 'formula', source: 'bridge' };
                                        if (otherChannels.vp !== null) return { value: otherChannels.vp, type: 'provable', source: 'bridge' };
                                    }
                                }
                            }
                        }
                    } else {
                        // For regular nodes, check if output port touches our port
                        const otherPorts = getNodePorts(otherNode).filter(p => !p.isInput);
                        for (const otherPort of otherPorts) {
                            const otherPos = getAbsolutePortPosition(otherNode, otherPort);
                            if (Math.abs(otherPos.x - portPos.x) < EPS && Math.abs(otherPos.y - portPos.y) < EPS) {
                                const otherVal = state.get(otherNode.id);
                                if (otherVal !== null && otherVal !== undefined) {
                                    const isFormula = otherVal instanceof Formula && !(otherVal instanceof Provable);
                                    return { 
                                        value: otherVal, 
                                        type: isFormula ? 'formula' : 'provable',
                                        source: 'node'
                                    };
                                }
                            }
                        }
                    }
                }

                return { value: null, type: null, source: null };
            };

            // Get connections at each port
            const leftConn = getPortConnection('left');
            const rightConn = getPortConnection('right');
            const topConn = getPortConnection('top');
            const bottomConn = getPortConnection('bottom');

            // Process channels
            const processChannel = (
                conn1: ReturnType<typeof getPortConnection>, 
                conn2: ReturnType<typeof getPortConnection>,
                channelKey: 'hf' | 'hp' | 'vf' | 'vp'
            ) => {
                const type1 = conn1.type;
                const type2 = conn2.type;
                
                if (!type1 && !type2) return;
                if (type1 && type2 && type1 !== type2) return;
                
                const effectiveType = type1 || type2;
                if (!effectiveType) return;

                const values: (Formula | Provable)[] = [];
                if (conn1.value !== null) values.push(conn1.value);
                if (conn2.value !== null) values.push(conn2.value);

                if (values.length > 0) {
                    const newVal = values[0];
                    const oldVal = channels[channelKey];
                    
                    if (!isEqual(oldVal, newVal)) {
                        (channels as Record<typeof channelKey, Formula | Provable | null>)[channelKey] = newVal;
                        changed = true;
                    }

                    // Propagate to connected wires
                    for (const conn of [conn1, conn2]) {
                        if (conn.source === 'wire' && conn.netIdx !== undefined) {
                            if (netState[conn.netIdx] === null) {
                                netState[conn.netIdx] = newVal;
                                changed = true;
                            }
                        }
                    }
                }
            };

            // Process channels
            if ((leftConn.type === 'formula' || rightConn.type === 'formula') && 
                (!leftConn.type || !rightConn.type || leftConn.type === rightConn.type)) {
                processChannel(leftConn, rightConn, 'hf');
            }
            if ((leftConn.type === 'provable' || rightConn.type === 'provable') && 
                (!leftConn.type || !rightConn.type || leftConn.type === rightConn.type)) {
                processChannel(leftConn, rightConn, 'hp');
            }
            if ((topConn.type === 'formula' || bottomConn.type === 'formula') && 
                (!topConn.type || !bottomConn.type || topConn.type === bottomConn.type)) {
                processChannel(topConn, bottomConn, 'vf');
            }
            if ((topConn.type === 'provable' || bottomConn.type === 'provable') && 
                (!topConn.type || !bottomConn.type || topConn.type === bottomConn.type)) {
                processChannel(topConn, bottomConn, 'vp');
            }

            // Mark bridge as active
            if (channels.hf !== null || channels.hp !== null || channels.vf !== null || channels.vp !== null) {
                state.set(node.id, channels.hf || channels.hp || channels.vf || channels.vp);
            }
        }

        // Update Nodes (excluding bridges) - AFTER bridges so they can read bridge values
        // Step 3: Process remaining nodes (gates, axioms, mp) - AFTER bridges
        for (const node of nodes) {
            if (node.type === 'wire' || node.type === 'bridge') continue;
            if (node.type === 'atom' || node.type === 'premise') continue; // Already processed

            const oldVal = state.get(node.id);
            const newVal = computeNodeOutput(node, nodes, state, netState, nodeToNetIdx, bridgeChannels);

            if (!isEqual(oldVal, newVal)) {
                state.set(node.id, newVal);
                changed = true;
                
                // If this node has output, push to connected Nets
                const outputPorts = getNodePorts(node).filter(p => !p.isInput);
                for (const port of outputPorts) {
                    const absPos = getAbsolutePortPosition(node, port);
                    // Check if this port touches any wire
                    const touchingWireIdx = findTouchingWire(absPos, wireNodes, port.type);
                    if (touchingWireIdx !== -1) {
                        const wire = wireNodes[touchingWireIdx];
                        // Strict Type Check: Wire must match Port type
                        if (wire.subType === port.type || port.type === 'any') {
                            const netIdx = nodeToNetIdx.get(wire.id);
                            if (netIdx !== undefined) {
                                const oldNetVal = netState[netIdx];
                                
                                // Conflict Detection (Short Circuit)
                                if (oldNetVal !== null && !isEqual(oldNetVal, newVal)) {
                                    conflictNetIndices.add(netIdx);
                                } else if (!isEqual(oldNetVal, newVal)) {
                                    netState[netIdx] = newVal;
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. Detect Type Mismatches (Errors)
    const errorWireIds = new Set<string>();
    
    // Add conflict nets to errors
    conflictNetIndices.forEach(netIdx => {
        nets[netIdx].forEach(w => errorWireIds.add(w.id));
    });
    const errorNodePorts = new Map<string, Set<string>>();
    const errorGoalPorts = new Set<string>();

    // Helper to add error port
    const addErrorPort = (nodeId: string, portId: string) => {
        if (!errorNodePorts.has(nodeId)) {
            errorNodePorts.set(nodeId, new Set());
        }
        errorNodePorts.get(nodeId)!.add(portId);
    };

    // Helper to mark wire and its net as error
    const markWireError = (wire: NodeData) => {
        const netIdx = nodeToNetIdx.get(wire.id);
        if (netIdx !== undefined) {
            // Mark all wires in this net
            nets[netIdx].forEach(w => errorWireIds.add(w.id));
        } else {
            // Just this wire (isolated)
            errorWireIds.add(wire.id);
        }
    };

    // Check Node Ports
    nodes.forEach(node => {
        if (node.type === 'wire') return;
        const ports = getNodePorts(node);
        ports.forEach(port => {
            const absPos = getAbsolutePortPosition(node, port);
            const touchingIndices = findAllTouchingWires(absPos, wireNodes);
            touchingIndices.forEach(idx => {
                const wire = wireNodes[idx];
                // 'any' type accepts both formula and provable
                if (port.type !== 'any' && wire.subType !== port.type) {
                    addErrorPort(node.id, port.id);
                    markWireError(wire);
                }
            });
        });
    });

    // Check Display Nodes: All connected wires must have the same signal
    nodes.forEach(node => {
        if (node.type !== 'display') return;
        const ports = getNodePorts(node);
        const connectedValues: string[] = [];
        const connectedWires: NodeData[] = [];
        let hasConflictWire = false;
        
        ports.forEach(port => {
            const absPos = getAbsolutePortPosition(node, port);
            const touchingIndices = findAllTouchingWires(absPos, wireNodes);
            touchingIndices.forEach(idx => {
                const wire = wireNodes[idx];
                connectedWires.push(wire);
                
                // Check if this wire is in a conflict net
                const netIdx = nodeToNetIdx.get(wire.id);
                if (netIdx !== undefined && conflictNetIndices.has(netIdx)) {
                    hasConflictWire = true;
                }
            });
        });
        
        // Get values of connected wires
        connectedWires.forEach(wire => {
            const netIdx = nodeToNetIdx.get(wire.id);
            if (netIdx !== undefined) {
                const val = netState[netIdx];
                if (val !== null) {
                    connectedValues.push(val.toString());
                }
            }
        });
        
        // Check for conflict wire or different values
        let hasError = hasConflictWire;
        
        // Check if all values are the same
        if (connectedValues.length > 1) {
            const firstValue = connectedValues[0];
            const hasConflict = connectedValues.some(v => v !== firstValue);
            if (hasConflict) {
                hasError = true;
            }
        }
        
        if (hasError) {
            // Mark all connected wires as errors
            connectedWires.forEach(wire => markWireError(wire));
            // Mark all ports as errors
            ports.forEach(port => addErrorPort(node.id, port.id));
        }
    });

    // Check Goal Ports
    const goalPorts = getGoalPorts();
    const expectedGoalType = (goalObject instanceof Provable) ? 'provable' : 'formula';
    
    goalPorts.forEach(gp => {
        const touchingIndices = findAllTouchingWires(gp, wireNodes);
        touchingIndices.forEach(idx => {
            const wire = wireNodes[idx];
            if (wire.subType !== expectedGoalType) {
                // Mark goal port error (store coordinate key "x,y")
                errorGoalPorts.add(`${gp.x},${gp.y}`);
                markWireError(wire);
            }
        });
    });

    // 5. Check Goal
    // Collect active nodes (Nodes + Wires)
    const activeNodeIds = new Set<string>();
    for (const [id, val] of state.entries()) {
        if (val !== null) {
            activeNodeIds.add(id);
        }
    }
    // Collect active wires
    netState.forEach((val, netIdx) => {
        if (val !== null) {
            nets[netIdx].forEach(w => activeNodeIds.add(w.id));
        }
    });

    // Collect wire values for tooltips
    const wireValues = new Map<string, string>();
    netState.forEach((val, netIdx) => {
        const valStr = conflictNetIndices.has(netIdx) ? 'Error' : (val !== null ? val.toString() : '');
        nets[netIdx].forEach(w => wireValues.set(w.id, valStr));
    });

    // Goal Block at [-4, -4] w=8 h=8
    // const goalPorts = getGoalPorts(); // Already computed
    for (const gp of goalPorts) {
        // Strict Type Check: Goal port expects same type as goal object
        const expectedType = expectedGoalType;
        
        // 1. Check Wire Connection
        const touchingWireIdx = findTouchingWire(gp, wireNodes, expectedType);
        if (touchingWireIdx !== -1) {
            const wire = wireNodes[touchingWireIdx];
            const netIdx = nodeToNetIdx.get(wire.id);
            if (netIdx !== undefined) {
                const val = netState[netIdx];
                if (checkGoalValue(val, goalObject)) {
                    return { isSolved: true, activeNodeIds, errorWireIds, errorNodePorts, errorGoalPorts, wireValues };
                }
            }
        }

        // 2. Check Direct Node Connection
        const EPS = 0.1;
        for (const node of nodes) {
            if (node.type === 'wire') continue;

            const outputPorts = getNodePorts(node).filter(p => !p.isInput);
            for (const port of outputPorts) {
                // Check Type
                if (port.type !== expectedType) continue;

                const absPos = getAbsolutePortPosition(node, port);
                if (Math.abs(absPos.x - gp.x) < EPS && Math.abs(absPos.y - gp.y) < EPS) {
                    const val = state.get(node.id);
                    if (checkGoalValue(val, goalObject)) {
                        return { isSolved: true, activeNodeIds, errorWireIds, errorNodePorts, errorGoalPorts, wireValues };
                    }
                }
            }
        }
    }

    return { isSolved: false, activeNodeIds, errorWireIds, errorNodePorts, errorGoalPorts, wireValues };
}

function checkGoalValue(val: Formula | Provable | null | undefined, goalObject: Formula | Provable): boolean {
    if (!val) return false;
    
    if (goalObject instanceof Provable) {
        if (val instanceof Provable && val.equals(goalObject)) {
            console.log("Goal Reached (Provable)!");
            return true;
        }
    } else if (goalObject instanceof Formula) {
        if (val instanceof Formula && val.equals(goalObject)) {
            console.log("Goal Reached (Formula)!");
            return true;
        }
    }
    return false;
}

// --- Helpers ---

function computeNodeOutput(
    node: NodeData, 
    allNodes: NodeData[], 
    state: CircuitState, 
    netState: (Formula | Provable | null)[],
    nodeToNetIdx: Map<string, number>,
    bridgeChannels: Map<string, { hf: Formula | null; hp: Provable | null; vf: Formula | null; vp: Provable | null }>
): Formula | Provable | null {

    // Helper to get input value
    const getInput = (portId: string): Formula | Provable | null => {
        const ports = getNodePorts(node);
        const port = ports.find(p => p.id === portId);
        if (!port) return null;

        const absPos = getAbsolutePortPosition(node, port);
        
        // 1. Check connected Wires
        const wires = allNodes.filter(n => n.type === 'wire');
        const wireIdx = findTouchingWire(absPos, wires, port.type);
        if (wireIdx !== -1) {
            const wire = wires[wireIdx];
            // Strict Type Check: Wire must match Port type
            if (wire.subType === port.type) {
                const netIdx = nodeToNetIdx.get(wire.id);
                if (netIdx !== undefined) {
                    if (netState[netIdx]) return netState[netIdx];
                }
            }
        }

        // 2. Check direct connection (Node output overlapping Node input)
        const EPS = 0.1;
        for (const otherNode of allNodes) {
            if (otherNode.id === node.id || otherNode.type === 'wire') continue;
            
            if (otherNode.type === 'bridge') {
                // Check if connected to a bridge port
                const bridgePorts = getNodePorts(otherNode);
                for (const bridgePort of bridgePorts) {
                    const bridgePos = getAbsolutePortPosition(otherNode, bridgePort);
                    if (Math.abs(bridgePos.x - absPos.x) < EPS && Math.abs(bridgePos.y - absPos.y) < EPS) {
                        // Get value from bridge channel
                        const otherChannels = bridgeChannels.get(otherNode.id);
                        if (otherChannels) {
                            // Determine which channel based on port direction
                            const isHorizontal = bridgePort.id === 'left' || bridgePort.id === 'right';
                            let val: Formula | Provable | null = null;
                            
                            if (isHorizontal) {
                                if (port.type === 'formula' || port.type === 'any') {
                                    val = otherChannels.hf;
                                }
                                if (!val && (port.type === 'provable' || port.type === 'any')) {
                                    val = otherChannels.hp;
                                }
                            } else {
                                if (port.type === 'formula' || port.type === 'any') {
                                    val = otherChannels.vf;
                                }
                                if (!val && (port.type === 'provable' || port.type === 'any')) {
                                    val = otherChannels.vp;
                                }
                            }
                            
                            if (val) return val;
                        }
                    }
                }
                continue; // Skip the regular port filtering for bridges
            } else {
                // Get output ports of otherNode
                const otherPorts = getNodePorts(otherNode).filter(p => !p.isInput);
                for (const otherPort of otherPorts) {
                    const otherAbsPos = getAbsolutePortPosition(otherNode, otherPort);
                    if (Math.abs(otherAbsPos.x - absPos.x) < EPS && Math.abs(otherAbsPos.y - absPos.y) < EPS) {
                        const val = state.get(otherNode.id);
                        if (val) return val;
                    }
                }
            }
        }

        return null;
    };

    if (node.type === 'atom') {
        // Check if atom is active (glowing)
        if (node.isActive === false) return null;
        return new Atom(node.subType);
    }

    if (node.type === 'gate') {
        if (node.subType === 'not') {
            const in0 = getInput('in0');
            if (in0 instanceof Formula) return new Not(in0);
        } else if (node.subType === 'implies') {
            const in0 = getInput('in0');
            const in1 = getInput('in1');
            if (in0 instanceof Formula && in1 instanceof Formula) {
                 return new Implies(in0, in1);
            }
        }
    }

    if (node.type === 'axiom') {
        const in0 = getInput('in0');
        const in1 = getInput('in1');
        
        if (node.subType === '1' && in0 instanceof Formula && in1 instanceof Formula) {
            return createAxiom1(in0, in1);
        }
        
        if (node.subType === '2') {
            const in2 = getInput('in2');
            if (in0 instanceof Formula && in1 instanceof Formula && in2 instanceof Formula) {
                return createAxiom2(in0, in1, in2);
            }
        }

        if (node.subType === '3' && in0 instanceof Formula && in1 instanceof Formula) {
            return createAxiom3(in0, in1);
        }
    }

    if (node.type === 'mp') {
        const in0 = getInput('in0'); // Formula A
        const in1 = getInput('in1'); // Formula B
        const in2 = getInput('in2'); // Provable A
        const in3 = getInput('in3'); // Provable A->B

        if (in0 instanceof Formula && in1 instanceof Formula && 
            in2 instanceof Provable && in3 instanceof Provable) {
            return checkModusPonens(in0, in1, in2, in3);
        }
    }

    if (node.type === 'premise') {
        const formulaStr = node.subType;
        const formula = parseFormula(formulaStr);
        if (formula) {
            return new Provable(formula);
        }
    }

    // Bridge nodes are handled separately in the main solver loop
    // They don't use computeNodeOutput because they have multiple independent channels

    return null;
}

function findTouchingWire(pos: {x: number, y: number}, wires: NodeData[], requiredType?: string): number {
    // Check if pos is close to any wire segment
    const EPS = 0.1;
    return wires.findIndex(w => {
        if (requiredType && w.subType !== requiredType) return false;

        const s = getWireSegment(w);
        if (s.vertical) {
            // Point (x,y) near Line x=c, y in [min, max]
            return Math.abs(pos.x - s.c) < EPS && pos.y >= s.min - EPS && pos.y <= s.max + EPS;
        } else {
            // Point (x,y) near Line y=c, x in [min, max]
            return Math.abs(pos.y - s.c) < EPS && pos.x >= s.min - EPS && pos.x <= s.max + EPS;
        }
    });
}

function findAllTouchingWires(pos: {x: number, y: number}, wires: NodeData[]): number[] {
    const EPS = 0.1;
    const indices: number[] = [];
    wires.forEach((w, i) => {
        const s = getWireSegment(w);
        let touch = false;
        if (s.vertical) {
            touch = Math.abs(pos.x - s.c) < EPS && pos.y >= s.min - EPS && pos.y <= s.max + EPS;
        } else {
            touch = Math.abs(pos.y - s.c) < EPS && pos.x >= s.min - EPS && pos.x <= s.max + EPS;
        }
        if (touch) indices.push(i);
    });
    return indices;
}

function getGoalPorts() {
    // Goal Block: [-4, -4] w=8 h=8
    const ports: {x: number, y: number}[] = [];
    const min = -4, max = 4;
    // Ports at every 2 grid cells, excluding corners (-4, 4)
    // -3, -1, 1, 3
    const steps = [-3, -1, 1, 3];
    
    // Top (y=-4) and Bottom (y=4)
    steps.forEach(x => {
        ports.push({ x, y: min });
        ports.push({ x, y: max });
    });
    // Left (x=-4) and Right (x=4)
    steps.forEach(y => {
        ports.push({ x: min, y });
        ports.push({ x: max, y });
    });
    return ports;
}

function isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if ((a instanceof Formula || a instanceof Provable)) {
        return a.equals(b);
    }
    return false;
}

// --- Geometry Helpers ---
// getNodePorts and getAbsolutePortPosition are now imported from ./gameUtils

