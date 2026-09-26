import {useState} from 'react';
import {rpc,studentAccess} from './api';
import {labels,type Snapshot} from './model';
import Modal from './Modal';
type Run=(action:()=>Promise<unknown>,message?:string)=>Promise<void>;
export default function StudentManagement({data,run}:{data:Snapshot;run:Run}) {
 const [selected,setSelected]=useState<string[]>([]),[amounts,setAmounts]=useState<Record<string,string>>({});
 const [target,setTarget]=useState(''),[pin,setPin]=useState(''),[saving,setSaving]=useState(false),[pinError,setPinError]=useState('');
 const students=data.students.filter(s=>s.role==='student');
 const pending=selected.filter(id=>students.some(s=>s.id===id&&s.status==='pending'));
 const approved=selected.filter(id=>students.some(s=>s.id===id&&s.status==='approved'));
 const suspended=selected.filter(id=>students.some(s=>s.id===id&&s.status==='suspended'));
 const change=(ids:string[],status:string,message:string)=>run(async()=>{await rpc('manage_students',{p_ids:ids,p_status:status});setSelected([]);},message);
 return <><div className="approval-bar"><span>가입 승인 대상 {pending.length}명</span><div className="actions">
 <button onClick={()=>setSelected(students.filter(s=>s.status==='pending').map(s=>s.id))}>대기 학생 선택</button>
 <button className="primary" disabled={!pending.length} onClick={()=>change(pending,'approved','가입을 승인했습니다.')}>선택 가입 승인</button>
 <button disabled={!approved.length} onClick={()=>change(approved,'suspended','선택 학생의 이용을 중지했습니다.')}>이용 중지</button>
 <button disabled={!suspended.length} onClick={()=>change(suspended,'approved','선택 학생의 이용을 재개했습니다.')}>이용 재개</button></div></div>
 <div className="card table-wrap"><table className="students-table"><thead><tr><th>선택</th><th>닉네임</th><th>상태</th><th>사용 가능</th><th>예약</th><th>레벨</th><th>PIN번호<br/>초기화</th><th>창조력 지급</th></tr></thead><tbody>{students.map(s=><tr key={s.id}>
 <td><input type="checkbox" aria-label={`${s.nickname} 선택`} checked={selected.includes(s.id)} onChange={e=>setSelected(e.target.checked?[...selected,s.id]:selected.filter(id=>id!==s.id))}/></td>
 <td>{s.nickname}</td><td><span className={`tag ${s.status}`}>{labels[s.status]}</span></td><td>{s.balance-s.reserved}</td><td>{s.reserved}</td><td>{s.level}</td>
 <td><button aria-label={`${s.nickname} PIN번호 초기화`} onClick={()=>{setTarget(s.id);setPin('');setPinError('');}}>PIN번호<br/>초기화</button></td>
 <td><form className="student-grant" onSubmit={e=>{e.preventDefault();const amount=Number(amounts[s.id]);if(!Number.isInteger(amount)||amount===0)return;run(async()=>{await rpc('adjust_balance',{p_student:s.id,p_amount:amount,p_reason:amount>0?'교사 직접 창조력 지급':'교사 직접 창조력 차감',p_request:crypto.randomUUID()});setAmounts(v=>({...v,[s.id]:''}));},`${s.nickname} 창조력을 ${amount>0?'+':''}${amount} 조정했습니다.`);}}>
 <input aria-label={`${s.nickname} 창조력 지급량`} required type="number" step={1} min={-10000} max={10000} placeholder="± 수량" value={amounts[s.id]||''} onChange={e=>setAmounts({...amounts,[s.id]:e.target.value})}/><button disabled={!Number(amounts[s.id])}>확인</button></form><small>음수 입력 시 차감</small></td></tr>)}</tbody></table></div>
 {target&&<Modal title={`${students.find(s=>s.id===target)?.nickname} PIN번호 초기화`} busy={saving} onClose={()=>{setTarget('');setPin('');}}>
 <form onSubmit={e=>{e.preventDefault();setSaving(true);setPinError('');run(async()=>{try{await studentAccess('reset','',pin,target);setTarget('');setPin('');}catch(error){setPinError((error as Error).message);throw error;}},'PIN번호를 변경했습니다.').finally(()=>setSaving(false));}}>
 <p>학생에게 전달할 새로운 숫자 6자리를 입력하세요.</p><label>새 PIN번호<input autoFocus aria-label="새 PIN번호" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e=>setPin(e.target.value)}/></label>{pinError&&<p role="alert">{pinError}</p>}<div className="actions"><button type="button" disabled={saving} onClick={()=>{setTarget('');setPin('');}}>취소</button><button disabled={saving} type="submit">확인</button></div></form></Modal>}
 </>;
}
