import { ART_THEME as A } from '@/lib/art-theme';
import { Stage2IslandDefinition } from '@/types/stage2';

export type WorldLod = 'coarse' | 'markers' | 'tiles';
export const worldLod = (scale: number): WorldLod => scale >= .95 ? 'tiles' : scale >= .38 ? 'markers' : 'coarse';

/** Names come from the ten existing main-island theorem labels, never from future progress. */
export const CHAPTER_LANDMARKS: Record<string,number> = {
    syl:1, com12:2, syl6:3, 'pm2.43i':4, 'pm2.21':5,
    con3i:6, mto:7, 'pm2.18i':8, con3d:9, expt:10,
};

export function drawStarWorkshop(ctx: CanvasRenderingContext2D,width:number,height:number,world:boolean,low:boolean) {
    const bg=ctx.createLinearGradient(0,0,width,height);
    bg.addColorStop(0,world?'#172B42':'#0B1425'); bg.addColorStop(.5,world?'#25374B':'#162239'); bg.addColorStop(1,world?'#3A414B':'#0D1728');
    ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
    if(low)return;
    // A cached screen-space atmosphere; the building plane never moves with these clouds.
    for(let i=0;i<7;i++) {
        const x=width*((i*.317)%1),y=height*((i*.237+.15)%1),r=width*(world?.28:.16);
        const glow=ctx.createRadialGradient(x,y,0,x,y,r);
        glow.addColorStop(0,world?'rgba(169,190,201,.085)':'rgba(94,130,171,.065)');glow.addColorStop(1,'transparent');
        ctx.fillStyle=glow;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    ctx.fillStyle='rgba(238,232,219,.24)';
    for(let i=0;i<75;i++) { const x=(i*997.3)%width,y=(i*479.7)%height;ctx.fillRect(x,y,i%7===0?2:1,1); }
    if(!world) {
        ctx.save();ctx.strokeStyle='rgba(182,154,102,.095)';ctx.lineWidth=1;
        for(const [x,y] of [[-width*.08,height*.25],[width*1.06,height*.65]]) {
            for(const r of [125,155,215]) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}
            for(let n=0;n<24;n++){const t=n*Math.PI/12;ctx.beginPath();ctx.moveTo(x+144*Math.cos(t),y+144*Math.sin(t));ctx.lineTo(x+165*Math.cos(t),y+165*Math.sin(t));ctx.stroke();}
        }
        ctx.restore();
    }
}

export function drawIslandGround(ctx:CanvasRenderingContext2D,island:Stage2IslandDefinition,outline:Path2D,tiles:Path2D,scale:number,lod:WorldLod,low:boolean,unlocked:boolean,completed:boolean,selected:boolean) {
    const {x,y,w,h}=island.mapBounds,G=25,depth=Math.min(190,h*G*.14);
    const skin=island.category==='main'?0:island.category==='support'?1:2;
    const tops=lod==='tiles'?['#26383C','#293844','#343B3C']:['#526A61','#50646A','#65695C'];
    ctx.save();ctx.globalAlpha=unlocked?1:.22;
    // Stacked silhouettes form the rock volume below the unchanged buildable top edge.
    for(let layer=low?2:4;layer>=1;layer--) {
        ctx.save();ctx.translate(0,depth*layer/(low?2:4));
        ctx.fillStyle=layer===1?'#655F56':layer===2?'#484D50':'#303B47';ctx.fill(outline,'evenodd');
        ctx.strokeStyle='rgba(164,145,115,.25)';ctx.lineWidth=2/scale;ctx.stroke(outline);ctx.restore();
    }
    ctx.fillStyle=tops[skin];ctx.fill(outline,'evenodd');
    ctx.save();ctx.clip(outline,'evenodd');
    const light=ctx.createLinearGradient(x*G,y*G,(x+w)*G,(y+h)*G);
    light.addColorStop(0,'rgba(212,220,174,.15)');light.addColorStop(1,'rgba(11,23,39,.18)');ctx.fillStyle=light;ctx.fillRect(x*G,y*G,w*G,h*G);
    // Grass tufts and weathered limestone are deliberately faint at construction distance.
    if(!low && lod!=='tiles') {
        for(let i=0;i<22;i++) {
            const px=(x+((i*17.137+w*.23)%w))*G,py=(y+((i*13.79+h*.42)%h))*G;
            ctx.fillStyle=i%4===0?'rgba(218,210,182,.15)':'rgba(168,189,129,.14)';
            ctx.beginPath();ctx.ellipse(px,py,22+i%3*9,8+i%4*3,-.3,0,Math.PI*2);ctx.fill();
        }
    }
    if(lod==='tiles') {ctx.lineWidth=.7/scale;ctx.strokeStyle='rgba(196,210,197,.105)';ctx.stroke(tiles);}
    ctx.restore();
    ctx.lineWidth=Math.max(1.5/scale,5);ctx.strokeStyle=selected?A.provable:completed?'#A5CCAF':unlocked?'#A8B18F':'#77858D';ctx.stroke(outline);
    // Inner grass lip shares the exact geometry of the buildable island surface.
    ctx.save();ctx.clip(outline,'evenodd');ctx.strokeStyle=lod==='tiles'?'rgba(147,172,132,.24)':'rgba(186,199,149,.36)';ctx.lineWidth=14;ctx.stroke(outline);ctx.restore();
    ctx.restore();
}

