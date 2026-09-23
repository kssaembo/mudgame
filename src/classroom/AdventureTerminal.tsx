import {useEffect,useRef,useState} from 'react';
import {Maximize2,Minimize2} from 'lucide-react';
import {rpc} from './api';
import {labels,type Snapshot} from './model';

type Run=(action:()=>Promise<unknown>,message?:string)=>Promise<void>;
const help=`명령어 안내
  동 / 서 / 남 / 북    연결된 길로 이동 (숲·길·던전에서는 무작위 조우)
  봐라                현재 장소와 발견한 것 확인
  공격 / 후퇴         몬스터 찾기 / 전투에서 물러나기
  대화                마을에서 만난 NPC와 이야기
  입장 / 나가기       마을 건축물에 들어가기 / 마을로 돌아가기
  읽기 / 열기         도서관의 책 읽기 / 발견한 보물상자 열기
  가방                내 아이템 목록 (보유 수 제한 없음)
  장착 1 / 해제 1     가방 번호의 장비 착용 / 해제
  사용 1              가방 번호의 회복 소모품 사용 (전투 밖)
  회복                광장·주택·치유소에서 체력 회복
  상태 / 도움말       능력치 / 명령어 안내

전투 중 정답은 문제 아래 입력하거나 명령줄에 그대로 입력하세요.
책 보상은 같은 책 하루 한 번 추첨, 탐험 창조력은 교사가 정한 하루 한도를 따릅니다.`;

