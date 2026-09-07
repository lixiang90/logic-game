import { NodeData, Tool } from '@/types/game';
import { getNodePorts, getAbsolutePortPosition } from '@/lib/gameUtils';
import { parseGoal } from '@/lib/logic-engine';
import { formulaRenderer } from '@/lib/formula-renderer';
import { ART_THEME as A, atomArt, signalColor } from '@/lib/art-theme';

const G = 25;
type CircuitItem = NodeData | Tool;
export interface CircuitArtState {
    scale: number;
    time: number;
    low: boolean;
    reducedMotion: boolean;
    active: boolean;
    error: boolean;
    errorPorts?: Set<string>;
    ghost?: boolean;
    displayValue?: string;
    language?: 'zh' | 'en';
}

/** Cached vector shells remain exact logical dimensions at every zoom and DPR. */
const shells = new Map<string, Path2D>();
function shell(node: CircuitItem, w: number, h: number) {
    const key = `${node.type}:${node.subType}:${w}:${h}`;
    const cached = shells.get(key);
    if (cached) return cached;
    const p = new Path2D();
    if (node.type === 'gate' && node.subType === 'not') {
        p.moveTo(0, 0); p.lineTo(w, h / 2); p.lineTo(0, h); p.closePath();
    } else if (node.type === 'gate') {
        p.moveTo(0, 0); p.lineTo(w * .6, 0);
        p.bezierCurveTo(w * 1.135, 0, w * 1.135, h, w * .6, h);
        p.lineTo(0, h); p.closePath();
    } else if (node.type === 'mp' || node.type === 'quick-mp') {
        p.moveTo(0, 0); p.lineTo(w * .6, 0); p.lineTo(w, h / 2);
        p.lineTo(w * .6, h); p.lineTo(0, h); p.closePath();
    } else {
        p.roundRect(3, 3, w - 6, h - 6, Math.min(12, w / 8));
    }
    if (shells.size > 256) shells.clear();
    shells.set(key, p);
    return p;
}

