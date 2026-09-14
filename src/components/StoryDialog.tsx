'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StoryScene } from '@/data/story';
import { AURELIA_PORTRAITS, getStoryArt, getVisibleHalo } from '@/data/story-art';
import { assetUrl } from '@/lib/art-assets';
import { useVisualSettings } from '@/contexts/VisualSettingsContext';
import { useArtModal } from '@/lib/use-art-modal';
import './story-dialog.css';
import '@/styles/story-journal.css';

interface StoryDialogProps {
    scene: StoryScene;
    language: 'en' | 'zh';
    onComplete: (skipped:boolean) => void;
    choices:Record<string,string>;
    initialIndex?:number;
    replay?:boolean;
    haloCracked?:boolean;
    onRead:(index:number)=>void;
    onChoice:(choiceId:string,optionId:string)=>void;
}

/** Reset safely when a scene is replayed in another language. */
export default function StoryDialog(props: StoryDialogProps) {
    return <StoryReader key={`${props.scene.id}:${props.language}`} {...props} />;
}

function StoryReader({ scene, language, onComplete,choices,initialIndex=0,replay=false,haloCracked=false,onRead,onChoice }: StoryDialogProps) {
    const { reducedMotion, quality } = useVisualSettings();
    const [lineIndex, setLineIndex] = useState(initialIndex);
    const [localChoices,setLocalChoices]=useState(choices);
    const [history,setHistory]=useState(false);
    const [reveal, setReveal] = useState({ line: 0, count: 0 });
    const completeRef = useRef(false);
    const continueRef = useRef<HTMLButtonElement>(null);
    const rootRef=useRef<HTMLElement>(null);
    const close=()=>{if(!completeRef.current){completeRef.current=true;onComplete(true);}};
    useArtModal(rootRef,()=>{if(history)setHistory(false);else close();});
    useEffect(()=>{if(!replay)onRead(lineIndex);},[lineIndex,onRead,replay]);
    const art = getStoryArt(scene.artId);
    const sourceLine = scene.lines[lineIndex];
    const answer=sourceLine?.choice?.options.find(option=>option.id===localChoices[sourceLine.choice!.id]);
    const echo=sourceLine?.echo;
    const line = answer ? {...sourceLine,...answer.reply,speaker:'aurelia' as const} : echo && localChoices[echo.choiceId]===echo.optionId ? {...sourceLine,...echo.text} : sourceLine;
    const needsChoice=!!sourceLine?.choice && !answer;
    const lineArt = {expression:sourceLine?.expression??'calm',halo:sourceLine?.halo??(scene.chapter>=9||(scene.kind!=='main'&&haloCracked)?'cracked':'intact'),fractureCue:sourceLine?.haloRevealCue} as const;
    const lineText=line?.[language]??'';
    const characters = useMemo(() => Array.from(lineText), [lineText]);
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
        const next = scene.lines[lineIndex + 1];
        if (!next || next.expression === lineArt.expression) return;
        const image = new window.Image();
        image.src = assetUrl(AURELIA_PORTRAITS[next.expression ?? 'calm']);
    }, [scene, lineArt.expression, lineIndex]);

    const advance = useCallback(() => {
        if (completeRef.current || history) return;
        if (!isRevealed) setReveal({ line: lineIndex, count: characters.length });
        else if(needsChoice)return;
        else if (isLast) { completeRef.current = true; onComplete(false); }
        else setLineIndex((value) => value + 1);
    }, [characters.length, isLast, isRevealed, lineIndex, onComplete,needsChoice,history]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Tab' || event.key==='Escape') return;
            event.stopPropagation();
            if(event.target instanceof HTMLButtonElement && ['Enter',' '].includes(event.key))return;
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
        <section ref={rootRef} tabIndex={-1} className="story-scene" data-atmosphere={art.atmosphere} data-reduced-motion={reducedMotion}
            data-quality={quality} data-scene-id={scene.id} data-line-index={lineIndex}
            role="dialog" aria-modal="true" aria-labelledby="story-scene-title" onClick={advance}>
            <Image className="story-scene__background" src={assetUrl(art.background)} alt="" fill priority unoptimized sizes="100vw" style={{ objectPosition: art.position }} />
            <div className="story-scene__shade" aria-hidden="true" />
            <div className="story-scene__ambience" aria-hidden="true" />
            <nav className="story-reader-tools" aria-label={zh?'阅读控制':'Reading controls'} onClick={event=>event.stopPropagation()}>
                {replay && <span>{zh?'回忆 · 不改变记录':'Memory · progress unchanged'}</span>}
                <button onClick={()=>setHistory(value=>!value)}>{history?(zh?'返回对白':'Back'):(zh?'本段回看':'Transcript')}</button>
                <button onClick={close}>{replay?(zh?'结束回忆':'Close memory'):(zh?'跳过本段':'Skip scene')}</button>
            </nav>
            <header className="story-scene__heading">
                <div className="story-scene__eyebrow">
                    <span className="story-scene__chapter">{zh ? '第二幕' : 'ACT II'} / {String(scene.chapter).padStart(2,'0')}</span>
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
            <div className="story-dialogue" inert={history}>
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
                {needsChoice && isRevealed && <div className="story-options" onClick={event=>event.stopPropagation()}>{sourceLine.choice!.options.map(option=><button key={option.id} onClick={()=>{
                    setLocalChoices(previous=>({...previous,[sourceLine.choice!.id]:option.id}));
                    setReveal({line:lineIndex,count:0});
                    if(!replay)onChoice(sourceLine.choice!.id,option.id);
                }}>{option.text[language]}</button>)}</div>}
                {replay&&answer&&<button className="story-rechoose" onClick={event=>{event.stopPropagation();setLocalChoices(previous=>{const next={...previous};delete next[sourceLine.choice!.id];return next;});setReveal({line:lineIndex,count:0});}}>{zh?'回忆中换个回答':'Try another reply in this memory'}</button>}
                <div className="story-dialogue__footer">
                    <span className="story-dialogue__hint">{zh ? '点击画面 · 空格 / Enter' : 'Click anywhere · Space / Enter'}</span>
                    <button ref={continueRef} disabled={needsChoice&&isRevealed} type="button" className="story-dialogue__continue" onClick={(event) => { event.stopPropagation(); advance(); }}>
                        <span>{needsChoice&&isRevealed?(zh?'选择回答':'Choose a reply'):!isRevealed ? (zh ? '显示全文' : 'Reveal text') : isLast ? (zh ? '结束本段' : 'Finish scene') : (zh ? '继续' : 'Continue')}</span>
                        <span aria-hidden="true">{isLast && isRevealed ? '↗' : '→'}</span>
                    </button>
                </div>
            </div>
            {history && <div className="story-transcript" onClick={event=>event.stopPropagation()} role="region" aria-label={zh?'本段对白记录':'Scene transcript'}>
                <h3>{zh?'本段回看':'Scene transcript'}</h3>
                {scene.lines.slice(0,lineIndex+1).map((entry,index)=>{const e=entry.echo,selected=entry.choice?.options.find(option=>option.id===localChoices[entry.choice!.id]);return <div key={index}><small>{entry.speaker==='aurelia'?(zh?'奥蕾莉娅':'Aurelia'):entry.speaker==='player'?(zh?'你':'You'):(zh?'旁白':'Narration')}</small><p>{e&&localChoices[e.choiceId]===e.optionId?e.text[language]:entry[language]}</p>{selected&&<><p className="story-transcript-choice">{zh?'你：':'You: '}{selected.text[language]}</p><p>{zh?'奥蕾莉娅：':'Aurelia: '}{selected.reply[language]}</p></>}</div>;})}
                <button onClick={()=>setHistory(false)}>{zh?'返回对白':'Back to scene'}</button>
            </div>}
        </section>
    );
}
