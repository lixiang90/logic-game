import { Formula, Atom, Not, Implies, And, Or, Equiv, Provable } from './logic-engine';

type AtomConfig = { color: string; shape: 'circle' | 'square' | 'triangle' | 'diamond' };

export const THEME = {
    colors: {
        blue: '#3b82f6',
        purple: '#a855f7',
        green: '#22c55e',
        yellow: '#eab308',
        red: '#ef4444',
        slate: '#1e293b',
        slateDark: '#0f172a',
        text: '#f8fafc'
    },
    atoms: {
        'P': { color: '#3b82f6', shape: 'circle' as const },
        'Q': { color: '#a855f7', shape: 'square' as const },
        'R': { color: '#ffaa00', shape: 'triangle' as const },
        'S': { color: '#f97316', shape: 'diamond' as const }
    } as Record<string, AtomConfig>
};

export class FormulaRenderer {
    private minScreenSize = 6;
    
    render(ctx: CanvasRenderingContext2D, formula: Formula | Provable, x: number, y: number, size: number, scale: number = 1) {
        const screenSize = size * scale;
        if (screenSize < this.minScreenSize) {
            this.renderFallback(ctx, formula, x, y, size, scale);
            return;
        }

        ctx.save();
        
        if (formula instanceof Atom) {
            this.renderAtom(ctx, formula, x, y, size, scale);
        } else if (formula instanceof Not) {
            this.renderNot(ctx, formula, x, y, size, scale);
        } else if (formula instanceof Implies) {
            this.renderImplies(ctx, formula, x, y, size, scale);
        } else if (formula instanceof And) {
            this.renderAnd(ctx, formula, x, y, size, scale);
        } else if (formula instanceof Or) {
            this.renderOr(ctx, formula, x, y, size, scale);
        } else if (formula instanceof Equiv) {
            this.renderEquiv(ctx, formula, x, y, size, scale);
        } else if (formula instanceof Provable) {
            this.renderProvable(ctx, formula, x, y, size, scale);
        }

        ctx.restore();
    }
    
    private renderFallback(ctx: CanvasRenderingContext2D, formula: Formula | Provable, x: number, y: number, size: number, scale: number) {
        const screenSize = size * scale;
        if (screenSize < 2) return;
        const r = Math.max(1, size * 0.35);
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a5b4fc';
        ctx.lineWidth = Math.max(0.5, screenSize * 0.1 / scale);
        ctx.stroke();
    }
    
    private scaleValue(screenSize: number, scale: number, fraction: number, minVal: number = 0): number {
        const screenPixels = screenSize * fraction;
        const worldUnits = screenPixels / scale;
        return Math.max(minVal / scale, worldUnits);
    }

