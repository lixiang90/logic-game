
export type NodeType = 'atom' | 'gate' | 'axiom' | 'mp' | 'wire' | 'premise' | 'theorem' | 'display' | 'bridge';

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
    theoremId?: string; // Stage 2 theorem chip identifier when this premise comes from inventory
    sourceIslandId?: string; // Stage 2 island that awarded this theorem chip
    placementCost?: number; // Coin cost for repeated placements after free uses run out
    theoremName?: string;
    theoremVars?: string[];
    theoremPremises?: string[];
    theoremConclusion?: string;
    theoremIsFormulaOnly?: boolean;
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
    type: 'formula' | 'provable' | 'any';
    isInput: boolean;
}

export interface Tool {
    type: NodeType;
    subType: string;
    w: number;
    h: number;
    rotation?: number;
    customLabel?: string;
    theoremId?: string;
    sourceIslandId?: string;
    placementCost?: number;
    theoremName?: string;
    theoremVars?: string[];
    theoremPremises?: string[];
    theoremConclusion?: string;
    theoremIsFormulaOnly?: boolean;
}
