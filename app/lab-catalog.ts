import presets from './lab-data/tb-presets.json';
import baselines from './lab-data/baselines.json';
import {LabDraft,defaultConfig} from './lab-model';
export type Preset={id:string;player_count:number;townsfolk:string[];outsiders:string[];minions:string[];demons:string[];drunk:boolean;source:string;complexity:string;style_tags:string[]};
export const catalog=Object.values(presets.pools).flat() as Preset[];
export const roles=presets.role_catalog as Record<string,{zh:string;name:string;type:string}>;
export {baselines};
export const roleName=(id:string)=>roles[id]?.zh||id;
export type OpeningSeat={seat:number;shownRoleId:string;actualRoleId:string;experience:string;[key:string]:unknown};
export function defaultSeats(p:Preset):OpeningSeat[]{
 const all=[...p.townsfolk,...p.outsiders,...p.minions,...p.demons];let seed=2166136261;
 for(const ch of p.id)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 for(let i=all.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[all[i],all[j]]=[all[j],all[i]];}
 return all.map((role,i)=>({seat:i+1,shownRoleId:role,actualRoleId:p.drunk&&p.townsfolk.includes(role)?'UNCOMMITTED_IF_DRUNK_SELECTED':role,experience:'BEGINNER'}));
}
export function readOpeningSeats(text:string,p:Preset):OpeningSeat[]|null{
 try{const v=JSON.parse(text);if(v.schemaId!=='botc.initial-joint-opening-request-v2'||v.scriptId!=='trouble_brewing'||v.state?.phase!=='SETUP_PRECOMMIT'||v.state?.hasDrunk!==p.drunk)return null;
 if(v.state.drunkAssignment!==(p.drunk?'UNCOMMITTED':'NOT_APPLICABLE'))return null;
 const seats=v.state.seats;if(!Array.isArray(seats)||seats.length!==p.player_count)return null;
 const expected=defaultSeats(p).map(s=>s.shownRoleId).sort().join(',');
 if(seats.map(s=>s.shownRoleId).sort().join(',')!==expected)return null;
 if(seats.some((s,i)=>s.seat!==i+1||s.actualRoleId!==(p.drunk&&p.townsfolk.includes(s.shownRoleId)?'UNCOMMITTED_IF_DRUNK_SELECTED':s.shownRoleId)||typeof s.experience!=='string'))return null;
 return seats.map(s=>({...s}));}catch{return null;}
}
export function swapSeats(seats:OpeningSeat[],a:number,b:number){
 const next=seats.map(s=>({...s}));[next[a],next[b]]=[next[b],next[a]];return next.map((s,i)=>({...s,seat:i+1}));
}
export function tablePositions(n:number){
 const size=Math.ceil(n/4)+1;const edge:{row:number;col:number}[]=[];
 for(let col=1;col<=size;col++)edge.push({row:1,col});
 for(let row=2;row<=size;row++)edge.push({row,col:size});
 for(let col=size-1;col>=1;col--)edge.push({row:size,col});
 for(let row=size-1;row>1;row--)edge.push({row,col:1});
 return {size,positions:Array.from({length:n},(_,i)=>edge[Math.floor(i*edge.length/n)])};
}
export function makeState(p:Preset,arranged:OpeningSeat[]=defaultSeats(p)){
 if(arranged.length!==p.player_count||arranged.map(s=>s.shownRoleId).sort().join(',')!==defaultSeats(p).map(s=>s.shownRoleId).sort().join(','))throw Error('座位角色与模板不一致。');
 const seats=arranged.map((s,i)=>({...s,seat:i+1}));
 const information=seats.filter(s=>['washerwoman','librarian','investigator','chef','empath','fortuneteller'].includes(s.shownRoleId)).map(s=>({decisionId:'first-night:seat-'+s.seat,sourceSeat:s.seat,shownRoleId:s.shownRoleId}));
 const events=seats.flatMap(s=>s.shownRoleId==='poisoner'?[{decisionId:'event:poisoner.target',event:'poisoner.target'}]:s.shownRoleId==='fortuneteller'?[{decisionId:`event:fortune_teller.targets:seat-${s.seat}`,event:`fortune_teller.targets:seat-${s.seat}`}]:[]);
 return JSON.stringify({schemaId:'botc.initial-joint-opening-request-v2',schemaVersion:2,scriptId:'trouble_brewing',requestIdentity:{gameId:'lab-'+p.id,gameStateRevision:0,playerInputRevision:0,rosterFingerprint:'lab:'+p.id+':'+seats.map(s=>[s.shownRoleId,s.actualRoleId,s.experience].join('/')).join(',')},decisionInventory:{information,events},state:{asOfRevision:0,phase:'SETUP_PRECOMMIT',hasDrunk:p.drunk,drunkAssignment:p.drunk?'UNCOMMITTED':'NOT_APPLICABLE',seats,confirmedEvents:[],unknownEvents:events.map(e=>e.event).sort(),recentGames:[]},unknownFutureActionsAreNotFacts:true},null,2);
}
export function makeDraft(p:Preset=catalog.find(p=>p.player_count===8)!):LabDraft{return {title:p.id+' · 首夜研究',templateId:p.id,baseline:'opening',sourceSha:baselines.sourceSha,instructions:baselines.opening.instructions,state:makeState(p),task:'按固定说明完成本次首夜整局规划。当前输入由研习所按 APP 请求字段构造，非安卓实际会话；未知的玩家行动仍为未知。',output:JSON.stringify(baselines.opening.responseSchema,null,2),config:{...defaultConfig}}}
