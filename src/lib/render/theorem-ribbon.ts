import type { Stage2IslandDefinition } from '@/types/stage2';
import { formulaRenderer } from '@/lib/formula-renderer';

export const islandPremises = (island: Stage2IslandDefinition) => island.premiseNodes?.map(p=>p.formula) ?? island.rewardTheorem?.premises ?? [];
export const theoremText = (premises: string[], conclusion:string, zh=true) =>
    `${premises.length ? premises.map((p,i)=>`${zh?'前提':'Premise'} ${i+1}: ${p}`).join('\n') : zh?'无前提':'No premises'}\n${zh?'结论':'Conclusion'}: ${conclusion}`;

/** Premises remain separate assertions; the collecting rail denotes inference,
 * distinct from the implication graphic *inside* a formula. Never drop a premise. */
export function drawTheoremRibbon(ctx:CanvasRenderingContext2D, premises:string[], conclusion:string, x:number,y:number,w:number,h:number,scale=1,zh=true) {
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    const left=w*.48, rail=x+w*.51, end=x+w*.61;
    const cols=premises.length>2?2:1, rows=Math.max(1,Math.ceil(premises.length/cols));
    const labelH=Math.min(15,h*.14), rowH=(h-8)/rows;
    const size=Math.min(left/cols-12,rowH-labelH-6);
    const centers:number[]=[];
    if(premises.length) premises.forEach((text,index)=>{
        const cx=x+(index%cols+.5)*left/cols,cy=y+(Math.floor(index/cols)+.5)*rowH;
        const parsed=formulaRenderer.parse(text);
        if(parsed)formulaRenderer.render(ctx,parsed,cx,cy-labelH*.25,size,scale);
        ctx.fillStyle='#a5b9d2';ctx.font=`${Math.max(8,Math.min(11,labelH))}px sans-serif`;
        ctx.fillText(`${zh?'前提':'P'} ${index+1}`,cx,cy+size/2+labelH*.25);
        centers.push(cy);
    });
    else {
        ctx.strokeStyle='#637990';ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(x+left*.5,y+h*.46,Math.min(left,h)*.2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        ctx.font=`${Math.min(20,h*.25)}px serif`;ctx.fillStyle='#a5b9d2';ctx.fillText('∅',x+left*.5,y+h*.46);
        ctx.font='10px sans-serif';ctx.fillText(zh?'无前提':'No premises',x+left*.5,y+h*.8);centers.push(y+h*.5);
    }
    const cy=y+h*.47;
    ctx.strokeStyle='#c6a76a';ctx.lineWidth=1.4;ctx.beginPath();
    ctx.moveTo(rail,Math.min(...centers));ctx.lineTo(rail,Math.max(...centers));
    for(const rowY of new Set(centers)){ctx.moveTo(rail-5,rowY);ctx.lineTo(rail,rowY);}
    ctx.moveTo(rail,cy);ctx.lineTo(end,cy);ctx.moveTo(end-5,cy-4);ctx.lineTo(end,cy);ctx.lineTo(end-5,cy+4);ctx.stroke();
    const cSize=Math.min(w*.34,h-labelH-10), cx=x+w*.81;
    const parsed=formulaRenderer.parse(conclusion);
    if(parsed)formulaRenderer.render(ctx,parsed,cx,cy,cSize,scale);
    ctx.fillStyle='#f0d6a0';ctx.font=`${Math.max(8,Math.min(11,labelH))}px sans-serif`;ctx.fillText(zh?'结论':'Conclusion',cx,cy+cSize/2+labelH*.6);
    ctx.restore();
}
