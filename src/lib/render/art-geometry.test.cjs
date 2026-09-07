/* Run with: node src/lib/render/art-geometry.test.cjs
 * Records Canvas transforms to verify that every rendered port still occupies the solver position.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- This isolated Node test transpiles the TypeScript render modules into its CommonJS loader. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const project = path.resolve(__dirname, '../..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
    if (name.startsWith('@/')) name = path.join(project, name.slice(2));
    return resolve.call(this, name, ...args);
};
require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
global.Path2D = class { roundRect() {} moveTo() {} lineTo() {} bezierCurveTo() {} closePath() {} };

class CanvasRecorder {
    constructor() { this.m = [1, 0, 0, 1, 0, 0]; this.stack = []; this.arcs = []; this.segments = []; this.globalAlpha = 1; }
    save() { this.stack.push([...this.m]); }
    restore() { this.m = this.stack.pop(); }
    translate(x, y) { const m = this.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; }
    rotate(t) { const [a,b,c,d,e,f] = this.m, co = Math.cos(t), si = Math.sin(t); this.m = [a*co+c*si,b*co+d*si,-a*si+c*co,-b*si+d*co,e,f]; }
    scale(x,y) { this.m[0]*=x;this.m[1]*=x;this.m[2]*=y;this.m[3]*=y; }
    point(x,y) { const [a,b,c,d,e,f] = this.m; return [a*x+c*y+e,b*x+d*y+f]; }
    arc(x,y,r) { this.arcs.push({ p:this.point(x,y),r }); }
    moveTo(x,y) { this.last = this.point(x,y); }
    lineTo(x,y) { this.segments.push({ from:this.last,to:this.point(x,y) }); this.last = this.point(x,y); }
    createLinearGradient() { return { addColorStop() {} }; }
    measureText(text) { return { width:text.length*7 }; }
    beginPath() {} closePath() {} roundRect() {} rect() {} fill() {} stroke() {} fillRect() {}
    fillText() {} clip() {} ellipse() {} setLineDash() {} bezierCurveTo() {}
}

const { drawCircuitItem, resolveDisplayValues } = require('./circuit-art.ts');
const { getNodePorts, getAbsolutePortPosition } = require('../gameUtils.ts');
const { worldLod, CHAPTER_LANDMARKS } = require('./world-art.ts');
const near = (a,b) => Math.abs(a-b) < .000001;
const fixtures = [
    {type:'atom',subType:'P',w:2,h:2},
    {type:'gate',subType:'not',w:4,h:4},
    {type:'gate',subType:'implies',w:4,h:4},
    {type:'gate',subType:'and',w:4,h:4},
    {type:'axiom',subType:'1',w:6,h:4},
    {type:'axiom',subType:'2',w:6,h:6},
    {type:'axiom',subType:'3',w:6,h:4},
    {type:'mp',subType:'mp',w:6,h:6},
    {type:'quick-mp',subType:'quick-mp',w:6,h:6},
    {type:'theorem',subType:'syl',w:8,h:12,theoremName:'syl',theoremVars:['P','Q','R'],theoremPremises:['|-P','|-(P->Q)'],theoremConclusion:'Q'},
    {type:'theorem',subType:'syl',w:8,h:8,theoremName:'syl',theoremSimplified:true,theoremVars:['P','Q','R'],theoremPremises:['|-P','|-(P->Q)'],theoremConclusion:'Q'},
    {type:'theorem',subType:'formula-only',w:8,h:8,theoremIsFormulaOnly:true,theoremVars:['P'],theoremPremises:[],theoremConclusion:'P'},
    {type:'premise',subType:'|-P',customLabel:'|-P',w:6,h:6,locked:true},
    {type:'premise',subType:'P',customLabel:'P',w:6,h:6},
    {type:'display',subType:'small',w:4,h:4},
    {type:'bridge',subType:'bridge',w:2,h:2},
];
let count = 0;
for (const fixture of fixtures) for (let rotation=0;rotation<4;rotation++) for(const zoom of [.1,.4,1,5]) for(const dpr of [1,2]) {
    const node={...fixture,id:'fixture',x:13,y:-7,rotation};
    const ctx=new CanvasRecorder();
    ctx.scale(dpr,dpr);ctx.translate(17,39);ctx.scale(zoom,zoom);
    drawCircuitItem(ctx,node,node.x*25,node.y*25,{scale:zoom,time:0,low:true,reducedMotion:true,active:false,error:false});
    for(const port of getNodePorts(node)) {
        const expected=getAbsolutePortPosition(node,port);
        assert(ctx.arcs.some(({p,r})=>r>=6&&near(p[0],(17+expected.x*25*zoom)*dpr)&&near(p[1],(39+expected.y*25*zoom)*dpr)),`${node.type}:${node.subType} rotation ${rotation} port ${port.id} shifted at zoom ${zoom}, DPR ${dpr}`);
        count++;
    }
}
for(let rotation=0;rotation<4;rotation++) {
    const node={id:'w',type:'wire',subType:'formula',x:3,y:4,w:1,h:1,rotation};
    const ctx=new CanvasRecorder();
    drawCircuitItem(ctx,node,75,100,{scale:1,time:0,low:true,reducedMotion:true,active:true,error:false});
    const ends=rotation===0?[[75,100],[100,100]]:rotation===1?[[75,100],[75,125]]:rotation===2?[[75,125],[100,125]]:[[100,100],[100,125]];
    assert(ctx.segments.some(segment=>segment.from.every((v,i)=>near(v,ends[0][i]))&&segment.to.every((v,i)=>near(v,ends[1][i]))),'wire boundary changed');
}
const display={id:'d',type:'display',subType:'small',x:0,y:0,w:4,h:4};
const port=getAbsolutePortPosition(display,getNodePorts(display)[0]);
const wire={id:'w',type:'wire',subType:'formula',x:port.x,y:port.y,w:1,h:1};
assert.equal(resolveDisplayValues([display,wire],new Map([['w','P']])).get('d'),'P');
assert.equal(worldLod(.1),'coarse');assert.equal(worldLod(.38),'markers');assert.equal(worldLod(.95),'tiles');
assert.deepEqual(Object.values(CHAPTER_LANDMARKS).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10]);
console.log(`PASS: ${count} port positions across 4 rotations, 4 zooms and DPR 1/2; 4 wire rotations, display input, 3 LOD levels and 10 chapter landmarks.`);
