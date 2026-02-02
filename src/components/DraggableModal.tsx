import React, { useState, useRef, useEffect } from 'react';

interface DraggableModalProps {
    children: React.ReactNode;
    title?: string;
    initialX?: number;
    initialY?: number;
}

const DraggableModal: React.FC<DraggableModalProps> = ({ children, title, initialX, initialY }) => {
    // Default position: Centered roughly near top
    // We'll calculate center dynamically if initialX/Y not provided, but for SSR safety start with defaults
    const [position, setPosition] = useState({ x: initialX ?? 0, y: initialY ?? 128 });
    const [isDragging, setIsDragging] = useState(false);
    const [rel, setRel] = useState({ x: 0, y: 0 }); // Relative position of mouse to top-left of modal
    const modalRef = useRef<HTMLDivElement>(null);

    // Center on mount if no initial pos provided
    useEffect(() => {
        if (initialX === undefined && initialY === undefined && modalRef.current) {
             const rect = modalRef.current.getBoundingClientRect();
             const winWidth = window.innerWidth;
             setPosition({
                 x: (winWidth - rect.width) / 2,
                 y: 128 // Keep consistent top margin
             });
        }
    }, [initialX, initialY]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        setIsDragging(true);
        const rect = modalRef.current!.getBoundingClientRect();
        setRel({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        e.stopPropagation();
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - rel.x,
            y: e.clientY - rel.y
        });
        e.stopPropagation();
        e.preventDefault();
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Attach global listeners for drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div 
            ref={modalRef}
            className="absolute bg-green-900/90 border-2 border-green-500 rounded-xl p-8 shadow-2xl z-50 backdrop-blur-md select-none"
            style={{ 
                left: position.x, 
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'auto'
            }}
        >
            {/* Drag Handle Area (Invisible or explicit) */}
            <div 
                onMouseDown={handleMouseDown}
                className="absolute inset-0 cursor-grab active:cursor-grabbing z-0"
                title="Drag to move"
            />
            
            {/* Content Container - Ensure clicks on buttons work by placing them above drag layer */}
            <div className="relative z-10 pointer-events-auto">
                {children}
            </div>
        </div>
    );
};

export default DraggableModal;