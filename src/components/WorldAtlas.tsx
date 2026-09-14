'use client';
import React, { useState,useEffect,useRef } from 'react';
import type { Stage2LevelConfig, Stage2MetaProgress } from '@/types/stage2';
import { MATH_CONTENT_DOMAINS } from '@/data/world-regions';
import ArtModal from './ArtModal';
import '@/styles/world-atlas.css';

interface Props {
    config:Stage2LevelConfig;progress:Stage2MetaProgress;language:'zh'|'en';landmarkId?:string;
    onClose:()=>void;onOverview:()=>void;onTravel:(x:number,y:number,zoom?:number)=>void;onDiscover:(id:string)=>void;
}
export default function WorldAtlas({config,progress,language,landmarkId,onClose,onOverview,onTravel,onDiscover}:Props) {
    const atlas=config.world.atlas,zh=language==='zh';
    const [selected,setSelected]=useState(landmarkId);
    const detailRef=useRef<HTMLElement>(null);
    useEffect(()=>{if(selected)detailRef.current?.scrollIntoView({block:'nearest'});},[selected]);
    if(!atlas)return null;
    const b=atlas.bounds,poi=atlas.pointsOfInterest.find(p=>p.id===selected);
    const unlocked=new Set([...config.initialUnlockedIslandIds,...progress.unlockedIslandIds]);
    return <ArtModal wide className="world-atlas-dialog" title={zh?'群岛航图':'Archipelago atlas'} eyebrow="THE OPEN ARCHIPELAGO" closeLabel={zh?'关闭航图':'Close atlas'} onClose={onClose}>
        <div className="world-atlas">
            <p>{zh?'选择地域查看风貌与地标。地图上的菱形航标可以调查；未开放岛屿保留轮廓，数学内容随章节开放。':'Select a region to visit its landscape and landmarks. Investigate diamond waymarks on the map; unreleased islands remain silhouettes as chapters open their content.'}</p>
            <svg className="atlas-chart" viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} role="img" aria-label={zh?'六地域位置示意':'Regional positions'}>
                <defs><radialGradient id="atlas-sea"><stop stopColor="#31485f"/><stop offset="1" stopColor="#0c1c30"/></radialGradient></defs>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="url(#atlas-sea)" rx="40"/>
                {atlas.regions.map(region=>{
                    const biome=atlas.biomes[region.biomeId];
                    return <g key={region.id}><ellipse cx={region.center.x} cy={region.center.y} rx="380" ry="280" fill={biome.ground} fillOpacity=".25" stroke={biome.edge} strokeOpacity=".4" strokeWidth="3" strokeDasharray="12 18"/><text x={region.center.x} y={region.center.y+20} textAnchor="middle" fill={biome.edge} fontSize="112">{region.name[language]}</text></g>;
                })}
            </svg>
            <button className="art-button" onClick={onOverview}>{zh?'展开真实世界地图':'Open world overview'}</button>
            <div className="atlas-regions">{atlas.regions.map(region=>{
                const biome=atlas.biomes[region.biomeId],domain=MATH_CONTENT_DOMAINS.find(d=>d.id===region.contentDomainId);
                const count=[...unlocked].filter(id=>config.world.getIslandById(id)?.regionId===region.id).length;
                const landmark=atlas.pointsOfInterest.find(p=>p.regionId===region.id)!;
                return <article key={region.id} style={{borderColor:biome.edge+'77'}}>
                    <span className={`atlas-biome atlas-biome--${biome.motif}`} style={{background:biome.ground,color:biome.accent}} aria-hidden>◇</span>
                    <div><h3>{region.name[language]}</h3><small>{biome.name[language]} · {count?`${count} ${zh?'座已开放岛屿':'open islands'}`:(zh?'远方空域':'Distant waters')}</small><p>{region.description[language]}</p><small>{zh?'数学内容':'Content'} · {domain?.name[language]}</small></div>
                    <div className="atlas-actions"><button className="art-button" onClick={()=>onTravel(region.center.x,region.center.y,.075)}>{zh?'前往地域':'Visit region'}</button><button className="art-button" onClick={()=>setSelected(landmark.id)}>{landmark.name[language]} {progress.discoveredLandmarkIds.includes(landmark.id)?'✦':'◇'}</button></div>
                </article>;
            })}</div>
            {poi && <section ref={detailRef} className="atlas-landmark" role="region" aria-label={poi.name[language]}>
                <h3>{poi.name[language]}</h3><p>{poi.description[language]}</p>
                <p>{progress.discoveredLandmarkIds.includes(poi.id)?(zh?'你已经把这里记入航行手记。':'You have recorded this place in your travel journal.'):(zh?'到地图上的航标旁调查，可以留下你的探索记录。':'Investigate the waymark on the map to record your visit.')}</p>
                <button className="art-button" onClick={()=>onTravel(poi.position.x,poi.position.y,.25)}>{zh?'定位航标':'Locate waymark'}</button>
                {landmarkId===poi.id && !progress.discoveredLandmarkIds.includes(poi.id) && <button className="art-button" onClick={()=>onDiscover(poi.id)}>{zh?'记入航行手记':'Record discovery'}</button>}
            </section>}
        </div>
    </ArtModal>;
}
