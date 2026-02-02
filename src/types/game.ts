
export type NodeType = 'atom' | 'gate' | 'axiom' | 'mp' | 'wire' | 'premise';

export interface NodeData {
    id: string;
    type: NodeType;
    subType: string; // 'P', 'Q', 'implies', 'not', '1', '2', '3', 'mp', 'premise'
    x: number; // Grid coordinate X
    y: number; // Grid coordinate Y
    w: number; // Width in grid units
    h: number; // Height in grid units
    rotation?: number; // 0: 0deg, 1: 90deg, 2: 180deg, 3: 270deg
    isActive?: boolean; // For atoms: true = glowing/emitting, false = off. Default true.
    locked?: boolean; // If true, cannot be moved or deleted
    customLabel?: string; // For displaying complex formulas on premise nodes
}

export interface Wire {
    id: string;
    startNodeId: string;
    startPortId: string; // 'out' or 'in0', 'in1', etc.
    endNodeId: string;
    endPortId: string;
    type: 'formula' | 'provable';
    path: { x: number, y: number }[]; // Grid coordinates
}

export interface Port {
    id: string; // 'in0', 'in1', 'out'
    x: number; // Relative to node (unrotated) OR absolute? Let's use Relative for getPorts
    y: number;
    type: 'formula' | 'provable';
    isInput: boolean;
}

export interface Tool {
    type: NodeType;
    subType: string;
    w: number;
    h: number;
    rotation?: number;
}
