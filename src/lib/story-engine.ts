import { STORY_SCENES } from '@/data/story';
import type { StoryProgress, StoryScene } from '@/types/story';
import { createStoryProgress } from '@/types/story';
import type { Stage2MetaProgress } from '@/types/stage2';

export function normalizeStoryProgress(value?:Partial<StoryProgress>):StoryProgress {
    const result=createStoryProgress();
    result.skippedIds=Array.isArray(value?.skippedIds)?value.skippedIds.filter(id=>typeof id==='string' && !!STORY_SCENES[id]):[];
    for(const scene of Object.values(STORY_SCENES)) {
        const index=value?.reading?.[scene.id];
        if(typeof index==='number' && Number.isFinite(index)) result.reading[scene.id]=Math.max(0,Math.min(scene.lines.length-1,Math.floor(index)));
        for(const line of scene.lines) if(line.choice) {
            const selected=value?.choices?.[line.choice.id];
            if(line.choice.options.some(option=>option.id===selected)) result.choices[line.choice.id]=selected!;
        }
    }
    return result;
}
export function isStoryAvailable(scene:StoryScene,progress:Stage2MetaProgress,chapter:number,domainId='propositional-logic'):boolean {
    const c=scene.condition;
    return chapter>=c.minChapter && (!c.contentDomainId || c.contentDomainId===domainId)
        && (!c.seen || c.seen.every(id=>progress.seenStoryIds.includes(id)))
        && (!c.completedIslandIds || c.completedIslandIds.every(id=>progress.completedIslandIds.includes(id)))
        && (!c.farm || (c.farm==='unlocked'?progress.farm.unlocked:progress.farm.harvestedCount>0))
        && (!c.minHarbors || Object.values(progress.harbors).some(ports=>ports.length>=c.minHarbors!))
        && (!c.proofReuse || Object.values(progress.proofDependencies).some(ids=>ids.length>0))
        && (!c.minDiscoveries || new Set(progress.discoveredLandmarkIds).size>=c.minDiscoveries);
}
export const availableStories=(progress:Stage2MetaProgress,chapter:number,domainId='propositional-logic')=>Object.values(STORY_SCENES).filter(scene=>isStoryAvailable(scene,progress,chapter,domainId));
export function finishStory(progress:Stage2MetaProgress,id:string,skipped:boolean):Stage2MetaProgress {
    if(!STORY_SCENES[id])return progress;
    const reading={...progress.story.reading};delete reading[id];
    return {...progress,seenStoryIds:[...new Set([...progress.seenStoryIds,id])],story:{...progress.story,reading,
        skippedIds:skipped?[...new Set([...progress.story.skippedIds,id])]:progress.story.skippedIds.filter(value=>value!==id)}};
}
export function chooseStoryOption(progress:Stage2MetaProgress,sceneId:string,choiceId:string,optionId:string):Stage2MetaProgress {
    const choice=STORY_SCENES[sceneId]?.lines.find(line=>line.choice?.id===choiceId)?.choice;
    if(!choice?.options.some(option=>option.id===optionId))return progress;
    return {...progress,story:{...progress.story,choices:{...progress.story.choices,[choiceId]:optionId}}};
}
