'use client';

import { memo, useId } from 'react';
import type { FarmCropId } from '@/types/stage2';
import type { FarmGrowthStage } from '@/lib/farm-visuals';

interface CropArtProps { cropId: FarmCropId; stage: FarmGrowthStage; className?: string }

function Leaf({ x, y, angle = 0, size = 1, fill }: { x: number; y: number; angle?: number; size?: number; fill: string }) {
    const facesRight = angle > 90 && angle < 270;
    return <g transform={`translate(${x} ${y}) rotate(${facesRight ? angle - 180 : angle}) scale(${facesRight ? -size : size} ${size})`}><path d="M0 0 C-22 -2 -26 -17 -31 -23 C-12 -23 -1 -17 0 0Z" fill={fill} stroke="#365845" strokeWidth="1.3"/><path d="M-25 -19 -2 -2 M-14 -12 -14 -19 M-14 -12 -23 -11" fill="none" stroke="#d0dda1" strokeWidth=".8" opacity=".65"/></g>;
}

/** Original resolution-independent botanical assets; every stage has its own silhouette. */
const FarmCropArt = memo(function FarmCropArt({ cropId, stage, className = '' }: CropArtProps) {
    const uid = useId().replace(/:/g, '');
    const leaf = `url(#${uid}-leaf)`;
    const gold = `url(#${uid}-gold)`;
    const pink = `url(#${uid}-pink)`;
    const blue = `url(#${uid}-blue)`;
    const violet = `url(#${uid}-violet)`;
    return <svg className={`farm-crop-art ${className}`} viewBox="0 0 160 144" aria-hidden="true" focusable="false" data-crop={cropId} data-growth-stage={stage}>
        <defs>
            <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2=".4" y2="1"><stop stopColor="#b8ce80"/><stop offset="1" stopColor="#437760"/></linearGradient>
            <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0ab"/><stop offset=".5" stopColor="#e8bb5d"/><stop offset="1" stopColor="#a76e31"/></linearGradient>
            <radialGradient id={`${uid}-pink`} cx=".3" cy=".22"><stop stopColor="#ffc2dd"/><stop offset=".5" stopColor="#e781ad"/><stop offset="1" stopColor="#9f497b"/></radialGradient>
            <linearGradient id={`${uid}-blue`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d8fff2"/><stop offset=".4" stopColor="#72d6c3"/><stop offset="1" stopColor="#348c83"/></linearGradient>
            <linearGradient id={`${uid}-violet`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff1ff"/><stop offset=".45" stopColor="#c6abed"/><stop offset="1" stopColor="#7664ad"/></linearGradient>
        </defs>
        <ellipse cx="80" cy="126" rx={stage === 0 ? 19 : 47} ry="8" fill="#201e21" opacity=".2"/>
        {cropId === 'axiom-wheat' && <g>
            {(stage === 0 ? [-13, 12] : stage === 1 ? [-23, 0, 23] : [-38, -20, 0, 20, 38]).map((offset, i) => {
                const height = [28, 51, 75, 88][stage] - Math.abs(offset) * .38;
                const tipX = 80 + offset;
                const tipY = 123 - height;
                return <g key={offset}>
                    <path d={`M${80 + offset * .24} 126 Q${tipX + 5} ${tipY + 43} ${tipX} ${tipY}`} fill="none" stroke={stage === 3 ? '#c8ad63' : '#75a074'} strokeWidth="2.8" strokeLinecap="round"/>
                    <Leaf x={tipX + 2} y={Math.min(116, tipY + 34)} angle={i % 2 ? 195 : -8} size={stage === 0 ? .5 : .75} fill={stage === 3 ? gold : leaf}/>
                    {stage > 0 && <Leaf x={tipX + 3} y={Math.min(119, tipY + 50)} angle={i % 2 ? 0 : 190} size={.65} fill={leaf}/>}
                    {stage > 1 && <g transform={`translate(${tipX} ${tipY + 17}) rotate(${offset * .32})`}>
                        {[0, 1, 2, 3, 4].map((row) => <g key={row} transform={`translate(0 ${-row * 5})`}>
                            <path d="M0 3 Q-11 0 -9 -8 Q-1 -8 0 3 M0 3 Q11 0 9 -8 Q1 -8 0 3" fill={stage === 3 ? gold : leaf} stroke={stage === 3 ? '#a77b3d' : '#638658'} strokeWidth=".7"/>
                            <path d="M-8 -7 -12 -16 M8 -7 12 -16" stroke={stage === 3 ? '#f6d88d' : '#aabd86'} strokeWidth=".8"/>
                        </g>)}
                    </g>}
                </g>;
            })}
        </g>}
        {cropId === 'implication-vine' && <g>
            {stage > 0 && <g stroke="#c9b489" strokeWidth="3" fill="none"><path d="M47 125 61 28 M113 125 99 28 M55 52 104 52 M51 81 109 81"/><path d="M58 34 102 34" strokeWidth="2"/><path d="M60 28 65 33 M96 34 99 28" stroke="#f2e0b2" strokeWidth="1"/></g>}
            <path d={stage === 0 ? 'M79 126 Q72 111 86 100' : stage === 1 ? 'M80 126 C114 105 50 109 73 79 Q82 70 90 75' : stage === 2 ? 'M80 126 C123 99 43 113 73 79 C99 65 62 58 76 45 L93 37' : 'M80 126 C123 99 43 113 73 79 C109 61 54 65 78 40 Q98 25 119 30'} fill="none" stroke="#3c8b72" strokeWidth="5" strokeLinecap="round"/>
            <path d={stage < 2 ? 'M80 124 Q83 113 74 110' : 'M80 124 C121 99 45 113 74 79 C104 65 61 58 78 44'} fill="none" stroke="#a8f1d4" strokeWidth="1.2"/>
            {(stage === 0 ? [[79, 114, 5]] : stage === 1 ? [[79, 117, 0], [76, 90, 180], [82, 76, -4]] : [[79, 117, 0], [85, 101, 170], [74, 81, -8], [88, 66, 170], [79, 47, 0]]).map(([x, y, angle], i) => <Leaf key={i} x={x} y={y} angle={angle} size={stage === 0 ? .6 : .83} fill={blue}/>)}
            {stage === 3 && <g fill={blue} stroke="#3f9986" strokeWidth="1.4"><path d="M111 28 134 22 127 39 118 34 108 40Z"/><path d="M51 80 38 72 34 93 44 88 51 98Z"/><path d="M114 104 124 95 130 118 119 113 109 121Z"/><path d="M118 30 129 25 M43 81 40 87 M122 104 125 113" stroke="#e0fff1"/></g>}
        </g>}
        {cropId === 'contradiction-berry' && <g>
            <path d={stage < 2 ? 'M80 126 Q73 111 80 95' : 'M80 126 78 71 M79 106 Q53 92 49 62 M79 97 Q105 85 112 56 M78 80 94 49'} stroke="#687f52" strokeWidth="3.3" fill="none" strokeLinecap="round"/>
            {(stage === 0 ? [[80, 109, 0], [80, 102, 170]] : stage === 1 ? [[80, 113, 5], [80, 98, 178], [80, 93, -25]] : [[67, 106, 15], [79, 87, 180], [48, 75, -18], [55, 68, 175], [104, 78, -15], [108, 64, 175], [83, 70, 15], [93, 50, 165]]).map(([x, y, angle], i) => <Leaf key={i} x={x} y={y} angle={angle} size={stage < 2 ? .6 + stage * .25 : .85} fill={leaf}/>)}
            {stage > 1 && [[50, 83], [108, 88], [87, 63]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y}) scale(${stage === 2 ? .58 : 1})`}>
                <path d="M-6 -8 Q0 -21 7 -8" fill="none" stroke="#5e7952" strokeWidth="2"/>
                <path d="M-7 -10 C-19 -13 -22 -1 -13 11 Q-9 17 -3 9 C4 -1 2 -10 -7 -10Z" fill={stage === 3 ? pink : leaf} stroke="#754f67" strokeWidth="1"/>
                <path d="M8 -9 C-3 -12 -5 0 3 12 Q9 18 15 9 C23 -3 18 -11 8 -9Z" fill={stage === 3 ? violet : leaf} stroke="#69547d" strokeWidth="1"/>
                <path d="M-11 -8 -7 -5 -3 -8 M4 -7 9 -4 13 -7" fill="none" stroke="#769861" strokeWidth="2"/>
                {stage === 3 && <g fill="#ffe5e4"><circle cx="-13" cy="-2" r="1.6"/><circle cx="-9" cy="5" r="1"/><circle cx="3" cy="0" r="1.4"/><circle cx="8" cy="7" r="1"/></g>}
            </g>)}
        </g>}
        {cropId === 'theorem-lotus' && <g>
            <ellipse cx="80" cy="120" rx={stage === 0 ? 29 : 56} ry="14" fill="#538d8e" opacity=".35"/><ellipse cx="80" cy="120" rx={stage === 0 ? 26 : 53} ry="11" fill="none" stroke="#a4d5d2" opacity=".65"/>
            {(stage === 0 ? [[78, 116, 0]] : [[62, 117, -8], [103, 120, 170], [88, 129, 100]]).map(([x, y, angle], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}><path d="M0 0 -15 -9 Q-37 -8 -30 4 Q-12 16 0 0Z" fill={leaf} stroke="#558678"/><path d="M-3 1 -25 0 M-10 0 -16 -6 M-13 1 -20 7" stroke="#c9d6a0" strokeWidth=".8" fill="none"/></g>)}
            <path d={`M80 119 Q90 105 80 ${[111, 86, 73, 75][stage]}`} stroke="#73a58a" strokeWidth="3" fill="none"/>
            {stage === 1 && <path d="M80 92 Q62 84 80 64 Q98 84 80 92Z" fill={violet} stroke="#8c83b0" strokeWidth="1.3"/>}
            {stage === 2 && <g><path d="M80 92 Q51 78 63 53 Q78 57 80 76 Q82 53 99 48 Q110 75 80 92Z" fill={violet} stroke="#8c83b0" strokeWidth="1"/><path d="M80 92 Q59 64 80 39 Q102 64 80 92Z" fill={violet} stroke="#8c83b0" strokeWidth="1"/><path d="M80 86 80 48" stroke="#eee2ff" strokeWidth="1"/></g>}
            {stage === 3 && <g>
                <ellipse cx="80" cy="113" rx="28" ry="5" fill="#cfb3ff" opacity=".22"/>
                {[-68, -44, -22, 0, 22, 44, 68].map((angle, i) => <path key={angle} d="M80 96 Q48 62 80 24 Q110 63 80 96Z" transform={`rotate(${angle} 80 94) scale(1 ${i % 2 ? .91 : 1})`} fill={violet} stroke="#9682be" strokeWidth="1.2"/>)}
                <path d="M80 96 Q44 103 29 76 Q56 68 80 96 Q104 68 131 76 Q114 104 80 96Z" fill={violet} stroke="#a08bc3"/>
                <path d="M80 93 Q59 72 80 52 Q99 72 80 93Z" fill="#f1d6ff" stroke="#ba9bdc"/>
                <ellipse cx="80" cy="88" rx="12" ry="5" fill="#f4d28d"/><path d="M80 62 84 73 80 83 76 73Z" fill="#fff2c5" stroke="#fae2a0"/>
            </g>}
        </g>}
    </svg>;
});

export function FarmSeedArt({ cropId }: { cropId: FarmCropId }) {
    const colors = { 'axiom-wheat': ['#f0d185', '#b78146'], 'implication-vine': ['#a8e7d1', '#5a9c87'], 'contradiction-berry': ['#edacca', '#ab608c'], 'theorem-lotus': ['#d4c3f0', '#8a73b2'] }[cropId];
    return <svg viewBox="0 0 64 72" className="farm-seed-art" aria-hidden="true" focusable="false">
        <path d="M12 8 51 8 55 17 53 64 9 64 8 18Z" fill="#e5cf9f" stroke="#ad8b58" strokeWidth="1.6"/><path d="M12 8 16 18 47 18 51 8" fill="#f4e2b6" stroke="#bd9d68"/><path d="M13 58 49 58 M13 62 49 62" stroke="#a98b5d" opacity=".5"/>
        <circle cx="31" cy="37" r="17" fill={colors[0]} opacity=".5"/>
        {cropId === 'axiom-wheat' ? <g fill={colors[1]} stroke={colors[1]}><path d="M31 52 31 23" fill="none" strokeWidth="1.5"/>{[26, 32, 38, 44].map(y => <path key={y} d={`M31 ${y+3} Q19 ${y} 23 ${y-4} Q31 ${y-3} 31 ${y+3} Q43 ${y} 39 ${y-4} Q31 ${y-3} 31 ${y+3}`}/>)}</g> : cropId === 'implication-vine' ? <g stroke={colors[1]} fill="none" strokeWidth="2"><path d="M24 52 C44 44 19 43 30 31 L40 25"/><path d="M32 25 42 24 39 33"/><path d="M28 42 Q17 44 18 33 Q27 33 28 42" fill={colors[1]}/></g> : cropId === 'contradiction-berry' ? <g fill={colors[1]}><ellipse cx="24" cy="41" rx="8" ry="11"/><ellipse cx="40" cy="41" rx="8" ry="11" fill="#80699d"/><path d="M24 32 Q29 21 40 31" fill="none" stroke="#759368" strokeWidth="2"/></g> : <g fill={colors[1]} stroke="#8065a5"><path d="M32 50 Q18 37 32 22 Q46 37 32 50 M32 50 Q11 48 15 33 Q29 33 32 50 M32 50 Q53 48 49 33 Q35 33 32 50"/><circle cx="32" cy="45" r="3" fill="#f5e3a7" stroke="none"/></g>}
    </svg>;
}

export default FarmCropArt;
