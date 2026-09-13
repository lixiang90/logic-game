import type { Stage2IslandDefinition, Stage2LevelConfig, Stage2MetaProgress, IslandHarbor } from '@/types/stage2';
import { portArtScale, type ShippingRoute } from '@/lib/shipping';
import { harborAnchor, harborBounds, harborNormal, islandHarbors } from '@/lib/harbors';
import { drawTheoremRibbon, islandPremises } from './theorem-ribbon';
import { fitLabel } from './circuit-art';

const colors = { planned: '#8495b6', building: '#65d9e8', pending: '#bd9af7', proved: '#f3cf80' };
export function drawShipping(ctx: CanvasRenderingContext2D, config: Stage2LevelConfig, islands: Stage2IslandDefinition[], routes: ShippingRoute[], progress: Stage2MetaProgress, scale: number, time: number, animate: boolean, zh: boolean, showCards=true, panelLayout=shippingPanels(islands,routes,progress,scale)) {
    ctx.save();
    for (const route of routes) {
        const source = config.world.getIslandById(route.sourceIslandId), target = config.world.getIslandById(route.targetIslandId);
        if (!source || !target) continue;
        const sp=islandHarbors(source,progress).find(p=>p.id===route.sourcePortId),tp=islandHarbors(target,progress).find(p=>p.id===route.targetPortId);
        if(!sp || !tp)continue;
        const a=harborAnchor(sp),b=harborAnchor(tp),sn=harborNormal(sp),tn=harborNormal(tp);
        const distance = Math.hypot(b.x - a.x, b.y - a.y);
        const bend = Math.min(900, Math.max(240, distance * .28));
        const c={x:a.x+sn.x*bend,y:a.y+sn.y*bend};
        const d={x:b.x+tn.x*bend,y:b.y+tn.y*bend};
        const path = () => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(c.x, c.y, d.x, d.y, b.x, b.y); };
        ctx.setLineDash([]); ctx.strokeStyle = '#09142899'; ctx.lineWidth = 8 / scale; path(); ctx.stroke();
        ctx.strokeStyle = colors[route.status]; ctx.globalAlpha = route.status === 'planned' ? .55 : .8;
        ctx.lineWidth = (route.status === 'proved' ? 1.7 : 1.2) / scale;
        ctx.setLineDash(route.status === 'planned' || route.status === 'pending' ? [7 / scale, 6 / scale] : []);
        path(); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        // A fixed arrow always conveys direction, including reduced motion mode.
        for (const t of [.72, ...(animate && route.status !== 'planned' ? [(time / 14000) % 1] : [])]) {
            const u = 1 - t;
            const x = u*u*u*a.x + 3*u*u*t*c.x + 3*u*t*t*d.x + t*t*t*b.x;
            const y = u*u*u*a.y + 3*u*u*t*c.y + 3*u*t*t*d.y + t*t*t*b.y;
            const dx = 3*u*u*(c.x-a.x)+6*u*t*(d.x-c.x)+3*t*t*(b.x-d.x);
            const dy = 3*u*u*(c.y-a.y)+6*u*t*(d.y-c.y)+3*t*t*(b.y-d.y);
            ctx.save(); ctx.translate(x,y); ctx.rotate(Math.atan2(dy,dx)); ctx.scale(1/scale,1/scale);
            ctx.fillStyle = colors[route.status]; ctx.beginPath(); ctx.moveTo(7,0); ctx.lineTo(-5,-4); ctx.lineTo(-2,0); ctx.lineTo(-5,4); ctx.closePath(); ctx.fill(); ctx.restore();
        }
    }
    for(const island of islands) for(const port of islandHarbors(island,progress)) {
        const bounds=harborBounds(port),anchor=harborAnchor(port),normal=harborNormal(port);
        const arrivals=routes.filter(route=>route.targetPortId===port.id);
        ctx.save();
        const x=bounds.x*25,y=bounds.y*25,w=bounds.w*25,h=bounds.h*25;
        ctx.fillStyle='#655341';ctx.strokeStyle='#e2c796';ctx.lineWidth=1.3/scale;
        ctx.beginPath();ctx.roundRect(x+2,y+2,w-4,h-4,6);ctx.fill();ctx.stroke();
        ctx.strokeStyle='#b39568';ctx.lineWidth=1;
        for(let row=1;row<6;row++){ctx.beginPath();ctx.moveTo(x+6,y+row*h/6);ctx.lineTo(x+w-6,y+row*h/6);ctx.stroke();}
        ctx.fillStyle='#152d41';ctx.fillRect(x+19,y+13,w-38,30);
        ctx.fillStyle='#d4b783';ctx.beginPath();ctx.moveTo(x+12,y+14);ctx.lineTo(x+w/2,y+4);ctx.lineTo(x+w-12,y+14);ctx.closePath();ctx.fill();
        for(const [bx,by] of [[x+8,y+8],[x+w-8,y+8],[x+8,y+h-8],[x+w-8,y+h-8]]){ctx.fillStyle='#edcf90';ctx.beginPath();ctx.arc(bx,by,3,0,Math.PI*2);ctx.fill();}
        ctx.strokeStyle='#c5ac78';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);ctx.lineTo(anchor.x+normal.x*14,anchor.y+normal.y*14);ctx.stroke();
        const labelScale=Math.max(1,.65/scale);
        ctx.save();ctx.translate(x+w/2,y+h/2);ctx.scale(labelScale,labelScale);
        ctx.fillStyle='#102337e8';ctx.beginPath();ctx.roundRect(-40,-10,80,20,5);ctx.fill();
        ctx.fillStyle='#f1dbaa';ctx.font='600 11px sans-serif';ctx.textAlign='center';ctx.fillText(`${zh?'港':'Port'} ${port.name}`,0,4);ctx.restore();
        const panels: HarborPanel[] = showCards ? panelLayout.get(port.id) ?? [] : [];
        panels.forEach((rect,index)=>{
            const route=arrivals[index],source=config.world.getIslandById(route.sourceIslandId);if(!source?.rewardTheorem)return;
            const z=portArtScale(scale);
            ctx.strokeStyle=colors[route.status];ctx.globalAlpha=.45;ctx.lineWidth=1/scale;
            ctx.beginPath();ctx.moveTo(anchor.x+normal.x*14,anchor.y+normal.y*14);
            ctx.lineTo(Math.max(rect.x,Math.min(rect.x+rect.w,anchor.x)),Math.max(rect.y,Math.min(rect.y+rect.h,anchor.y)));ctx.stroke();ctx.globalAlpha=1;
            ctx.save();ctx.translate(rect.x,rect.y);ctx.scale(z,z);
            ctx.fillStyle='#101d35f5';ctx.strokeStyle=colors[route.status];ctx.lineWidth=1.3/(scale*z);ctx.setLineDash(route.status==='pending'?[4,4]:[]);
            ctx.beginPath();ctx.roundRect(0,0,260,136,8);ctx.fill();ctx.stroke();ctx.setLineDash([]);
            ctx.fillStyle=colors[route.status];ctx.font='600 12px sans-serif';ctx.textAlign='left';
            ctx.fillText(fitLabel(ctx,`${route.theoremId} → ${island.name} · ${zh?'港':'Port'} ${port.name}`,242),9,16);
            drawTheoremRibbon(ctx,islandPremises(source),source.rewardTheorem.formula,8,25,244,99,scale*z,zh);
            if(index===panels.length-1 && arrivals.length>panels.length){ctx.font='11px sans-serif';ctx.textAlign='right';ctx.fillStyle='#e0d4ef';ctx.fillText(`+${arrivals.length-panels.length}`,250,132);}
            ctx.restore();
        });
        ctx.restore();
    }
    ctx.restore();
}

