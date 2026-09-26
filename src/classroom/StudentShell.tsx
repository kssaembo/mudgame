import {useState,type ReactNode} from 'react';
import Adventure,{help} from './AdventureTerminal';
import Modal from './Modal';
import type {Snapshot} from './model';

type Run=(action:()=>Promise<unknown>,message?:string)=>Promise<void>;
export default function StudentShell({data,run,preview,busy,error,notice,onLeave,renderPanel}:{data:Snapshot;run:Run;preview:boolean;busy:boolean;error:string;notice:string;onLeave:()=>Promise<void>;renderPanel:(panel:string)=>ReactNode}) {
 const [panel,setPanel]=useState(''),[leaving,setLeaving]=useState(false),[leaveError,setLeaveError]=useState('');
 const [theme,setTheme]=useState(()=>{const saved=localStorage.getItem('mud_terminal_theme');return ['blue','green','black'].includes(saved||'')?saved!:'blue';});
 const changeTheme=(value:string)=>{setTheme(value);localStorage.setItem('mud_terminal_theme',value);};
 const command=(raw:string)=>{
  const cmd=raw.replace(/\s/g,'');
  const pages:Record<string,string>={'명령어':'commands','도움말':'commands','help':'commands','?':'commands','문제만들기':'questions','창작작업실':'proposals','창조력':'wallet','성장':'wallet','창조력성장':'wallet','창조력,성장':'wallet','나가기':'logout','로그아웃':'logout'};
  if(pages[cmd]){setLeaveError('');setPanel(pages[cmd]);return true;}
  const colors:Record<string,string>={'색상파랑':'blue','색상초록':'green','색상검정':'black'};
  if(colors[cmd]){changeTheme(colors[cmd]);return true;}return false;
 };
 const titles:Record<string,string>={commands:'명령어 모음',questions:'문제 만들기',proposals:'창작 작업실',wallet:'창조력 · 성장',logout:'나가기 확인'};
 const messages=<>{error&&<div role="alert" className="alert">{error}</div>}{notice&&<div role="status" className="notice">{notice}</div>}{busy&&<div role="status">처리 중…</div>}</>;
 return <div className={`classroom student-shell theme-${theme}`}>
 <fieldset className="student-workspace" disabled={busy||leaving}>
 <Adventure data={data} run={run} preview={preview} onAppCommand={command} messages={!panel?messages:null} toolbar={<>
  <div className="cli-hint">입력창에 명령어 라고 입력해 보세요. 활용 가능한 명령어를 볼 수 있습니다.</div>
  <div className="cli-tools"><div className="cli-menu">{[['commands','명령어 모음'],['questions','문제만들기'],['proposals','창작 작업실'],['wallet','창조력,성장'],['logout','나가기']].map(([id,label])=><button key={id} onClick={()=>{setLeaveError('');setPanel(id);}}>[{label}]</button>)}</div>
  <label className="cli-theme">화면 색상<select aria-label="화면 색상" value={theme} onChange={e=>changeTheme(e.target.value)}><option value="blue">파란 배경</option><option value="green">초록 배경</option><option value="black">검정 배경</option></select></label>
  <strong className="cli-balance">창조력 {data.profile.balance-data.profile.reserved}<small>예약 {data.profile.reserved}</small></strong></div>
 </>}/></fieldset>
 {panel&&<Modal title={titles[panel]} busy={busy||leaving} onClose={()=>setPanel('')}>
 {messages}<fieldset disabled={busy||leaving} className="workspace">
 {panel==='commands'?<><p>명령어를 입력하거나 상단의 텍스트 메뉴를 클릭하세요.</p><pre className="cli-help">{help}</pre></>:panel==='logout'?<><p>정말 나가시겠습니까?</p><p>저장된 문제, 창작물과 성장 기록은 유지됩니다.</p>{leaveError&&<p role="alert">{leaveError}</p>}<div className="actions"><button onClick={()=>setPanel('')}>취소</button><button autoFocus onClick={async()=>{setLeaving(true);try{await onLeave();}catch(e){setLeaveError((e as Error).message);}finally{setLeaving(false);}}}>확인 · 나가기</button></div></>:renderPanel(panel)}
 </fieldset></Modal>}
 </div>;
}