export function fitLabel(ctx: CanvasRenderingContext2D, text: string, width: number) {
    if (ctx.measureText(text).width <= width) return text;
    let end = text.length;
    while (end > 0 && ctx.measureText(`${text.slice(0, end)}…`).width > width) end -= 1;
    return `${text.slice(0, end)}…`;
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, width: number, color: string = A.ivory) {
    ctx.fillStyle = color; ctx.font = `600 ${size}px ${A.font}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(fitLabel(ctx, text, width), x, y);
}

function formula(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, scale: number) {
    const parsed = formulaRenderer.parse(text);
    if (parsed) formulaRenderer.render(ctx, parsed, x, y, size, scale);
    else label(ctx, text, x, y, 14, size);
}

function warning(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.save(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#412C34'; ctx.strokeStyle = A.error; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y-r); ctx.lineTo(x+r, y+r*.8); ctx.lineTo(x-r, y+r*.8); ctx.closePath();
    ctx.fill(); ctx.stroke(); label(ctx, '!', x, y+r*.05, r*1.2, r*1.4, A.error); ctx.restore();
}

function wire(ctx: CanvasRenderingContext2D, node: CircuitItem, x: number, y: number, s: CircuitArtState) {
    const w = node.w * G, h = node.h * G, r = node.rotation ?? 0;
    const x1 = x + (r === 3 ? w : 0), y1 = y + (r === 2 ? h : 0);
    const x2 = r === 1 || r === 3 ? x1 : x1+w;
    const y2 = r === 1 || r === 3 ? y1+h : y1;
    const color = node.subType === 'provable' ? A.provable : A.formula;
    ctx.save(); ctx.globalAlpha *= s.ghost ? .48 : 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#070D19'; ctx.lineWidth = Math.max(7, 2.5/s.scale); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(3.2, 1.3/s.scale);
    if (s.active && !s.low) { ctx.shadowColor = color; ctx.shadowBlur = 7; }
    ctx.stroke(); ctx.shadowBlur = 0;
    if (s.active && !s.error && !s.low && !s.reducedMotion && s.scale >= .35) {
        // Both directions mean an active network. This is not solver provenance.
        const length = Math.hypot(x2-x1, y2-y1), spacing = 32;
        const phase = s.time * .025 % spacing;
        ctx.fillStyle = A.ivory;
        for (let p = -spacing; p <= length; p += spacing) {
            for (const distance of [p+phase, p+spacing/2-phase]) {
                if (distance < 0 || distance > length || length === 0) continue;
                ctx.beginPath(); ctx.arc(x1+(x2-x1)*distance/length, y1+(y2-y1)*distance/length, 1.3, 0, Math.PI*2); ctx.fill();
            }
        }
    }
    for (const [px, py] of [[x1,y1],[x2,y2]]) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px,py,2,0,Math.PI*2); ctx.fill();
    }
    if (s.error) warning(ctx,(x1+x2)/2,(y1+y2)/2-7,5);
    ctx.restore();
}

export function drawCircuitItem(ctx: CanvasRenderingContext2D, node: CircuitItem, x: number, y: number, s: CircuitArtState) {
    if (node.type === 'wire') { wire(ctx,node,x,y,s); return; }
    const w=node.w*G, h=node.h*G, cx=w/2, cy=h/2;
    const rotation=(node.rotation??0)*Math.PI/2;
    const isProof = ['axiom','mp','quick-mp'].includes(node.type) || (node.type === 'theorem' && node.theoremIsFormulaOnly !== true) || (node.type === 'premise' && /^(\|-|⊢)/.test((node.customLabel??node.subType).trim()));
    const accent = node.type === 'atom' ? atomArt(node.subType).color : node.type === 'display' || node.type === 'bridge' ? A.any : isProof ? A.provable : A.formula;
    ctx.save(); ctx.globalAlpha *= s.ghost ? .48 : 1;
    ctx.translate(x+cx,y+cy); ctx.rotate(rotation); ctx.translate(-cx,-cy);
    const outline=shell(node,w,h);
    const fill=ctx.createLinearGradient(0,0,w,h); fill.addColorStop(0,'#26384F'); fill.addColorStop(.45,'#152238'); fill.addColorStop(1,'#10192B');
    if (!s.low) { ctx.shadowColor = s.active ? `${accent}55` : '#02071188'; ctx.shadowBlur = s.active ? 13 : 6; ctx.shadowOffsetY = 2; }
    ctx.fillStyle=fill; ctx.fill(outline); ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    ctx.strokeStyle=s.active?accent:A.brass; ctx.lineWidth=2; ctx.stroke(outline);
    // Interior material engraving is clipped to the original silhouette.
    if (s.scale >= .4 && !s.low) {
        ctx.save(); ctx.clip(outline); ctx.strokeStyle='rgba(238,232,219,.12)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.roundRect(8,8,w-16,h-16,6); ctx.stroke();
        ctx.strokeStyle='rgba(182,154,102,.18)'; ctx.beginPath(); ctx.moveTo(9,h-12); ctx.lineTo(w-12,h-12); ctx.stroke();
        ctx.fillStyle=A.brass;
        for(const [px,py] of [[10,10],[w-10,10],[10,h-10],[w-10,h-10]]) { ctx.beginPath(); ctx.arc(px,py,1.7,0,Math.PI*2); ctx.fill(); }
        ctx.restore();
    }
    // Rotate the body, but keep labels and formula diagrams upright for reading.
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(-rotation); ctx.translate(-cx,-cy);
    const inner=Math.min(w,h)-28;
    const contentW=(node.rotation??0)%2===0?w:h;
    const contentH=(node.rotation??0)%2===0?h:w;
    if (node.type === 'atom') {
        const parsed=formulaRenderer.parse(node.subType);
        if (parsed) formulaRenderer.render(ctx,parsed,cx,cy,Math.min(w,h)*.77,s.scale);
        if ('isActive' in node && node.isActive === false) {
            ctx.fillStyle='rgba(11,20,37,.58)'; ctx.beginPath(); ctx.arc(cx,cy,inner*.45,0,Math.PI*2); ctx.fill();
            label(ctx,node.subType,cx,cy,Math.min(w,h)*.28,inner,A.muted);
        }
    } else if (node.type === 'gate') {
        const symbols: Record<string,string>={not:'¬',implies:'→',and:'∧',or:'∨',equiv:'↔'};
        label(ctx,symbols[node.subType]??node.subType,cx-(node.subType==='not'?w*.13:0),cy,Math.min(w,h)*.39,inner,accent);
    } else if (node.type === 'axiom') {
        label(ctx,{1:'I',2:'II',3:'III'}[node.subType]??node.subType,cx,cy-2,Math.min(w,h)*.36,inner,A.ivory);
        if(s.scale>.65) label(ctx,s.language==='zh'?'公理':'AXIOM',cx,cy+24,9,inner,A.brass);
    } else if (node.type === 'mp' || node.type === 'quick-mp') {
        label(ctx,node.type==='quick-mp'?'MP+':'MP',cx-8,cy,Math.min(w,h)*.29,inner,A.ivory);
    } else if (node.type === 'theorem') {
        const title=`${node.theoremName??node.subType}${node.theoremSimplified?' +':''}`;
        label(ctx,title,cx,cy-contentH/2+21,15,contentW-30,accent);
        const conclusion=node.theoremConclusion??node.customLabel??'';
        const premises=node.theoremPremises??[];
        const conclusionText=`${node.theoremIsFormulaOnly?'':'|-'}${conclusion.replace(/^\s*(\|-|⊢)\s*/,'')}`;
        if (premises.length && s.scale >= .5) {
            const visible=premises.slice(0,2), areaH=contentH-82;
            visible.forEach((premise,index)=>{
                const slotY=cy+7+(index-(visible.length-1)/2)*areaH/visible.length;
                formula(ctx,`|-${premise.replace(/^\s*(\|-|⊢)\s*/,'')}`,cx-contentW*.24,slotY,Math.min(contentW*.32,areaH/visible.length-6),s.scale);
            });
            label(ctx,'⇒',cx,cy+7,15,contentW*.14,A.brass);
            formula(ctx,conclusionText,cx+contentW*.24,cy+7,Math.min(contentW*.35,areaH),s.scale);
        } else formula(ctx,conclusionText,cx,cy+10,Math.min(contentW-35,contentH-88),s.scale);
        if(s.scale>.5) label(ctx,`${premises.length} ${s.language==='zh'?'条前提':premises.length===1?'PREMISE':'PREMISES'}${premises.length>2?' · +'+(premises.length-2):''}  ⓘ`,cx,cy+contentH/2-19,10,contentW-24,A.muted);
    } else if(node.type==='premise') {
        formula(ctx,node.customLabel??node.subType,cx,cy,inner*.86,s.scale);
    } else if(node.type==='display') {
        ctx.beginPath(); ctx.roundRect(cx-inner/2,cy-inner/2,inner,inner,Math.min(14,inner*.15));
        ctx.fillStyle='#091523'; ctx.fill(); ctx.strokeStyle='#617B99'; ctx.lineWidth=1; ctx.stroke();
        if(s.error) warning(ctx,cx,cy,Math.min(22,inner*.2));
        else if(s.displayValue) formula(ctx,s.displayValue,cx,cy,inner*.85,s.scale);
        else { ctx.strokeStyle='rgba(171,150,220,.28)'; ctx.beginPath(); ctx.arc(cx,cy,inner*.26,0,Math.PI*2); ctx.moveTo(cx-inner*.34,cy); ctx.lineTo(cx+inner*.34,cy); ctx.stroke(); }
    }
    ctx.restore();
    if(node.type==='bridge') {
        // The two channels never merge. The vertical bridge visibly passes over the horizontal channel.
        ctx.lineCap='round'; ctx.lineWidth=3; ctx.strokeStyle='#91A2B7';
        ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(cx-7,cy); ctx.moveTo(cx+7,cy); ctx.lineTo(w,cy); ctx.stroke();
        ctx.strokeStyle='#090F1C'; ctx.lineWidth=9; ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,h); ctx.stroke();
        ctx.strokeStyle=A.ivory; ctx.lineWidth=3; ctx.stroke();
        ctx.strokeStyle=A.brass; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(cx,cy,8,Math.PI,0); ctx.stroke();
    }
    if('locked' in node && node.locked && s.scale>.45) {
        ctx.fillStyle=A.brass; ctx.fillRect(w-19,12,8,7); ctx.strokeStyle=A.brass; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(w-15,12,3,Math.PI,0); ctx.stroke();
    }
    // Ports are always derived from the same geometry that the solver uses.
    for(const port of getNodePorts(node as NodeData)) {
        const px=port.x*G,py=port.y*G,color=signalColor(port.type);
        const radius=Math.max(4,Math.min(7,3/s.scale));
        ctx.fillStyle='#08101F'; ctx.strokeStyle=color; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(px,py,radius+2,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle=color;
        if(port.type==='provable') ctx.fillRect(px-radius*.5,py-radius*.5,radius,radius);
        else { ctx.beginPath(); ctx.arc(px,py,radius*.5,0,Math.PI*2); ctx.fill(); }
        if(!port.isInput) { ctx.beginPath();ctx.arc(px,py,radius+4,-.6,.6);ctx.stroke(); }
        if(s.errorPorts?.has(port.id)) warning(ctx,px,py-12,5);
    }
    if(s.error && !s.errorPorts?.size && node.type!=='display') warning(ctx,w-12,h-12,7);
    ctx.restore();
}

/** Resolve display inputs once per solver change, rather than scanning every animation frame. */
export function resolveDisplayValues(nodes: NodeData[], wireValues: Map<string,string>) {
    const values=new Map<string,string>();
    const wires=nodes.filter(n=>n.type==='wire' && wireValues.has(n.id));
    for(const node of nodes) {
        if(node.type!=='display') continue;
        outer: for(const port of getNodePorts(node)) {
            const p=getAbsolutePortPosition(node,port);
            for(const wire of wires) {
                const r=wire.rotation??0,vertical=r===1||r===3;
                const c=vertical?(r===1?wire.x:wire.x+wire.w):(r===0?wire.y:wire.y+wire.h);
                const along=vertical?p.y:p.x,perpendicular=vertical?p.x:p.y;
                const min=vertical?wire.y:wire.x,max=min+(vertical?wire.h:wire.w);
                const value=wireValues.get(wire.id);
                if(Math.abs(perpendicular-c)<.5 && along>=min-.5 && along<=max+.5 && value && value!=='Error' && parseGoal(value)) { values.set(node.id,value);break outer; }
            }
        }
    }
    return values;
}
