import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { rpc } from './api';
import { categories,estimate,labels,type Snapshot } from './model';

type Run=(action:()=>Promise<unknown>,message?:string)=>Promise<void>;
export function creationPayload(kind:string,d:Record<string,any>) {
 const description=d.description;
 if(kind==='map') return ['house','healing','library'].includes(d.category)
   ? {description,category:d.category,count:1,village_id:d.village_id}
   : {description,category:d.category,count:Number(d.count),anchor:d.anchor,direction:d.direction};
 if(kind==='npc'||kind==='book')return {description};
 const effect=d.effect,power=effect==='none'?0:Number(d.power);
 if(kind==='skill')return {description,effect,power,hp:0,attack:0,defense:0};
 if(kind==='item')return {description,slot:d.slot,hp:Number(d.hp),attack:Number(d.attack),defense:Number(d.defense),effect,power};
 return {description,hp:Number(d.hp),attack:Number(d.attack),defense:Number(d.defense),level:Number(d.level),min_correct:Number(d.min_correct),place:d.place||null,subject:d.subject,effect,power};
}
export default function CreationWorkshop({data,run,teacher}:{data:Snapshot;run:Run;teacher:boolean}) {
 const [kind,setKind]=useState('map'),[name,setName]=useState('');
 const [draft,setDraft]=useState<Record<string,any>>({count:1,category:'forest',anchor:data.places.find(p=>!p.village_id&&p.active)?.id||'',direction:'동',village_id:'',description:'',hp:40,attack:8,defense:1,level:1,min_correct:2,place:'',subject:'',slot:'weapon',effect:'none',power:0});
 const [feedback,setFeedback]=useState(''),[bonus,setBonus]=useState<Record<string,number>>({}),[filter,setFilter]=useState('pending');
 const change=(key:string,value:any)=>setDraft(d=>({...d,[key]:value}));
 const chooseKind=(value:string)=>{
   setKind(value);
   setDraft(d=>({...d,hp:value==='monster'?40:0,attack:value==='monster'?8:0,defense:value==='monster'?1:0,effect:value==='skill'?'strike':'none',power:value==='skill'?5:0}));
 };
 const building=kind==='map'&&['house','healing','library'].includes(draft.category);
 const villages=data.places.filter(p=>p.creator===data.profile.id&&p.category==='village'&&p.active);
 const occupied=(id:string)=>data.places.some(p=>p.village_id===id&&p.active)||data.proposals.some(p=>p.kind==='map'&&p.status==='pending'&&p.data.village_id===id);
 const payload=creationPayload(kind,draft),cost=estimate(kind,payload,data.settings);
 const review=(id:string,action:string)=>run(()=>rpc('review_proposal',{p_id:id,p_action:action,p_feedback:feedback,p_bonus:action==='approved'?(bonus[id]||0):0}),action==='approved'?'창작 승인과 추가 보상을 반영했습니다.':'신청 상태를 변경하고 예약액을 해제했습니다.');
 const rows=data.proposals.filter(p=>!teacher||filter==='all'||p.status===filter);
 return <div className={teacher?'':'two-col form-columns'}>
 {!teacher&&<section className="card"><h2>우리 세계에 무엇을 더할까요?</h2><p>필요한 창조력은 수치에 따라 계산됩니다. 승인 전에는 예약만 해요.</p>
 <form onSubmit={e=>{e.preventDefault();run(async()=>{await rpc('submit_proposal',{p_id:crypto.randomUUID(),p_kind:kind,p_name:name,p_data:payload});setName('');},'창작 신청을 보냈습니다.');}}>
 <div className="form-row"><label>만들 것<select aria-label="만들 것" value={kind} onChange={e=>chooseKind(e.target.value)}>{['map','npc','book','monster','item','skill'].map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></label>
 <label>이름<input required maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label></div>
 <label>설명{kind==='npc'&&<small> · 줄마다 대사로 표시됩니다.</small>}{kind==='book'&&<small> · 책을 펼쳤을 때 읽는 본문입니다.</small>}<textarea required={kind==='npc'||kind==='book'} rows={kind==='book'?8:4} maxLength={6000} value={draft.description} onChange={e=>change('description',e.target.value)} placeholder={kind==='npc'?'어서 와, 모험가!\n오늘은 어떤 질문을 발견했니?':kind==='book'?'책 제목과 내용을 자유롭게 적어 보세요.':'이 창작물을 소개해 주세요.'}/></label>
 <fieldset className="creation-group" disabled={kind!=='map'}><legend>맵 설정 {kind!=='map'&&'· 맵 선택 시 사용'}</legend>
 <div className="form-row"><label>칸 수<input required={kind==='map'} type="number" min={1} max={10} disabled={building} value={building?1:draft.count} onChange={e=>change('count',Number(e.target.value))}/></label><label>장소 성격<select aria-label="장소 성격" value={draft.category} onChange={e=>{change('category',e.target.value);change('village_id','');}}>{Object.entries(categories).filter(([k])=>k!=='square').map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
 {building&&<label>연계 마을<select aria-label="연계 마을" required value={draft.village_id} onChange={e=>change('village_id',e.target.value)}><option value="">내 마을의 빈 칸 선택</option>{villages.map(v=><option value={v.id} key={v.id} disabled={occupied(v.id)}>{v.name}{occupied(v.id)?' · 건축물 있음/신청 중':''}</option>)}</select><small>내가 만든 마을 한 칸에 건축물 하나만 배치합니다. {villages.length===0?'먼저 마을을 만들어 주세요.':''}</small></label>}
 <div className="form-row"><label>연결할 기존 장소<select aria-label="연결할 기존 장소" disabled={building} value={draft.anchor} onChange={e=>change('anchor',e.target.value)}>{data.places.filter(p=>p.active&&!p.village_id).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>확장 방향<select aria-label="확장 방향" disabled={building} value={draft.direction} onChange={e=>change('direction',e.target.value)}>{['동','서','남','북'].map(d=><option key={d}>{d}</option>)}</select></label></div></fieldset>
 {kind==='npc'&&<p className="creation-note">이 NPC는 내가 만든 마을에 무작위로 나타납니다. 마을이 없으면 대기하다가 마을이 생긴 뒤 등장합니다.</p>}
 {kind==='book'&&<p className="creation-note">승인된 책은 모든 도서관의 무작위 책 목록에 들어갑니다. 독자는 확률에 따라 창조력 1을 얻습니다.</p>}
 {kind==='item'&&<label>아이템 유형<select aria-label="아이템 유형" value={draft.slot} onChange={e=>change('slot',e.target.value)}>{['weapon','armor','accessory','consumable'].map(k=><option value={k} key={k}>{labels[k]}</option>)}</select><small>승인 후 몬스터 전리품에 추가됩니다. 제작과 소유는 별개입니다.</small></label>}
 {['item','monster'].includes(kind)&&<fieldset className="creation-group"><legend>능력치</legend><div className="form-row">{[['attack','공격력',kind==='monster'?1:0,kind==='monster'?data.settings.stat_cap:50],['defense','방어력',0,kind==='monster'?data.settings.stat_cap:50],['hp',kind==='monster'?'체력':'체력 증가 / 회복',kind==='monster'?10:0,kind==='monster'?500:200]].map(([key,text,min,max])=><label key={key}>{text}<input aria-label={String(text)} required type="number" min={Number(min)} max={Number(max)} value={draft[String(key)]} onChange={e=>change(String(key),Number(e.target.value))}/></label>)}</div></fieldset>}
 {kind==='monster'&&<><div className="form-row"><label>레벨<input required type="number" min={1} max={20} value={draft.level} onChange={e=>change('level',Number(e.target.value))}/></label><label>최소 정답 횟수<input required type="number" min={1} max={5} value={draft.min_correct} onChange={e=>change('min_correct',Number(e.target.value))}/></label></div><div className="form-row"><label>출현 지역<select aria-label="출현 지역" value={draft.place} onChange={e=>change('place',e.target.value)}><option value="">모든 숲·길·던전</option>{data.places.filter(p=>p.active&&['forest','road','dungeon'].includes(p.category)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>출제 과목<select aria-label="출제 과목" value={draft.subject} onChange={e=>change('subject',e.target.value)}><option value="">모든 과목</option>{data.settings.subjects.map(s=><option key={s}>{s}</option>)}</select></label></div></>}
 {['item','skill','monster'].includes(kind)&&<fieldset className="creation-group"><legend>{kind==='monster'?'특수 능력':'효과 설정'}</legend><div className="form-row"><label>효과<select aria-label="효과" value={draft.effect} onChange={e=>{change('effect',e.target.value);change('power',e.target.value==='none'?0:Math.max(1,draft.power));}}>{(kind==='skill'?['strike','heal','guard']:['none','strike','heal','guard']).map(k=><option value={k} key={k}>{labels[k]}</option>)}</select></label><label>효과 강도<input required type="number" min={draft.effect==='none'?0:1} max={30} disabled={draft.effect==='none'} value={draft.power} onChange={e=>change('power',Number(e.target.value))}/></label></div><small>{kind==='monster'?'방어는 받은 피해를 줄이고, 회복·데미지는 학생의 오답 반격에 적용됩니다.':'데미지·회복은 정답일 때, 방어는 오답 피해에 적용됩니다.'}</small></fieldset>}
 <div className="cost"><span>필요한 창조력<small className="cost-detail">{kind==='map'?`칸당 ${data.settings.room_cost} × ${payload.count}`:kind==='item'?'기본 + 체력/5 올림 + 공격×2 + 방어×2 + 효과×2':kind==='monster'?'기본 + 체력/10 올림 + 공격 + 방어 + 레벨×2 + 효과×2':kind==='skill'?'기본 + 효과 강도×2':'기본 + 500자 초과 구간당 1'}</small></span><strong>{cost}</strong></div>
 <button className="primary wide" disabled={!data.settings.creation_open||!Number.isFinite(cost)||cost>data.profile.balance-data.profile.reserved}>교사에게 제작 신청</button></form></section>}
 <section className="card"><div className="row-between"><h2>{teacher?'창작 검토':'내 창작 신청'}</h2>{teacher&&<button onClick={()=>run(async()=>{},'창작 검토함을 새로고침했습니다.')}><RefreshCw size={15}/>새로고침</button>}</div>
 {teacher&&<><div className="toolbar"><select aria-label="창작 검토 상태" value={filter} onChange={e=>setFilter(e.target.value)}>{['pending','approved','revision','rejected','all'].map(s=><option value={s} key={s}>{labels[s]||'전체'}</option>)}</select></div><label>검토 의견<input value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="좋았던 점 또는 수정할 내용"/></label></>}
 {rows.length===0&&<div className="empty">이 상태의 창작물이 없습니다.</div>}
 {rows.map(p=><article className="list-card" key={p.id}><div className="row-between"><span>{labels[p.kind]} · {teacher?(data.students.find(s=>s.id===p.author)?.nickname||'학생'):'내 창작'}</span><span className={`tag ${p.status}`}>{labels[p.status]}</span></div><h3>{p.name}</h3><p className="creation-description">{p.data.description}</p><div className="chips">{p.kind==='map'?<><span>{p.data.count}칸 · {categories[p.data.category]}</span><span>{p.data.village_id?`연계 마을: ${data.places.find(l=>l.id===p.data.village_id)?.name||'확인 필요'}`:`${data.places.find(l=>l.id===p.data.anchor)?.name||'시작점'} → ${p.data.direction}`}</span></>:['item','monster','skill'].includes(p.kind)?<><span>ATK {p.data.attack||0} / DEF {p.data.defense||0} / HP {p.data.hp||0}</span><span>{labels[p.data.effect]||'효과 없음'} {p.data.power||0}</span></>:<span>{p.kind==='npc'?'제작자의 마을에서 등장':'모든 도서관에 배치'}</span>}<span>예약 비용 {p.cost}</span></div>{p.feedback&&<p className="feedback">{p.feedback}</p>}
 {p.status==='pending'&&<>{teacher&&<label>우수 창작 추가 창조력<input type="number" min={0} max={100} value={bonus[p.id]||0} onChange={e=>setBonus({...bonus,[p.id]:Number(e.target.value)})}/><small>승인 시 별도 지급 · 같은 창작물에 한 번만 지급</small></label>}<div className="actions">{teacher?<><button className="primary" onClick={()=>review(p.id,'approved')}>승인 및 생성{bonus[p.id]?` · 추가 +${bonus[p.id]}`:''}</button><button onClick={()=>review(p.id,'revision')}>수정 요청</button><button onClick={()=>review(p.id,'rejected')}>반려</button></>:<button onClick={()=>review(p.id,'cancelled')}>취소 · 예약 해제</button>}</div></>}
 {!teacher&&['revision','rejected','cancelled'].includes(p.status)&&<button onClick={()=>{setKind(p.kind);setName(p.name);setDraft({...draft,...p.data});}}>내용을 복사해 다시 만들기</button>}
 </article>)}</section></div>;
}
