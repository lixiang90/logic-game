'use client';

import { memo, useEffect, useRef } from 'react';
import type { NodeData, Wire } from '@/types/game';
import { getAbsolutePortPosition, getNodeBounds, getNodePorts } from '@/lib/gameUtils';
import { drawCircuitItem } from '@/lib/render/circuit-art';
import { ART_THEME } from '@/lib/art-theme';
import { useVisualSettings } from '@/contexts/VisualSettingsContext';

interface CircuitThumbnailProps {
    nodes: readonly NodeData[];
    wires?: readonly Wire[];
    language?: 'zh' | 'en';
    height?: number;
    className?: string;
    label?: string;
}

const EMPTY_WIRES: readonly Wire[] = [];
const GRID_SIZE = 25;

/** A still portrait of saved geometry. It never solves or changes the circuit. */
export default memo(function CircuitThumbnail({ nodes, wires = EMPTY_WIRES, language = 'zh', height = 142, className = '', label }: CircuitThumbnailProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { quality } = useVisualSettings();
    const description = label ?? (language === 'zh' ? `${nodes.length} 个节点的电路缩略图` : `Circuit preview with ${nodes.length} nodes`);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        const validNodes = nodes.filter(node => node && [node.x, node.y, node.w, node.h].every(Number.isFinite) && node.w >= 0 && node.h >= 0 && (node.type === 'wire' ? node.w + node.h > 0 : node.w > 0 && node.h > 0));
        const nodeMap = new Map(validNodes.map(node => [node.id, node]));
        const savedPaths = wires.flatMap(wire => {
            const path = (wire.path ?? []).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
            if (path.length > 1) return [{ type: wire.type, path }];
            // Older explicit wires without a path still retain their real endpoint IDs.
            const start = nodeMap.get(wire.startNodeId), end = nodeMap.get(wire.endNodeId);
            const startPort = start && getNodePorts(start).find(port => port.id === wire.startPortId);
            const endPort = end && getNodePorts(end).find(port => port.id === wire.endPortId);
            return start && end && startPort && endPort
                ? [{ type: wire.type, path: [getAbsolutePortPosition(start, startPort), getAbsolutePortPosition(end, endPort)] }]
                : [];
        });
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
        for (const node of validNodes) {
            const bounds = getNodeBounds(node);
            left = Math.min(left, bounds.x); top = Math.min(top, bounds.y);
            right = Math.max(right, bounds.x + bounds.w); bottom = Math.max(bottom, bounds.y + bounds.h);
        }
        for (const wire of savedPaths) for (const point of wire.path) {
            left = Math.min(left, point.x); top = Math.min(top, point.y);
            right = Math.max(right, point.x); bottom = Math.max(bottom, point.y);
        }
        let previousWidth = -1, previousHeight = -1, previousDpr = -1;
        const draw = () => {
            const rect = canvas.getBoundingClientRect();
            const width = Math.round(rect.width), canvasHeight = Math.round(rect.height);
            if (width <= 0 || canvasHeight <= 0) return;
            const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1.25 : 2);
            if (width === previousWidth && canvasHeight === previousHeight && dpr === previousDpr) return;
            previousWidth = width; previousHeight = canvasHeight; previousDpr = dpr;
            canvas.width = Math.round(width * dpr); canvas.height = Math.round(canvasHeight * dpr);
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            context.fillStyle = '#0c1b2c'; context.fillRect(0, 0, width, canvasHeight);
            context.strokeStyle = '#a9b4a414'; context.lineWidth = 1;
            context.beginPath();
            for (let x = 18.5; x < width; x += 22) { context.moveTo(x, 0); context.lineTo(x, canvasHeight); }
            for (let y = 12.5; y < canvasHeight; y += 22) { context.moveTo(0, y); context.lineTo(width, y); }
            context.stroke();
            if (!Number.isFinite(left)) {
                context.fillStyle = ART_THEME.muted; context.font = `11px ${ART_THEME.font}`;
                context.textAlign = 'center'; context.textBaseline = 'middle';
                context.fillText(language === 'zh' ? '尚无电路' : 'No circuit yet', width / 2, canvasHeight / 2);
                return;
            }
            // The margin includes external ports, body shadows and rotated device outlines.
            const worldWidth = Math.max(1, right - left) * GRID_SIZE;
            const worldHeight = Math.max(1, bottom - top) * GRID_SIZE;
            const inset = Math.min(24, width * .09, canvasHeight * .15);
            const scale = Math.min((width - inset * 2) / (worldWidth + 26), (canvasHeight - inset * 2) / (worldHeight + 26), 1.15);
            context.save();
            context.translate(width / 2, canvasHeight / 2);
            context.scale(scale, scale);
            context.translate(-(left + right) * GRID_SIZE / 2, -(top + bottom) * GRID_SIZE / 2);
            for (const wire of savedPaths) {
                context.beginPath();
                wire.path.forEach((point, index) => index === 0 ? context.moveTo(point.x * GRID_SIZE, point.y * GRID_SIZE) : context.lineTo(point.x * GRID_SIZE, point.y * GRID_SIZE));
                context.lineCap = 'round'; context.lineJoin = 'round';
                context.strokeStyle = '#07111e'; context.lineWidth = Math.max(6, 2.3 / scale); context.stroke();
                context.strokeStyle = wire.type === 'provable' ? ART_THEME.provable : ART_THEME.formula;
                context.lineWidth = Math.max(2.5, 1.15 / scale); context.stroke();
            }
            const state = { scale, time: 0, low: quality === 'low', reducedMotion: true, active: false, error: false, language };
            // Legacy segments sit behind bodies, just like the live canvas.
            for (const node of validNodes) if (node.type === 'wire') drawCircuitItem(context, node, node.x * GRID_SIZE, node.y * GRID_SIZE, state);
            for (const node of validNodes) if (node.type !== 'wire') drawCircuitItem(context, node, node.x * GRID_SIZE, node.y * GRID_SIZE, state);
            context.restore();
        };
        draw();
        const observer = new ResizeObserver(draw);
        observer.observe(canvas);
        // Resize also covers moving between displays with different pixel densities.
        window.addEventListener('resize', draw);
        return () => { observer.disconnect(); window.removeEventListener('resize', draw); };
    }, [nodes, wires, language, height, quality]);

    return <canvas ref={canvasRef} className={`art-blueprint-preview ${className}`} role="img" aria-label={description} style={{ display: 'block', width: '100%', height, borderRadius: 6, border: '1px solid #b59f6e3b', background: '#0c1b2c' }}>{description}</canvas>;
});
