/** Public assets must also work under the static export's configured subpath. */
export const assetUrl = (path: string): string => {
    const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim().replace(/^\/+|\/+$/g, '');
    return `${base ? `/${base}` : ''}/${path.replace(/^\/+/, '')}`;
};

export const CHAPTER_ART = ['archipelago', 'commutation-current', 'garden', 'contraction-terrace', 'farm', 'ridge', 'foundry', 'observatory', 'negated-ruins', 'second-gate'] as const;
export const chapterArtwork = (levelIndex: number) => assetUrl(levelIndex < 10 ? 'art/title-academy.webp' : `art/scenes/${CHAPTER_ART[Math.min(9, Math.max(0, levelIndex - 10))]}.webp`);
