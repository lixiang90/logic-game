import type { FarmPlotState } from '@/types/stage2';

export type FarmGrowthStage = 0 | 1 | 2 | 3;

/** Presentation only: no new clock or persistent state is introduced. */
export function getFarmGrowth(plot: FarmPlotState, now: number, growMs: number) {
    if (!plot.cropId || plot.readyAt === undefined) return { stage: 0 as FarmGrowthStage, ratio: 0, ready: false, remaining: 0 };
    const plantedAt = plot.plantedAt ?? plot.readyAt - growMs;
    const duration = Math.max(1, plot.readyAt - plantedAt);
    const ratio = Math.max(0, Math.min(1, (now - plantedAt) / duration));
    const ready = now >= plot.readyAt;
    const stage: FarmGrowthStage = ready ? 3 : ratio < 0.25 ? 0 : ratio < 0.6 ? 1 : 2;
    return { stage, ratio, ready, remaining: Math.max(0, plot.readyAt - now) };
}

export function formatFarmDuration(milliseconds: number) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}:${(seconds % 60).toString().padStart(2, '0')}` : `${seconds}s`;
}
