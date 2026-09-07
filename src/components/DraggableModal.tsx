import React, { useEffect, useRef, useState } from 'react';
import GameIcon from './GameIcon';
import { useLanguage } from '@/contexts/LanguageContext';
interface DraggableModalProps { children: React.ReactNode; title?: string; initialX?: number; initialY?: number; }
export default function DraggableModal({ children, title, initialX, initialY }: DraggableModalProps) {
    const { language } = useLanguage();
    const [position, setPosition] = useState<{ x: number; y: number } | null>(initialX !== undefined ? { x: initialX, y: initialY ?? 128 } : null);
    const modalRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; y: number } | null>(null);
    const clamp = (x: number, y: number) => {
        const box = modalRef.current?.getBoundingClientRect();
        return { x: Math.max(8, Math.min(x, window.innerWidth - (box?.width ?? 320) - 8)), y: Math.max(65, Math.min(y, window.innerHeight - Math.min(box?.height ?? 250, window.innerHeight - 80) - 8)) };
    };
    useEffect(() => {
        const resize = () => setPosition(previous => previous ? clamp(previous.x, previous.y) : previous);
        window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
    }, []);
    return <div ref={modalRef} role="dialog" aria-label={title} className="art-draggable" style={position ? { left: position.x, top: position.y } : { left: '50%', top: 'clamp(90px, 20vh, 170px)', transform: 'translateX(-50%)' }}>
        <button type="button" className="art-drag-handle" aria-label={language === 'zh' ? '拖动面板，或使用方向键移动' : 'Drag panel, or use arrow keys to move'}
            onPointerDown={event => { const rect = modalRef.current!.getBoundingClientRect(); drag.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={event => { if (drag.current) setPosition(clamp(event.clientX - drag.current.x, event.clientY - drag.current.y)); }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
            onKeyDown={event => { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return; event.preventDefault(); event.stopPropagation(); const rect = modalRef.current!.getBoundingClientRect(); setPosition(clamp(rect.left + (event.key === 'ArrowRight' ? 10 : event.key === 'ArrowLeft' ? -10 : 0), rect.top + (event.key === 'ArrowDown' ? 10 : event.key === 'ArrowUp' ? -10 : 0))); }}>
            <span>{title ?? (language === 'zh' ? '星图学宫' : 'CELESTIAL ACADEMY')}</span><GameIcon name="layers" size={16} />
        </button>{children}
    </div>;
}
