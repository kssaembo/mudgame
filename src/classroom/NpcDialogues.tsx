import {useState} from 'react';
import {rpc} from './api';
import type {Entity} from './model';
export function DialogueFields({values,onChange}:{values:string[];onChange:(v:string[])=>void}){
 return <fieldset className="creation-group"><legend>NPC 대화 종류</legend><p>한 칸이 한 번에 보여 줄 대화입니다. 1~10개, 전체 합계 6,000자까지 작성해요. 같은 NPC의 보상 제한은 공유합니다.</p>{values.map((s,i)=><div key={i}><label>대화 {i+1}<textarea required maxLength={6000} rows={3} value={s} onChange={e=>onChange(values.map((x,n)=>n===i?e.target.value:x))}/></label>{values.length>1&&<button type="button" onClick={()=>onChange(values.filter((_,n)=>n!==i))}>대화 {i+1} 삭제</button>}</div>)}<button type="button" disabled={values.length>=10} onClick={()=>onChange([...values,''])}>＋ 대화 추가</button><small>전체 {values.join('\n').length.toLocaleString()} / 6,000자</small></fieldset>;
}
export default function NpcDialogues({entity,run}:{key?:string;entity:Entity;run:(a:()=>Promise<unknown>,m?:string)=>Promise<void>}){
 const [values,setValues]=useState<string[]>(entity.data.dialogues||[entity.data.description||'']);
 return <section className="card"><h2>{entity.name} · 대화 관리</h2><form onSubmit={e=>{e.preventDefault();run(()=>rpc('save_npc_dialogues',{p_id:entity.id,p_dialogues:values,p_original:entity.data}),'NPC 대화를 저장했습니다.');}}><DialogueFields values={values} onChange={setValues}/><button className="primary">대화 저장</button></form></section>;
}