/** Shared draw/hit-test rectangles; precise coast footprint stays independent of labels. */
export function harborPanels(port:IslandHarbor,scale:number,count:number) {
    const a=harborAnchor(port),n=harborNormal(port),z=portArtScale(scale),w=260*z,h=136*z;
    return Array.from({length:Math.min(count,scale>=.5?2:1)},(_,index)=>{
        const x=n.x===0?a.x-w/2:n.x>0?a.x+20*z:a.x-20*z-w;
        const y=n.y===0?a.y-h/2:n.y>0?a.y+20*z:a.y-20*z-h;
        return {x:x+(n.x===0?index*(w+10*z):0),y:y+(n.x!==0?index*(h+10*z):0),w,h};
    });
}

type HarborPanel = {x:number;y:number;w:number;h:number};
/** Share collision-free card positions between painting and clicking. Nearby
 * harbors fan their cards along the shore before adding another outward row. */
export function shippingPanels(islands:Stage2IslandDefinition[],routes:ShippingRoute[],progress:Stage2MetaProgress,scale:number) {
    const layout=new Map<string,HarborPanel[]>(),placed:HarborPanel[]=[];
    const gap=10*portArtScale(scale);
    const overlaps=(a:HarborPanel,b:HarborPanel)=>a.x<b.x+b.w+gap && a.x+a.w+gap>b.x && a.y<b.y+b.h+gap && a.y+a.h+gap>b.y;
    for(const island of islands)for(const port of islandHarbors(island,progress)) {
        const n=harborNormal(port),cards=harborPanels(port,scale,routes.filter(r=>r.targetPortId===port.id).length);
        layout.set(port.id,cards.map(base=>{
            const candidates: Array<HarborPanel & {score:number}>=[];
            for(let depth=0;depth<=3;depth++)for(let lateral=-placed.length-1;lateral<=placed.length+1;lateral++) {
                const tangent=lateral*(n.x===0?base.w+gap:base.h+gap),outward=depth*(n.x===0?base.h+gap:base.w+gap);
                candidates.push({...base,x:base.x+(n.x===0?tangent:n.x*outward),y:base.y+(n.y===0?tangent:n.y*outward),score:Math.abs(tangent)+outward*2.5});
            }
            candidates.sort((a,b)=>a.score-b.score);
            const chosen=candidates.find(rect=>placed.every(other=>!overlaps(rect,other))) ?? base;
            placed.push(chosen);return chosen;
        }));
    }
    return layout;
}
