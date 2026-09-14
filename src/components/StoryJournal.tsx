'use client';
import type { Stage2MetaProgress } from '@/types/stage2';
import { availableStories } from '@/lib/story-engine';
import ArtModal from './ArtModal';
import '@/styles/story-journal.css';
export default function StoryJournal({progress,chapter,language,onClose,onOpen}:{progress:Stage2MetaProgress;chapter:number;language:'zh'|'en';onClose:()=>void;onOpen:(id:string,replay:boolean)=>void}) {
    const zh=language==='zh',scenes=availableStories(progress,chapter);
    return <ArtModal wide title={zh?'航行手记':'Travel journal'} eyebrow="OUR UNFINISHED CHART" closeLabel={zh?'关闭手记':'Close journal'} onClose={onClose}>
        <div className="story-journal"><p>{zh?'这里收着相处与探索的记录。支线随经历出现，可以随时读；回忆中的选择不改变已保存的故事。':'Companionship and discoveries, gathered along the way. Optional scenes appear as you travel. Choices made in memories do not change your saved story.'}</p>
            {(['main','companion','exploration','epilogue'] as const).map((kind,index)=><section key={kind}><h3>{(zh?['共同的旅程','相处片刻','探索见闻','门后的回信']:['Our journey','Quiet moments','Discoveries','Beyond the gate'])[index]}</h3><div className="story-journal-grid">
                {scenes.filter(scene=>scene.kind===kind).map(scene=>{const seen=progress.seenStoryIds.includes(scene.id),skipped=progress.story.skippedIds.includes(scene.id),reading=progress.story.reading[scene.id];return <article key={scene.id}><small>{String(scene.chapter).padStart(2,'0')} · {scene.location[language]}</small><h4>{scene.title[language]}</h4><p>{skipped?(zh?'已跳过 · 可补读':'Skipped · available to read'):seen?(zh?'已记录':'Recorded'):reading!==undefined?(zh?'阅读中':'In progress'):(zh?'有新的故事':'New scene')}</p><button className="art-button" onClick={()=>onOpen(scene.id,seen&&!skipped)}>{skipped?(zh?'补读本段':'Read scene'):seen?(zh?'回忆':'Replay'):reading!==undefined?(zh?'继续阅读':'Continue reading'):(zh?'开始阅读':'Read')}</button></article>;})}
                {!scenes.some(scene=>scene.kind===kind)&&<p className="story-journal-empty">{kind==='epilogue'?(zh?'完成第二道门的主线证明后，这里会多一页。':'A new page awaits after the second gate’s main proof.'):(zh?'继续旅程，新的经历会留在这里。':'More experiences will find their way here as you travel.')}</p>}
            </div></section>)}
        </div>
    </ArtModal>;
}