function Stream({text}:{text:string}) {
 const [shown,setShown]=useState(0);
 useEffect(()=>{
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){setShown(text.length);return;}
   setShown(0);const timer=setInterval(()=>setShown(n=>{if(n+18>=text.length){clearInterval(timer);return text.length;}return n+18;}),16);
   return()=>clearInterval(timer);
 },[text]);
 return <div className="ps-message" onClick={()=>setShown(text.length)}>{text.slice(0,shown)}{shown<text.length&&<span className="ps-caret">▌</span>}</div>;
}
export default function AdventureTerminal({data,run,preview=false}:{data:Snapshot;run:Run;preview?:boolean}) {
 const [full,setFull]=useState(false),[command,setCommand]=useState(''),[answer,setAnswer]=useState(''),[effect,setEffect]=useState('');
 const [lines,setLines]=useState([{id:0,text:'우리 반 MUD [Classroom Adventure]\n배움으로 넓어지는 세계에 오신 것을 환영합니다.\n「도움말」을 입력해 모험을 시작하세요.'}]);
 const [showBag,setShowBag]=useState(false),[history,setHistory]=useState<string[]>([]),[historyIndex,setHistoryIndex]=useState(-1);
 const serial=useRef(1),tail=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null);
 const loc=data.places.find(p=>p.id===data.profile.location),battle=data.battle,monster=data.entities.find(e=>e.id===battle?.monster);
 const inventory=[...(data.inventory||[])].filter(i=>i.student===data.profile.id).sort((a,b)=>a.acquired_at.localeCompare(b.acquired_at)||a.id.localeCompare(b.id));
 const effective={attack:data.profile.attack,defense:data.profile.defense,max_hp:data.profile.max_hp};
 inventory.filter(i=>i.equipped).forEach(i=>{effective.attack+=Number(i.data.attack||0);effective.defense+=Number(i.data.defense||0);effective.max_hp+=Number(i.data.hp||0);});
 const write=(text:string)=>setLines(v=>[...v.slice(-160),{id:serial.current++,text}]);
 useEffect(()=>{tail.current?.scrollIntoView({block:'nearest'});},[lines.length,battle?.token,showBag]);
 useEffect(()=>{if(!full)return;const before=document.body.style.overflow;document.body.style.overflow='hidden';const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setFull(false);};window.addEventListener('keydown',escape);return()=>{document.body.style.overflow=before;window.removeEventListener('keydown',escape);};},[full]);
 useEffect(()=>{setAnswer('');setEffect('');},[battle?.token]);
 const execute=(action:()=>Promise<unknown>)=>run(async()=>{try{await action();}catch(e){write(`[오류] ${(e as Error).message}`);throw e;}},'');
 const submitAnswer=(value:string)=>execute(async()=>{
   if(!battle)return;
   const result=await rpc('answer',{p_token:battle.token,p_answer:value,p_effect:effect||null});
   write(`${result.correct?'[정답]':'[오답]'} 가한 피해 ${result.damage} / 받은 피해 ${result.taken}\n${result.explanation}`);
   if(result.status==='won')write(`[승리] ${monster?.name||'몬스터'} 처치! EXP +${result.exp}\n창조력 +${result.creativity||0}${result.loot?`\n[전리품] ${result.loot} → 가방에 보관`:''}${result.levels?`\n[LEVEL UP] ${result.levels}레벨 상승! 체력 회복 · 능력치 증가`:''}`);
   if(result.status==='lost')write('[구조] 광장으로 돌아왔습니다. 체력을 회복했으니 다시 도전하세요.');
 });
 const act=(raw:string)=>{
   const cmd=raw.trim();if(!cmd)return;
   write(`PS C:\\우리반\\${loc?.name||'광장'}> ${cmd}`);setHistory(h=>[...h.slice(-80),cmd]);setHistoryIndex(-1);
   if(['도움말','help','?'].includes(cmd)){write(help);return;}
   if(['가방','bag','인벤토리'].includes(cmd)){setShowBag(true);write(`[가방] ${inventory.length}개 보유 · 소지 제한 없음${inventory.length?'':'\n몬스터 전리품과 보물상자에서 아이템을 얻어 보세요.'}`);return;}
   if(cmd==='상태'){write(`Lv.${data.profile.level} · EXP ${data.profile.exp}/100\nHP ${data.profile.hp}/${effective.max_hp} · ATK ${effective.attack} · DEF ${effective.defense}\n사용 가능한 창조력 ${data.profile.balance-data.profile.reserved}`);return;}
   if(battle&&!['후퇴','공격'].includes(cmd)&&!['동','서','남','북','회복','대화','읽기','열기','입장','나가기','봐라'].includes(cmd)&&!cmd.startsWith('장착 ')&&!cmd.startsWith('해제 ')&&!cmd.startsWith('사용 ')){submitAnswer(cmd);return;}
   const itemAction=cmd.match(/^(장착|해제|사용)\s+(\d+)$/);
   execute(async()=>{
     if(itemAction){const item=inventory[Number(itemAction[2])-1];if(!item)throw new Error('가방에서 아이템 번호를 확인해 주세요.');
       if(itemAction[1]==='사용'){const result=await rpc('use_item',{p_item:item.id,p_request:crypto.randomUUID()});write(result);}
       else {await rpc('equipment',{p_item:item.id,p_equip:itemAction[1]==='장착'});write(`${item.name} ${itemAction[1]} 완료.`);}return;}
     if(cmd==='공격'){await rpc('start_battle');write('[전투] 몬스터를 발견했습니다. 문제를 풀어 행동하세요.');}
     else if(cmd==='후퇴'){await rpc('escape');write('[후퇴] 전투에서 물러났습니다.');}
     else if(['동','서','남','북','봐라','회복','대화','읽기','열기','입장','나가기'].includes(cmd)) {const r=await rpc('explore',{p_command:cmd,p_request:crypto.randomUUID()});write(r.text);}
     else throw new Error('알 수 없는 명령입니다. 도움말을 입력하세요.');
   });
 };
 return <section className={`powershell ${full?'ps-fullscreen':''}`} aria-label="세계 탐험 터미널">
 <div className="ps-title"><div><span className="ps-symbol">›_</span> 우리 반 MUD — PowerShell <small>{preview?'미리보기':'온라인 탐험'}</small></div><button aria-label={full?'전체화면 종료':'터미널 전체화면'} onClick={()=>setFull(!full)}>{full?<Minimize2 size={16}/>:<Maximize2 size={16}/>} {full?'창 모드':'전체화면'}</button></div>
 <div className="ps-top"><div><strong>{loc?.name||'배움의 광장'}</strong><p>Lv.{data.profile.level}　HP {data.profile.hp}/{effective.max_hp}　ATK {effective.attack}　DEF {effective.defense}　EXP {data.profile.exp}/100</p></div>
 <div className="ps-exits"><span>┌─ 연결된 길 ──────────┐</span>{data.links.filter(l=>l.source===data.profile.location&&data.places.some(p=>p.id===l.target&&p.active)).map(l=><div key={l.direction}>{l.direction} → {data.places.find(p=>p.id===l.target)?.name}</div>)}{data.places.filter(p=>p.village_id===loc?.id&&p.active).map(p=><div key={p.id}>입장 → {p.name}</div>)}{loc?.village_id&&<div>나가기 → {data.places.find(p=>p.id===loc.village_id)?.name}</div>}<span>└───────────────────┘</span></div></div>
 <div className="ps-output"><p className="ps-location-description">{loc?.description}</p>{lines.map(l=><div key={l.id}><Stream text={l.text}/></div>)}
 {showBag&&<div className="ps-bag"><div className="row-between"><strong>┌─ 가방 · {inventory.length}개 / 제한 없음 ─┐</strong><button onClick={()=>setShowBag(false)}>접기</button></div>{inventory.length===0?<p>아직 아이템이 없습니다.</p>:inventory.map((i,n)=><div className="ps-inventory-row" key={i.id}><div><b>[{n+1}] {i.name} {i.equipped?'[장착 중]':''}</b><small>{labels[i.slot]} · 공격 {i.data.attack||0} / 방어 {i.data.defense||0} / 체력 {i.data.hp||0} · {labels[i.data.effect]||'효과 없음'} {i.data.power||0}</small></div><button disabled={!!battle} onClick={()=>act(`${i.slot==='consumable'?'사용':i.equipped?'해제':'장착'} ${n+1}`)}>{i.slot==='consumable'?'사용':i.equipped?'해제':'장착'}</button></div>)}<p>공격·방어 소모품은 전투에서 선택하세요. 장비는 슬롯별 하나씩 장착할 수 있습니다.</p></div>}
 {battle&&<div className="ps-battle"><div className="row-between"><strong>⚔ {monster?.name||'몬스터'}</strong><span>HP {battle.hp} · 정답 {battle.correct_count}회</span></div><small>{battle.question.subject} · {labels[battle.question.kind]}{battle.repeated?' · 준비된 문제를 모두 풀어 복습합니다.':''}</small><h3>{battle.question.body}</h3>
 <form onSubmit={e=>{e.preventDefault();submitAnswer(answer);}}>{battle.question.kind==='short'?<input aria-label="단답형 정답" required value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&e.nativeEvent.isComposing)e.preventDefault();}} placeholder="정답 입력"/>:<div className="battle-choices">{(battle.question.kind==='ox'?['O','X']:battle.question.options).map((o,i)=>{const value=battle.question.kind==='ox'?o:String(i+1);return <label key={i}><input type="radio" name="battle-answer" required checked={answer===value} onChange={()=>setAnswer(value)}/>{battle.question.kind==='choice'?`${i+1}. `:''}{o}</label>;})}</div>}
 <div className="ps-battle-actions"><select aria-label="전투 아이템 또는 기술" value={effect} onChange={e=>setEffect(e.target.value)}><option value="">기본 공격</option>{inventory.filter(i=>i.data.effect!=='none'||i.slot==='consumable').map(i=><option key={i.id} value={i.id}>{i.name} · {i.slot==='consumable'?'소모품':'장비 효과'}</option>)}{data.entities.filter(e=>e.kind==='skill'&&e.creator===data.profile.id&&e.active).map(e=><option key={e.id} value={e.id}>{e.name} · {labels[e.data.effect]} +{e.data.power}</option>)}</select><button type="submit">정답 제출 · 행동 실행</button><button type="button" onClick={()=>act('후퇴')}>후퇴</button></div></form></div>}
 <div ref={tail}/></div>
 <form className="ps-command" onSubmit={e=>{e.preventDefault();act(command);setCommand('');input.current?.focus();}}><label htmlFor="mud-command">PS C:\우리반&gt;</label><input id="mud-command" ref={input} autoComplete="off" spellCheck={false} value={command} onChange={e=>setCommand(e.target.value)} placeholder={battle?'정답 또는 후퇴':'명령어를 입력하세요'} onKeyDown={e=>{if(e.key==='Enter'&&e.nativeEvent.isComposing){e.preventDefault();return;}if(e.key==='ArrowUp'){e.preventDefault();const i=historyIndex<0?history.length-1:Math.max(0,historyIndex-1);setHistoryIndex(i);setCommand(history[i]||'');}if(e.key==='ArrowDown'){e.preventDefault();const i=historyIndex+1;if(i>=history.length){setHistoryIndex(-1);setCommand('');}else {setHistoryIndex(i);setCommand(history[i]||'');}}}}/><button type="submit">입력 ↵</button></form>
 <div className="ps-footer"><button onClick={()=>act('도움말')}>도움말</button><button onClick={()=>act('가방')}>가방</button><span>↑ ↓ 명령 기록　{full?'Esc 창 모드':'텍스트를 눌러 즉시 표시'}</span></div>
 </section>;
}
