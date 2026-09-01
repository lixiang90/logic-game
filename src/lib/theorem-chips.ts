import type { TheoremChipDefinition } from '../types/stage2';

export const normalizeTheoremFormula = (formula: string) =>
    formula.replace(/^\s*(\|-|⊢)\s*/, '').trim();

export const extractTheoremVariables = (parts: string[]) => {
    const variables = new Set<string>();
    parts.forEach((part) => {
        const matches = normalizeTheoremFormula(part).match(/[A-Z][A-Za-z0-9]*/g) ?? [];
        matches.forEach((variable) => variables.add(variable));
    });
    return Array.from(variables);
};

export const getTheoremVariables = (theorem: Pick<TheoremChipDefinition, 'formula' | 'premises'>) => {
    const premises = theorem.premises ?? [];
    return extractTheoremVariables([...premises, theorem.formula]);
};

/**
 * A mixed theorem can lose its formula inputs only when every metavariable in
 * its conclusion and premises is structurally determined by the yellow
 * premise inputs. Ordered premise ports then make the substitution unique.
 */
export const canSimplifyTheoremChip = (theorem: Pick<TheoremChipDefinition, 'formula' | 'premises'>) => {
    const premises = theorem.premises ?? [];
    const variables = getTheoremVariables(theorem);
    if (premises.length === 0 || variables.length === 0) return false;

    const premiseVariables = new Set(extractTheoremVariables(premises));
    return variables.every((variable) => premiseVariables.has(variable));
};

export const getTheoremChipHeight = (variableCount: number, premiseCount: number, simplified = false) => {
    const rowCount = Math.max(1, (simplified ? 0 : variableCount) + premiseCount);
    return Math.max(6, rowCount * 2 + 2);
};

export const getSimplifiedTheoremPackCost = (theoremCost: number, uses: number, multiplier: number) =>
    Math.ceil((theoremCost * uses * multiplier) / 5) * 5;
