
// Logic Game V2 - Symbolic Logic Engine

// --- 1. Logic Classes (Immutable Data Structures) ---

/**
 * Abstract base class for all logical formulas.
 */
export abstract class Formula {
    abstract equals(other: any): boolean;
    abstract toString(): string;
}

/**
 * Represents an atomic proposition (e.g., P, Q, R).
 */
export class Atom extends Formula {
    readonly name: string;

    constructor(name: string) {
        super();
        this.name = name;
    }

    equals(other: any): boolean {
        return other instanceof Atom && other.name === this.name;
    }

    toString(): string {
        return this.name;
    }
}

/**
 * Represents a negation (e.g., ¬P).
 */
export class Not extends Formula {
    readonly child: Formula;

    constructor(child: Formula) {
        super();
        this.child = child;
    }

    equals(other: any): boolean {
        return other instanceof Not && this.child.equals(other.child);
    }

    toString(): string {
        return `¬${this.child.toString()}`;
    }
}

/**
 * Represents an implication (e.g., P → Q).
 */
export class Implies extends Formula {
    readonly left: Formula;
    readonly right: Formula;

    constructor(left: Formula, right: Formula) {
        super();
        this.left = left;
        this.right = right;
    }

    equals(other: any): boolean {
        return other instanceof Implies && 
               this.left.equals(other.left) && 
               this.right.equals(other.right);
    }

    toString(): string {
        return `(${this.left.toString()} → ${this.right.toString()})`;
    }
}

/**
 * Represents a provable statement (e.g., ⊢ P).
 * Note: This wraps a Formula but is distinct from a Formula itself in the type system context of the game.
 * It represents that the formula has been proven (or is asserted as proven).
 */
export class Provable {
    readonly formula: Formula;

    constructor(formula: Formula) {
        this.formula = formula;
    }

    equals(other: any): boolean {
        return other instanceof Provable && this.formula.equals(other.formula);
    }

    toString(): string {
        return `⊢ ${this.formula.toString()}`;
    }
}

// --- 2. Logical Rules (Axioms & Inference) ---

/**
 * Axiom 1: A → (B → A)
 */
export function createAxiom1(A: Formula, B: Formula): Provable {
    const formula = new Implies(A, new Implies(B, A));
    return new Provable(formula);
}

/**
 * Axiom 2: (A → (B → C)) → ((A → B) → (A → C))
 */
export function createAxiom2(A: Formula, B: Formula, C: Formula): Provable {
    const term1 = new Implies(A, new Implies(B, C));
    const term2 = new Implies(new Implies(A, B), new Implies(A, C));
    const formula = new Implies(term1, term2);
    return new Provable(formula);
}

/**
 * Axiom 3: (¬A → ¬B) → (B → A)
 */
export function createAxiom3(A: Formula, B: Formula): Provable {
    const term1 = new Implies(new Not(A), new Not(B));
    const term2 = new Implies(B, A);
    const formula = new Implies(term1, term2);
    return new Provable(formula);
}

/**
 * Modus Ponens Rule:
 * Given:
 *   1. Formula A
 *   2. Formula B
 *   3. Proof of A (⊢ A)
 *   4. Proof of A → B (⊢ (A → B))
 * Returns:
 *   Proof of B (⊢ B) if valid, otherwise null.
 */
export function checkModusPonens(A: Formula, B: Formula, provA: Provable, provImp: Provable): Provable | null {
    // 1. Verify provA matches A
    if (!provA.formula.equals(A)) return null;

    // 2. Verify provImp matches A → B
    const targetImp = new Implies(A, B);
    if (!provImp.formula.equals(targetImp)) return null;

    // 3. Return ⊢ B
    return new Provable(B);
}

// --- 3. Parser ---

/**
 * Parses a string representation of a formula.
 * Supported syntax:
 * - Atoms: P, Q, R
 * - Negation: ¬A, ~A, not A, -.A
 * - Implication: A -> B, A → B
 * - Parentheses: (A)
 */
export function parseFormula(str: string): Formula | null {
    // Tokenizer
    const tokens: string[] = [];
    let i = 0;
    while (i < str.length) {
        const c = str[i];
        if (/\s/.test(c)) {
            i++;
            continue;
        }
        if (c === '(' || c === ')') {
            tokens.push(c);
            i++;
        } else if (c === '¬' || c === '~') {
            tokens.push('¬');
            i++;
        } else if (str.startsWith('-.', i)) {
            tokens.push('¬');
            i += 2;
        } else if (str.startsWith('not', i)) {
            tokens.push('¬');
            i += 3;
        } else if (c === '→') {
            tokens.push('→');
            i++;
        } else if (str.startsWith('->', i)) {
            tokens.push('→');
            i += 2;
        } else if (/[A-Z]/.test(c)) {
            let atom = c;
            i++;
            while (i < str.length && /[a-zA-Z0-9]/.test(str[i])) {
                atom += str[i];
                i++;
            }
            tokens.push(atom);
        } else {
            i++; // Skip unknown
        }
    }

    let tokenIdx = 0;
    const peek = () => tokens[tokenIdx];
    const consume = () => tokens[tokenIdx++];

    function parseExpression(): Formula | null {
        let left = parseTerm();
        if (!left) return null;

        while (peek() === '→') {
            consume();
            const right = parseExpression(); // Right associative
            if (!right) return null;
            left = new Implies(left, right);
        }
        return left;
    }

    function parseTerm(): Formula | null {
        const t = peek();
        if (t === '¬') {
            consume();
            const child = parseTerm();
            if (!child) return null;
            return new Not(child);
        } else if (t === '(') {
            consume();
            const expr = parseExpression();
            if (peek() !== ')') return null;
            consume();
            return expr;
        } else if (t && /[A-Z]/.test(t)) {
            consume();
            return new Atom(t);
        }
        return null;
    }

    try {
        const result = parseExpression();
        if (tokenIdx < tokens.length) return null; // Unconsumed tokens
        return result;
    } catch (e) {
        return null;
    }
}

/**
 * Parses a goal string which might be a Formula or a Provable.
 * - If starts with "|-", it expects a Provable.
 * - Otherwise, it expects a Formula.
 */
export function parseGoal(str: string): Formula | Provable | null {
    str = str.trim();
    if (str.startsWith('|-')) {
        const formulaStr = str.substring(2);
        const formula = parseFormula(formulaStr);
        return formula ? new Provable(formula) : null;
    } else {
        return parseFormula(str);
    }
}
