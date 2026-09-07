/** Read-only presentation metadata; dialogue and progression remain in story.ts. */
export type AureliaExpression = 'calm' | 'smile' | 'think' | 'worry' | 'surprise' | 'resolve';
export type AureliaHalo = 'intact' | 'cracked';
export interface StoryLineArt {
    expression: AureliaExpression;
    halo: AureliaHalo;
    fractureCue?: { zh: string; en: string };
}
export interface StorySceneArt {
    background: string;
    atmosphere: 'starlight' | 'sunlight' | 'twilight' | 'lamplight';
    position: string;
    lines: StoryLineArt[];
}
const portrait = (expression: AureliaExpression, halo: AureliaHalo = 'intact'): StoryLineArt => ({ expression, halo });
export const STORY_ART: Record<string, StorySceneArt> = {
    'stage2-1': { background: '/art/scenes/archipelago.webp', atmosphere: 'starlight', position: '43% center', lines: [portrait('calm'), portrait('smile')] },
    'stage2-2': { background: '/art/scenes/commutation-current.webp', atmosphere: 'starlight', position: '43% center', lines: [portrait('think'), portrait('calm')] },
    'stage2-3': { background: '/art/scenes/garden.webp', atmosphere: 'sunlight', position: '40% center', lines: [portrait('smile')] },
    'stage2-4': { background: '/art/scenes/contraction-terrace.webp', atmosphere: 'sunlight', position: '40% center', lines: [portrait('think'), portrait('calm')] },
    'stage2-5': { background: '/art/scenes/farm.webp', atmosphere: 'sunlight', position: '40% center', lines: [portrait('calm'), portrait('smile')] },
    'stage2-6': { background: '/art/scenes/ridge.webp', atmosphere: 'twilight', position: '40% center', lines: [portrait('think')] },
    'stage2-7': { background: '/art/scenes/foundry.webp', atmosphere: 'lamplight', position: '40% center', lines: [portrait('resolve'), portrait('calm')] },
    'stage2-8': { background: '/art/scenes/observatory.webp', atmosphere: 'starlight', position: '40% center', lines: [portrait('resolve')] },
    'stage2-9': {
        background: '/art/scenes/negated-ruins.webp', atmosphere: 'twilight', position: '40% center',
        lines: [{ expression: 'surprise', halo: 'cracked', fractureCue: { zh: '裂痕', en: 'fracture' } }, portrait('worry', 'cracked')],
    },
    'stage2-10': { background: '/art/scenes/second-gate.webp', atmosphere: 'starlight', position: '38% center', lines: [portrait('resolve', 'cracked'), portrait('think', 'cracked')] },
};
export const AURELIA_PORTRAITS: Record<AureliaExpression, string> = {
    calm: '/art/characters/aurelia-calm.webp', smile: '/art/characters/aurelia-smile.webp',
    think: '/art/characters/aurelia-think.webp', worry: '/art/characters/aurelia-worry.webp',
    surprise: '/art/characters/aurelia-surprise.webp', resolve: '/art/characters/aurelia-resolve.webp',
};
export const getStoryArt = (sceneId: string): StorySceneArt => STORY_ART[sceneId] ?? STORY_ART['stage2-1'];
export const getVisibleHalo = (art: StoryLineArt, visibleText: string, language: 'zh' | 'en'): AureliaHalo => {
    if (!art.fractureCue) return art.halo;
    return visibleText.toLowerCase().includes(art.fractureCue[language].toLowerCase()) ? art.halo : 'intact';
};
