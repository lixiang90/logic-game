'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StoryScene } from '@/data/story';
import { AURELIA_PORTRAITS, getStoryArt, getVisibleHalo } from '@/data/story-art';
import { assetUrl } from '@/lib/art-assets';
import { useVisualSettings } from '@/contexts/VisualSettingsContext';
import './story-dialog.css';

interface StoryDialogProps {
    scene: StoryScene;
    language: 'en' | 'zh';
    onComplete: () => void;
}

/** Reset safely when a scene is replayed in another language. */
export default function StoryDialog(props: StoryDialogProps) {
    return <StoryReader key={`${props.scene.id}:${props.language}`} {...props} />;
}

function StoryReader({ scene, language, onComplete }: StoryDialogProps) {
    const { reducedMotion, quality } = useVisualSettings();
    const [lineIndex, setLineIndex] = useState(0);
    const [reveal, setReveal] = useState({ line: 0, count: 0 });
    const completeRef = useRef(false);
    const continueRef = useRef<HTMLButtonElement>(null);
    const art = getStoryArt(scene.id);
    const line = scene.lines[lineIndex];
    const lineArt = art.lines[lineIndex] ?? art.lines[art.lines.length - 1];
    const characters = useMemo(() => Array.from(line?.[language] ?? ''), [line, language]);
    const shownCount = reducedMotion ? characters.length : reveal.line === lineIndex ? reveal.count : 0;
    const visibleText = characters.slice(0, shownCount).join('');
    const isRevealed = shownCount >= characters.length;
    const isLast = lineIndex >= scene.lines.length - 1;
    const halo = getVisibleHalo(lineArt, visibleText, language);
    const zh = language === 'zh';
    const speaker = line?.speaker === 'aurelia'
        ? (zh ? '奥蕾莉娅' : 'Aurelia')
        : line?.speaker === 'player' ? (zh ? '你' : 'You') : (zh ? '旁白' : 'Narration');

    useEffect(() => { continueRef.current?.focus({ preventScroll: true }); }, []);

    useEffect(() => {
        if (reducedMotion || isRevealed) return;
        const timer = window.setInterval(() => {
            setReveal((previous) => ({
                line: lineIndex,
                count: Math.min(characters.length, (previous.line === lineIndex ? previous.count : 0) + 1),
            }));
        }, zh ? 38 : 23);
        return () => window.clearInterval(timer);
    }, [characters.length, isRevealed, lineIndex, reducedMotion, zh]);

    // Decode only the next portrait, rather than the entire story archive.
    useEffect(() => {
        const next = art.lines[lineIndex + 1];
        if (!next || next.expression === lineArt.expression) return;
        const image = new window.Image();
        image.src = assetUrl(AURELIA_PORTRAITS[next.expression]);
    }, [art, lineArt.expression, lineIndex]);

    const advance = useCallback(() => {
        if (completeRef.current) return;
        if (!isRevealed) setReveal({ line: lineIndex, count: characters.length });
        else if (isLast) { completeRef.current = true; onComplete(); }
        else setLineIndex((value) => value + 1);
    }, [characters.length, isLast, isRevealed, lineIndex, onComplete]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Tab') {
                event.preventDefault();
                continueRef.current?.focus();
                return;
            }
            if (!['Enter', ' ', 'ArrowRight'].includes(event.key) || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            event.stopPropagation();
            advance();
        };
        window.addEventListener('keydown', handleKey, true);
        return () => window.removeEventListener('keydown', handleKey, true);
    }, [advance]);

    if (!line) return null;
    return (
        <section className="story-scene" data-atmosphere={art.atmosphere} data-reduced-motion={reducedMotion}
            data-quality={quality} data-scene-id={scene.id} data-line-index={lineIndex}
            role="dialog" aria-modal="true" aria-labelledby="story-scene-title" onClick={advance}>
            <Image className="story-scene__background" src={assetUrl(art.background)} alt="" fill priority unoptimized sizes="100vw" style={{ objectPosition: art.position }} />
            <div className="story-scene__shade" aria-hidden="true" />
            <div className="story-scene__ambience" aria-hidden="true" />
            <header className="story-scene__heading">
                <div className="story-scene__eyebrow">
                    <span className="story-scene__chapter">{zh ? '第二幕' : 'ACT II'} / {scene.id.split('-').at(-1)?.padStart(2, '0')}</span>
                    <span className="story-scene__rule" aria-hidden="true" /><span>{scene.location[language]}</span>
                </div>
                <h2 id="story-scene-title">{scene.title[language]}</h2>
                <div className="story-scene__heading-ornament" aria-hidden="true">◇ <span /> ◇</div>
            </header>
            <div className={`story-scene__portrait-stage ${line.speaker === 'aurelia' ? 'is-speaking' : 'is-listening'}`} data-expression={lineArt.expression} data-halo={halo}>
                <Image key={lineArt.expression} className="story-scene__portrait" src={assetUrl(AURELIA_PORTRAITS[lineArt.expression])}
                    alt={zh ? '奥蕾莉娅，数学世界的守望者' : 'Aurelia, keeper of the mathematical world'} width={1024} height={1536} priority unoptimized />
                <Image className="story-scene__halo" src={assetUrl(`/art/characters/halo-${halo}.svg`)} alt="" aria-hidden="true" width={480} height={480} unoptimized />
            </div>
            <div className="story-dialogue">
                <div className="story-dialogue__topline">
                    <div className="story-dialogue__speaker"><span className="story-dialogue__speaker-mark" aria-hidden="true">◇</span><span>{speaker}</span>
                        {line.speaker === 'aurelia' && <span className="story-dialogue__speaker-role">{zh ? '数学世界的守望者' : 'KEEPER OF THE MATHEMATICAL WORLD'}</span>}
                    </div>
                    <span className="story-dialogue__page" aria-label={zh ? `第${lineIndex + 1}句，共${scene.lines.length}句` : `Line ${lineIndex + 1} of ${scene.lines.length}`}>
                        {String(lineIndex + 1).padStart(2, '0')} <span>/ {String(scene.lines.length).padStart(2, '0')}</span>
                    </span>
                </div>
                <p className="story-dialogue__text" aria-hidden="true">{visibleText}<span className={`story-dialogue__cursor ${isRevealed ? 'is-hidden' : ''}`} /></p>
                <p className="story-dialogue__accessible" aria-live="polite" aria-atomic="true">{speaker}: {line[language]}</p>
                <div className="story-dialogue__footer">
                    <span className="story-dialogue__hint">{zh ? '点击画面 · 空格 / Enter' : 'Click anywhere · Space / Enter'}</span>
                    <button ref={continueRef} type="button" className="story-dialogue__continue" onClick={(event) => { event.stopPropagation(); advance(); }}>
                        <span>{!isRevealed ? (zh ? '显示全文' : 'Reveal text') : isLast ? (zh ? '进入关卡' : 'Enter chapter') : (zh ? '继续' : 'Continue')}</span>
                        <span aria-hidden="true">{isLast && isRevealed ? '↗' : '→'}</span>
                    </button>
                </div>
            </div>
        </section>
    );
}
