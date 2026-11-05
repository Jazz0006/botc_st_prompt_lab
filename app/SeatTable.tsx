'use client';
import {useState,useEffect} from 'react';
import {Shuffle,Undo2,RotateCcw,ArrowRight} from 'lucide-react';
import {Preset,OpeningSeat,defaultSeats,readOpeningSeats,roleName,roles,swapSeats,tablePositions,makeState} from './lab-catalog';

export default function SeatTable({preset,state,disabled,onApply,onTouch,onPendingChange}:{preset:Preset;state:string;disabled:boolean;onApply:(state:string)=>void;onTouch:()=>void;onPendingChange:(changed:boolean)=>void}){
 const parsed=readOpeningSeats(state,preset);
 const [seats,setSeats]=useState<OpeningSeat[]>(()=>parsed||defaultSeats(preset));
 const [selected,setSelected]=useState<number|null>(null),[history,setHistory]=useState<OpeningSeat[][]>([]);
 const {size,positions}=tablePositions(seats.length);
 const changed=JSON.stringify(seats)!==JSON.stringify(parsed||defaultSeats(preset));
 useEffect(()=>{onPendingChange(changed);return()=>onPendingChange(false)},[changed,onPendingChange]);
 function edit(next:OpeningSeat[]){onTouch();setHistory(h=>[...h,seats].slice(-30));setSeats(next);setSelected(null)}
 function choose(i:number){onTouch();if(selected===null)setSelected(i);else if(selected===i)setSelected(null);else edit(swapSeats(seats,selected,i))}
 function shuffle(){const next=seats.map(s=>({...s}));for(let i=next.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[next[i],next[j]]=[next[j],next[i]]}edit(next.map((s,i)=>({...s,seat:i+1})))}
 return <section className="seat-section" aria-labelledby="seat-heading">
  <div className="seat-heading"><div><span className="eyebrow">FIRST NIGHT · SEATING</span><h2 id="seat-heading">首夜方桌排座</h2><p>顺时针编号 · {seats.length} 号与 1 号相邻</p></div><span className="seat-status">{changed?'排座有修改 · 尚未应用':parsed?'当前局面座位':'模板默认排列'}</span></div>
  {!parsed&&<p className="seat-warning">当前文本不是可识别的模板首夜局面，方桌展示模板默认排列。应用会重新生成首夜局面，请先保留原文本。</p>}
  <div className="seat-board" style={{gridTemplateColumns:`repeat(${size},minmax(0,1fr))`,gridTemplateRows:`repeat(${size},minmax(68px,auto))`}}>
   <div className="seat-center" style={{gridColumn:`2 / ${size}`,gridRow:`2 / ${size}`}}><b>{seats.length}<small> 人</small></b><span>暗流涌动</span><p role="status">{selected===null?'点选两个角色交换位置':`已选 ${selected+1} 号，请选择交换对象`}</p></div>
   {seats.map((s,i)=>{const type=roles[s.shownRoleId]?.type;const evil=type==='minion'||type==='demon';return <button type="button" key={s.seat} disabled={disabled} className={`seat-card ${evil?'seat-evil':'seat-good'} ${selected===i?'seat-selected':''}`} style={{gridRow:positions[i].row,gridColumn:positions[i].col}} aria-label={`${i+1}号 ${roleName(s.shownRoleId)}，点击交换`} aria-pressed={selected===i} onClick={()=>choose(i)}><span className="seat-number">{i+1}<small>号</small></span><b>{roleName(s.shownRoleId)}</b><span className="seat-type">{type==='demon'?'恶魔':type==='minion'?'爪牙':type==='outsider'?'外来者':'镇民'}</span></button>})}
  </div>
  <p className="seat-hint">{selected===null?'角色与熟练度一起移动，座位编号保持固定。':'再次点击已选角色可取消选择。'}{preset.drunk?' 此模板含酒鬼，绑定仍待首夜规划。':''}</p>
  <div className="seat-actions"><button className="button" disabled={disabled} onClick={shuffle}><Shuffle size={15}/>随机排列</button><button className="button" disabled={disabled||!history.length} onClick={()=>{onTouch();setSeats(history[history.length-1]);setHistory(h=>h.slice(0,-1));setSelected(null)}}><Undo2 size={15}/>撤销排座</button><button className="button" disabled={disabled} onClick={()=>edit(defaultSeats(preset))}><RotateCcw size={15}/>恢复默认</button><button className="button primary" disabled={disabled||(!changed&&!!parsed)} onClick={()=>onApply(makeState(preset,seats))}>应用座位<ArrowRight size={15}/></button></div>
  <p className="seat-hint">应用后统一更新局面 JSON；固定说明与输出要求保持原样。排座修改需应用后才能保存或复制。</p>
 </section>
}
