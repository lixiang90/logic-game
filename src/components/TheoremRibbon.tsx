'use client';
import React, { useEffect, useRef } from 'react';
import { drawTheoremRibbon, theoremText } from '@/lib/render/theorem-ribbon';

export default function TheoremRibbon({premises,conclusion,language='zh',height=126}:{premises:string[];conclusion:string;language?:'zh'|'en';height?:number}) {
    const ref=useRef<HTMLCanvasElement>(null);
    const key=JSON.stringify(premises);
    useEffect(()=>{
        const canvas=ref.current;if(!canvas)return;
        const draw=()=>{
            const width=canvas.getBoundingClientRect().width;if(!width)return;
            const dpr=Math.min(window.devicePixelRatio||1,2);
            canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
            const ctx=canvas.getContext('2d');if(!ctx)return;
            ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
            drawTheoremRibbon(ctx,JSON.parse(key),conclusion,5,5,width-10,height-10,1,language==='zh');
        };
        const observer=new ResizeObserver(draw);observer.observe(canvas);draw();return()=>observer.disconnect();
    },[key,conclusion,height,language]);
    return <canvas ref={ref} role="img" aria-label={theoremText(premises,conclusion,language==='zh')} style={{display:'block',width:'100%',height}} />;
}