    private renderAtom(ctx: CanvasRenderingContext2D, formula: Atom, x: number, y: number, size: number, scale: number) {
        const screenSize = size * scale;
        const config = THEME.atoms[formula.name] || { color: '#ffffff', shape: 'circle' as const };
        
        ctx.fillStyle = config.color;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = this.scaleValue(screenSize, scale, 0.04, 1);

        ctx.shadowColor = config.color;
        ctx.shadowBlur = this.scaleValue(screenSize, scale, 0.15, 2);

        const r = size * 0.35;

        ctx.beginPath();
        if (config.shape === 'circle') {
            ctx.arc(x, y, r, 0, Math.PI * 2);
        } else if (config.shape === 'square') {
            const s = r * 1.6;
            ctx.rect(x - s/2, y - s/2, s, s);
        } else if (config.shape === 'triangle') {
            const rTri = r * 1.2;
            ctx.moveTo(x, y - rTri);
            ctx.lineTo(x + rTri * 0.866, y + rTri * 0.5);
            ctx.lineTo(x - rTri * 0.866, y + rTri * 0.5);
            ctx.closePath();
        } else if (config.shape === 'diamond') {
            const rDia = r * 1.3;
            ctx.moveTo(x, y - rDia);
            ctx.lineTo(x + rDia * 0.8, y);
            ctx.lineTo(x, y + rDia);
            ctx.lineTo(x - rDia * 0.8, y);
            ctx.closePath();
        }
        
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        
        const fontSize = this.scaleValue(screenSize, scale, 0.35, 6);
        if (fontSize * scale >= 6) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(formula.name, x, y + size * 0.02);
        }
    }

    private renderNot(ctx: CanvasRenderingContext2D, formula: Not, x: number, y: number, size: number, scale: number) {
        const screenSize = size * scale;
        ctx.fillStyle = '#2c0b0e';
        ctx.strokeStyle = THEME.colors.red;
        ctx.lineWidth = this.scaleValue(screenSize, scale, 0.04, 1);
        
        const chamfer = size * 0.08;
        const half = size / 2;
        
        ctx.beginPath();
        ctx.moveTo(x - half + chamfer, y - half);
        ctx.lineTo(x + half - chamfer, y - half);
        ctx.lineTo(x + half, y - half + chamfer);
        ctx.lineTo(x + half, y + half - chamfer);
        ctx.lineTo(x + half - chamfer, y + half);
        ctx.lineTo(x - half + chamfer, y + half);
        ctx.lineTo(x - half, y + half - chamfer);
        ctx.lineTo(x - half, y - half + chamfer);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();

        this.render(ctx, formula.child, x, y, size * 0.7, scale);
    }

    private renderImplies(ctx: CanvasRenderingContext2D, formula: Implies, x: number, y: number, size: number, scale: number) {
        const screenSize = size * scale;
        const w = size;
        const h = size;
        const r = size * 0.08;
        
        ctx.beginPath();
        ctx.roundRect(x - w/2, y - h/2, w, h, r);
        ctx.save();
        ctx.clip();

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x - w/2, y - h/2, w/2, h);
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y - h/2, w/2, h);
        
        ctx.restore();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = this.scaleValue(screenSize, scale, 0.03, 1);
        ctx.stroke();

        const arrowSize = size * 0.08;
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(x - arrowSize/2, y - arrowSize/2);
        ctx.lineTo(x + arrowSize/2, y);
        ctx.lineTo(x - arrowSize/2, y + arrowSize/2);
        ctx.fill();

        const childSize = size * 0.42;
        const leftX = x - w * 0.25;
        const rightX = x + w * 0.25;
        this.render(ctx, formula.left, leftX, y, childSize, scale);
        this.render(ctx, formula.right, rightX, y, childSize, scale);
    }

    private renderAnd(ctx: CanvasRenderingContext2D, formula: And, x: number, y: number, size: number, scale: number) {
        const screenSize = size * scale;
        const w = size;
        const h = size;
        const r = size * 0.08;

        ctx.beginPath();
        ctx.roundRect(x - w/2, y - h/2, w, h, r);
        ctx.save();
        ctx.clip();

        ctx.fillStyle = '#14532d';
        ctx.fillRect(x - w/2, y - h/2, w, h/2);

        ctx.fillStyle = '#166534';
        ctx.fillRect(x - w/2, y, w, h/2);

        ctx.restore();

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = this.scaleValue(screenSize, scale, 0.03, 1);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - w/2, y);
        ctx.lineTo(x + w/2, y);
        ctx.stroke();

        const childSize = size * 0.38;
        this.render(ctx, formula.left, x, y - h * 0.25, childSize, scale);
        this.render(ctx, formula.right, x, y + h * 0.25, childSize, scale);
    }

    private renderOr(ctx: CanvasRenderingContext2D, formula: Or, x: number, y: number, size: number, scale: number) {
        const screenSize = size * scale;
        const w = size;
        const h = size;
        const r = size * 0.08;

        ctx.beginPath();
        ctx.roundRect(x - w/2, y - h/2, w, h, r);
        ctx.save();
        ctx.clip();

        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(x - w/2, y - h/2, w/2, h);

        ctx.fillStyle = '#9a3412';
        ctx.fillRect(x, y - h/2, w/2, h);

        ctx.restore();

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = this.scaleValue(screenSize, scale, 0.03, 1);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y - h/2);
        ctx.lineTo(x, y + h/2);
        ctx.stroke();

        const childSize = size * 0.38;
        this.render(ctx, formula.left, x - w * 0.25, y, childSize, scale);
        this.render(ctx, formula.right, x + w * 0.25, y, childSize, scale);
    }

    private renderEquiv(ctx: CanvasRenderingContext2D, formula: Equiv, x: number, y: number, size: number, scale: number) {
        const screenSize = size * scale;
        const w = size;
        const h = size;
        const r = size * 0.08;

        ctx.beginPath();
        ctx.roundRect(x - w/2, y - h/2, w, h, r);
        ctx.save();
        ctx.clip();

        ctx.fillStyle = '#581c87';
        ctx.fillRect(x - w/2, y - h/2, w/2, h);

        ctx.fillStyle = '#6b21a8';
        ctx.fillRect(x, y - h/2, w/2, h);

        ctx.restore();

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = this.scaleValue(screenSize, scale, 0.03, 1);
        ctx.stroke();

        const fontSize = this.scaleValue(screenSize, scale, 0.12, 6);
        ctx.fillStyle = '#e9d5ff';
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u21d4', x, y);

        const childSize = size * 0.38;
        this.render(ctx, formula.left, x - w * 0.25, y, childSize, scale);
        this.render(ctx, formula.right, x + w * 0.25, y, childSize, scale);
    }

    private renderProvable(ctx: CanvasRenderingContext2D, formula: Provable, x: number, y: number, size: number, scale: number) {
        const screenSize = size * scale;
        
        ctx.shadowColor = THEME.colors.yellow;
        ctx.shadowBlur = this.scaleValue(screenSize, scale, 0.1, 2);

        ctx.strokeStyle = THEME.colors.yellow;
        ctx.lineWidth = this.scaleValue(screenSize, scale, 0.03, 1);
        ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';

        const r = size * 0.08;
        
        ctx.beginPath();
        ctx.roundRect(x - size/2, y - size/2, size, size, r);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        const fontSize = this.scaleValue(screenSize, scale, 0.08, 5);
        ctx.fillStyle = THEME.colors.yellow;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('\u22a2', x - size/2 + this.scaleValue(screenSize, scale, 0.02, 1), y - size/2 + this.scaleValue(screenSize, scale, 0.02, 1));

        this.render(ctx, formula.formula, x, y, size * 0.75, scale);
    }
}

export const formulaRenderer = new FormulaRenderer();
