import type { AureliaExpression, AureliaHalo } from '@/data/story-art';
import type { LocalizedText } from './world';
export interface StoryOption { id:string; text:LocalizedText; reply:LocalizedText }
export interface StoryLine extends LocalizedText {
    speaker:'aurelia'|'player'|'narrator'; expression?:AureliaExpression; halo?:AureliaHalo;
    haloRevealCue?:LocalizedText;
    choice?:{id:string;options:StoryOption[]};
    echo?:{choiceId:string;optionId:string;text:LocalizedText};
}
export interface StoryCondition {
    minChapter:number; seen?:string[]; completedIslandIds?:string[];
    farm?:'unlocked'|'harvested'; minHarbors?:number; proofReuse?:boolean; minDiscoveries?:number;
    contentDomainId?:string;
}
export interface StoryScene {
    id:string; title:LocalizedText; location:LocalizedText; lines:StoryLine[];
    chapter:number; kind:'main'|'companion'|'exploration'|'epilogue'; artId:string; condition:StoryCondition;
}
export interface StoryProgress {
    version:1; skippedIds:string[]; choices:Record<string,string>;
    reading:Record<string,number>;
}
export const createStoryProgress=():StoryProgress=>({version:1,skippedIds:[],choices:{},reading:{}});