/** Ten small architectural silhouettes. They occupy a cartographic plaque outside the build area. */
export function drawLandmark(ctx:CanvasRenderingContext2D,chapter:number,x:number,y:number,size:number,completed:boolean,low:boolean) {
    ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);
    const stone='#DDD3BA',shadow='#8C9293',metal=A.brass,light=completed?A.success:'#8AD1DC';
    ctx.strokeStyle=metal;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
    const line=(x1:number,y1:number,x2:number,y2:number)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
    const rect=(x1:number,y1:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x1,y1,w,h);};
    const ring=(x1:number,y1:number,r:number)=>{ctx.beginPath();ctx.ellipse(x1,y1,r,r*.38,0,0,Math.PI*2);ctx.stroke();};
    const crystal=(x1:number,y1:number,r:number)=>{ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(x1,y1-r);ctx.lineTo(x1+r*.5,y1);ctx.lineTo(x1,y1+r);ctx.lineTo(x1-r*.5,y1);ctx.closePath();ctx.fill();};
    ctx.fillStyle='rgba(4,12,24,.25)';ctx.beginPath();ctx.ellipse(0,32,45,11,0,0,Math.PI*2);ctx.fill();
    rect(-37,23,74,8,shadow);rect(-32,18,64,7,stone);
    switch(chapter) {
        case 1: ring(0,2,34);ring(0,2,22);crystal(-25,-8,12);crystal(25,-8,12);crystal(0,-24,16);break;
        case 2: ctx.strokeStyle=light;ctx.beginPath();ctx.moveTo(-37,8);ctx.bezierCurveTo(-15,-44,18,38,37,-8);ctx.moveTo(-37,-8);ctx.bezierCurveTo(-15,38,18,-44,37,8);ctx.stroke();rect(-5,-29,10,44,stone);break;
        case 3: for(let i=0;i<3;i++){rect(-34+i*25,9-i*13,18,10+i*13,stone);crystal(-25+i*25,-i*13,7);}break;
        case 4: for(let i=0;i<4;i++)rect(-36+i*6,14-i*10,72-i*12,10,i%2?shadow:stone);crystal(0,-25,12);break;
        case 5: rect(-28,-5,40,23,'#AF926E');ctx.fillStyle='#C5A56B';ctx.beginPath();ctx.moveTo(-35,-5);ctx.lineTo(-8,-26);ctx.lineTo(21,-5);ctx.closePath();ctx.fill();rect(-11,4,9,14,'#555B53');for(let i=0;i<3;i++){line(23+i*6,18,23+i*6,-5);crystal(23+i*6,-9,5);}break;
        case 6: for(let i=0;i<3;i++){ctx.fillStyle=i===1?stone:shadow;ctx.beginPath();ctx.moveTo(-42+i*24,18);ctx.lineTo(-22+i*24,-28-i%2*18);ctx.lineTo(i*24,18);ctx.closePath();ctx.fill();}line(-32,14,28,-10);break;
        case 7: rect(-29,-17,58,34,shadow);rect(-34,-23,68,8,stone);rect(-22,-13,13,25,'#172D3D');rect(9,-13,13,25,'#172D3D');crystal(-16,-1,11);crystal(16,-1,11);rect(-5,-42,10,19,metal);ring(0,-30,19);break;
        case 8: rect(-8,-13,16,31,stone);ring(0,-14,36);ctx.beginPath();ctx.ellipse(0,-15,29,29,-.5,0,Math.PI*2);ctx.stroke();crystal(0,-15,10);break;
        case 9: rect(-30,-28,11,44,stone);rect(17,-18,12,34,shadow);ctx.beginPath();ctx.arc(0,-13,27,-Math.PI*.85,-Math.PI*.12);ctx.stroke();line(-5,-42,0,-32);line(0,-32,-5,-25);crystal(0,-4,8);break;
        default: rect(-31,-40,12,59,stone);rect(19,-40,12,59,stone);rect(-35,-45,70,9,stone);ctx.strokeStyle=metal;line(-23,-36,23,-36);rect(-15,-28,30,46,completed?'#395F6D':'#172435');ctx.strokeStyle=light;ring(0,-4,12);line(0,-27,0,17);break;
    }
    if(!low){ctx.strokeStyle='rgba(238,232,219,.45)';line(-29,20,29,20);}
    ctx.restore();
}
