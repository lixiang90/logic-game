'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { StoryScene } from '@/data/story';

interface StoryDialogProps {
    scene: StoryScene;
    language: 'en' | 'zh';
    onComplete: () => void;
}

export default function StoryDialog({ scene, language, onComplete }: StoryDialogProps) {
    const [lineIndex, setLineIndex] = useState(0);

    const line = scene.lines[lineIndex];
    const isLast = lineIndex === scene.lines.length - 1;
    const speaker = line.speaker === 'aurelia'
        ? (language === 'zh' ? '奥蕾莉娅' : 'Aurelia')
        : line.speaker === 'player'
          ? (language === 'zh' ? '你' : 'You')
          : '';

    const advance = () => {
        if (isLast) onComplete();
        else setLineIndex((value) => value + 1);
    };

    return (
        <div className="fixed inset-0 z-[200] overflow-hidden bg-[radial-gradient(circle_at_50%_20%,#164e63_0%,#020617_62%)] text-white" onClick={advance}>
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.08) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
            <div className="absolute left-6 top-6 z-20 sm:left-10 sm:top-10">
                <div className="text-xs font-bold uppercase tracking-[0.4em] text-cyan-300">{scene.location[language]}</div>
                <h2 className="mt-2 text-2xl font-black sm:text-4xl">{scene.title[language]}</h2>
            </div>
            <Image
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/goddess-aurelia.png?v=2`}
                alt={language === 'zh' ? '数学世界的女神奥蕾莉娅' : 'Aurelia, goddess of the mathematical world'}
                width={997}
                height={1536}
                priority
                unoptimized
                className={`absolute bottom-0 right-0 h-[84vh] w-auto object-contain drop-shadow-[0_0_40px_rgba(34,211,238,.22)] transition-opacity ${line.speaker === 'aurelia' ? 'opacity-100' : 'opacity-65'}`}
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 100%)', maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 100%)' }}
            />
            <div className="absolute bottom-5 left-1/2 z-30 w-[min(94vw,1000px)] -translate-x-1/2 rounded-3xl border border-cyan-300/30 bg-slate-950/88 p-6 shadow-2xl backdrop-blur-xl sm:bottom-10 sm:p-8">
                <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="text-sm font-black uppercase tracking-[0.25em] text-cyan-200">{speaker || (language === 'zh' ? '旁白' : 'Narration')}</div>
                    <div className="text-xs text-slate-500">{lineIndex + 1} / {scene.lines.length}</div>
                </div>
                <p className="min-h-16 text-lg leading-relaxed text-slate-100 sm:text-xl">{line[language]}</p>
                <div className="mt-5 flex justify-end">
                    <button type="button" onClick={(event) => { event.stopPropagation(); advance(); }} className="rounded-xl bg-cyan-500 px-6 py-2.5 font-black text-slate-950 hover:bg-cyan-300">
                        {isLast ? (language === 'zh' ? '进入关卡' : 'Enter chapter') : (language === 'zh' ? '继续' : 'Continue')}
                    </button>
                </div>
            </div>
        </div>
    );
}
